import { database } from '../../../shared/src/database';
import { config } from '../../../shared/src/config';
import { ApiError } from '../../../shared/src/errors';
import { InternalClients } from '../../../shared/src/internal-clients';
import type { OperationInputs, OperationOutputs } from '../../../shared/src/operations.generated';
import { InventoryRepository, QuoteVariantRow } from './inventory.repository';
import { quoteItemResponse } from './inventory.mapper';

/** Narrow view of the M3 `ActiveStores` lookup so the dependency can be faked in unit tests. */
export interface ActiveStoreDirectory {
  call(operation: 'ActiveStores', input: undefined, correlation: string): Promise<{ ids: string[] }>;
}

// Extension point for inventory; controller delegates here after implementation.
export class InventoryService {
  constructor(private readonly stores?: ActiveStoreDirectory) {}

  private directory(): ActiveStoreDirectory {
    if (this.stores) return this.stores;
    const c = config('M1');
    return new InternalClients('M1', c.internalKeys.M1, { M1: c.catalogUrl, M2: '', M3: c.identityUrl });
  }

  /**
   * QuoteVariants — snapshot giá/tồn hiện hành cho M2.
   *
   * Chỉ đọc: không lock, không reserve, không trừ tồn. Store còn được bán lấy từ M3; lỗi M3
   * (timeout/quyền) ném 503 giữ nguyên correlation và fail closed, không trả dữ liệu cũ hay
   * danh sách rỗng. Variant/Product/Store phải kiểm theo quan hệ hiện hành chứ không tin input.
   */
  async quote(input: OperationInputs['QuoteVariants']['body'], correlation: string): Promise<OperationOutputs['QuoteVariants']> {
    const activeStoreIds = (await this.directory().call('ActiveStores', undefined, correlation)).ids;
    const variantIds = [...new Set(input.items.map(item => item.variant_id))];
    const rows = await new InventoryRepository(database.manager).variantsForQuote(variantIds);
    const byVariantId = new Map<string, QuoteVariantRow>(rows.map(row => [row.variant_id, row] as const));

    return { items: input.items.map(item => {
      const row = byVariantId.get(item.variant_id);
      if (!row || row.store_id !== item.store_id) throw new ApiError(404, 'VARIANT_NOT_FOUND', 'Không tìm thấy Variant trong Store.');
      if (!activeStoreIds.includes(item.store_id)) throw new ApiError(409, 'STORE_UNAVAILABLE', 'Store đang không được phép bán.');
      if (row.product_status !== 'ACTIVE' || row.moderation_status !== 'VISIBLE') throw new ApiError(409, 'PRODUCT_UNAVAILABLE', 'Sản phẩm không còn được bán.');
      if (row.variant_status !== 'ACTIVE') throw new ApiError(409, 'VARIANT_UNAVAILABLE', 'Variant không còn được bán.');
      if (item.quantity > row.available_quantity) throw new ApiError(409, 'INSUFFICIENT_STOCK', 'Số lượng vượt quá tồn kho khả dụng.');
      return quoteItemResponse(row, item.quantity);
    })};
  }
}

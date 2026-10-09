import { database } from '../../../shared/src/database';
import { config } from '../../../shared/src/config';
import { audit } from '../../../shared/src/audit';
import { ApiError } from '../../../shared/src/errors';
import { InternalClients } from '../../../shared/src/internal-clients';
import { once } from '../../../shared/src/idempotency';
import type { OperationInputs, OperationOutputs } from '../../../shared/src/operations.generated';
import { InventoryRepository, QuoteVariantRow } from './inventory.repository';
import { inventoryBalance, quoteItemResponse, stockMovementView } from './inventory.mapper';

/** Owner always manages stock; a Seller needs the store inventory permission group (RBAC). */
export function hasInventoryPermission(role: string | undefined, permissions: string[]): boolean {
  if (role !== 'OWNER' && role !== 'SELLER') return false;
  return role === 'OWNER'
    || permissions.includes('inventory.store.*')
    || permissions.some(code => code.startsWith('inventory.store.'));
}

/** Narrow view of the M3 `ActiveStores` lookup so the dependency can be faked in unit tests. */
export interface ActiveStoreDirectory {
  call(operation: 'ActiveStores', input: undefined, correlation: string): Promise<{ ids: string[] }>;
}

// Extension point for inventory; controller delegates here after implementation.
export class InventoryService {
  constructor(private readonly stores?: ActiveStoreDirectory) {}

  private clients(): InternalClients {
    const c = config('M1');
    return new InternalClients('M1', c.internalKeys.M1, { M1: c.catalogUrl, M2: '', M3: c.identityUrl });
  }

  private directory(): ActiveStoreDirectory {
    return this.stores ?? this.clients();
  }

  /**
   * Store scope always comes from the resolved membership, never from the request, so a member of
   * one Store cannot read or adjust another Store's stock by guessing an id. Permission is checked
   * on the live context, so a revoked permission is refused even while an old JWT is still valid.
   */
  private requireStoreScope(context: any): { storeId: string; actorUserId: string } {
    const membership = context?.store_membership;
    if (!membership?.store_id) throw new ApiError(403, 'FORBIDDEN', 'Tài khoản không thuộc Store đang hoạt động nào.');
    if (!hasInventoryPermission(membership.role, membership.permissions ?? []))
      throw new ApiError(403, 'FORBIDDEN', 'Cần quyền quản lý kho của Store.');
    return { storeId: membership.store_id, actorUserId: context.user_id };
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

  /** listStoreInventory — trang tồn kho của Store mà người gọi là thành viên. */
  async listStoreInventory(query: { page: number; size: number }, context: any): Promise<OperationOutputs['listStoreInventory']> {
    const { storeId } = this.requireStoreScope(context);
    const page = await new InventoryRepository(database.manager).pageInventory(storeId, query.page, query.size);
    return { items: page.items, total: page.total, page: query.page, size: query.size };
  }

  /**
   * adjustInventory — nhập/xuất/điều chỉnh tồn của một Variant trong Store.
   *
   * Idempotent theo `operation_id`; `expected_version` chống ghi đè khi hai người sửa cùng lúc.
   * Không cho tồn xuống dưới lượng đang giữ cho Order, vì làm vậy sẽ phá reservation đã cam kết.
   */
  async adjustInventory(input: OperationInputs['adjustInventory']['body'], context: any, correlation: string):
  Promise<OperationOutputs['adjustInventory']> {
    const { storeId, actorUserId } = this.requireStoreScope(context);
    return database.transaction(async manager => {
      const repository = new InventoryRepository(manager);
      // Store nằm trong fingerprint để cùng operation ID không thể dùng lại cho Store khác.
      return once(manager, 'M1.Inventory.adjust', input.operation_id, { ...input, store_id: storeId }, async () => {
        const row = await repository.lockStoreInventory(storeId, input.variant_id);
        if (!row) throw new ApiError(404, 'INVENTORY_NOT_FOUND', 'Không tìm thấy tồn kho cho Variant trong Store.');
        if (row.version !== input.expected_version) throw new ApiError(409, 'VERSION_CONFLICT', 'Dữ liệu đã thay đổi. Vui lòng tải lại.');
        const next = row.quantity + input.delta_quantity;
        if (next < 0) throw new ApiError(409, 'INSUFFICIENT_STOCK', 'Số lượng sau điều chỉnh không được âm.');
        if (next < row.reserved_quantity) throw new ApiError(409, 'RESERVED_STOCK_CONFLICT', 'Không thể giảm xuống dưới lượng đang giữ cho đơn hàng.');

        await repository.setQuantity(row.id, next);
        await repository.insertStockMovement({ inventoryId: row.id, operationId: input.operation_id,
          deltaQuantity: input.delta_quantity, reason: input.reason, actorUserId });
        await audit(manager, 'M1', actorUserId, 'Inventory', row.id, 'ADJUST', correlation,
          { quantity: row.quantity, reserved_quantity: row.reserved_quantity, version: row.version },
          { quantity: next, reserved_quantity: row.reserved_quantity, version: row.version + 1, reason: input.reason });
        return inventoryBalance({ variant_id: row.variant_id, quantity: next,
          reserved_quantity: row.reserved_quantity, version: row.version + 1 });
      });
    });
  }

  /** listStockMovements — lịch sử nhập/xuất của Store, chỉ đọc. */
  async listStockMovements(query: { page: number; size: number }, context: any): Promise<OperationOutputs['listStockMovements']> {
    const { storeId } = this.requireStoreScope(context);
    const page = await new InventoryRepository(database.manager).pageMovements(storeId, query.page, query.size);
    return { items: page.items.map(stockMovementView), total: page.total, page: query.page, size: query.size };
  }

  /**
   * ListLowStockVariants — M2 chuyển token người dùng sang; M1 tự resolve với M3 thay vì tin
   * scope do caller khai. Store khác hoặc thiếu quyền trả 403; lỗi M3 ném 503 nên không bao giờ
   * biến sự cố dependency thành một trang rỗng trông như "không có hàng sắp hết".
   */
  async listLowStockVariants(input: OperationInputs['ListLowStockVariants']['body'], correlation: string):
  Promise<OperationOutputs['ListLowStockVariants']> {
    const context = await this.clients().call('ResolveContext', { token: input.token }, correlation);
    const membership = context.store_membership;
    if (!membership?.store_id) throw new ApiError(403, 'FORBIDDEN', 'Tài khoản không thuộc Store đang hoạt động nào.');
    if (membership.store_id !== input.store_id) throw new ApiError(403, 'FORBIDDEN', 'Không có quyền xem kho của Store khác.');
    if (!hasInventoryPermission(membership.role, membership.permissions ?? []))
      throw new ApiError(403, 'FORBIDDEN', 'Cần quyền quản lý kho của Store.');

    const threshold = input.threshold ?? 5;
    const page = input.page ?? 1;
    const size = input.size ?? 20;
    const result = await new InventoryRepository(database.manager).pageLowStock(input.store_id, threshold, page, size);
    return { store_id: input.store_id, items: result.items, page, size, total: result.total };
  }
}

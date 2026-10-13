import { database } from '../../../shared/src/database';
import { config } from '../../../shared/src/config';
import { audit } from '../../../shared/src/audit';
import { ApiError } from '../../../shared/src/errors';
import { InternalClients } from '../../../shared/src/internal-clients';
import { once } from '../../../shared/src/idempotency';
import type { OperationInputs, OperationOutputs } from '../../../shared/src/operations.generated';
import { InventoryRepository, InventoryRow, QuoteVariantRow, ReservationRow } from './inventory.repository';
import { inventoryBalance, quoteItemResponse, stockMovementView, reservationView } from './inventory.mapper';

/** Owner always manages stock; a Seller needs the store inventory permission group (RBAC). */
export function hasInventoryPermission(role: string | undefined, permissions: string[]): boolean {
  if (role !== 'OWNER' && role !== 'SELLER') return false;
  return role === 'OWNER'
    || permissions.includes('inventory.store.*')
    || permissions.includes('inventory.store.read_adjust');
}

/** Narrow view of the M3 `ActiveStores` lookup so the dependency can be faked in unit tests. */
export interface ActiveStoreDirectory {
  call(operation: 'ActiveStores', input: undefined, correlation: string): Promise<{ ids: string[] }>;
}

const SYSTEM_ACTOR = '00000000-0000-0000-0000-000000000000';
function millis(value: Date | string): number { return value instanceof Date ? value.getTime() : Date.parse(value); }

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
        if (!Number.isSafeInteger(next) || next > 2147483647)
          throw new ApiError(422, 'STOCK_LIMIT_EXCEEDED', 'Số lượng tồn kho vượt giới hạn lưu trữ.');
        if (!input.reason.trim()) throw new ApiError(422, 'ADJUSTMENT_REASON_REQUIRED', 'Cần lý do điều chỉnh tồn kho.');
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

  /**
   * ReserveInventory — giữ hàng cho các Order của một purchase group.
   *
   * Nguyên tử theo thiết kế: mọi dòng phải đủ tồn **trước khi** ghi bất cứ thứ gì, nên thiếu một
   * SKU thì không giữ một phần. `reservation_order_unique` cho phép đúng một reservation mỗi
   * Order, nên các dòng được gom theo `order_id`. Không gọi M3/provider ở đây: đây là command
   * ghi, phải nhanh và chỉ phụ thuộc DB của M1.
   */
  async reserve(input: OperationInputs['ReserveInventory']['body']): Promise<OperationOutputs['ReserveInventory']> {
    const variantIds = [...new Set(input.items.map(line => line.variant_id))].sort();

    return database.transaction(async manager => {
      const repository = new InventoryRepository(manager);
      return once(manager, 'M2.Inventory.reserve', input.operation_id, input, async () => {
        // Business validation follows the idempotency check, including malformed duplicate lines.
        const seen = new Set<string>();
        for (const line of input.items) {
          const key = line.order_id + ':' + line.variant_id;
          if (seen.has(key)) throw new ApiError(422, 'DUPLICATE_RESERVATION_LINE', 'Mỗi Variant chỉ được xuất hiện một lần trong một Order.');
          seen.add(key);
        }
        // Serialize competing commands for an Order even when they use disjoint stock rows.
        const orderIds = [...new Set(input.items.map(line => line.order_id))].sort();
        await repository.lockReservationOrders(orderIds);
        const stock = await repository.lockInventoryByVariant(variantIds);
        // A replay is returned by once before checking time-dependent conditions.
        if (millis(input.expires_at) <= Date.now()) throw new ApiError(422, 'INVALID_EXPIRY', 'Thời điểm hết hạn phải ở tương lai.');
        const byVariantId = new Map<string, InventoryRow>(stock.map(row => [row.variant_id, row] as const));

        for (const line of input.items) {
          const row = byVariantId.get(line.variant_id);
          if (!row || row.store_id !== line.store_id) throw new ApiError(404, 'INVENTORY_NOT_FOUND', 'Không tìm thấy tồn kho cho Variant trong Store.');
        }
        // Total demand per Variant: two lines for the same Variant must not both pass a stale check.
        const demand = new Map<string, number>();
        for (const line of input.items) demand.set(line.variant_id, (demand.get(line.variant_id) ?? 0) + line.quantity);
        for (const [variantId, total] of demand) {
          const row = byVariantId.get(variantId)!;
          if (total > row.quantity - row.reserved_quantity) throw new ApiError(409, 'INSUFFICIENT_STOCK', 'Không đủ tồn khả dụng để giữ hàng.');
        }

        const reservations = new Map<string, ReservationRow>();
        for (const orderId of orderIds) {
          if (await repository.reservationByOrder(orderId)) throw new ApiError(409, 'RESERVATION_EXISTS', 'Order đã có reservation.');
          reservations.set(orderId, await repository.insertReservation(orderId, input.purchase_group_id, input.expires_at));
        }

        const views: OperationOutputs['ReserveInventory']['reservations'] = [];
        for (const line of input.items) {
          const row = byVariantId.get(line.variant_id)!;
          const reservation = reservations.get(line.order_id)!;
          const item = await repository.insertReservationItem(reservation.id, row.id, line.quantity);
          await repository.addReserved(row.id, line.quantity);
          await repository.insertMovement({ inventoryId: row.id, reservationItemId: item.id, orderId: line.order_id,
            operationId: input.operation_id, deltaQuantity: 0, deltaReserved: line.quantity, reason: 'RESERVE', actorUserId: SYSTEM_ACTOR });
          views.push(reservationView(reservation, line));
        }
        return { reservations: views };
      });
    });
  }

  consume(input: OperationInputs['ConsumeReservation']['body']): Promise<OperationOutputs['ConsumeReservation']> {
    return this.settle('CONSUME', input);
  }

  release(input: OperationInputs['ReleaseReservation']['body']): Promise<OperationOutputs['ReleaseReservation']> {
    return this.settle('RELEASE', input);
  }

  /**
   * Consume và Release dùng chung một đường: chỉ khác trạng thái đích và việc consume có trừ
   * tồn thật hay không. Cả hai chỉ tác động lên `reservation_item` còn `ACTIVE`, nên gọi lần hai
   * bằng operation ID khác trả `ALREADY_APPLIED` mà không lặp hiệu ứng. Đi ngược trạng thái
   * (release sau consume) là xung đột nghiệp vụ 409, không im lặng bỏ qua.
   */
  private async settle(mode: 'CONSUME' | 'RELEASE', input: OperationInputs['ConsumeReservation']['body']):
  Promise<OperationOutputs['ConsumeReservation']> {
    const target = mode === 'CONSUME' ? 'CONSUMED' : 'RELEASED';
    const conflicting = mode === 'CONSUME' ? 'RELEASED' : 'CONSUMED';
    const operationKey = mode === 'CONSUME' ? 'M2.Inventory.consume' : 'M2.Inventory.release';
    const reservationIds = [...new Set(input.reservation_ids)];

    return database.transaction(async manager => {
      const repository = new InventoryRepository(manager);
      return once(manager, operationKey, input.operation_id, input, async () => {
        const reservations = await repository.lockReservations(reservationIds, input.order_id);
        if (reservations.length !== reservationIds.length) throw new ApiError(404, 'RESERVATION_NOT_FOUND', 'Không tìm thấy reservation thuộc Order.');
        if (reservations.some(row => row.status === conflicting)) throw new ApiError(409, 'RESERVATION_STATE_CONFLICT', 'Reservation đã ở trạng thái không thể chuyển tiếp.');

        const active = (await repository.reservationItems(reservationIds)).filter(item => item.status === 'ACTIVE');
        if (!active.length) return { operation_id: input.operation_id, status: 'ALREADY_APPLIED' as const };
        await repository.lockInventoryById([...new Set(active.map(item => item.inventory_id))]);
        // Check after waiting for stock locks; release must still free an expired hold.
        if (mode === 'CONSUME' && reservations.some(row => millis(row.expires_at) <= Date.now()))
          throw new ApiError(409, 'RESERVATION_EXPIRED', 'Reservation đã hết hạn, không thể consume.');

        for (const item of active) {
          if (mode === 'CONSUME') await repository.consumeStock(item.inventory_id, item.quantity);
          else await repository.releaseStock(item.inventory_id, item.quantity);
          await repository.insertMovement({ inventoryId: item.inventory_id, reservationItemId: item.id, orderId: input.order_id,
            operationId: input.operation_id, deltaQuantity: mode === 'CONSUME' ? -item.quantity : 0,
            deltaReserved: -item.quantity, reason: mode, actorUserId: SYSTEM_ACTOR });
        }
        await repository.setReservationItemStatus(active.map(item => item.id), target);
        await repository.setReservationStatus([...new Set(active.map(item => item.reservation_id))].sort(), target);
        return { operation_id: input.operation_id, status: 'APPLIED' as const };
      });
    });
  }
}

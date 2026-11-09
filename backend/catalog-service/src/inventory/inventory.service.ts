import type { DataSource } from 'typeorm';
import {reconcileInventory} from './inventory-reconciliation';
import { database } from '../../../shared/src/database';
import { config } from '../../../shared/src/config';
import { audit } from '../../../shared/src/audit';
import { ApiError } from '../../../shared/src/errors';
import { InternalClients } from '../../../shared/src/internal-clients';
import { once, fingerprint } from '../../../shared/src/idempotency';
import type { OperationInputs, OperationOutputs } from '../../../shared/src/operations.generated';
import { InventoryRepository, InventoryRow, QuoteVariantRow, ReservationRow,type InventoryFilters } from './inventory.repository';
import { inventoryBalance, inventoryView, isoTime, quoteItemResponse, stockMovementView, reservationView } from './inventory.mapper';
import {attributeErrors,variantAttributeErrors} from '../catalog/catalog.validation';

/** Unset preserves existing deployments. Explicit malformed values pause new writes. */
export function exchangeDispatchWritesEnabled(): boolean {
  return process.env.EXCHANGE_DISPATCH_WRITES_ENABLED === undefined
    || process.env.EXCHANGE_DISPATCH_WRITES_ENABLED === 'true';
}

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
function assertSellableConfiguration(row:QuoteVariantRow){
  if(row.product_status!=='ACTIVE'||row.moderation_status!=='VISIBLE'||row.taxonomy_status!=='ACTIVE')throw new ApiError(409,'PRODUCT_UNAVAILABLE','Sản phẩm hoặc loại sản phẩm hiện không được bán.');
  if(row.variant_status!=='ACTIVE')throw new ApiError(409,'VARIANT_UNAVAILABLE','Phân loại hiện không được bán.');
  if(!Array.isArray(row.attribute_definitions)||!row.product_attributes||typeof row.product_attributes!=='object'||Array.isArray(row.product_attributes)||attributeErrors(row.product_attributes,row.attribute_definitions).length||variantAttributeErrors(row.variant_values!,row.attribute_definitions).length)
    throw new ApiError(409,'VARIANT_CONFIGURATION_INVALID','Phân loại chưa khớp cấu hình sản phẩm hiện hành. Cửa hàng cần kiểm tra trước khi nhận đơn mới.');
}
function millis(value: Date | string): number { return value instanceof Date ? value.getTime() : Date.parse(value); }

function tally(lines: { variant_id: string; quantity: number }[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const line of lines) totals.set(line.variant_id, (totals.get(line.variant_id) ?? 0) + line.quantity);
  return totals;
}

/**
 * A restock request only identifies what to return; the consumed reservation lines decide how much.
 * Quantities are summed per Variant, so splitting one line into two does not slip past the check.
 */
export function restockMatches(consumed: { variant_id: string; quantity: number }[],
  requested: { variant_id: string; quantity: number }[]): boolean {
  const expected = tally(consumed);
  const actual = tally(requested);
  return expected.size === actual.size
    && [...expected].every(([variantId, quantity]) => actual.get(variantId) === quantity);
}

// Extension point for inventory; controller delegates here after implementation.
export class InventoryService {
  constructor(private readonly stores?: ActiveStoreDirectory, private readonly source?: DataSource) {}

  private get db(): DataSource { return this.source ?? database; }

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
    const rows = await new InventoryRepository(this.db.manager).variantsForQuote(variantIds);
    const byVariantId = new Map<string, QuoteVariantRow>(rows.map(row => [row.variant_id, row] as const));

    return { items: input.items.map(item => {
      const row = byVariantId.get(item.variant_id);
      if (!row || row.store_id !== item.store_id) throw new ApiError(404, 'VARIANT_NOT_FOUND', 'Không tìm thấy Variant trong Store.');
      if (!activeStoreIds.includes(item.store_id)) throw new ApiError(409, 'STORE_UNAVAILABLE', 'Store đang không được phép bán.');
      assertSellableConfiguration(row);
      if (item.quantity > row.available_quantity) throw new ApiError(409, 'INSUFFICIENT_STOCK', 'Số lượng vượt quá tồn kho khả dụng.');
      return quoteItemResponse(row, item.quantity);
    })};
  }

  /** listStoreInventory — trang tồn kho của Store mà người gọi là thành viên. */
  async listStoreInventory(query: { page: number; size: number }&InventoryFilters, context: any): Promise<OperationOutputs['listStoreInventory']> {
    const { storeId } = this.requireStoreScope(context);
    const page = await new InventoryRepository(this.db.manager).pageInventory(storeId, query.page, query.size,query);
    return { items: page.items.map(inventoryView), total: page.total, page: query.page, size: query.size };
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
    return this.db.transaction(async manager => {
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
          { variant_id: row.variant_id, quantity: row.quantity, reserved_quantity: row.reserved_quantity, version: row.version },
          { variant_id: row.variant_id, quantity: next, reserved_quantity: row.reserved_quantity, version: row.version + 1, reason: input.reason });
        return inventoryBalance({ variant_id: row.variant_id, quantity: next,
          reserved_quantity: row.reserved_quantity, version: row.version + 1 });
      });
    });
  }

  /** listStockMovements — lịch sử nhập/xuất của Store, chỉ đọc. */
  async listStockMovements(query: { page: number; size: number }&InventoryFilters, context: any): Promise<OperationOutputs['listStockMovements']> {
    const { storeId } = this.requireStoreScope(context);
    const filters={...query,...(query.from?{from:new Date(query.from).toISOString()}:{}),...(query.to?{to:new Date(query.to).toISOString()}:{})};
    const page = await new InventoryRepository(this.db.manager).pageMovements(storeId, query.page, query.size,filters);
    return { items: page.items.map(stockMovementView), total: page.total, page: query.page, size: query.size };
  }

  async getInventoryReconciliation(query:OperationInputs['getInventoryReconciliation']['query'],context:any):Promise<OperationOutputs['getInventoryReconciliation']>{
    const {storeId}=this.requireStoreScope(context),start=Date.parse(query.from),end=Date.parse(query.to);
    if(!Number.isFinite(start)||!Number.isFinite(end)||start>=end||end-start>366*86400000||start>Date.now())throw new ApiError(422,'INVALID_PERIOD','Chọn kỳ hợp lệ không quá 366 ngày, bắt đầu trước hiện tại.');
    return this.db.transaction('REPEATABLE READ',async manager=>{
      const repository=new InventoryRepository(manager),page=await repository.pageInventory(storeId,1,1,{variant_id:query.variant_id});
      if(!page.items[0])throw new ApiError(404,'INVENTORY_NOT_FOUND','Không tìm thấy phân loại trong kho Store.');
      const rows=await repository.reconciliationMovements(storeId,query.variant_id);
      if(rows.length>20000)throw new ApiError(503,'RECONCILIATION_HISTORY_LIMIT','Lịch sử vượt giới hạn đối chiếu trực tuyến; cần hỗ trợ tạo mốc đối chiếu, không suy số đầu kỳ.');
      const [clock]=await manager.query('SELECT clock_timestamp() AS as_of');
      return reconcileInventory(page.items[0],rows,query.from,query.to,new Date(clock.as_of).toISOString());
    });
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
    const result = await new InventoryRepository(this.db.manager).pageLowStock(input.store_id, threshold, page, size);
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

    return this.db.transaction(async manager => {
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
        // Product locks precede stock locks, matching catalog writes. Taxonomy
        // parent SHARE locks block definition writers until the hold commits.
        // The final read has a fresh READ COMMITTED snapshot after each lock wait.
        const sellable=await repository.variantsForQuote(variantIds,true),bySellable=new Map(sellable.map(row=>[row.variant_id,row]));
        for(const line of input.items){const row=bySellable.get(line.variant_id);if(!row||row.store_id!==line.store_id)throw new ApiError(404,'VARIANT_NOT_FOUND','Không tìm thấy phân loại trong cửa hàng.');assertSellableConfiguration(row);}
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

    return this.db.transaction(async manager => {
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
          if (mode === 'CONSUME') { await repository.consumeStock(item.inventory_id, item.quantity); await repository.incrementSoldCountByInventory(item.inventory_id, item.quantity); }
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

  /**
   * RestockOrder — trả tồn cho Order đã consume (hủy đơn/hoàn hàng).
   *
   * Chỉ restock reservation đã CONSUMED: reservation chưa consume chưa từng trừ tồn, nên hoàn kho
   * lúc đó là tạo hàng từ hư không. Đây cũng là lý do M1 **không** tự hoàn kho cho một hold quá
   * hạn mà M2 chưa kết luận tiền: M1 chỉ đọc DB của mình nên không được suy đoán Payment (BR-23).
   * Guard "một lần" dựa trên movement RESTOCK đã ghi cho Order, nên nếu M2 gọi lại bằng operation
   * ID khác thì trả ALREADY_APPLIED thay vì cộng tồn lần hai.
   */
  async restockOrder(input: OperationInputs['RestockOrder']['body']): Promise<OperationOutputs['RestockOrder']> {
    return this.db.transaction(async manager => {
      const repository = new InventoryRepository(manager);
      return once(manager, 'M2.Inventory.restock', input.operation_id, input, async () => {
        // Serialize against reserve/release/restock for the same Order, even on disjoint stock rows.
        await repository.lockReservationOrders([input.order_id]);
        const reservation = await repository.reservationByOrder(input.order_id);
        if (!reservation) throw new ApiError(404, 'RESERVATION_NOT_FOUND', 'Không tìm thấy reservation của Order.');

        const items = await repository.reservationItems([reservation.id]);
        const consumed = items.filter(item => item.status === 'CONSUMED');
        if (!consumed.length || consumed.length !== items.length)
          throw new ApiError(409, 'RESTOCK_NOT_ALLOWED', 'Chỉ hoàn kho cho reservation đã consume.');

        // Stored consumed lines are the source of truth; the request only has to match them.
        if (!restockMatches(consumed, input.items))
          throw new ApiError(409, 'RESTOCK_MISMATCH', 'Danh sách hoàn kho không khớp reservation đã consume.');

        if(await repository.hasReceivedInspection(input.order_id))throw new ApiError(409,'INSPECTED_RETURN_EXISTS','Đơn đã có kiểm hàng hoàn; không dùng hoàn toàn bộ tồn của luồng hủy.');
        if (await repository.hasRestockMovement(input.order_id))
          return { operation_id: input.operation_id, status: 'ALREADY_APPLIED' as const };

        await repository.lockInventoryById([...new Set(consumed.map(item => item.inventory_id))]);
        for (const item of consumed) {
          await repository.restockStock(item.inventory_id, item.quantity); await repository.decrementSoldCountByInventory(item.inventory_id, item.quantity);
          await repository.insertMovement({ inventoryId: item.inventory_id, reservationItemId: item.id,
            orderId: input.order_id, operationId: input.operation_id, deltaQuantity: item.quantity,
            deltaReserved: 0, reason: 'RESTOCK', actorUserId: SYSTEM_ACTOR });
        }
        return { operation_id: input.operation_id, status: 'APPLIED' as const };
      });
    });
  }

  /** Receipt is immutable. Aggregate sellable returns can never exceed originally consumed stock. */
  async restockReceived(input:OperationInputs['RestockReceivedItems']['body']):Promise<OperationOutputs['RestockReceivedItems']> {
    return this.db.transaction(async manager=>{
      const repository=new InventoryRepository(manager);
      const canonical={...input,items:[...input.items].sort((a,b)=>a.variant_id.localeCompare(b.variant_id))};
      return once(manager,'M2.Inventory.received-restock',input.operation_id,canonical,async()=>{
        await repository.lockReservationOrders([input.order_id]);
        const hash=fingerprint({order_id:input.order_id,actor_user_id:input.actor_user_id,items:canonical.items});
        const [receipt]=await manager.query('SELECT payload_hash FROM inventory_return_receipt WHERE id=$1',[input.receipt_id]);
        if(receipt){if(receipt.payload_hash!==hash)throw new ApiError(409,'RETURN_RECEIPT_CONFLICT','Biên bản kiểm hàng đã được ghi với nội dung khác.');return {operation_id:input.operation_id,status:'ALREADY_APPLIED' as const};}
        const reservation=await repository.reservationByOrder(input.order_id);
        if(!reservation)throw new ApiError(404,'RESERVATION_NOT_FOUND','Không tìm thấy dữ liệu xuất tồn của đơn.');
        const consumed=(await repository.reservationItems([reservation.id])).filter(row=>row.status==='CONSUMED');
        const returned=await repository.receivedTotals(input.order_id),seen=new Set<string>();
        for(const item of input.items){
          if(seen.has(item.variant_id)||!Number.isSafeInteger(item.quantity)||item.quantity<=0)throw new ApiError(422,'INVALID_RECEIVED_ITEMS','Phân loại phải duy nhất và lượng bán lại là số nguyên dương.');seen.add(item.variant_id);
          const original=consumed.find(row=>row.variant_id===item.variant_id&&row.store_id===item.store_id);
          if(!original||item.quantity+(returned.get(item.variant_id)??0)>original.quantity)throw new ApiError(409,'RECEIVED_QUANTITY_EXCEEDED','Không cộng vượt lượng thương mại đã trừ của chính đơn.');
        }
        if(!consumed.length)throw new ApiError(409,'RETURN_NOT_CONSUMED','Đơn chưa được trừ tồn thương mại.');
        const balances=await repository.lockInventoryById(consumed.filter(row=>seen.has(row.variant_id)).map(row=>row.inventory_id));
        for(const item of input.items){const balance=balances.find(row=>row.variant_id===item.variant_id);if(!balance||balance.quantity+item.quantity>2147483647)throw new ApiError(409,'STOCK_LIMIT_EXCEEDED','Lượng sau nhận hoàn vượt giới hạn tồn thương mại.');}
        await manager.query('INSERT INTO inventory_return_receipt(id,order_id,operation_id,payload_hash,actor_user_id,items_json) VALUES($1,$2,$3,$4,$5,$6)',[input.receipt_id,input.order_id,input.operation_id,hash,input.actor_user_id,JSON.stringify(canonical.items)]);
        for(const item of input.items){const original=consumed.find(row=>row.variant_id===item.variant_id)!;await repository.restockStock(original.inventory_id,item.quantity); await repository.decrementSoldCountByInventory(original.inventory_id,item.quantity);await repository.insertMovement({inventoryId:original.inventory_id,reservationItemId:original.id,orderId:input.order_id,operationId:input.operation_id,deltaQuantity:item.quantity,deltaReserved:0,reason:'RETURN_RECEIVED',actorUserId:input.actor_user_id,receiptId:input.receipt_id});}
        return {operation_id:input.operation_id,status:'APPLIED' as const};
      });
    });
  }

  /** A separate receipt restores replacement variants, never the original purchase twice. */
  async restockExchange(input:OperationInputs['RestockExchangeItems']['body']):Promise<OperationOutputs['RestockExchangeItems']>{
    const canonical={...input,items:[...input.items].sort((a,b)=>a.variant_id.localeCompare(b.variant_id))};
    return this.db.transaction(async manager=>once(manager,'M2.Inventory.exchange-restock',input.operation_id,canonical,async()=>{
      const repo=new InventoryRepository(manager);await repo.lockReservationOrders([input.order_id]);
      const hash=fingerprint(canonical);
      const [prior]=await manager.query('SELECT r.payload_hash FROM inventory_exchange_return e JOIN inventory_return_receipt r ON r.id=e.receipt_id WHERE e.dispatch_receipt_id=$1',[input.dispatch_receipt_id]);
      if(prior){if(prior.payload_hash!==hash)throw new ApiError(409,'EXCHANGE_RETURN_CONFLICT','Kiện đổi đã có biên bản khác.');return {operation_id:input.operation_id,status:'ALREADY_APPLIED' as const};}
      const [dispatch]=await manager.query('SELECT d.items_json FROM inventory_exchange_dispatch d JOIN inventory_return_receipt r ON r.id=d.receipt_id WHERE d.receipt_id=$1 AND r.order_id=$2',[input.dispatch_receipt_id,input.order_id]);
      if(!dispatch)throw new ApiError(409,'EXCHANGE_DISPATCH_MISSING','Thiếu bằng chứng xuất hàng đổi.');
      const totals=new Map<string,{quantity:number;store:string}>();
      for(const line of dispatch.items_json){const entry=totals.get(line.variant_id);totals.set(line.variant_id,{quantity:(entry?.quantity??0)+line.quantity,store:line.store_id});}
      const seen=new Set<string>();
      for(const item of input.items){const original=totals.get(item.variant_id);
        if(seen.has(item.variant_id)||!original||original.store!==item.store_id||!Number.isSafeInteger(item.quantity)||item.quantity<=0||item.quantity>original.quantity)throw new ApiError(409,'EXCHANGE_RETURN_QUANTITY_INVALID','Không cộng vượt lượng hàng đổi đã xuất.');seen.add(item.variant_id);}
      const balances=await manager.query('SELECT * FROM inventory WHERE variant_id=ANY($1::uuid[]) ORDER BY id FOR UPDATE',[input.items.map(i=>i.variant_id)]);
      if(balances.length!==input.items.length)throw new ApiError(409,'EXCHANGE_INVENTORY_MISSING','Thiếu sổ tồn của hàng đổi.');
      await manager.query("INSERT INTO inventory_return_receipt(id,order_id,operation_id,payload_hash,actor_user_id,items_json,kind) VALUES($1,$2,$3,$4,$5,$6,'EXCHANGE')",[input.receipt_id,input.order_id,input.operation_id,hash,input.actor_user_id,JSON.stringify(input.items)]);
      await manager.query('INSERT INTO inventory_exchange_return(receipt_id,dispatch_receipt_id) VALUES($1,$2)',[input.receipt_id,input.dispatch_receipt_id]);
      for(const item of input.items){const balance=balances.find((v:any)=>v.variant_id===item.variant_id);await repo.restockStock(balance.id,item.quantity);await repo.insertMovement({inventoryId:balance.id,orderId:input.order_id,operationId:input.operation_id,deltaQuantity:item.quantity,deltaReserved:0,reason:'EXCHANGE_RETURN',actorUserId:input.actor_user_id,receiptId:input.receipt_id});}
      return {operation_id:input.operation_id,status:'APPLIED' as const};
    }));
  }

  /** One same-price replacement dispatch per inspected receipt; no stock effect on rejection. */
  async dispatchExchange(input:OperationInputs['DispatchExchangeItems']['body']):Promise<OperationOutputs['DispatchExchangeItems']> {
    const canonical={...input,items:[...input.items].sort((a,b)=>a.original_variant_id.localeCompare(b.original_variant_id))};
    return this.db.transaction(async manager=>once(manager,'M2.Inventory.exchange-dispatch',input.operation_id,canonical,async()=>{
      const repository=new InventoryRepository(manager);await repository.lockReservationOrders([input.order_id]);
      const [receipt]=await manager.query('SELECT id FROM inventory_return_receipt WHERE id=$1 AND order_id=$2',[input.receipt_id,input.order_id]);
      if(!receipt)throw new ApiError(409,'RETURN_RECEIPT_REQUIRED','Cần đối chiếu biên bản nhận hàng trước khi giao hàng đổi.');
      const hash=fingerprint({...canonical,operation_id:undefined});
      const [prior]=await manager.query('SELECT payload_hash,dispatch_snapshot FROM inventory_exchange_dispatch WHERE receipt_id=$1',[input.receipt_id]);
      if(prior){if(prior.payload_hash!==hash)throw new ApiError(409,'EXCHANGE_DISPATCH_CONFLICT','Biên bản đã có nội dung hàng đổi khác.');return {operation_id:input.operation_id,status:'ALREADY_APPLIED' as const,...(prior.dispatch_snapshot?{exchange_dispatch:prior.dispatch_snapshot}:{})};}
      // Committed operation/receipt replay must remain available during a writer rollback.
      // Keep this gate inside the transaction, before any new dispatch or stock effect.
      if(!exchangeDispatchWritesEnabled())throw new ApiError(503,'EXCHANGE_DISPATCH_PAUSED','Tạm dừng xác nhận bàn giao hàng đổi; giữ nguyên yêu cầu để tiếp tục đối chiếu.');
      const reservation=await repository.reservationByOrder(input.order_id);
      const consumed=reservation?(await repository.reservationItems([reservation.id])).filter(row=>row.status==='CONSUMED'):[];
      if(!consumed.length||input.items.length!==consumed.length||new Set(input.items.map(row=>row.original_variant_id)).size!==consumed.length)throw new ApiError(409,'EXCHANGE_ITEMS_MISMATCH','Chỉ đổi đủ các dòng của đơn, không đổi một phần.');
      const ids=[...new Set([...consumed.map(row=>row.variant_id),...input.items.map(row=>row.variant_id)])].sort();
      const variants=await manager.query(`SELECT v.id,v.product_id,v.store_id,v.price_vnd,v.status,v.sku,v.variant_values_json,p.title,p.status AS product_status,p.moderation_status FROM product_variant v JOIN product p ON p.id=v.product_id WHERE v.id=ANY($1::uuid[]) ORDER BY v.id FOR SHARE OF v,p`,[ids]);
      const balances=await manager.query('SELECT * FROM inventory WHERE variant_id=ANY($1::uuid[]) ORDER BY id FOR UPDATE',[ids]);
      const totals=new Map<string,number>();
      for(const item of input.items){
        const original=consumed.find(row=>row.variant_id===item.original_variant_id&&row.store_id===item.store_id);
        const from=variants.find((row:any)=>row.id===item.original_variant_id),to=variants.find((row:any)=>row.id===item.variant_id&&row.store_id===item.store_id);
        if(!original||original.quantity!==item.quantity||!to||to.product_id!==from?.product_id||BigInt(to.price_vnd)!==BigInt(item.unit_price_vnd)||to.status!=='ACTIVE'||to.product_status!=='ACTIVE'||to.moderation_status!=='VISIBLE')throw new ApiError(409,'EXCHANGE_VARIANT_UNAVAILABLE','Chỉ đổi phân loại cùng sản phẩm, cùng giá đã mua và đang bán. Có thể đề nghị hoàn tiền để khách xác nhận.');
        totals.set(item.variant_id,(totals.get(item.variant_id)??0)+item.quantity);
      }
      for(const [variant,quantity] of totals){const balance=balances.find((row:any)=>row.variant_id===variant);if(!balance||balance.quantity-balance.reserved_quantity<quantity)throw new ApiError(409,'EXCHANGE_OUT_OF_STOCK','Không đủ tồn khả dụng cho hàng đổi; không trừ tồn.');}
      const [clock]=await manager.query('SELECT now() AS dispatched_at');
      const exchange_dispatch={dispatched_at:new Date(clock.dispatched_at).toISOString(),items:canonical.items.map(item=>{
        const variant=variants.find((v:any)=>v.id===item.variant_id);
        return {original_variant_id:item.original_variant_id,variant_id:item.variant_id,product_id:variant.product_id,store_id:item.store_id,sku_snapshot:variant.sku,
          quantity:item.quantity,unit_price_vnd:item.unit_price_vnd,product_snapshot:{title:variant.title,variant_values:variant.variant_values_json}};
      })};
      await manager.query('INSERT INTO inventory_exchange_dispatch(receipt_id,operation_id,payload_hash,items_json,actor_user_id,dispatch_snapshot) VALUES($1,$2,$3,$4,$5,$6)',[input.receipt_id,input.operation_id,hash,JSON.stringify(canonical.items),input.actor_user_id,JSON.stringify(exchange_dispatch)]);
      for(const [variant,quantity] of totals){const balance=balances.find((row:any)=>row.variant_id===variant);await manager.query('UPDATE inventory SET quantity=quantity-$2,version=version+1 WHERE id=$1',[balance.id,quantity]);await repository.insertMovement({inventoryId:balance.id,orderId:input.order_id,operationId:input.operation_id,deltaQuantity:-quantity,deltaReserved:0,reason:'EXCHANGE_DISPATCH',actorUserId:input.actor_user_id,receiptId:input.receipt_id});}
      return {operation_id:input.operation_id,status:'APPLIED' as const,exchange_dispatch};
    }));
  }

  /**
   * Đối soát reservation quá hạn — **chỉ đọc**.
   *
   * BR-23: Order AWAITING_PAYMENT chỉ được expire/release tồn sau khi M2 đối soát rằng chưa có
   * Payment Attempt thành công. M1 không đọc DB M2, nên hàm này chỉ báo cáo các hold quá hạn còn
   * ACTIVE kèm số lượng đang giữ; việc giải phóng vẫn là lệnh `ReleaseReservation` tường minh của
   * M2. Nhờ vậy một Payment đến muộn không làm mất hàng đã giữ, và không có đường nào để M1 tự
   * quyết định tiền.
   */
  async overdueReservations(limit = 100): Promise<{ reservation_id: string; order_id: string;
    expires_at: string; reserved_quantity: number }[]> {
    const rows = await new InventoryRepository(this.db.manager)
      .overdueReservations(Math.min(Math.max(limit, 1), 100));
    return rows.map(row => ({ reservation_id: row.reservation_id, order_id: row.order_id,
      expires_at: isoTime(row.expires_at), reserved_quantity: row.reserved_quantity }));
  }
}

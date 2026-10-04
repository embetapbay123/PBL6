import { database } from '../../../shared/src/database';
import { ApiError } from '../../../shared/src/errors';
import {
  ResolveAiMetricsScopeRequestDto,
  ResolveAiMetricsScopeResponseDto,
  ResolveCheckoutContextRequestDto,
  ResolveCheckoutContextResponseDto,
} from './id-lookup.dto';

type Queryable = {
  query<T = any>(sql: string, parameters?: unknown[]): Promise<T[]>;
};

type AddressRow = ResolveCheckoutContextResponseDto['address_snapshot'];
type StoreRow = { id: string; shipping_fee_vnd: string | number; version: number };

export class IdLookupService {
  constructor(private readonly db: Queryable = database) {}

  async resolveCheckoutContext(
    input: ResolveCheckoutContextRequestDto,
  ): Promise<ResolveCheckoutContextResponseDto> {
    const [address] = await this.db.query<AddressRow>(
      `SELECT recipient_name,phone,line1,ward,district,city
       FROM address
       WHERE id=$1 AND customer_user_id=$2 AND status='ACTIVE'`,
      [input.addressId, input.customerId],
    );
    if (!address) {
      throw new ApiError(404, 'ADDRESS_NOT_FOUND', 'Không tìm thấy địa chỉ hoạt động của khách hàng.');
    }

    const stores = await this.db.query<StoreRow>(
      `SELECT id,shipping_fee_vnd,version
       FROM store
       WHERE id=ANY($1::uuid[]) AND status='ACTIVE'`,
      [input.storeIds],
    );
    const activeStoreIds = new Set(stores.map(store => store.id));
    const unavailableStoreIds = input.storeIds.filter(id => !activeStoreIds.has(id));
    if (unavailableStoreIds.length) {
      throw new ApiError(409, 'STORE_UNAVAILABLE', 'Một hoặc nhiều cửa hàng không còn hoạt động.', unavailableStoreIds);
    }

    const storesById = new Map(stores.map(store => [store.id, store]));
    return {
      address_snapshot: address,
      stores: input.storeIds.map(storeId => {
        const store = storesById.get(storeId)!;
        return {
          store_id: store.id,
          shipping_fee_vnd: String(store.shipping_fee_vnd),
          version: store.version,
        };
      }),
    };
  }

  async resolveAiMetricsScope(
    input: ResolveAiMetricsScopeRequestDto,
  ): Promise<ResolveAiMetricsScopeResponseDto> {
    const [admin] = await this.db.query(
      `SELECT 1
       FROM user_role ur
       JOIN role r ON r.id=ur.role_id
       WHERE ur.user_id=$1 AND r.scope='PLATFORM' AND r.status='ACTIVE'`,
      [input.userId],
    );
    if (admin) {
      return input.requestedStoreId
        ? { is_platform_scope: true, store_ids: [input.requestedStoreId] }
        : { is_platform_scope: true };
    }

    if (input.requestedStoreId) {
      const [membership] = await this.db.query(
        `SELECT 1
         FROM store_membership
         WHERE user_id=$1 AND store_id=$2 AND status='ACTIVE'`,
        [input.userId, input.requestedStoreId],
      );
      if (!membership) {
        throw new ApiError(403, 'STORE_METRICS_FORBIDDEN', 'Bạn không có quyền xem metrics của cửa hàng này.');
      }
      return { is_platform_scope: false, store_ids: [input.requestedStoreId] };
    }

    const memberships = await this.db.query<{ store_id: string }>(
      `SELECT store_id
       FROM store_membership
       WHERE user_id=$1 AND status='ACTIVE'
       ORDER BY store_id`,
      [input.userId],
    );
    return { is_platform_scope: false, store_ids: memberships.map(row => row.store_id) };
  }
}

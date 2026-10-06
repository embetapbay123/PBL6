import { database } from '../../../shared/src/database';
import { ApiError } from '../../../shared/src/errors';
import { moneyNumber } from '../../../shared/src/money';
import type { OperationInputs, OperationOutputs } from '../../../shared/src/operations.generated';
import { AuthService } from './auth.service';

type Queryable = { query(sql: string, parameters?: unknown[]): Promise<any[]> };
type Context = { user_id: string; roles: string[]; token_version: number };
type Resolver = { resolve(token: string): Promise<Context> };

export class IdLookupService {
  constructor(private readonly db: Queryable = database, private readonly auth: Resolver = new AuthService()) {}

  async resolveCheckoutContext(input: OperationInputs['ResolveCheckoutContext']['body']): Promise<OperationOutputs['ResolveCheckoutContext']> {
    const context = await this.auth.resolve(input.token);
    if (!context.roles.includes('CUSTOMER')) throw new ApiError(403, 'FORBIDDEN', 'Checkout yêu cầu quyền Customer.');
    const [address] = await this.db.query(
      `SELECT id,recipient_name,phone,line1,ward,district,city,is_default
       FROM address WHERE id=$1 AND customer_user_id=$2 AND status='ACTIVE'`,
      [input.address_id, context.user_id],
    );
    if (!address) throw new ApiError(404, 'ADDRESS_NOT_FOUND', 'Không tìm thấy địa chỉ hoạt động của khách hàng.');
    const stores = await this.db.query(
      `SELECT id,name,shipping_fee_vnd,version FROM store WHERE id=ANY($1::uuid[]) AND status='ACTIVE'`,
      [input.store_ids],
    );
    const byId = new Map(stores.map(row => [row.id, row]));
    const missing = input.store_ids.filter(id => !byId.has(id));
    if (missing.length) throw new ApiError(409, 'STORE_UNAVAILABLE', 'Một hoặc nhiều cửa hàng không còn hoạt động.', missing);
    return {
      customer_user_id: context.user_id,
      address_snapshot: address,
      stores: input.store_ids.map(id => {
        const store = byId.get(id)!;
        return { id: store.id, name: store.name, shipping_fee_vnd: moneyNumber(store.shipping_fee_vnd), version: store.version };
      }),
    };
  }

  async resolveAiMetricsScope(input: OperationInputs['ResolveAiMetricsScope']['body']): Promise<OperationOutputs['ResolveAiMetricsScope']> {
    const context = await this.auth.resolve(input.token);
    if (context.roles.includes('ADMIN')) {
      if (input.store_id) {
        const [store] = await this.db.query("SELECT id FROM store WHERE id=$1 AND status='ACTIVE'", [input.store_id]);
        if (!store) throw new ApiError(404, 'STORE_NOT_FOUND', 'Không tìm thấy Store hoạt động.');
        return { user_id: context.user_id, scope: 'STORE', store_id: input.store_id, token_version: context.token_version };
      }
      return { user_id: context.user_id, scope: 'PLATFORM', token_version: context.token_version };
    }
    const memberships = await this.db.query(
      `SELECT m.store_id FROM store_membership m JOIN store s ON s.id=m.store_id AND s.status='ACTIVE'
       WHERE m.user_id=$1 AND m.status='ACTIVE' AND m.role='OWNER'
       AND ($2::uuid IS NULL OR m.store_id=$2) ORDER BY m.store_id LIMIT 2`,
      [context.user_id, input.store_id ?? null],
    );
    if (!memberships.length) throw new ApiError(403, 'STORE_METRICS_FORBIDDEN', 'Metrics yêu cầu membership Owner hoạt động.');
    if (memberships.length > 1) throw new ApiError(422, 'STORE_SCOPE_REQUIRED', 'Cần chọn Store cho metrics.');
    return { user_id: context.user_id, scope: 'STORE', store_id: memberships[0].store_id, token_version: context.token_version };
  }
}

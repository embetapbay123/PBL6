import type {DataSource} from 'typeorm';
import {searchPattern} from '../../../shared/src/search';
import { database } from '../../../shared/src/database';
import { ApiError } from '../../../shared/src/errors';
import { audit } from '../../../shared/src/audit';
import { emitEvent } from '../../../shared/src/events';
import { randomUUID } from 'node:crypto';
import { returnedRow } from '../../../shared/src/postgres-returning';
import type {OperationOutputs} from '../../../shared/src/operations.generated';

/** Exact batched identity lookup uses the existing authorized directory and its pagination. */
function identityIds(value?:string):string[]|undefined {
  if(value===undefined)return undefined;
  if(typeof value!=='string')throw new ApiError(422,'INVALID_IDENTITY_IDS','Danh sách mã không hợp lệ.');
  const ids=value.split(',');
  if(!ids.length||ids.length>100||ids.some(id=>!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)))throw new ApiError(422,'INVALID_IDENTITY_IDS','Chỉ đọc tối đa100 mã UUID mỗi lần.');
  return [...new Set(ids)];
}

export class AdministrationRepository {
  constructor(private readonly source:DataSource=database) {}
  async listUsers(page = 1, size = 20, q?:string, status?:string, ids?:string):Promise<OperationOutputs['listUsers']> {
    page=Math.max(1,Math.trunc(page));size=Math.min(100,Math.max(1,Math.trunc(size)));
    const args:unknown[]=[],conditions:string[]=[];
    const selected=identityIds(ids);if(selected){args.push(selected);conditions.push(`u.id=ANY($${args.length}::uuid[])`);}
    if(q?.trim()){args.push(searchPattern(q));conditions.push(`marketplace_search(concat_ws(' ',u.email,u.id::text,p.display_name)) LIKE $${args.length}`);}
    if(status){args.push(status);conditions.push(`u.status=$${args.length}`);}
    const from=` FROM "user" u LEFT JOIN customer_profile p ON p.user_id=u.id`+(conditions.length?' WHERE '+conditions.join(' AND '):'');
    const [count]=await this.source.query('SELECT count(*)::int AS total'+from,args);
    const rows=await this.source.query('SELECT u.id,u.email,u.status,u.version,p.display_name'+from+` ORDER BY u.created_at DESC,u.id LIMIT $${args.length+1} OFFSET $${args.length+2}`,[...args,size,(page-1)*size]);
    return {items:rows.map((row:any)=>({id:row.id,email:row.email,status:row.status,version:row.version,...(row.display_name?{display_name:row.display_name}:{})})),total:count.total,page,size};
  }

  async updateUserState(id: string, status: string, reason: string, expectedVersion: number, actorUserId: string, correlationId: string) {
    if(!['ACTIVE','LOCKED'].includes(status)||!reason?.trim())throw new ApiError(422,'INVALID_STATE_DECISION','Cần trạng thái hợp lệ và lý do cụ thể.');
    reason=reason.trim();
    return this.source.transaction(async manager => {
      const [user] = await manager.query('SELECT * FROM "user" WHERE id=$1 FOR UPDATE', [id]);
      if (!user) throw new ApiError(404, 'NOT_FOUND', 'Người dùng không tồn tại.');
      if (user.version !== expectedVersion) {
        throw new ApiError(409, 'VERSION_CONFLICT', 'Phiên bản không khớp.');
      }
      const newVersion = user.version + 1;
      const updated = returnedRow<any>(await manager.query(
        'UPDATE "user" SET status=$1, version=$2 WHERE id=$3 RETURNING id, email, status, version',
        [status, newVersion, id]
      ));
      if (!updated) throw new Error('User state update returned no row');

      if (status !== 'ACTIVE') {
        await manager.query(
          'UPDATE refresh_session SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL',
          [id]
        );
      }

      await audit(
        manager,
        'M3',
        actorUserId,
        'User',
        id,
        'USER_STATE_UPDATED',
        correlationId,
        { status: user.status, version: user.version },
        { status: updated.status, version: updated.version, reason }
      );

      if (updated.status !== 'ACTIVE') await emitEvent(
        manager,
        'UserLocked',
        {
          user_id: updated.id,
          version: updated.version,
        },
        correlationId || randomUUID()
      );

      return updated;
    });
  }

  async listStores(page = 1, size = 20, q?:string, status?:string, ids?:string):Promise<OperationOutputs['listStores']> {
    page=Math.max(1,Math.trunc(page));size=Math.min(100,Math.max(1,Math.trunc(size)));
    const args:unknown[]=[],conditions:string[]=[];
    const selected=identityIds(ids);if(selected){args.push(selected);conditions.push(`s.id=ANY($${args.length}::uuid[])`);}
    if(q?.trim()){args.push(searchPattern(q));conditions.push(`marketplace_search(concat_ws(' ',s.name,s.slug,s.id::text,m.user_id::text,u.email,p.display_name)) LIKE $${args.length}`);}
    if(status){args.push(status);conditions.push(`s.status=$${args.length}`);}
    const from=` FROM store s LEFT JOIN store_membership m ON m.store_id=s.id AND m.role='OWNER' AND m.status='ACTIVE' LEFT JOIN "user" u ON u.id=m.user_id LEFT JOIN customer_profile p ON p.user_id=u.id`+(conditions.length?' WHERE '+conditions.join(' AND '):'');
    const [count]=await this.source.query('SELECT count(*)::int AS total'+from,args);
    const rows=await this.source.query('SELECT s.id,s.name,s.status,s.shipping_fee_vnd,s.version,m.user_id AS owner_user_id,u.email AS owner_email,p.display_name AS owner_display_name'+from+` ORDER BY s.id LIMIT $${args.length+1} OFFSET $${args.length+2}`,[...args,size,(page-1)*size]);
    return {items:rows.map((row:any)=>({id:row.id,name:row.name,status:row.status,shipping_fee_vnd:Number(row.shipping_fee_vnd),version:row.version,...(row.owner_user_id?{owner_user_id:row.owner_user_id}:{}),...(row.owner_email?{owner_email:row.owner_email}:{}),...(row.owner_display_name?{owner_display_name:row.owner_display_name}:{})})),total:count.total,page,size};
  }

  async listRoles() {
    const [roles, permissions] = await Promise.all([
      this.source.query(
        `SELECT r.id,r.code AS name,r.version,
          COALESCE(array_agg(rp.permission_id ORDER BY rp.permission_id) FILTER (WHERE rp.permission_id IS NOT NULL), ARRAY[]::uuid[]) AS permission_ids
         FROM role r LEFT JOIN role_permission rp ON rp.role_id=r.id
         GROUP BY r.id ORDER BY r.code`),
      this.source.query('SELECT id,code,resource,action FROM permission ORDER BY resource,action,code'),
    ]);
    return { roles, permissions };
  }

  async updateStoreState(id: string, status: string, reason: string, expectedVersion: number, actorUserId: string, correlationId: string) {
    if(!['ACTIVE','LOCKED'].includes(status)||!reason?.trim())throw new ApiError(422,'INVALID_STATE_DECISION','Cần trạng thái hợp lệ và lý do cụ thể.');
    reason=reason.trim();
    return this.source.transaction(async manager => {
      const [store] = await manager.query('SELECT * FROM store WHERE id=$1 FOR UPDATE', [id]);
      if (!store) throw new ApiError(404, 'NOT_FOUND', 'Cửa hàng không tồn tại.');
      if (store.version !== expectedVersion) {
        throw new ApiError(409, 'VERSION_CONFLICT', 'Phiên bản không khớp.');
      }
      const newVersion = store.version + 1;
      const updated = returnedRow<any>(await manager.query(
        'UPDATE store SET status=$1, version=$2 WHERE id=$3 RETURNING *',
        [status, newVersion, id]
      ));
      if (!updated) throw new Error('Store state update returned no row');
      const [ownerRow] = await manager.query(
        "SELECT user_id FROM store_membership WHERE store_id=$1 AND role='OWNER' AND status='ACTIVE' LIMIT 1",
        [id]
      );

      await audit(
        manager,
        'M3',
        actorUserId,
        'Store',
        id,
        'STORE_STATE_UPDATED',
        correlationId,
        { status: store.status, version: store.version },
        { status: updated.status, version: updated.version, reason }
      );

      await emitEvent(
        manager,
        'StoreStatusChanged',
        {
          store_id: id,
          status: updated.status,
          version: updated.version,
        },
        correlationId || randomUUID()
      );

      return {
        id: updated.id,
        ...(ownerRow?.user_id?{owner_user_id:ownerRow.user_id}:{}),
        name: updated.name,
        status: updated.status,
        shipping_fee_vnd: Number(updated.shipping_fee_vnd),
        version: updated.version,
      };
    });
  }

  async updateRole(id: string, permissionIds: string[], expectedVersion: number, actorUserId: string, correlationId: string) {
    return this.source.transaction(async manager => {
      const [role] = await manager.query('SELECT * FROM role WHERE id=$1 FOR UPDATE', [id]);
      if (!role) throw new ApiError(404, 'NOT_FOUND', 'Vai trò không tồn tại.');
      if (role.version !== expectedVersion) throw new ApiError(409, 'VERSION_CONFLICT', 'Phiên bản không khớp.');

      const existing = await manager.query(
        'SELECT permission_id FROM role_permission WHERE role_id=$1',
        [id]
      );
      const oldPermissionIds = existing.map((r: any) => r.permission_id);

      const uniquePermissionIds = [...new Set(permissionIds)];
      const allowed = uniquePermissionIds.length ? await manager.query(
        'SELECT id,code FROM permission WHERE id = ANY($1::uuid[])',
        [uniquePermissionIds],
      ) : [];
      if (allowed.length !== uniquePermissionIds.length) {
        throw new ApiError(422, 'VALIDATION_FAILED', 'Một hoặc nhiều quyền không tồn tại.');
      }
      const includesPlatformAdmin = allowed.some((permission: any) => permission.code === 'platform.admin');
      if (includesPlatformAdmin && role.code !== 'ADMIN') {
        throw new ApiError(422, 'VALIDATION_FAILED', 'platform.admin may be assigned only to the ADMIN role.');
      }
      await manager.query('DELETE FROM role_permission WHERE role_id=$1', [id]);
      for (const pid of uniquePermissionIds) {
        await manager.query(
          'INSERT INTO role_permission(role_id, permission_id) VALUES($1, $2) ON CONFLICT DO NOTHING',
          [id, pid]
        );
      }
      const newVersion = role.version + 1;
      await manager.query('UPDATE role SET version=$1 WHERE id=$2', [newVersion, id]);

      await audit(
        manager,
        'M3',
        actorUserId,
        'Role',
        id,
        'ROLE_PERMISSIONS_UPDATED',
        correlationId,
        { permission_ids: oldPermissionIds, version: expectedVersion },
        { permission_ids: uniquePermissionIds, version: newVersion }
      );

      return {
        id: role.id,
        name: role.code,
        permission_ids: uniquePermissionIds,
        version: newVersion,
      };
    });
  }
}

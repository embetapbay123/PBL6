import type {DataSource} from 'typeorm';
import {searchPattern} from '../../../shared/src/search';
import { database } from '../../../shared/src/database';
import { ApiError } from '../../../shared/src/errors';
import { audit } from '../../../shared/src/audit';
import { randomUUID } from 'node:crypto';
import { returnedRow } from '../../../shared/src/postgres-returning';
import { moneyNumber } from '../../../shared/src/money';

interface StoreApplicationRow {
  id: string;
  proposed_name: string;
  contact: string;
  status: string;
  decision_reason: string | null;
  version: number;
}

interface StoreUpdateRow {
  logo_url?: string | null;
  return_address?: Record<string,string> | null;
  id: string;
  name: string;
  description: string | null;
  shipping_fee_vnd: string | number;
  status: string;
  version: number;
}

export class StoreRepository {
  constructor(private readonly source:DataSource=database){}
  async getPublicStore(id:string){
    const [row]=await this.source.manager.query("SELECT id,name,description,shipping_fee_vnd FROM store WHERE id=$1 AND status='ACTIVE'",[id]);
    if(!row)throw new ApiError(404,'NOT_FOUND','Không tìm thấy gian hàng đang hoạt động.');
    return {id:row.id,name:row.name,...(row.description==null?{}:{description:row.description}),shipping_fee_vnd:moneyNumber(row.shipping_fee_vnd)};
  }
  async submitStoreApplication(
    userId: string,
    input: { proposed_name: string; contact: string },
    correlationId: string
  ) {
    try {
      return await this.source.transaction(async manager => {
        // Lock a stable row even when no pending application exists yet.
        await manager.query('SELECT id FROM "user" WHERE id=$1 FOR UPDATE', [userId]);
        const pending = await manager.query(
          `SELECT id FROM store_application
           WHERE applicant_user_id=$1 AND status='PENDING'
           LIMIT 1 FOR UPDATE`,
          [userId]
        );
        if (pending.length) {
          throw new ApiError(409, 'DUPLICATE_APPLICATION', 'Người dùng đã có đơn đăng ký đang chờ duyệt.');
        }

        const application = returnedRow<StoreApplicationRow>(await manager.query(
          `INSERT INTO store_application
             (id, applicant_user_id, proposed_name, contact, status, submitted_at, version)
           VALUES ($1,$2,$3,$4,'PENDING',now(),0)
           RETURNING id, proposed_name, contact, status, decision_reason, version`,
          [randomUUID(), userId, input.proposed_name, input.contact]
        ));
        if (!application) throw new Error('Store application insert returned no row');
        await audit(manager, 'M3', userId, 'StoreApplication', application.id, 'STORE_APPLICATION_SUBMITTED',
          correlationId, null, application);
        return application;
      });
    } catch (error) {
      const driverError = (error as { driverError?: { code?: string; constraint?: string } })?.driverError ?? error as { code?: string; constraint?: string };
      if (driverError?.code === '23505' && driverError.constraint === 'store_application_one_pending_per_applicant') {
        throw new ApiError(409, 'DUPLICATE_APPLICATION', 'Người dùng đã có đơn đăng ký đang chờ duyệt.');
      }
      throw error;
    }
  }

  async listStoreApplications(userId:string|null,page=1,size=20,status?:string,q?:string){
    page=Math.max(1,Math.trunc(page));size=Math.min(100,Math.max(1,Math.trunc(size)));
    const parameters:unknown[]=[],conditions:string[]=[];
    if(userId){parameters.push(userId);conditions.push('a.applicant_user_id=$'+parameters.length);}
    if(q?.trim()){parameters.push(searchPattern(q));const n=parameters.length;conditions.push(`(marketplace_search(a.proposed_name) LIKE $${n} OR marketplace_search(a.contact) LIKE $${n} OR a.id::text LIKE $${n} OR marketplace_search(u.email) LIKE $${n} OR marketplace_search(p.display_name) LIKE $${n})`);}
    const from=' FROM store_application a JOIN "user" u ON u.id=a.applicant_user_id LEFT JOIN customer_profile p ON p.user_id=u.id';
    const scope=conditions.length?' WHERE '+conditions.join(' AND '):'';
    const [counts]=await this.source.query("SELECT count(*)::int AS total,count(*) FILTER(WHERE a.status='PENDING')::int AS pending,count(*) FILTER(WHERE a.status='APPROVED')::int AS approved,count(*) FILTER(WHERE a.status='REJECTED')::int AS rejected"+from+scope,parameters);
    const status_counts={ALL:counts?.total??0,PENDING:counts?.pending??0,APPROVED:counts?.approved??0,REJECTED:counts?.rejected??0};
    if(status){parameters.push(status);conditions.push('a.status=$'+parameters.length);}
    const where=conditions.length?' WHERE '+conditions.join(' AND '):'';
    const items=await this.source.query(`SELECT a.id,a.proposed_name,a.contact,a.status,a.decision_reason,a.version,a.applicant_user_id,u.email AS applicant_email,u.status AS applicant_status,p.display_name AS applicant_display_name`+from+where+` ORDER BY a.submitted_at DESC,a.id LIMIT $${parameters.length+1} OFFSET $${parameters.length+2}`,[...parameters,size,(page-1)*size]);
    // Old profiles can be absent; never fabricate a name or return null into optional string fields.
    for(const row of items)if(row.applicant_display_name==null)delete row.applicant_display_name;
    return {items,total:status?status_counts[status as keyof typeof status_counts]??0:status_counts.ALL,page,size,status_counts};
  }

  async reviewStoreApplication(
    id: string,
    input: { status: 'APPROVED' | 'REJECTED'; decision_reason?: string; expected_version: number },
    adminUserId: string,
    correlationId: string
  ) {
    if (input.status === 'REJECTED' && !input.decision_reason?.trim()) {
      throw new ApiError(422, 'VALIDATION_FAILED', 'decision_reason là bắt buộc khi từ chối.');
    }

    return this.source.transaction(async manager => {
      // Lock order is user -> application -> membership/store for submissions and reviews.
      const [candidate] = await manager.query('SELECT applicant_user_id FROM store_application WHERE id=$1', [id]);
      if (!candidate) throw new ApiError(404, 'NOT_FOUND', 'Đơn đăng ký Store không tồn tại.');
      await manager.query('SELECT id FROM "user" WHERE id=$1 FOR UPDATE', [candidate.applicant_user_id]);
      const [application] = await manager.query('SELECT * FROM store_application WHERE id=$1 FOR UPDATE', [id]);
      if (!application) throw new ApiError(404, 'NOT_FOUND', 'Đơn đăng ký Store không tồn tại.');
      if (application.version !== input.expected_version) {
        throw new ApiError(409, 'VERSION_CONFLICT', 'Phiên bản không khớp.');
      }
      if (application.status !== 'PENDING') {
        throw new ApiError(409, 'INVALID_STATE_TRANSITION', 'Chỉ đơn PENDING mới được duyệt.');
      }

      if (input.status === 'APPROVED') {
        const activeMembership = await manager.query(
          `SELECT id FROM store_membership
           WHERE user_id=$1 AND status='ACTIVE'
           LIMIT 1 FOR UPDATE`,
          [application.applicant_user_id]
        );
        if (activeMembership.length) {
          throw new ApiError(409, 'ACTIVE_MEMBERSHIP_EXISTS', 'Người dùng đã có Store đang hoạt động.');
        }
      }

      const version = application.version + 1;
      const updated = returnedRow<StoreApplicationRow>(await manager.query(
        `UPDATE store_application
         SET status=$1, decision_reason=$2, decided_by_user_id=$3, decided_at=now(), version=$4
         WHERE id=$5
         RETURNING id, proposed_name, contact, status, decision_reason, version`,
        [input.status, input.decision_reason ?? null, adminUserId, version, id]
      ));
      if (!updated) throw new Error('Store application update returned no row');

      if (input.status === 'APPROVED') {
        const storeId = randomUUID();
        const slugBase = application.proposed_name.normalize('NFKD')
          .replace(/[\u0300-\u036f]/g, '').toLowerCase()
          .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 180) || 'store';
        const slug = `${slugBase}-${storeId.slice(0, 8)}`;
        await manager.query(
          `INSERT INTO store
             (id, application_id, name, slug, description, contact, shipping_fee_vnd, status, version)
           VALUES ($1,$2,$3,$4,NULL,$5,0,'ACTIVE',0)
           RETURNING id`,
          [storeId, id, application.proposed_name, slug, application.contact]
        );
        await manager.query(
          `INSERT INTO store_membership (id, store_id, user_id, role, status, joined_at, version)
           VALUES ($1,$2,$3,'OWNER','ACTIVE',now(),0)`,
          [randomUUID(), storeId, application.applicant_user_id]
        );
      }

      await audit(manager, 'M3', adminUserId, 'StoreApplication', id, 'STORE_APPLICATION_REVIEWED',
        correlationId,
        { id: application.id, applicant_user_id: application.applicant_user_id,
          proposed_name: application.proposed_name, contact: application.contact,
          status: application.status, decision_reason: application.decision_reason,
          version: application.version },
        updated);
      return updated;
    });
  }

  async listActiveStoreIds(query:{size?:number;after?:string}={}) {
    if(query.size===undefined&&query.after===undefined){
      // Reader-first deployment: old callers still receive the complete allowlist.
      const rows=await this.source.query(`SELECT id FROM store WHERE status='ACTIVE' ORDER BY id`);
      return {ids:rows.map((row:{id:string})=>row.id)};
    }
    const size=query.size??100;
    const rows=await this.source.query(`SELECT id FROM store WHERE status='ACTIVE' AND ($1::uuid IS NULL OR id>$1) ORDER BY id LIMIT $2`,[query.after??null,size+1]);
    const ids=rows.slice(0,size).map((row:{id:string})=>row.id);
    return {ids,next_after:rows.length>size?ids[ids.length-1]:null};
  }

  async getOwnStore(userId: string) {
    const [row] = await this.source.query(
      `SELECT s.id, owner.user_id AS owner_user_id, s.name, s.status, s.shipping_fee_vnd, s.version, s.return_address, s.logo_url
       FROM store s
       JOIN store_membership m ON m.store_id=s.id AND m.user_id=$1 AND m.status='ACTIVE'
       JOIN store_membership owner ON owner.store_id=s.id AND owner.role='OWNER' AND owner.status='ACTIVE'
       WHERE s.status='ACTIVE' AND m.role IN ('OWNER','SELLER')
       ORDER BY m.joined_at DESC, m.id
       LIMIT 1`,
      [userId]
    );
    if (!row) {
      throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy cửa hàng hoạt động của người dùng.');
    }
    return {
      id: row.id,
      owner_user_id: row.owner_user_id,
      name: row.name,
      status: row.status,
      ...(row.logo_url ? {logo_url:row.logo_url} : {}),
      ...(row.return_address ? {return_address:row.return_address} : {}),
      shipping_fee_vnd: Number(row.shipping_fee_vnd),
      version: row.version,
    };
  }

  async updateOwnStore(
    userId: string,
    input: { name?: string; description?: string; shipping_fee_vnd?: number; return_address?: Record<string,string>; logo_url?: string; expected_version: number },
    correlationId: string
  ) {
    return this.source.transaction(async manager => {
      const [store] = await manager.query(
        `SELECT s.* FROM store s
         JOIN store_membership m ON m.store_id=s.id AND m.user_id=$1 AND m.role='OWNER' AND m.status='ACTIVE'
         WHERE m.user_id=$1 AND s.status='ACTIVE'
         FOR UPDATE`,
        [userId]
      );
      if (!store) {
        throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy cửa hàng để cập nhật.');
      }
      if (store.version !== input.expected_version) {
        throw new ApiError(409, 'VERSION_CONFLICT', 'Phiên bản không khớp.');
      }

      const name = input.name !== undefined ? input.name : store.name;
      const description = input.description !== undefined ? input.description : store.description;
      const shippingFee = input.shipping_fee_vnd !== undefined ? input.shipping_fee_vnd : store.shipping_fee_vnd;
      const returnAddress=input.return_address ?? store.return_address;
      let logoUrl=store.logo_url;
      if(input.logo_url !== undefined){
        const value=input.logo_url.trim();
        if(value){try{const url=new URL(value);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw new Error('invalid');}catch{throw new ApiError(422,'STORE_LOGO_INVALID','Địa chỉ ảnh phải là URL HTTP hoặc HTTPS hợp lệ.');}}
        logoUrl=value || null;
      }
      if(input.return_address && ['recipient_name','phone','line1','ward','district','city'].some(key=>!input.return_address![key]?.trim()))throw new ApiError(422,'RETURN_ADDRESS_REQUIRED','Cần đầy đủ thông tin địa chỉ nhận trả.');
      const newVersion = store.version + 1;

      const updated = returnedRow<StoreUpdateRow>(await manager.query(
        `UPDATE store SET name=$1, description=$2, shipping_fee_vnd=$3, version=$4,return_address=$6,logo_url=$7 WHERE id=$5 RETURNING *`,
        [name, description, shippingFee, newVersion, store.id, returnAddress ?? null, logoUrl]
      ));
      if (!updated) throw new Error('Store update returned no row');

      await audit(
        manager,
        'M3',
        userId,
        'Store',
        store.id,
        'STORE_UPDATED',
        correlationId,
        { id: store.id, name: store.name, description: store.description,
          shipping_fee_vnd: Number(store.shipping_fee_vnd), status: store.status, version: store.version },
        { id: updated.id, name: updated.name, description: updated.description,
          ...(updated.return_address ? {return_address:updated.return_address} : {}),
        shipping_fee_vnd: Number(updated.shipping_fee_vnd), status: updated.status, version: updated.version, logo_changed:store.logo_url!==updated.logo_url, return_address_changed:JSON.stringify(store.return_address ?? null)!==JSON.stringify(updated.return_address ?? null) }
      );

      return {
        id: updated.id,
        owner_user_id: userId,
        name: updated.name,
        status: updated.status,
        ...(updated.logo_url ? {logo_url:updated.logo_url} : {}),
        ...(updated.return_address ? {return_address:updated.return_address} : {}),
        shipping_fee_vnd: Number(updated.shipping_fee_vnd),
        version: updated.version,
      };
    });
  }
}

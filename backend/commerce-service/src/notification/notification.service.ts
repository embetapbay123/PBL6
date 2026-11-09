import type {DataSource} from 'typeorm';
import { database } from '../../../shared/src/database';
import { ApiError } from '../../../shared/src/errors';

const changes=`SELECT 'ORDER_STATUS'::text AS kind,h.id AS event_id,h.order_id,h.to_status AS status,h.created_at AS occurred_at
  FROM order_status_history h JOIN "order" o ON o.id=h.order_id WHERE o.customer_user_id=$1
  UNION ALL SELECT 'PAYMENT_EVENT'::text AS kind,e.id AS event_id,p.order_id,e.event_type AS status,e.received_at AS occurred_at
  FROM payment_event e LEFT JOIN payment_attempt a ON a.id=e.attempt_id JOIN payment p ON p.id=coalesce(e.payment_id,a.payment_id) JOIN "order" o ON o.id=p.order_id WHERE o.customer_user_id=$1
  UNION ALL SELECT 'RETURN_STATUS'::text AS kind,h.id AS event_id,r.order_id,h.to_status AS status,h.created_at AS occurred_at
  FROM return_status_history h JOIN order_return_request r ON r.id=h.request_id JOIN "order" o ON o.id=r.order_id WHERE o.customer_user_id=$1`;
const readJoin='LEFT JOIN customer_notification_read r ON r.customer_user_id=$1 AND r.kind=n.kind AND r.event_id=n.event_id';

/** Notifications project immutable, owned order/payment events; they do not infer payment success. */
export class NotificationService {
  constructor(private readonly source:Pick<DataSource,'manager'>=database){}

  async list(userId:string,page=1,size=20){
    const [counts]=await this.source.manager.query(
      `WITH changes AS (${changes}),
       with_read AS (
         SELECT n.*, (r.read_at IS NOT NULL) AS read
         FROM changes n ${readJoin}
       ),
       groups AS (
         SELECT DISTINCT kind, order_id FROM changes
       )
       SELECT
         (SELECT count(*)::int FROM groups) AS total,
         (SELECT count(*)::int FROM with_read WHERE NOT read) AS unread`,
      [userId]
    );

    const rows=await this.source.manager.query(
      `WITH changes AS (${changes}),
       with_read AS (
         SELECT n.*, (r.read_at IS NOT NULL) AS read
         FROM changes n ${readJoin}
       ),
       groups AS (
         SELECT kind, order_id, count(*)::int AS update_count, count(*) FILTER (WHERE NOT read)::int AS unread_count, max(occurred_at) AS latest_occurred_at
         FROM with_read
         GROUP BY kind, order_id
       ),
       ranked AS (
         SELECT w.*, g.update_count, g.unread_count, g.latest_occurred_at,
                (to_json(w.occurred_at AT TIME ZONE 'UTC') #>> '{}') || 'Z' AS created_at_iso,
                row_number() OVER (PARTITION BY w.kind, w.order_id ORDER BY w.occurred_at DESC, w.event_id) AS rn
         FROM with_read w
         JOIN groups g ON g.kind=w.kind AND g.order_id=w.order_id
       )
       SELECT * FROM ranked WHERE rn=1 ORDER BY latest_occurred_at DESC, kind, order_id LIMIT $2 OFFSET $3`,
      [userId,size,(page-1)*size]
    );

    return {
      items:rows.map((row:any)=>({
        id:row.kind+':'+row.event_id,
        kind:row.kind,
        order_id:row.order_id,
        event_status:row.status,
        created_at:row.created_at_iso ?? (row.occurred_at instanceof Date ? row.occurred_at.toISOString() : String(row.occurred_at)),
        read:row.read,
        update_count:row.update_count,
        unread_count:row.unread_count,
      })),
      total:counts?.total ?? 0,
      unread:counts?.unread ?? 0,
      page,
      size
    };
  }

  async listGroupHistory(userId:string,kind:string,orderId:string,page=1,size=20,excludePrimary=false,upTo?:string){
    const [ownership]=await this.source.manager.query(
      'SELECT id FROM "order" WHERE id=$1 AND customer_user_id=$2',
      [orderId,userId]
    );
    if(!ownership)throw new ApiError(404,'NOT_FOUND','Không tìm thấy đơn hàng của bạn.');

    let filterSql = '';
    const baseParams: unknown[] = [userId, kind, orderId];
    if(upTo){
      if(typeof upTo !== 'string' || Number.isNaN(Date.parse(upTo))){
        throw new ApiError(422,'VALIDATION_FAILED','Mốc thời gian không hợp lệ.');
      }
      baseParams.push(upTo);
      filterSql += ` AND n.occurred_at <= $${baseParams.length}::timestamptz`;
    }

    const [counts]=await this.source.manager.query(
      `WITH changes AS (${changes}),
       filtered AS (
         SELECT n.*, (r.read_at IS NOT NULL) AS read,
                row_number() OVER (ORDER BY n.occurred_at DESC, n.event_id) AS rn
         FROM changes n ${readJoin}
         WHERE n.kind=$2 AND n.order_id=$3 ${filterSql}
       )
       SELECT
         count(*)::int AS total,
         count(*) FILTER (WHERE NOT read)::int AS unread
       FROM filtered
       WHERE ($${baseParams.length + 1}::boolean IS NOT TRUE OR rn > 1)`,
      [...baseParams, excludePrimary]
    );

    const rows=await this.source.manager.query(
      `WITH changes AS (${changes}),
       filtered AS (
         SELECT n.*, (r.read_at IS NOT NULL) AS read,
                (to_json(n.occurred_at AT TIME ZONE 'UTC') #>> '{}') || 'Z' AS created_at_iso,
                row_number() OVER (ORDER BY n.occurred_at DESC, n.event_id) AS rn
         FROM changes n ${readJoin}
         WHERE n.kind=$2 AND n.order_id=$3 ${filterSql}
       )
       SELECT * FROM filtered
       WHERE ($${baseParams.length + 1}::boolean IS NOT TRUE OR rn > 1)
       ORDER BY occurred_at DESC, event_id
       LIMIT $${baseParams.length + 2} OFFSET $${baseParams.length + 3}`,
      [...baseParams, excludePrimary, size, (page-1)*size]
    );

    return {
      items:rows.map((row:any)=>({
        id:row.kind+':'+row.event_id,
        kind:row.kind,
        order_id:row.order_id,
        event_status:row.status,
        created_at:row.created_at_iso ?? (row.occurred_at instanceof Date ? row.occurred_at.toISOString() : String(row.occurred_at)),
        read:row.read,
        update_count:1,
        unread_count:row.read?0:1,
      })),
      total:counts?.total ?? 0,
      unread:counts?.unread ?? 0,
      page,
      size
    };
  }

  async markGroupRead(userId:string,kind:string,orderId:string,upTo?:string){
    const [ownership]=await this.source.manager.query(
      'SELECT id FROM "order" WHERE id=$1 AND customer_user_id=$2',
      [orderId,userId]
    );
    if(!ownership)throw new ApiError(404,'NOT_FOUND','Không tìm thấy đơn hàng của bạn.');

    let sql=`WITH changes AS (${changes})
      INSERT INTO customer_notification_read(customer_user_id,kind,event_id)
      SELECT $1, kind, event_id FROM changes
      WHERE kind=$2 AND order_id=$3`;
    const params:unknown[]=[userId,kind,orderId];

    if(upTo){
      if(typeof upTo !== 'string' || Number.isNaN(Date.parse(upTo))){
        throw new ApiError(422,'VALIDATION_FAILED','Mốc thời gian không hợp lệ.');
      }
      params.push(upTo);
      sql+=` AND occurred_at <= $4::timestamptz`;
    }

    sql+=` ON CONFLICT DO NOTHING RETURNING event_id`;

    const rows=await this.source.manager.query(sql,params);
    return {updated:rows.length};
  }

  async markAllRead(userId:string){
    const rows=await this.source.manager.query(`WITH changes AS (${changes})
      INSERT INTO customer_notification_read(customer_user_id,kind,event_id)
      SELECT $1,kind,event_id FROM changes ON CONFLICT DO NOTHING RETURNING event_id`,[userId]);
    return {updated:rows.length};
  }

  async markRead(id:string,userId:string){
    const match=/^(ORDER_STATUS|PAYMENT_EVENT|RETURN_STATUS):([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.exec(id);
    if(!match)throw new ApiError(422,'VALIDATION_FAILED','Mã thông báo không hợp lệ.');
    const kind=match[1].toUpperCase(),eventId=match[2];
    const sql=kind==='ORDER_STATUS'?'SELECT h.id FROM order_status_history h JOIN "order" o ON o.id=h.order_id WHERE h.id=$1 AND o.customer_user_id=$2':kind==='RETURN_STATUS'?'SELECT h.id FROM return_status_history h JOIN order_return_request r ON r.id=h.request_id JOIN "order" o ON o.id=r.order_id WHERE h.id=$1 AND o.customer_user_id=$2':'SELECT e.id FROM payment_event e LEFT JOIN payment_attempt a ON a.id=e.attempt_id JOIN payment p ON p.id=coalesce(e.payment_id,a.payment_id) JOIN "order" o ON o.id=p.order_id WHERE e.id=$1 AND o.customer_user_id=$2';
    const [event]=await this.source.manager.query(sql,[eventId,userId]);
    if(!event)throw new ApiError(404,'NOT_FOUND','Không tìm thấy thông báo của bạn.');
    await this.source.manager.query('INSERT INTO customer_notification_read(customer_user_id,kind,event_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[userId,kind,eventId]);
    return {id};
  }
}

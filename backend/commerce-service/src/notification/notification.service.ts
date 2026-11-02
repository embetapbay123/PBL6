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
    const [count]=await this.source.manager.query(`WITH changes AS (${changes}) SELECT count(*)::int AS total,count(*) FILTER(WHERE r.event_id IS NULL)::int AS unread FROM changes n ${readJoin}`,[userId]);
    const rows=await this.source.manager.query(`WITH changes AS (${changes}) SELECT n.*,r.read_at IS NOT NULL AS read FROM changes n ${readJoin} ORDER BY n.occurred_at DESC,n.kind,n.event_id LIMIT $2 OFFSET $3`,[userId,size,(page-1)*size]);
    return {items:rows.map((row:any)=>({id:row.kind+':'+row.event_id,kind:row.kind,order_id:row.order_id,event_status:row.status,created_at:new Date(row.occurred_at).toISOString(),read:row.read})),total:count.total,unread:count.unread,page,size};
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

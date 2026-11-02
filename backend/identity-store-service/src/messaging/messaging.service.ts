import type {DataSource} from 'typeorm';
import {config,required} from '../../../shared/src/config';
import {InternalClients} from '../../../shared/src/internal-clients';
import type {OperationOutputs} from '../../../shared/src/operations.generated';
import { database } from '../../../shared/src/database';
import { ApiError } from '../../../shared/src/errors';
import type { EntityManager } from 'typeorm';

type Side='CUSTOMER'|'STORE';
type Context={user_id:string;access_token?:string;store_membership?:{store_id:string;role:string;status?:string;permissions?:string[]}};
const timestamp=(value:Date|string)=>new Date(value).toISOString();
const message=(row:any)=>({id:row.id,conversation_id:row.conversation_id,sender_side:row.sender_side,content:row.content,created_at:timestamp(row.created_at),...(row.order_id?{order_id:row.order_id}:{})});

type OrderContext=OperationOutputs['ResolveConversationOrder'];
export class MessagingService {
  constructor(private readonly source:DataSource=database,private readonly orderLookup?:(id:string,context:Context,side:Side,correlation:string)=>Promise<OrderContext>){}
  private checkedOrder(id:string,order:OrderContext){if(order.order_id!==id)throw new ApiError(503,'DEPENDENCY_CONTRACT_INVALID','Kết quả đối chiếu không khớp đơn đã yêu cầu.');return order;}
  private async order(id:string,context:Context,side:Side,correlation:string):Promise<OrderContext>{
    if(this.orderLookup)return this.checkedOrder(id,await this.orderLookup(id,context,side,correlation));
    if(!context.access_token)throw new ApiError(401,'UNAUTHENTICATED','Cần phiên hiện hành để gắn đơn hàng.');
    const c=config('M3'),clients=new InternalClients('M3',c.internalKeys.M3,{M1:c.catalogUrl,M2:required('COMMERCE_URL'),M3:c.identityUrl});
    return this.checkedOrder(id,await clients.call('ResolveConversationOrder',{order_id:id,side,token:context.access_token},correlation));
  }
  private matchesOrder(order:OrderContext,thread:{store_id:string;customer_user_id:string}){
    if(order.store_id!==thread.store_id||order.customer_user_id!==thread.customer_user_id)throw new ApiError(404,'ORDER_CONVERSATION_MISMATCH','Đơn không thuộc khách hàng và Store của hội thoại này.');
  }
  private store(context:Context) {
    const member=context.store_membership;
    if(!member || member.status!=='ACTIVE' || !['OWNER','SELLER'].includes(member.role)
      || (member.role!=='OWNER'&&!member.permissions?.includes('order.store.read_status_cancel')))
      throw new ApiError(403,'FORBIDDEN','Cần quyền xử lý đơn hàng để truy cập tin nhắn Store.');
    return member.store_id;
  }
  private authorize(row:any,context:Context,side:Side) {
    if(!row || (side==='CUSTOMER'?row.customer_user_id!==context.user_id:row.store_id!==this.store(context)))
      throw new ApiError(404,'NOT_FOUND','Không tìm thấy hội thoại của bạn.');
  }
  async start(storeId:string,context:Context,orderId?:string,correlation=''):Promise<OperationOutputs['startStoreConversation']> {
    const order=orderId?await this.order(orderId,context,'CUSTOMER',correlation):undefined;
    if(order)this.matchesOrder(order,{store_id:storeId,customer_user_id:context.user_id});
    return this.source.transaction(async manager=>{
      const [store]=await manager.query("SELECT id,name FROM store WHERE id=$1 AND status='ACTIVE'",[storeId]);
      if(!store)throw new ApiError(404,'NOT_FOUND','Không tìm thấy gian hàng đang hoạt động.');
      await manager.query('INSERT INTO store_conversation(customer_user_id,store_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[context.user_id,storeId]);
      const [row]=await manager.query('SELECT id FROM store_conversation WHERE customer_user_id=$1 AND store_id=$2',[context.user_id,storeId]);
      return {id:row.id,...(store.name?{store_name:store.name}:{}),...(order?{order_context:{order_id:order.order_id,store_id:order.store_id,status:order.status,items:order.items}}:{})};
    });
  }
  async list(context:Context,side:Side,page=1,size=20):Promise<OperationOutputs['listOwnConversations']> {
    const field=side==='CUSTOMER'?'customer_user_id':'store_id',owner=side==='CUSTOMER'?context.user_id:this.store(context);
    const [count]=await this.source.manager.query(`SELECT count(*)::int AS total FROM store_conversation WHERE ${field}=$1`,[owner]);
    const rows=await this.source.manager.query(`SELECT c.id,c.store_id,s.name AS store_name,coalesce(p.display_name,'Khách hàng') AS customer_name,c.updated_at,
      (SELECT content FROM store_message WHERE conversation_id=c.id ORDER BY created_at DESC,id DESC LIMIT 1) AS last_message
      FROM store_conversation c JOIN store s ON s.id=c.store_id LEFT JOIN customer_profile p ON p.user_id=c.customer_user_id
      WHERE c.${field}=$1 ORDER BY c.updated_at DESC,c.id LIMIT $2 OFFSET $3`,[owner,size,(page-1)*size]);
    return {items:rows.map((row:any)=>({id:row.id,store_id:row.store_id,store_name:row.store_name,customer_name:row.customer_name,updated_at:timestamp(row.updated_at),...(row.last_message===null?{}:{last_message:row.last_message})})),total:count.total,page,size};
  }
  async history(id:string,context:Context,side:Side,page=1,size=20):Promise<OperationOutputs['listOwnConversationMessages']> {
    const [thread]=await this.source.manager.query(`SELECT c.id,c.customer_user_id,c.store_id,c.updated_at,s.name AS store_name,coalesce(p.display_name,'Khách hàng') AS customer_name
      FROM store_conversation c JOIN store s ON s.id=c.store_id LEFT JOIN customer_profile p ON p.user_id=c.customer_user_id WHERE c.id=$1`,[id]);
    this.authorize(thread,context,side);
    const [count]=await this.source.manager.query('SELECT count(*)::int AS total FROM store_message WHERE conversation_id=$1',[id]);
    const rows=await this.source.manager.query('SELECT id,conversation_id,sender_side,content,created_at,order_id FROM store_message WHERE conversation_id=$1 ORDER BY created_at DESC,id DESC LIMIT $2 OFFSET $3',[id,size,(page-1)*size]);
    return {conversation_id:id,conversation:{id:thread.id,store_id:thread.store_id,store_name:thread.store_name,customer_name:thread.customer_name,updated_at:timestamp(thread.updated_at)},items:rows.map(message),total:count.total,page,size};
  }
  async send(id:string,input:{content:string;client_message_id:string;order_id?:string},context:Context,side:Side,correlation=''):Promise<OperationOutputs['sendOwnConversationMessage']> {
    const content=input.content.trim();
    if(!content || content.length>2000)throw new ApiError(422,'VALIDATION_FAILED','Tin nhắn cần có từ 1 đến 2000 ký tự.');
    let order:OrderContext|undefined;
    if(input.order_id){
      const [thread]=await this.source.manager.query('SELECT customer_user_id,store_id FROM store_conversation WHERE id=$1',[id]);
      this.authorize(thread,context,side);order=await this.order(input.order_id,context,side,correlation);this.matchesOrder(order,thread);
    }
    return this.source.transaction(async(manager:EntityManager)=>{
      const [thread]=await manager.query('SELECT customer_user_id,store_id FROM store_conversation WHERE id=$1 FOR UPDATE',[id]);
      this.authorize(thread,context,side);if(order)this.matchesOrder(order,thread);
      const [existing]=await manager.query('SELECT * FROM store_message WHERE conversation_id=$1 AND sender_side=$2 AND client_message_id=$3',[id,side,input.client_message_id]);
      if(existing){
        if(existing.content!==content || existing.sender_user_id!==context.user_id||(existing.order_id??null)!==(input.order_id??null))throw new ApiError(409,'MESSAGE_KEY_CONFLICT','Mã gửi tin đã được dùng cho nội dung khác.');
        return message(existing);
      }
      const [store]=await manager.query("SELECT id FROM store WHERE id=$1 AND status='ACTIVE'",[thread.store_id]);
      if(!store)throw new ApiError(409,'STORE_UNAVAILABLE','Gian hàng hiện không nhận tin nhắn.');
      const [row]=input.order_id?await manager.query('INSERT INTO store_message(conversation_id,sender_user_id,sender_side,client_message_id,content,order_id) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[id,context.user_id,side,input.client_message_id,content,input.order_id]):await manager.query('INSERT INTO store_message(conversation_id,sender_user_id,sender_side,client_message_id,content) VALUES($1,$2,$3,$4,$5) RETURNING *',[id,context.user_id,side,input.client_message_id,content]);
      await manager.query('UPDATE store_conversation SET updated_at=now() WHERE id=$1',[id]);
      return message(row);
    });
  }
}

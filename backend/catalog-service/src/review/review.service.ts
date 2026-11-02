import { database } from '../../../shared/src/database';
import { config, required } from '../../../shared/src/config';
import { InternalClients } from '../../../shared/src/internal-clients';
import { ApiError } from '../../../shared/src/errors';
import { audit } from '../../../shared/src/audit';
import { returnedRow } from '../../../shared/src/postgres-returning';
import type { EntityManager } from 'typeorm';
import type { OperationInputs } from '../../../shared/src/operations.generated';

const map=(row:any)=>({...(row.product_title?{product_title:row.product_title}:{}),id:row.id,product_id:row.product_id,order_item_id:row.order_item_id,rating:row.rating,...(row.body!==null?{body:row.body}:{}),status:row.status,version:row.version});
export class ReviewService {
  constructor(private readonly clientsFactory?:()=>InternalClients){}
  private clients(){
    if(this.clientsFactory)return this.clientsFactory();
    const c=config('M1');
    return new InternalClients('M1',c.internalKeys.M1,{M1:c.catalogUrl,M2:required('COMMERCE_URL'),M3:c.identityUrl});
  }
  private async eligible(item:string,user:string,trace:string,product?:string){
    const result=await this.clients().call('VerifyReviewEligibility',{order_item_id:item,customer_user_id:user,...(product?{product_id:product}:{})},trace);
    if(!result.eligible)throw new ApiError(409,'REVIEW_NOT_ELIGIBLE','Chỉ đánh giá mục đơn hàng của bạn đã hoàn tất.');
    const canonical=product ?? result.product_id;
    if(!canonical)throw new ApiError(503,'DEPENDENCY_CONTRACT_INVALID','Dịch vụ đơn hàng chưa trả sản phẩm của mục đã mua.');
    return canonical;
  }
  async list(product:string,query:{page?:number;size?:number},trace:string){
    const stores=await this.clients().call('ActiveStores',undefined,trace);
    const [visible]=await database.manager.query("SELECT id FROM product WHERE id=$1 AND status='ACTIVE' AND moderation_status='VISIBLE' AND store_id=ANY($2::uuid[])",[product,stores.ids]);
    if(!visible)throw new ApiError(404,'NOT_FOUND','Không tìm thấy sản phẩm công khai.');
    const page=query.page ?? 1,size=query.size ?? 20;
    const [count]=await database.manager.query("SELECT count(*)::int AS total FROM review WHERE product_id=$1 AND status='VISIBLE'",[product]);
    const rows=await database.manager.query("SELECT * FROM review WHERE product_id=$1 AND status='VISIBLE' ORDER BY created_at DESC,id LIMIT $2 OFFSET $3",[product,size,(page-1)*size]);
    return {items:rows.map(map),page,size,total:count.total};
  }
  async listAdmin(query:{page?:number;size?:number;status?:string;product_id?:string}){
    const page=query.page ?? 1,size=query.size ?? 20,args=[query.status ?? null,query.product_id ?? null];
    const where=' WHERE ($1::text IS NULL OR status=$1) AND ($2::uuid IS NULL OR product_id=$2)';
    const [count]=await database.manager.query('SELECT count(*)::int AS total FROM review r'+where,args);
    const rows=await database.manager.query('SELECT * FROM review'+where+' ORDER BY created_at DESC,id LIMIT $3 OFFSET $4',[...args,size,(page-1)*size]);
    return {items:rows.map(map),page,size,total:count.total};
  }
  async listOwn(user:string,query:{page?:number;size?:number;product_id?:string;order_item_id?:string}){
    if(!user)throw new ApiError(401,'UNAUTHENTICATED','Vui lòng đăng nhập.');
    const page=query.page??1,size=query.size??20,args=[user,query.product_id??null,query.order_item_id??null];
    const where=' WHERE r.customer_user_id=$1 AND ($2::uuid IS NULL OR r.product_id=$2) AND ($3::uuid IS NULL OR r.order_item_id=$3)';
    const [count]=await database.manager.query('SELECT count(*)::int AS total FROM review r'+where,args);
    const rows=await database.manager.query('SELECT r.*,p.title AS product_title FROM review r LEFT JOIN product p ON p.id=r.product_id'+where+' ORDER BY r.updated_at DESC,r.id LIMIT $4 OFFSET $5',[...args,size,(page-1)*size]);
    // Never use the public VISIBLE list to reconstruct ownership or a current edit version.
    return {items:rows.map(map),page,size,total:count.total};
  }
  async create(input:OperationInputs['createReview']['body'],user:string,trace:string){
    const product=await this.eligible(input.order_item_id,user,trace),body=input.body?.trim() ?? null;
    return database.transaction(async manager=>{
      // Serializes retries and concurrent creates for the unique purchased item.
      await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[input.order_item_id]);
      const [existing]=await manager.query('SELECT * FROM review WHERE order_item_id=$1',[input.order_item_id]);
      if(existing){
        if(existing.customer_user_id===user&&existing.rating===input.rating&&existing.body===body)return map(existing);
        throw new ApiError(409,'REVIEW_ALREADY_EXISTS','Mục đơn hàng đã có đánh giá. Tải lại để sửa đánh giá hiện có.');
      }
      const [row]=await manager.query("INSERT INTO review(product_id,order_item_id,customer_user_id,rating,body,status,updated_at) VALUES($1,$2,$3,$4,$5,'VISIBLE',now()) RETURNING *",[product,input.order_item_id,user,input.rating,body]);
      await this.record(manager,row,user,'CREATE',trace);return map(row);
    });
  }
  async update(id:string,input:OperationInputs['updateReview']['body'],user:string,trace:string){
    return database.transaction(async manager=>{
      const [before]=await manager.query('SELECT * FROM review WHERE id=$1 AND customer_user_id=$2 FOR UPDATE',[id,user]);
      if(!before)throw new ApiError(404,'NOT_FOUND','Không tìm thấy đánh giá của bạn.');
      if(before.version!==input.expected_version)throw new ApiError(409,'VERSION_CONFLICT','Đánh giá đã thay đổi. Vui lòng tải lại.');
      await this.eligible(before.order_item_id,user,trace,before.product_id);
      const row=returnedRow<any>(await manager.query('UPDATE review SET rating=$2,body=$3,version=version+1,updated_at=now() WHERE id=$1 RETURNING *',[id,input.rating ?? before.rating,input.body===undefined?before.body:input.body.trim()]));
      if(!row)throw new Error('Review update returned no row');
      // Editing content never clears a moderation decision.
      await this.record(manager,row,user,'UPDATE',trace,undefined,before);return map(row);
    });
  }
  async moderate(id:string,input:OperationInputs['hideReview']['body'],user:string,trace:string,visible:boolean){
    const reason=input.reason.trim();if(!reason)throw new ApiError(422,'VALIDATION_FAILED','Cần lý do kiểm duyệt.');
    return database.transaction(async manager=>{
      const [before]=await manager.query('SELECT * FROM review WHERE id=$1 FOR UPDATE',[id]);
      if(!before)throw new ApiError(404,'NOT_FOUND','Không tìm thấy đánh giá.');
      if(before.version!==input.expected_version)throw new ApiError(409,'VERSION_CONFLICT','Đánh giá đã thay đổi. Vui lòng tải lại.');
      const status=visible?'VISIBLE':'HIDDEN';
      if(before.status===status)throw new ApiError(409,'REVIEW_STATE_CONFLICT','Đánh giá đã ở trạng thái này.');
      const row=returnedRow<any>(await manager.query('UPDATE review SET status=$2,hidden_reason=$3,version=version+1,updated_at=now() WHERE id=$1 RETURNING *',[id,status,visible?null:reason]));
      if(!row)throw new Error('Review moderation returned no row');
      await this.record(manager,row,user,visible?'RESTORE':'HIDE',trace,reason,before);return map(row);
    });
  }
  private async record(manager:EntityManager,row:any,user:string,action:string,trace:string,reason?:string,before?:any){
    await manager.query('INSERT INTO review_audit(review_id,actor_user_id,action,reason) VALUES($1,$2,$3,$4)',[row.id,user,action,reason ?? null]);
    await audit(manager,'M1',user,'Review',row.id,action,trace,before?map(before):{},map(row));
  }
}

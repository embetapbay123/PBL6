import type {DataSource,EntityManager} from 'typeorm';
import {database} from '../../../shared/src/database';
import {ApiError} from '../../../shared/src/errors';
import {once} from '../../../shared/src/idempotency';
import {audit} from '../../../shared/src/audit';
import {moneyNumber} from '../../../shared/src/money';
import type {OperationInputs,OperationOutputs} from '../../../shared/src/operations.generated';
import {refundOrderEligible} from './refund-eligibility';
import {executionId,registerRefundExecution} from './refund-execution';
type Scope='STORE'|'ADMIN';
type Command=OperationInputs['requestStoreRefundRecovery']['body'];
export class RefundRecoveryService {
 constructor(private readonly source:DataSource=database,private readonly env:NodeJS.ProcessEnv=process.env){}
 private scope(auth:any,scope:Scope):string|null {
  if(!auth?.user_id)throw new ApiError(401,'UNAUTHENTICATED','Vui lòng đăng nhập.');
  if(scope==='ADMIN'){if(auth.roles?.includes('ADMIN')&&auth.role_permissions?.includes('platform.admin'))return null;throw new ApiError(403,'FORBIDDEN','Cần quyền quản trị hiện hành.');}
  const m=auth.store_membership;if(!auth.roles?.includes('STORE_OWNER')||m?.role!=='OWNER'||m.status!=='ACTIVE'||!m.store_id)throw new ApiError(403,'OWNER_REQUIRED','Chỉ Owner hiện hành của Store hoặc Admin được yêu cầu phục hồi hoàn online.');return m.store_id;
 }
 private async order(manager:EntityManager,id:string,store:string|null,lock=false){const [row]=await manager.query('SELECT * FROM "order" WHERE id=$1 AND ($2::uuid IS NULL OR store_id=$2)'+(lock?' FOR UPDATE':''),[id,store]);if(!row)throw new ApiError(404,'NOT_FOUND','Không tìm thấy đơn thuộc phạm vi của bạn.');return row;}
 private async state(manager:EntityManager,order:any):Promise<OperationOutputs['getStoreRefundRecovery']>{
  const [row]=await manager.query(`SELECT r.id,r.status,r.version,r.amount_vnd,r.operation_id,j.operation_id AS job_operation_id,j.execution_operation_id,j.status AS job_status,j.last_error,j.amount_vnd AS job_amount,j.provider_receipt,
   p.status AS payment_status,p.method,p.payable_vnd,p.collected_vnd,p.refunded_vnd FROM refund r JOIN payment p ON p.id=r.payment_id LEFT JOIN refund_job j ON j.refund_id=r.id WHERE r.order_id=$1`,[order.id]);
  if(!row)throw new ApiError(404,'NOT_FOUND','Đơn chưa có yêu cầu hoàn online để đối chiếu.');
  const [recovery]=await manager.query('SELECT id,status,created_at,updated_at FROM refund_recovery_request WHERE refund_id=$1 ORDER BY created_at DESC,id DESC LIMIT 1',[row.id]);
  const eligible=await refundOrderEligible(manager,order),pending=recovery?.status==='PENDING',blocked=recovery?.status==='BLOCKED',writesOff=this.env.REFUND_RECOVERY_WRITES==='0';
  const reconciled=order.payment_method==='SANDBOX'&&row.method==='SANDBOX'&&row.payment_status==='SUCCEEDED'&&row.refunded_vnd==='0'&&row.amount_vnd===row.collected_vnd&&row.amount_vnd===row.payable_vnd&&row.amount_vnd===order.payable_vnd&&row.amount_vnd===row.job_amount&&row.operation_id===row.job_operation_id&&!row.provider_receipt;
  const canRetry=eligible&&reconciled&&!pending&&!blocked&&!writesOff&&row.status==='FAILED'&&row.job_status==='FAILED'&&row.last_error==='PROVIDER_REJECTED';
  return {order_id:order.id,order_version:order.version,refund_id:row.id,refund_version:row.version,status:row.status,amount_vnd:moneyNumber(row.amount_vnd),can_retry_known_failure:canRetry,
   ...(!canRetry?{blocked_reason:blocked?'RECONCILIATION_REQUIRED':pending?'RECOVERY_PENDING':writesOff?'RECOVERY_DISABLED':row.status==='UNKNOWN'||['LEASED','RECONCILE'].includes(row.job_status)?'RESULT_UNKNOWN':!eligible||!reconciled&&row.status!=='SUCCEEDED'?'RECONCILIATION_REQUIRED':'NOT_FAILED'}:{}),
   ...(recovery?{recovery:{id:recovery.id,status:recovery.status,created_at:new Date(recovery.created_at).toISOString(),updated_at:new Date(recovery.updated_at).toISOString()}}:{})};
 }
 async get(id:string,auth:any,scope:Scope){const store=this.scope(auth,scope);return this.state(this.source.manager,await this.order(this.source.manager,id,store));}
 async request(id:string,input:Command,auth:any,scope:Scope,trace:string){
  const store=this.scope(auth,scope),note=input.note.trim();if(!note||note.length>2000)throw new ApiError(422,'REASON_REQUIRED','Cần ghi căn cứ yêu cầu đối soát và thử lại khoản hoàn.');
  return this.source.transaction(async manager=>{
   const order=await this.order(manager,id,store,true);
   const [payment]=await manager.query('SELECT * FROM payment WHERE order_id=$1 FOR UPDATE',[id]);
   const [refund]=await manager.query('SELECT * FROM refund WHERE order_id=$1 FOR UPDATE',[id]);
   if(!refund)throw new ApiError(404,'NOT_FOUND','Không có yêu cầu hoàn của đơn này.');
   const [job]=await manager.query('SELECT * FROM refund_job WHERE refund_id=$1 FOR UPDATE',[refund.id]);
   return once(manager,'M2.Refund.recovery',input.operation_id,{...input,order_id:id,actor:auth.user_id,scope,store},async()=>{
    if(order.version!==input.expected_order_version||refund.version!==input.expected_refund_version)throw new ApiError(409,'VERSION_CONFLICT','Đơn hoặc khoản hoàn đã thay đổi. Đọc lại trước khi quyết định.');
    if(this.env.REFUND_RECOVERY_WRITES==='0')throw new ApiError(503,'RECOVERY_WRITES_DISABLED','Đang tạm dừng nhận yêu cầu phục hồi mới; lệnh đã nhận vẫn được đọc và đối soát.');
    const state=await this.state(manager,order);
    if(!state.can_retry_known_failure)throw new ApiError(409,'REFUND_RECONCILIATION_REQUIRED','Chỉ phục hồi FAILED đã xác minh chưa hoàn. UNKNOWN phải tra soát, không gửi khoản hoàn mới.');
    if(!job||!payment)throw new ApiError(409,'REFUND_RECONCILIATION_REQUIRED','Thiếu dữ liệu đối chiếu khoản hoàn.');
    await registerRefundExecution(manager,job);
    await manager.query('INSERT INTO refund_recovery_request(id,refund_id,actor_user_id,previous_execution_id,note) VALUES($1,$2,$3,$4,$5)',[input.operation_id,refund.id,auth.user_id,executionId(job),note]);
    // The first step is authoritative lookup of the old execution, never a new refund.
    await manager.query("UPDATE refund_job SET status='RECONCILE',last_error='RETRY_VERIFICATION_REQUIRED',next_attempt_at=now(),updated_at=now() WHERE refund_id=$1",[refund.id]);
    await manager.query("UPDATE refund SET status='UNKNOWN' WHERE id=$1",[refund.id]);
    await manager.query('UPDATE "order" SET version=version+1 WHERE id=$1',[id]);
    await audit(manager,'M2',auth.user_id,'Refund',refund.id,'RETRY_REQUESTED',trace,{status:'FAILED'},{status:'UNKNOWN',recovery_request_id:input.operation_id,note});
    return this.state(manager,{...order,version:order.version+1});
   });
  });
 }
}

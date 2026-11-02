import {recordMoneyMovement} from './money-journal';
import { randomUUID } from 'node:crypto';
import { DataSource,EntityManager } from 'typeorm';
import { ApiError } from '../../../shared/src/errors';
import { audit } from '../../../shared/src/audit';
import { fingerprint } from '../../../shared/src/idempotency';
import { PaymentService } from './payment.service';
import {refundOrderEligible} from './refund-eligibility';
import { PaymentFollowupPort } from './payment.followup.port';
import {executionId,registerRefundExecution} from './refund-execution';

export interface RefundCommand {operation_id:string;provider:string;payment_reference:string;amount_vnd:string;correlation_id:string}
export type RefundOutcome = {status:'UNKNOWN'} | (RefundCommand & {status:'NOT_FOUND'|'FAILED'}) | (RefundCommand & {status:'SUCCEEDED';receipt_id:string});
// A provider must implement durable idempotency and authoritative lookup by operation ID.
// Test doubles never belong to production configuration.
export interface RefundProvider {readonly enabled:boolean;readonly name:string;refund(command:RefundCommand):Promise<RefundOutcome>;lookup(command:RefundCommand):Promise<RefundOutcome>}
export class DisabledRefundProvider implements RefundProvider {
  readonly enabled=false;readonly name='DISABLED';
  async refund():Promise<RefundOutcome> {return {status:'UNKNOWN'};}
  async lookup():Promise<RefundOutcome> {return {status:'UNKNOWN'};}
}

export class RefundRunner {
  constructor(private readonly source:DataSource,private readonly provider:RefundProvider) {}
  async enqueueDeliveryRefunds(){
    const rows=await this.source.query(`SELECT c.id,c.order_id,p.id AS payment_id,p.payable_vnd FROM delivery_return_case c JOIN "order" o ON o.id=c.order_id JOIN payment p ON p.order_id=o.id LEFT JOIN refund f ON f.payment_id=p.id
      WHERE c.status='SETTLING' AND o.status='SHIPPED' AND p.method='SANDBOX' AND p.status='SUCCEEDED' AND p.refunded_vnd=0 AND p.collected_vnd=p.payable_vnd AND p.payable_vnd=o.payable_vnd AND p.payable_vnd>0 AND f.id IS NULL ORDER BY c.created_at,c.id LIMIT 20`);
    for(const row of rows)await this.source.transaction(async manager=>{
      await manager.query('SELECT id FROM "order" WHERE id=$1 FOR UPDATE',[row.order_id]);
      const [current]=await manager.query('SELECT status FROM delivery_return_case WHERE id=$1 FOR UPDATE',[row.id]);if(current?.status!=='SETTLING')return;
      await new PaymentService(manager).requestRefund({order_id:row.order_id,payment_id:row.payment_id,amount_vnd:BigInt(row.payable_vnd),operation_id:row.id,correlation_id:'delivery-refund-'+row.id});
    });
  }
  async enqueueReturnRefunds(){
    const rows=await this.source.query(`SELECT r.id,r.order_id,p.id AS payment_id,p.payable_vnd FROM order_return_request r JOIN "order" o ON o.id=r.order_id JOIN payment p ON p.order_id=o.id LEFT JOIN refund f ON f.payment_id=p.id
      WHERE r.type='REFUND' AND r.status='RECEIVED' AND r.inventory_status IN ('APPLIED','LEGACY_RECONCILED') AND r.fault_party IN ('STORE','CUSTOMER') AND r.fee_payer=r.fault_party AND o.status='COMPLETED' AND p.method='SANDBOX' AND p.status='SUCCEEDED' AND p.refunded_vnd=0 AND p.collected_vnd=p.payable_vnd AND p.payable_vnd=o.payable_vnd AND p.payable_vnd>0 AND f.id IS NULL
      AND EXISTS(SELECT 1 FROM payment_attempt a WHERE a.payment_id=p.id AND a.status='SUCCEEDED' AND a.amount_vnd=p.payable_vnd) ORDER BY r.created_at,r.id LIMIT 20`);
    for(const row of rows)await this.source.transaction(async manager=>{
      await manager.query('SELECT id FROM "order" WHERE id=$1 FOR UPDATE',[row.order_id]);
      const [request]=await manager.query('SELECT type,status,inventory_status,fault_party,fee_payer FROM order_return_request WHERE id=$1 FOR UPDATE',[row.id]);
      if(request?.type!=='REFUND'||request.status!=='RECEIVED'||!['APPLIED','LEGACY_RECONCILED'].includes(request.inventory_status)||!['STORE','CUSTOMER'].includes(request.fault_party)||request.fee_payer!==request.fault_party)return;
      await new PaymentService(manager).requestRefund({order_id:row.order_id,payment_id:row.payment_id,amount_vnd:BigInt(row.payable_vnd),operation_id:row.id,correlation_id:'return-refund-'+row.id});
    });
  }
  async enqueueLatePayments() {
    const rows=await this.source.query("SELECT f.* FROM payment_followup f JOIN \"order\" o ON o.id=f.order_id JOIN payment p ON p.id=f.payment_id LEFT JOIN refund r ON r.payment_id=p.id WHERE f.kind='REFUND_REQUIRED' AND f.status='PENDING' AND o.status IN ('CANCELLED','EXPIRED') AND p.status='SUCCEEDED' AND r.id IS NULL ORDER BY f.created_at LIMIT 20");
    for(const row of rows)await this.source.transaction(async manager=>{
      const [payment]=await manager.query('SELECT payable_vnd FROM payment WHERE id=$1',[row.payment_id]);
      await new PaymentService(manager).requestRefund({order_id:row.order_id,payment_id:row.payment_id,amount_vnd:BigInt(payment.payable_vnd),operation_id:row.operation_id,correlation_id:row.correlation_id});
    });
  }
  private async lock(manager:EntityManager,id:string) {
    const [target]=await manager.query('SELECT order_id,payment_id FROM refund WHERE id=$1',[id]);
    if(!target)throw new ApiError(404,'NOT_FOUND','Không tìm thấy Refund.');
    const [order]=await manager.query('SELECT * FROM "order" WHERE id=$1 FOR UPDATE',[target.order_id]);
    const [payment]=await manager.query('SELECT * FROM payment WHERE id=$1 FOR UPDATE',[target.payment_id]);
    const [refund]=await manager.query('SELECT * FROM refund WHERE id=$1 FOR UPDATE',[id]);
    const [job]=await manager.query('SELECT * FROM refund_job WHERE refund_id=$1 FOR UPDATE',[id]);
    return {order,payment,refund,job};
  }
  async recoverExpired() {
    const targets=await this.source.query("SELECT refund_id FROM refund_job WHERE status='LEASED' AND lease_until<=now() ORDER BY created_at LIMIT 20");
    for(const row of targets)await this.source.transaction(async manager=>{
      const {order,refund,job}=await this.lock(manager,row.refund_id);
      if(job.status!=='LEASED' || new Date(job.lease_until).getTime()>Date.now())return;
      await manager.query("UPDATE refund_job SET status='RECONCILE',lease_token=NULL,lease_until=NULL,last_error='LEASE_EXPIRED',next_attempt_at=now(),updated_at=now() WHERE refund_id=$1",[refund.id]);
      await manager.query("UPDATE refund SET status='UNKNOWN' WHERE id=$1",[refund.id]);
      await audit(manager,'M2',order.customer_user_id,'Refund',refund.id,'LEASE_EXPIRED',job.correlation_id,{status:refund.status},{status:'UNKNOWN'});
    });
  }
  private async claim() {
    const candidates=await this.source.query("SELECT refund_id FROM refund_job WHERE status IN ('PENDING','RECONCILE') AND next_attempt_at<=now() AND provider=$1 ORDER BY created_at LIMIT 20",[this.provider.name]);
    return this.source.transaction(async manager=>{
      for(const candidate of candidates) {
        const {order,payment,refund,job}=await this.lock(manager,candidate.refund_id);
        if(!['PENDING','RECONCILE'].includes(job.status))continue;
        if(!(await refundOrderEligible(manager,order)) || payment.status!=='SUCCEEDED' || payment.method!=='SANDBOX' || payment.refunded_vnd!=='0' || payment.collected_vnd!==job.amount_vnd || payment.payable_vnd!==job.amount_vnd || refund.amount_vnd!==job.amount_vnd || refund.operation_id!==job.operation_id) {
          await manager.query("UPDATE refund_job SET status='FAILED',last_error='STATE_CHANGED',updated_at=now() WHERE refund_id=$1",[refund.id]);
          await manager.query("UPDATE refund SET status='FAILED' WHERE id=$1",[refund.id]);
          await manager.query("UPDATE refund_recovery_request SET status='BLOCKED',updated_at=now() WHERE refund_id=$1 AND status='PENDING'",[refund.id]);
          await audit(manager,'M2',order.customer_user_id,'Refund',refund.id,'STATE_CHANGED',job.correlation_id,{status:refund.status},{status:'FAILED'});
          continue;
        }
        try{await registerRefundExecution(manager,job);}catch{
          await manager.query("UPDATE refund_job SET status='FAILED',last_error='EXECUTION_IDENTITY_MISMATCH',updated_at=now() WHERE refund_id=$1",[refund.id]);
          await manager.query("UPDATE refund SET status='FAILED' WHERE id=$1",[refund.id]);
          await manager.query("UPDATE refund_recovery_request SET status='BLOCKED',updated_at=now() WHERE refund_id=$1 AND status='PENDING'",[refund.id]);
          continue;
        }
        const token=randomUUID(),lookup=job.status==='RECONCILE';
        await manager.query("UPDATE refund_job SET status='LEASED',lease_token=$2,lease_until=now()+interval '30 seconds',attempts=attempts+1,updated_at=now() WHERE refund_id=$1",[job.refund_id,token]);
        await manager.query('UPDATE refund SET status=$2 WHERE id=$1',[job.refund_id,lookup?'UNKNOWN':'PROCESSING']);
        await audit(manager,'M2',order.customer_user_id,'Refund',refund.id,lookup?'LOOKUP_STARTED':'COMMAND_STARTED',job.correlation_id,{status:refund.status},{status:lookup?'UNKNOWN':'PROCESSING',operation_id:job.operation_id});
        return {...job,token,lookup};
      }
    });
  }
  async tick():Promise<'DISABLED'|'IDLE'|'PROCESSED'> {
    await this.recoverExpired();await this.enqueueLatePayments();if(!this.provider.enabled)return 'DISABLED';
    const job=await this.claim();if(!job)return 'IDLE';
    const command:RefundCommand={operation_id:executionId(job),provider:job.provider,payment_reference:job.payment_reference,amount_vnd:job.amount_vnd,correlation_id:job.correlation_id};
    let result:RefundOutcome;
    try {
      // Race adds an overall deadline even when an injected provider forgets one.
      let timer:ReturnType<typeof setTimeout>|undefined;
      try {result=await Promise.race([job.lookup?this.provider.lookup(command):this.provider.refund(command),new Promise<RefundOutcome>(resolve=>{timer=setTimeout(()=>resolve({status:'UNKNOWN'}),1000);})]);}
      finally {if(timer)clearTimeout(timer);}
    }catch {result={status:'UNKNOWN'};}
    await this.finish(job,result);return 'PROCESSED';
  }
  private async finish(claim:any,result:RefundOutcome) {
    await this.source.transaction(async manager=>{
      const {order,payment,refund,job}=await this.lock(manager,claim.refund_id);
      if(job.status!=='LEASED' || job.lease_token!==claim.token)return; // Lost lease: reconcile rather than write stale financial result.
      let state=result?.status;
      if(state && state!=='UNKNOWN') {
        const scoped=result as RefundCommand;
        if(scoped.operation_id!==executionId(job) || scoped.provider!==job.provider || scoped.payment_reference!==job.payment_reference || scoped.amount_vnd!==job.amount_vnd)state='UNKNOWN';
      }
      if(state==='NOT_FOUND' && !claim.lookup)state='UNKNOWN';
      if(state==='SUCCEEDED') {
        const receipt=result as Extract<RefundOutcome,{status:'SUCCEEDED'}>;
        const valid=receipt.operation_id===executionId(job) && receipt.provider===job.provider && receipt.payment_reference===job.payment_reference && receipt.amount_vnd===job.amount_vnd && typeof receipt.receipt_id==='string' && /^[A-Za-z0-9_.:-]{1,128}$/.test(receipt.receipt_id);
        if(!valid || !(await refundOrderEligible(manager,order)) || payment.status!=='SUCCEEDED' || payment.refunded_vnd!=='0' || payment.collected_vnd!==job.amount_vnd || refund.amount_vnd!==job.amount_vnd)state='UNKNOWN';
        else {
          await manager.query("UPDATE payment SET status='REFUNDED',refunded_vnd=$2,version=version+1 WHERE id=$1",[payment.id,job.amount_vnd]);
          await manager.query("INSERT INTO payment_event(payment_id,provider_event_id,event_type,payload_hash) VALUES($1,$2,'REFUNDED',$3)",[payment.id,'refund:'+executionId(job),fingerprint(receipt)]);
          await manager.query('UPDATE refund_job SET provider_receipt=$2 WHERE refund_id=$1',[refund.id,receipt.receipt_id]);
          await recordMoneyMovement(manager,{paymentId:payment.id,orderId:order.id,storeId:order.store_id,kind:'REFUND',amount:job.amount_vnd,sourceType:'REFUND_PROVIDER_RECEIPT',sourceId:job.provider+':'+receipt.receipt_id,timeSource:'SYSTEM_RECEIVED'});
        }
      }
      if(!['SUCCEEDED','FAILED','NOT_FOUND','UNKNOWN'].includes(state))state='UNKNOWN';
      const [recovery]=await manager.query("SELECT * FROM refund_recovery_request WHERE refund_id=$1 AND status='PENDING' FOR UPDATE",[refund.id]);
      if(recovery&&claim.lookup&&state==='FAILED'){
        // FAILED must be confirmed by authoritative lookup of the old execution.
        // The parent Refund/key/amount stays immutable. Only the provider execution changes.
        const valid=recovery.previous_execution_id===executionId(job)&&await refundOrderEligible(manager,order)&&payment.status==='SUCCEEDED'&&payment.refunded_vnd==='0'&&payment.collected_vnd===job.amount_vnd&&payment.payable_vnd===job.amount_vnd&&refund.amount_vnd===job.amount_vnd&&refund.operation_id===job.operation_id;
        if(valid){
          const next=randomUUID();await registerRefundExecution(manager,{...job,execution_operation_id:next});
          await manager.query("UPDATE refund_job SET execution_operation_id=$2,status='PENDING',lease_token=NULL,lease_until=NULL,last_error=NULL,attempts=0,next_attempt_at=now(),updated_at=now() WHERE refund_id=$1",[refund.id,next]);
          await manager.query("UPDATE refund SET status='REQUESTED' WHERE id=$1",[refund.id]);
          await manager.query("UPDATE refund_recovery_request SET status='REQUEUED',next_execution_id=$2,updated_at=now() WHERE id=$1",[recovery.id,next]);
          await audit(manager,'M2','00000000-0000-0000-0000-000000000000','Refund',refund.id,'RETRY_REQUEUED',job.correlation_id,{status:'FAILED',execution_operation_id:executionId(job)},{status:'REQUESTED',execution_operation_id:next,recovery_request_id:recovery.id});
          return;
        }
        await manager.query("UPDATE refund_recovery_request SET status='BLOCKED',updated_at=now() WHERE id=$1",[recovery.id]);
      }
      const next=state==='SUCCEEDED'?'DONE':state==='FAILED'?'FAILED':state==='NOT_FOUND'?'PENDING':'RECONCILE';
      const status=state==='NOT_FOUND'?'REQUESTED':state;
      await manager.query('UPDATE refund SET status=$2 WHERE id=$1',[refund.id,status]);
      if(recovery&&claim.lookup&&['SUCCEEDED','NOT_FOUND'].includes(state))await manager.query("UPDATE refund_recovery_request SET status=$2,next_execution_id=$3,updated_at=now() WHERE id=$1",[recovery.id,state==='SUCCEEDED'?'RECONCILED':'REQUEUED',state==='NOT_FOUND'?executionId(job):null]);
      if(state==='SUCCEEDED') {
        // Complete only the closed-Order late-payment marker after its verified Refund row.
        const followups=await manager.query("SELECT operation_id FROM payment_followup WHERE payment_id=$1 AND kind='REFUND_REQUIRED' AND status='PENDING'",[payment.id]);
        for(const followup of followups)await new PaymentFollowupPort(manager).complete(followup.operation_id,'REFUNDED');
      }
      const delay=state==='UNKNOWN'?Math.min(300,2**Math.min(job.attempts,8))+Math.random():0;
      await manager.query("UPDATE refund_job SET status=$2,lease_token=NULL,lease_until=NULL,last_error=$3,next_attempt_at=now()+$4*interval '1 second',updated_at=now() WHERE refund_id=$1",[refund.id,next,state==='UNKNOWN'?'RESULT_UNKNOWN':state==='FAILED'?'PROVIDER_REJECTED':null,delay]);
      await audit(manager,'M2',order.customer_user_id,'Refund',refund.id,'PROVIDER_RESULT',job.correlation_id,{status:refund.status},{status,operation_id:job.operation_id});
    });
  }
}

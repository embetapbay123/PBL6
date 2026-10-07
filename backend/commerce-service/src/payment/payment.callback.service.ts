import { DataSource } from 'typeorm';
import { database } from '../../../shared/src/database';
import { ApiError } from '../../../shared/src/errors';
import { audit } from '../../../shared/src/audit';
import { fingerprint } from '../../../shared/src/idempotency';
import type { OperationInputs } from '../../../shared/src/operations.generated';

type Provider = 'SEPAY_TEST' | 'LEGACY_SANDBOX';
interface Callback {
  provider: Provider; eventId:string; reference?:string; result:'SUCCESS'|'FAILED'|'CANCELLED'|'IGNORED';
  amount?:number; payloadHash:string;
}
// A provider ACK confirms durable receipt, not inventory consumption or Order success.
export class PaymentCallbackService {
  constructor(private readonly source:DataSource=database) {}
  async sepay(input:OperationInputs['sepayCallback']['body'],correlation:string) {
    if(process.env.PAYMENT_PROVIDER_MODE!=='sepay_test' || !process.env.SEPAY_TEST_ACCOUNT)
      throw new ApiError(503,'PROVIDER_NOT_CONFIGURED','Cần bật SePay Test và cấu hình tài khoản nhận.');
    if(input.accountNumber!==process.env.SEPAY_TEST_ACCOUNT)
      throw new ApiError(422,'CALLBACK_ACCOUNT_MISMATCH','Tài khoản nhận không khớp.');
    const references=[...new Set(input.content.match(/\bPBL6[A-F0-9]{32}\b/g) ?? [])];
    if(input.code && references.some(reference=>reference!==input.code) || references.length>1)
      throw new ApiError(422,'CALLBACK_REFERENCE_AMBIGUOUS','Callback chứa mã thanh toán mâu thuẫn.');
    const reference=input.code || references[0];
    return this.apply({provider:'SEPAY_TEST',eventId:String(input.id),reference,
      result:input.transferType==='out' || !reference?'IGNORED':'SUCCESS',amount:input.transferAmount,payloadHash:fingerprint(input)},correlation);
  }
  sandbox(input:OperationInputs['sandboxCallback']['body'],correlation:string) {
    // The legacy body signature is compatibility metadata, not authentication. Header HMAC is checked first.
    const {signature:_signature,...payload}=input;
    return this.apply({provider:'LEGACY_SANDBOX',eventId:input.provider_event_id,reference:input.provider_reference,
      result:input.result,payloadHash:fingerprint(payload)},correlation);
  }
  private apply(input:Callback,correlation:string) {
    return this.source.transaction(async manager=>{
      await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['payment-callback:'+input.provider+':'+input.eventId]);
      const [seen]=await manager.query('SELECT * FROM payment_callback_receipt WHERE provider=$1 AND event_id=$2',[input.provider,input.eventId]);
      if(seen){
        if(seen.payload_hash!==input.payloadHash)throw new ApiError(409,'CALLBACK_EVENT_CONFLICT','Event ID đã dùng với dữ liệu khác.');
        return {disposition:seen.disposition as string,duplicate:true};
      }
      let disposition='IGNORED',attemptId:string|null=null;
      if(input.result!=='IGNORED'){
        // Discover immutable IDs, then lock in the same order as Order/Payment/attempt writers.
        const [target]=await manager.query('SELECT a.id,a.payment_id,p.order_id FROM payment_attempt a JOIN payment p ON p.id=a.payment_id WHERE a.provider_reference=$1 AND a.provider=$2',[input.reference,input.provider]);
        if(!target)throw new ApiError(404,'PAYMENT_REFERENCE_NOT_FOUND','Không tìm thấy PaymentAttempt của provider.');
        const [order]=await manager.query('SELECT * FROM "order" WHERE id=$1 FOR UPDATE',[target.order_id]);
        const [payment]=await manager.query('SELECT * FROM payment WHERE id=$1 FOR UPDATE',[target.payment_id]);
        const [attempt]=await manager.query('SELECT * FROM payment_attempt WHERE id=$1 FOR UPDATE',[target.id]);
        attemptId=attempt.id;
        if(order.payment_method!=='SANDBOX' || payment.method!=='SANDBOX' || BigInt(attempt.amount_vnd)!==BigInt(payment.payable_vnd) || BigInt(payment.payable_vnd)!==BigInt(order.payable_vnd))
          throw new ApiError(409,'PAYMENT_SNAPSHOT_CONFLICT','Amount/method của Order/Payment/Attempt không khớp.');
        if(input.result==='SUCCESS'){
          if(input.amount!==undefined && BigInt(input.amount)!==BigInt(attempt.amount_vnd))
            throw new ApiError(422,'CALLBACK_AMOUNT_MISMATCH','Callback phải khớp số tiền của Attempt.');
          if(attempt.status==='SUCCEEDED'){
            if(payment.status!=='SUCCEEDED' || BigInt(payment.collected_vnd)!==BigInt(attempt.amount_vnd))
              throw new ApiError(409,'PAYMENT_RECONCILIATION_REQUIRED','Attempt thành công nhưng Payment không khớp.');
            // A different SePay transaction ID may represent a second bank transfer.
            // Keep its amount for PAY-03 reconciliation; never silently call it a replay.
            disposition=input.provider==='SEPAY_TEST'?'EXTRA_TRANSFER_RECONCILE_REQUIRED':'ALREADY_SUCCEEDED';
          }else{
            if(!['CREATED','PENDING','UNKNOWN','FAILED','CANCELLED','EXPIRED'].includes(attempt.status) || !['PENDING','FAILED','CANCELLED'].includes(payment.status) || BigInt(payment.collected_vnd)!==0n)
              throw new ApiError(409,'PAYMENT_RECONCILIATION_REQUIRED','Không ghi đè tiền đã thu hoặc trạng thái cần đối soát.');
            await manager.query("UPDATE payment_attempt SET status='SUCCEEDED' WHERE id=$1",[attempt.id]);
            await manager.query("UPDATE payment SET status='SUCCEEDED',collected_vnd=$2,version=version+1 WHERE id=$1",[payment.id,attempt.amount_vnd]);
            // Expiry alone does not prove inventory release. Order owner must reconcile before compensation.
            const kind=['EXPIRED','CANCELLED'].includes(order.status)?'REFUND_REQUIRED':
              order.status==='AWAITING_PAYMENT' && order.payment_expires_at && new Date(order.payment_expires_at).getTime()>Date.now()?'CONSUME_REQUIRED':'RECONCILE_REQUIRED';
            await manager.query('INSERT INTO payment_followup(attempt_id,payment_id,order_id,kind,correlation_id) VALUES($1,$2,$3,$4,$5)',[attempt.id,payment.id,order.id,kind,correlation]);
            disposition=kind;
          }
        }else if(attempt.status==='SUCCEEDED' || payment.status==='SUCCEEDED')disposition='STALE';
        else{
          // Failure of an older attempt must not fail a newer active attempt or its Payment.
          const [newer]=await manager.query("SELECT id FROM payment_attempt WHERE payment_id=$1 AND id<>$2 AND status IN ('CREATED','PENDING','UNKNOWN','SUCCEEDED')",[payment.id,attempt.id]);
          if(!['CREATED','PENDING','UNKNOWN'].includes(attempt.status))disposition='STALE';
          else{
            await manager.query('UPDATE payment_attempt SET status=$2 WHERE id=$1',[attempt.id,input.result==='FAILED'?'FAILED':'CANCELLED']);
            if(!newer && payment.status==='PENDING')await manager.query("UPDATE payment SET status='FAILED',version=version+1 WHERE id=$1",[payment.id]);
            disposition=input.result;
          }
        }
        await manager.query('INSERT INTO payment_event(attempt_id,payment_id,provider_event_id,event_type,payload_hash) VALUES($1,$2,$3,$4,$5)',[attempt.id,payment.id,input.provider+':'+input.eventId,input.result,input.payloadHash]);
        await audit(manager,'M2',order.customer_user_id,'Payment',payment.id,'CALLBACK',correlation,{status:payment.status},{disposition,provider:input.provider,attempt_id:attempt.id});
      }
      await manager.query('INSERT INTO payment_callback_receipt(provider,event_id,payload_hash,disposition,attempt_id,amount_vnd) VALUES($1,$2,$3,$4,$5,$6)',[input.provider,input.eventId,input.payloadHash,disposition,attemptId,input.amount ?? null]);
      return {disposition,duplicate:false};
    });
  }
}

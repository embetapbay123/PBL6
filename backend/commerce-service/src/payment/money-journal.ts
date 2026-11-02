import type {EntityManager} from 'typeorm';
import {moneyNumber} from '../../../shared/src/money';
export async function recordMoneyMovement(manager: EntityManager, input: {
  paymentId:string; orderId:string; storeId:string; kind:'COLLECTION'|'REFUND'; amount: string;
  sourceType:string; sourceId:string; occurredAt?:string; timeSource:'SYSTEM_CONFIRMED'|'SYSTEM_RECEIVED'|'OWNER_ATTESTED';
}) {
  if (!manager.queryRunner?.isTransactionActive) throw new Error('MONEY_JOURNAL_REQUIRES_TRANSACTION');
  moneyNumber(input.amount);
  await manager.query(`INSERT INTO money_movement(payment_id,order_id,store_id,kind,amount_vnd,source_type,source_id,occurred_at,time_source)
    VALUES($1,$2,$3,$4,$5,$6,$7,coalesce($8::timestamptz,now()),$9)`,
    [input.paymentId,input.orderId,input.storeId,input.kind,input.amount,input.sourceType,input.sourceId,input.occurredAt ?? null,input.timeSource]);
}

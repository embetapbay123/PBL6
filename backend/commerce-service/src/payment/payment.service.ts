import { EntityManager } from 'typeorm';
import { PaymentPort, PaymentDraft, CodDraft, RefundDraft } from './payment.port';
import { notImplemented } from '../../../shared/src/errors';
// Construct inside orderPaymentUnitOfWork; never open a second transaction here.
export class PaymentService implements PaymentPort {
  constructor(readonly manager:EntityManager) {}
  async createForOrder(_input:PaymentDraft):Promise<never> {return notImplemented('Payment.createForOrder');}
  async recordCodCollection(_input:CodDraft):Promise<never> {return notImplemented('Payment.recordCodCollection');}
  async requestRefund(_input:RefundDraft):Promise<never> {return notImplemented('Payment.requestRefund');}
}

import { EntityManager } from 'typeorm';
export interface PaymentRow {
  id:string;order_id:string;method:'COD'|'SANDBOX';status:string;
  payable_vnd:string;collectible_vnd:string;collected_vnd:string;refunded_vnd:string;version:number;
}
export interface AttemptRow {id:string;payment_id:string;status:string;provider_reference:string;amount_vnd:string;qr_url:string|null;expires_at:Date|null}
export class PaymentRepository {
  constructor(readonly manager:EntityManager) {}
  async lockOrder(id:string) {
    const [row]=await this.manager.query('SELECT * FROM "order" WHERE id=$1 FOR UPDATE',[id]);return row;
  }
  async byOrder(id:string):Promise<PaymentRow|undefined> {
    const [row]=await this.manager.query('SELECT * FROM payment WHERE order_id=$1 FOR UPDATE',[id]);return row;
  }
  async owned(id:string,user:string):Promise<PaymentRow|undefined> {
    const [row]=await this.manager.query('SELECT p.* FROM payment p JOIN "order" o ON o.id=p.order_id WHERE p.id=$1 AND o.customer_user_id=$2',[id,user]);return row;
  }
  async activeAttempt(id:string):Promise<AttemptRow|undefined> {
    const [row]=await this.manager.query("SELECT * FROM payment_attempt WHERE payment_id=$1 AND status IN ('CREATED','PENDING','UNKNOWN','SUCCEEDED') ORDER BY created_at DESC,id DESC LIMIT 1 FOR UPDATE",[id]);return row;
  }
}

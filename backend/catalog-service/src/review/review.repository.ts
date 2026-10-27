import { database } from '../../../shared/src/database';
import { returnedRow } from '../../../shared/src/postgres-returning';
import { EntityManager } from 'typeorm';

/** Columns the contract `Review` exposes; `status` and `version` are optional there. */
const REVIEW_COLUMNS = 'id,order_item_id,product_id,rating,body,status,version';

export class ReviewRepository {
  constructor(private readonly manager:EntityManager=database.manager) {}
  /**
   * Public list of one Product. Only `VISIBLE` reviews are readable, so a hidden review disappears
   * without leaking that it exists; the count and the page share the same predicate.
   */
  async pageVisible(productId: string, page: number, size: number) {
    const [count] = await this.manager.query(
      "SELECT count(*)::int AS total FROM review WHERE product_id=$1 AND status='VISIBLE'", [productId]);
    const items = await this.manager.query(
      `SELECT ${REVIEW_COLUMNS} FROM review WHERE product_id=$1 AND status='VISIBLE'
        ORDER BY created_at DESC, id DESC LIMIT $2 OFFSET $3`,
      [productId, size, (page - 1) * size]);
    const [summary]=await this.manager.query("SELECT count(*)::int AS count,coalesce(avg(rating),0)::float AS average_rating FROM review WHERE product_id=$1 AND status='VISIBLE'",[productId]);
    return { items, total: count.total, page, size,summary };
  }

  /**
   * Ownership is part of the lookup, so another customer's review simply does not exist for this
   * caller and the answer is 404 rather than 403: the id is never confirmed.
   */
  async lockOwnedReview(id: string, customerId: string) {
    const [row] = await this.manager.query(
      'SELECT * FROM review WHERE id=$1 AND customer_user_id=$2 FOR UPDATE', [id, customerId]);
    return row;
  }

  /** `body` is cleared only when the caller actually sent the field, hence the separate flag. */
  async updateReview(id: string, fields: { rating?: number; body?: string | null; replaceBody: boolean }) {
    await this.manager.query(
      `UPDATE review SET rating=coalesce($1,rating), body=CASE WHEN $2 THEN $3 ELSE body END,
              updated_at=now(), version=version+1 WHERE id=$4`,
      [fields.rating ?? null, fields.replaceBody, fields.body ?? null, id]);
    const [row] = await this.manager.query(`SELECT ${REVIEW_COLUMNS} FROM review WHERE id=$1`, [id]);
    return returnedRow<any>([row]);
  }

  async audit(customerId: string, reviewId: string, action: string, reason: string,
    requestId: string, before: any, after: any) {
    await this.manager.query(
      `INSERT INTO m1_audit(actor_user_id,target_type,target_id,action,reason,request_id,before_json,after_json)
       VALUES($1,'Review',$2,$3,$4,$5,$6::jsonb,$7::jsonb)`,
      [customerId, reviewId, action, reason, requestId, JSON.stringify(before), JSON.stringify(after)]);
    await this.manager.query('INSERT INTO review_audit(review_id,actor_user_id,action,reason) VALUES($1,$2,$3,$4)',[reviewId,customerId,action,reason]);
  }
}

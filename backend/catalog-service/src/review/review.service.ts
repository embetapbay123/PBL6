import type { OperationOutputs,OperationInputs } from '../../../shared/src/operations.generated';
import { ApiError } from '../../../shared/src/errors';
import { ReviewRepository } from './review.repository';
import { DataSource } from 'typeorm';
import { database } from '../../../shared/src/database';
import { config } from '../../../shared/src/config';
import { InternalClients } from '../../../shared/src/internal-clients';

/** `body` is optional in the contract, so it is omitted rather than sent as null. */
export function reviewResponse(row: any): OperationOutputs['updateReview'] {
  return { id: row.id, order_item_id: row.order_item_id, product_id: row.product_id, rating: row.rating,
    ...(row.body == null ? {} : { body: row.body }),
    ...(row.status == null ? {} : { status: row.status }),
    ...(row.version == null ? {} : { version: row.version }) };
}

export class ReviewService {
  constructor(private readonly suppliedRepository?:ReviewRepository,private readonly suppliedSource?:DataSource,
    private readonly eligibility?:(input:OperationInputs['VerifyReviewEligibility']['body'])=>Promise<OperationOutputs['VerifyReviewEligibility']>) {}
  private get source(){return this.suppliedSource??database}
  private get repository(){return this.suppliedRepository??new ReviewRepository(this.source.manager)}

  async createReview(body:OperationInputs['createReview']['body'],context:any,correlation:string):Promise<OperationOutputs['createReview']> {
    const customer=context?.user_id;
    if(!customer)throw new ApiError(401,'UNAUTHENTICATED','Cần đăng nhập.');
    const input={order_item_id:body.order_item_id,customer_user_id:customer};
    const resolve=()=>{const c=config('M1');return new InternalClients('M1',c.internalKeys.M1,{M1:c.catalogUrl,M2:process.env.COMMERCE_URL??'http://m2:3102',M3:c.identityUrl}).call('VerifyReviewEligibility',input,correlation)};
    const eligible=await (this.eligibility?this.eligibility(input):resolve());
    if(!eligible.eligible)throw new ApiError(409,'REVIEW_NOT_ELIGIBLE',eligible.reason??'Mục đơn hàng chưa đủ điều kiện đánh giá.');
    if(!eligible.product_id)throw new ApiError(503,'DEPENDENCY_CONTRACT_INVALID','M2 chưa trả Product của mục đơn hàng.');
    return this.source.transaction(async manager=>{
      await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['review:'+body.order_item_id]);
      const [existing]=await manager.query('SELECT * FROM review WHERE order_item_id=$1',[body.order_item_id]);
      if(existing){
        if(existing.customer_user_id===customer && existing.rating===body.rating && (existing.body??'')===(body.body??''))return reviewResponse(existing);
        throw new ApiError(409,'REVIEW_ALREADY_EXISTS','Mục đơn hàng đã được đánh giá.');
      }
      const [product]=await manager.query('SELECT id FROM product WHERE id=$1',[eligible.product_id]);
      if(!product)throw new ApiError(404,'NOT_FOUND','Không tìm thấy sản phẩm đã mua.');
      const [row]=await manager.query(`INSERT INTO review(product_id,order_item_id,customer_user_id,rating,body,status,updated_at)
        VALUES($1,$2,$3,$4,$5,'VISIBLE',now()) RETURNING *`,[eligible.product_id,body.order_item_id,customer,body.rating,body.body??null]);
      await new ReviewRepository(manager).audit(customer,row.id,'REVIEW_CREATED','Created',correlation,{},reviewResponse(row));
      return reviewResponse(row);
    });
  }

  /**
   * listProductReviews — public, paged, and visibility-filtered.
   *
   * The Product id comes from the path and is not validated against the catalogue: a Product with no
   * visible review answers an empty page, which is the same thing a shopper should see, and it keeps
   * this read independent of Store state.
   */
  async listProductReviews(id: string, query: { page?: number; size?: number }): Promise<OperationOutputs['listProductReviews']> {
    const page = await this.repository.pageVisible(id, query.page ?? 1, query.size ?? 20);
    return { items: page.items.map(reviewResponse), total: page.total, page: page.page, size: page.size,summary:page.summary };
  }

  /**
   * updateReview — the author may change the rating and the text.
   *
   * Ownership is part of the lookup and `expected_version` guards concurrent edits; the moderation
   * state is never touched here, so a hidden review stays hidden after its author edits it.
   */
  async updateReview(id: string, body: { rating?: number; body?: string; expected_version: number },
    context: any, correlation: string): Promise<OperationOutputs['updateReview']> {
    const customerId = context?.user_id;
    if (!customerId) throw new ApiError(401, 'UNAUTHENTICATED', 'Cần đăng nhập.');

    return this.source.transaction(async manager=>{
    const repository=new ReviewRepository(manager);
    const existing = await repository.lockOwnedReview(id, customerId);
    if (!existing) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy đánh giá của bạn.');
    if (existing.version !== body.expected_version) {
      throw new ApiError(409, 'VERSION_CONFLICT', 'Đánh giá đã thay đổi. Vui lòng tải lại.');
    }
    if (body.rating === undefined && body.body === undefined) {
      throw new ApiError(422, 'VALIDATION_FAILED', 'Cần trường thay đổi.');
    }

    const updated = await repository.updateReview(id, {
      rating: body.rating, body: body.body, replaceBody: Object.hasOwn(body, 'body') });
    await repository.audit(customerId, id, 'REVIEW_UPDATED', 'Updated', correlation,
      { rating: existing.rating, body: existing.body, version: existing.version },
      { rating: updated.rating, body: updated.body, version: updated.version });
    return reviewResponse(updated);
    });
  }
}

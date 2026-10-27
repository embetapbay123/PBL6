import type { OperationOutputs } from '../../../shared/src/operations.generated';
import { ApiError } from '../../../shared/src/errors';
import { ReviewRepository } from './review.repository';

/** `body` is optional in the contract, so it is omitted rather than sent as null. */
export function reviewResponse(row: any): OperationOutputs['updateReview'] {
  return { id: row.id, order_item_id: row.order_item_id, product_id: row.product_id, rating: row.rating,
    ...(row.body == null ? {} : { body: row.body }),
    ...(row.status == null ? {} : { status: row.status }),
    ...(row.version == null ? {} : { version: row.version }) };
}

export class ReviewService {
  constructor(private readonly repository = new ReviewRepository()) {}

  /**
   * listProductReviews — public, paged, and visibility-filtered.
   *
   * The Product id comes from the path and is not validated against the catalogue: a Product with no
   * visible review answers an empty page, which is the same thing a shopper should see, and it keeps
   * this read independent of Store state.
   */
  async listProductReviews(id: string, query: { page?: number; size?: number }): Promise<OperationOutputs['listProductReviews']> {
    const page = await this.repository.pageVisible(id, query.page ?? 1, query.size ?? 20);
    return { items: page.items.map(reviewResponse), total: page.total, page: page.page, size: page.size };
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

    const existing = await this.repository.lockOwnedReview(id, customerId);
    if (!existing) throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy đánh giá của bạn.');
    if (existing.version !== body.expected_version) {
      throw new ApiError(409, 'VERSION_CONFLICT', 'Đánh giá đã thay đổi. Vui lòng tải lại.');
    }
    if (body.rating === undefined && body.body === undefined) {
      throw new ApiError(422, 'VALIDATION_FAILED', 'Cần trường thay đổi.');
    }

    const updated = await this.repository.updateReview(id, {
      rating: body.rating, body: body.body, replaceBody: Object.hasOwn(body, 'body') });
    await this.repository.audit(customerId, id, 'REVIEW_UPDATED', 'Updated', correlation,
      { rating: existing.rating, body: existing.body, version: existing.version },
      { rating: updated.rating, body: updated.body, version: updated.version });
    return reviewResponse(updated);
  }
}

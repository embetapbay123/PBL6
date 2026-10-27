import { Body, Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, Public, Roles } from '../../../shared/src/auth';
import { ListProductReviewsPathDto, UpdateReviewBodyDto, UpdateReviewPathDto } from '../../../shared/src/dtos.generated';
import { ReviewService } from './review.service';

/**
 * Customer reviews. The list is public reference data; the edit is scoped to the caller's own review.
 *
 * `createReview` stays in the skeleton controller: `ReviewCreate` carries no `product_id`, while M2
 * `VerifyReviewEligibility` requires one, and no internal operation resolves an order item to its
 * Product. Adding that field or lookup is a contract change owned by FLOW-01, so the route is left
 * as an explicit not-implemented rather than guessing a Product.
 */
@Controller()
export class ReviewController {
  private readonly service = new ReviewService();
  @Get('products/:id/reviews') @Public()
  listProductReviews(@Param() p: ListProductReviewsPathDto, @Req() r: any) {
    return this.service.listProductReviews(p.id, r.contract.query);
  }
  @Patch('me/reviews/:id') @UseGuards(AuthGuard) @Roles('CUSTOMER')
  updateReview(@Param() p: UpdateReviewPathDto, @Body() b: UpdateReviewBodyDto, @Req() r: any) {
    return this.service.updateReview(p.id, b, r.auth, r.correlationId ?? '');
  }
}

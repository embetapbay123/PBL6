import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, Public, Roles } from '../../../shared/src/auth';
import { CreateReviewBodyDto,ListProductReviewsPathDto, UpdateReviewBodyDto, UpdateReviewPathDto } from '../../../shared/src/dtos.generated';
import { ReviewService } from './review.service';

/**
 * Customer reviews. The list is public reference data; the edit is scoped to the caller's own review.
 *
 * M2 resolves the Product of the owned eligible OrderItem; the public caller never supplies a
 * trusted Product/Customer identity. Review edits and audit share the same transaction manager.
 */
@Controller()
export class ReviewController {
  private readonly service = new ReviewService();
  @Post('me/reviews') @UseGuards(AuthGuard) @Roles('CUSTOMER')
  create(@Body() b:CreateReviewBodyDto,@Req() r:any){return this.service.createReview(b,r.auth,r.correlationId)}
  @Get('products/:id/reviews') @Public()
  listProductReviews(@Param() p: ListProductReviewsPathDto, @Req() r: any) {
    return this.service.listProductReviews(p.id, r.contract.query);
  }
  @Patch('me/reviews/:id') @UseGuards(AuthGuard) @Roles('CUSTOMER')
  updateReview(@Param() p: UpdateReviewPathDto, @Body() b: UpdateReviewBodyDto, @Req() r: any) {
    return this.service.updateReview(p.id, b, r.auth, r.correlationId ?? '');
  }
}

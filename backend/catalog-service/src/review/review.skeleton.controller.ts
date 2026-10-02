// GENERATED from OpenAPI; replace implementations deliberately, do not regenerate after editing.
import { Controller, Get, Post, Patch, Delete, UseGuards } from '@nestjs/common';
import { AuthGuard, Public, Roles } from '../../../shared/src/auth';
import { notImplemented } from '../../../shared/src/errors';
@Controller() @UseGuards(AuthGuard)
export class ReviewSkeletonController {
  @Post('me/reviews') @Roles("CUSTOMER")
  createReview(): never { return notImplemented('createReview'); }
  @Get('products/:id/reviews') @Public()
  listProductReviews(): never { return notImplemented('listProductReviews'); }
  @Patch('me/reviews/:id') @Roles("CUSTOMER")
  updateReview(): never { return notImplemented('updateReview'); }
  @Post('admin/reviews/:id/hide') @Roles("ADMIN")
  hideReview(): never { return notImplemented('hideReview'); }
  @Post('admin/reviews/:id/restore') @Roles("ADMIN")
  restoreReview(): never { return notImplemented('restoreReview'); }
}

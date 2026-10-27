// GENERATED from OpenAPI; replace implementations deliberately, do not regenerate after editing.
import { Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard, Roles } from '../../../shared/src/auth';
import { notImplemented } from '../../../shared/src/errors';
@Controller() @UseGuards(AuthGuard)
export class ReviewSkeletonController {
  // `ReviewCreate` carries no product_id while M2 `VerifyReviewEligibility` requires one, and no
  // internal operation resolves an order item to its Product; that field or lookup is a FLOW-01
  // contract change, so the route stays an explicit not-implemented instead of guessing a Product.
  // All Review operations are implemented by ReviewController and ModerationController.
}

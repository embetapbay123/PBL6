import { Controller,Post,UseGuards } from '@nestjs/common';
import { ServiceGuard,ServiceCallers } from '../../../shared/src/auth';
import { notImplemented } from '../../../shared/src/errors';
@Controller('internal') @UseGuards(ServiceGuard) @ServiceCallers('M1')
export class ReviewEligibilityInternalController {
  @Post('reviews/eligibility') eligibility():never {return notImplemented('VerifyReviewEligibility');}
}

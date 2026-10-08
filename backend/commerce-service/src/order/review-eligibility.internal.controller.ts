import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ServiceGuard, ServiceCallers } from '../../../shared/src/auth';
import { VerifyReviewEligibilityBodyDto } from '../../../shared/src/dtos.generated';
import { OrderService } from './order.service';

@Controller('internal')
@UseGuards(ServiceGuard)
@ServiceCallers('M1')
export class ReviewEligibilityInternalController {
  private readonly service = new OrderService();

  @Post('reviews/eligibility')
  @HttpCode(200)
  eligibility(@Body() body: VerifyReviewEligibilityBodyDto) {
    return this.service.verifyReviewEligibility(body);
  }
}

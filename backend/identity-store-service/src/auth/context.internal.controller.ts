import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ServiceGuard, ServiceCallers } from '../../../shared/src/auth';
import { IdLookupService } from './id-lookup.service';
import { ResolveAiMetricsScopeBodyDto, ResolveCheckoutContextBodyDto } from '../../../shared/src/dtos.generated';

@Controller('internal') @UseGuards(ServiceGuard)
export class ContextInternalController {
  private readonly service = new IdLookupService();
  @Post('checkout/context') @HttpCode(200) @ServiceCallers('M2')
  checkout(@Body() input: ResolveCheckoutContextBodyDto) {
    return this.service.resolveCheckoutContext(input);
  }

  @Post('ai/metrics-scope') @HttpCode(200) @ServiceCallers('M4')
  metrics(@Body() input: ResolveAiMetricsScopeBodyDto) {
    return this.service.resolveAiMetricsScope(input);
  }
}

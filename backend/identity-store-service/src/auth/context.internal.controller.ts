import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ServiceGuard, ServiceCallers } from '../../../shared/src/auth';
import { IdLookupService } from './id-lookup.service';
import { ResolveAiMetricsScopeRequestDto, ResolveCheckoutContextRequestDto } from './id-lookup.dto';

@Controller('internal') @UseGuards(ServiceGuard)
export class ContextInternalController {
  private readonly service = new IdLookupService();

  @Post('checkout/context') @ServiceCallers('M2')
  checkout(@Body() input: ResolveCheckoutContextRequestDto) {
    return this.service.resolveCheckoutContext(input);
  }

  @Post('ai/metrics-scope') @ServiceCallers('M4')
  metrics(@Body() input: ResolveAiMetricsScopeRequestDto) {
    return this.service.resolveAiMetricsScope(input);
  }
}

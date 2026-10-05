import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ServiceGuard, ServiceCallers } from '../../../shared/src/auth';
import { notImplemented } from '../../../shared/src/errors';
import { ResolveAiMetricsScopeBodyDto, ResolveCheckoutContextBodyDto } from '../../../shared/src/dtos.generated';

@Controller('internal') @UseGuards(ServiceGuard)
export class ContextInternalController {
  @Post('checkout/context') @ServiceCallers('M2')
  checkout(@Body() _input: ResolveCheckoutContextBodyDto): never {
    return notImplemented('ResolveCheckoutContext');
  }

  @Post('ai/metrics-scope') @ServiceCallers('M4')
  metrics(@Body() _input: ResolveAiMetricsScopeBodyDto): never {
    return notImplemented('ResolveAiMetricsScope');
  }
}

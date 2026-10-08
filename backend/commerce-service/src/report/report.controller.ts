import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, Roles } from '../../../shared/src/auth';
import { ReportService } from './report.service';

@Controller()
@UseGuards(AuthGuard)
export class ReportController {
  private readonly service = new ReportService();

  @Get('admin/orders')
  @Roles('ADMIN')
  listAllOrders(@Req() req: any) {
    return this.service.listAllOrders(req.contract?.query ?? req.query ?? {}, req.auth, req.correlationId);
  }

  @Get('admin/dashboard')
  @Roles('ADMIN')
  getPlatformDashboard(@Req() req: any) {
    return this.service.getPlatformDashboard(req.auth, req.correlationId);
  }

  @Get('store/reports')
  @Roles('STORE_OWNER')
  getStoreReport(@Req() req: any) {
    return this.service.getStoreReport(req.contract?.query ?? req.query ?? {}, req.auth, req.correlationId);
  }
}

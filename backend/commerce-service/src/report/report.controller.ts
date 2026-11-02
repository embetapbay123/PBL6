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

  @Get('admin/reports') @Roles('ADMIN')
  platformReport(@Req() req:any){return this.service.getPlatformMoneyReport(req.contract.query,req.auth);}
  @Get('store/reports/unresolved-money') @Roles('STORE_OWNER')
  storeUnresolved(@Req() req:any){return this.service.listUnresolvedMoney(req.contract.query,req.auth);}
  @Get('admin/reports/unresolved-money') @Roles('ADMIN')
  adminUnresolved(@Req() req:any){return this.service.listUnresolvedMoney(req.contract.query,req.auth,true);}

  @Get('store/reports/money') @Roles('STORE_OWNER')
  storeMoney(@Req() req:any){return this.service.listMoney(req.contract.query,req.auth);}
  @Get('admin/reports/money') @Roles('ADMIN')
  adminMoney(@Req() req:any){return this.service.listMoney(req.contract.query,req.auth,true);}

  @Get('store/reports')
  @Roles('STORE_OWNER')
  getStoreReport(@Req() req: any) {
    return this.service.getStoreReport(req.contract?.query ?? req.query ?? {}, req.auth, req.correlationId);
  }
}

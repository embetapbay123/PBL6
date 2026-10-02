// GENERATED from OpenAPI; replace implementations deliberately, do not regenerate after editing.
import { Controller, Get, Post, Patch, Delete, UseGuards } from '@nestjs/common';
import { AuthGuard, Public, Roles } from '../../../shared/src/auth';
import { notImplemented } from '../../../shared/src/errors';
@Controller() @UseGuards(AuthGuard)
export class ReportSkeletonController {
  @Get('admin/orders') @Roles("ADMIN")
  listAllOrders(): never { return notImplemented('listAllOrders'); }
  @Get('admin/dashboard') @Roles("ADMIN")
  getPlatformDashboard(): never { return notImplemented('getPlatformDashboard'); }
  @Get('store/reports') @Roles("STORE_OWNER")
  getStoreReport(): never { return notImplemented('getStoreReport'); }
}

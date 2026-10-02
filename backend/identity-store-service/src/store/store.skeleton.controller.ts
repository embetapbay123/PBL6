// GENERATED from OpenAPI; replace implementations deliberately, do not regenerate after editing.
import { Controller, Get, Post, Patch, Delete, UseGuards } from '@nestjs/common';
import { AuthGuard, Public, Roles } from '../../../shared/src/auth';
import { notImplemented } from '../../../shared/src/errors';
@Controller() @UseGuards(AuthGuard)
export class StoreSkeletonController {
  @Post('me/store-applications') @Roles("CUSTOMER")
  submitStoreApplication(): never { return notImplemented('submitStoreApplication'); }
  @Get('me/store-applications') @Roles("CUSTOMER")
  listOwnStoreApplications(): never { return notImplemented('listOwnStoreApplications'); }
  @Get('admin/store-applications') @Roles("ADMIN")
  listStoreApplications(): never { return notImplemented('listStoreApplications'); }
  @Get('store') @Roles("SELLER","STORE_OWNER")
  getOwnStore(): never { return notImplemented('getOwnStore'); }
  @Patch('store') @Roles("STORE_OWNER")
  updateOwnStore(): never { return notImplemented('updateOwnStore'); }
  @Patch('admin/store-applications/:id') @Roles("ADMIN")
  reviewStoreApplication(): never { return notImplemented('reviewStoreApplication'); }
}

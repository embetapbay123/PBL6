// GENERATED from OpenAPI; replace implementations deliberately, do not regenerate after editing.
import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, Roles } from '../../../shared/src/auth';
import { notImplemented } from '../../../shared/src/errors';
import { UpdateOwnStoreBodyDto } from '../../../shared/src/dtos.generated';
import { StoreService } from './store.service';

@Controller() @UseGuards(AuthGuard)
export class StoreSkeletonController {
  private readonly service = new StoreService();

  @Post('me/store-applications') @Roles("CUSTOMER")
  submitStoreApplication(): never { return notImplemented('submitStoreApplication'); }

  @Get('me/store-applications') @Roles("CUSTOMER")
  listOwnStoreApplications(): never { return notImplemented('listOwnStoreApplications'); }

  @Get('admin/store-applications') @Roles("ADMIN")
  listStoreApplications(): never { return notImplemented('listStoreApplications'); }

  @Get('store') @Roles("SELLER","STORE_OWNER")
  getOwnStore(@Req() req: any) {
    return this.service.getOwnStore(req.auth.user_id);
  }

  @Patch('store') @Roles("STORE_OWNER")
  updateOwnStore(@Req() req: any, @Body() body: UpdateOwnStoreBodyDto) {
    return this.service.updateOwnStore(req.auth.user_id, body, req.correlationId ?? '');
  }

  @Patch('admin/store-applications/:id') @Roles("ADMIN")
  reviewStoreApplication(): never { return notImplemented('reviewStoreApplication'); }
}

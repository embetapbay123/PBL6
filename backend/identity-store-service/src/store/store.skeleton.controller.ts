// GENERATED from OpenAPI; replace implementations deliberately, do not regenerate after editing.
import { Body, Controller, Get, Patch, Post, Query, Param, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, Roles, ServiceCallers, ServiceGuard } from '../../../shared/src/auth';
import {
  ListOwnStoreApplicationsQueryDto, ListStoreApplicationsQueryDto, ReviewStoreApplicationBodyDto,
  ReviewStoreApplicationPathDto, SubmitStoreApplicationBodyDto, UpdateOwnStoreBodyDto,
} from '../../../shared/src/dtos.generated';
import { StoreService } from './store.service';

@Controller() @UseGuards(AuthGuard)
export class StoreSkeletonController {
  private readonly service = new StoreService();

  @Post('me/store-applications') @Roles("CUSTOMER")
  submitStoreApplication(@Req() req: any, @Body() body: SubmitStoreApplicationBodyDto) {
    return this.service.submitStoreApplication(req.auth.user_id, body, req.correlationId ?? '');
  }

  @Get('me/store-applications') @Roles("CUSTOMER")
  listOwnStoreApplications(@Req() req: any, @Query() query: ListOwnStoreApplicationsQueryDto) {
    return this.service.listOwnStoreApplications(req.auth.user_id, query.page, query.size);
  }

  @Get('admin/store-applications') @Roles("ADMIN")
  listStoreApplications(@Query() query: ListStoreApplicationsQueryDto) {
    return this.service.listStoreApplications(query.page, query.size);
  }

  @Get('store') @Roles("SELLER","STORE_OWNER")
  getOwnStore(@Req() req: any) {
    return this.service.getOwnStore(req.auth.user_id);
  }

  @Patch('store') @Roles("STORE_OWNER")
  updateOwnStore(@Req() req: any, @Body() body: UpdateOwnStoreBodyDto) {
    return this.service.updateOwnStore(req.auth.user_id, body, req.correlationId ?? '');
  }

  @Patch('admin/store-applications/:id') @Roles("ADMIN")
  reviewStoreApplication(@Req() req: any, @Param() params: ReviewStoreApplicationPathDto, @Body() body: ReviewStoreApplicationBodyDto) {
    return this.service.reviewStoreApplication(params.id, body, req.auth.user_id, req.correlationId ?? '');
  }
}

@Controller('internal') @UseGuards(ServiceGuard)
export class StoreInternalController {
  private readonly service = new StoreService();

  @Get('stores/active') @ServiceCallers('M1', 'M2', 'M4')
  activeStores() {
    return this.service.listActiveStoreIds();
  }
}

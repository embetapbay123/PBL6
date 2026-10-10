import { Body, Controller, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, Roles } from '../../../shared/src/auth';
import {
  ListStoresQueryDto,
  ListUsersQueryDto,
  UpdateRoleBodyDto,
  UpdateRolePathDto,
  UpdateStoreStateBodyDto,
  UpdateStoreStatePathDto,
  UpdateUserStateBodyDto,
  UpdateUserStatePathDto,
} from '../../../shared/src/dtos.generated';
import { AdministrationService } from './administration.service';

@Controller() @UseGuards(AuthGuard)
export class AdministrationSkeletonController {
  private readonly service = new AdministrationService();

  @Get('admin/users') @Roles("ADMIN")
  async listUsers(@Query() query: ListUsersQueryDto) {
    return this.service.listUsers(query.page, query.size);
  }

  @Get('admin/stores') @Roles("ADMIN")
  async listStores(@Query() query: ListStoresQueryDto) {
    return this.service.listStores(query.page, query.size);
  }

  @Patch('admin/users/:id') @Roles("ADMIN")
  async updateUserState(
    @Param() params: UpdateUserStatePathDto,
    @Body() body: UpdateUserStateBodyDto,
    @Req() req: any
  ) {
    return this.service.updateUserState(
      params.id,
      body.status,
      body.reason,
      body.expected_version,
      req.auth?.user_id,
      req.correlationId ?? ''
    );
  }

  @Patch('admin/stores/:id') @Roles("ADMIN")
  async updateStoreState(
    @Param() params: UpdateStoreStatePathDto,
    @Body() body: UpdateStoreStateBodyDto,
    @Req() req: any
  ) {
    return this.service.updateStoreState(
      params.id,
      body.status,
      body.reason,
      body.expected_version,
      req.auth?.user_id,
      req.correlationId ?? ''
    );
  }

  @Patch('admin/roles/:id') @Roles("ADMIN")
  async updateRole(
    @Param() params: UpdateRolePathDto,
    @Body() body: UpdateRoleBodyDto,
    @Req() req: any
  ) {
    return this.service.updateRole(
      params.id,
      body.permission_ids,
      body.expected_version,
      req.auth?.user_id,
      req.correlationId ?? ''
    );
  }
}

// GENERATED from OpenAPI; replace implementations deliberately, do not regenerate after editing.
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, Roles } from '../../../shared/src/auth';
import {
  CreateAddressBodyDto,
  DeleteAddressPathDto,
  ListAddressesQueryDto,
  UpdateAddressBodyDto,
  UpdateAddressPathDto,
  UpdateProfileBodyDto,
} from '../../../shared/src/dtos.generated';
import type { Request } from 'express';
import type { CreateAddressRequest, UpdateAddressRequest } from './dtos';
import { ProfileService } from './profile.service';

type AuthenticatedRequest = Request & { auth: { user_id: string }; correlationId?: string };

@Controller() @UseGuards(AuthGuard)
export class ProfileSkeletonController {
  @Patch('me') @Roles("AUTHENTICATED")
  updateProfile(@Req() req: AuthenticatedRequest, @Body() body: UpdateProfileBodyDto) {
    return this.service.updateProfile(req.auth.user_id, body, req.correlationId ?? '');
  }

  private readonly service = new ProfileService();

  @Get('me/addresses') @Roles("CUSTOMER")
  listAddresses(@Req() req: AuthenticatedRequest, @Query() query: ListAddressesQueryDto) {
    return this.service.listAddresses(req.auth.user_id, query.page, query.size);
  }

  @Post('me/addresses') @Roles("CUSTOMER")
  createAddress(@Req() req: AuthenticatedRequest, @Body() body: CreateAddressBodyDto) {
    return this.service.createAddress(req.auth.user_id, body as CreateAddressRequest, req.correlationId ?? '');
  }

  @Patch('me/addresses/:id') @Roles("CUSTOMER")
  updateAddress(@Req() req: AuthenticatedRequest, @Param() params: UpdateAddressPathDto, @Body() body: UpdateAddressBodyDto) {
    return this.service.updateAddress(req.auth.user_id, params.id, body as UpdateAddressRequest, req.correlationId ?? '');
  }

  @Delete('me/addresses/:id') @Roles("CUSTOMER")
  deleteAddress(@Req() req: AuthenticatedRequest, @Param() params: DeleteAddressPathDto) {
    return this.service.deleteAddress(req.auth.user_id, params.id, req.correlationId ?? '');
  }
}

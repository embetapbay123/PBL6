import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { IsArray, IsEmail, IsInt, IsString, Max, MaxLength, Min } from 'class-validator';
import { AuthGuard, Roles } from '../../../shared/src/auth';
import { ApiError } from '../../../shared/src/errors';
import { StaffService } from './staff.service';
import { ListStoreStaffQueryDto, UpdateStaffBodyDto, UpdateStaffPathDto } from '../../../shared/src/dtos.generated';
import { AuthService } from '../auth/auth.service';

class PageQueryDto {
  @IsInt() @Min(1) @Max(1_000_000) page = 1;
  @IsInt() @Min(1) @Max(100) size = 20;
}
class InviteStaffDto {
  @IsEmail() @MaxLength(254) invited_email!: string;
  @IsArray() @IsString({ each: true }) @MaxLength(200, { each: true }) permissions!: string[];
}

@Controller() @UseGuards(AuthGuard)
export class StaffSkeletonController {
  private readonly service: StaffService;
  constructor(authService: AuthService) {
    this.service = new StaffService(undefined, email => authService.sendStaffInvitationEmail(email));
  }
  private context(req: any) {
    const userId = req.auth?.user_id;
    if (!userId) throw new ApiError(401, 'UNAUTHENTICATED', 'Vui lòng đăng nhập.');
    return { userId, storeId: req.auth?.store_membership?.store_id };
  }
  private ownerScope(req: any) {
    const { userId, storeId } = this.context(req);
    if (!storeId || req.auth?.store_membership?.role !== 'OWNER' || req.auth?.store_membership?.status !== 'ACTIVE') {
      throw new ApiError(403, 'FORBIDDEN', 'Cần Owner membership đang hoạt động.');
    }
    return { userId, storeId };
  }

  @Get('store/staff/invitations') @Roles('STORE_OWNER')
  listStaffInvitations(@Req() req: any, @Query() query: PageQueryDto) {
    const scope = this.ownerScope(req);
    return this.service.listStoreInvitations(scope.userId, scope.storeId, query.page, query.size);
  }

  @Get('store/staff') @Roles('STORE_OWNER')
  listStoreStaff(@Req() req: any, @Query() query: ListStoreStaffQueryDto) {
    const scope = this.ownerScope(req);
    return this.service.listStaff(scope.userId, scope.storeId, query.page, query.size);
  }

  @Patch('store/staff/:id') @Roles('STORE_OWNER')
  updateStaff(@Req() req: any, @Param() params: UpdateStaffPathDto, @Body() body: UpdateStaffBodyDto) {
    const scope = this.ownerScope(req);
    return this.service.updateStaff(scope.userId, scope.storeId, params.id, body, req.correlationId ?? '');
  }

  @Post('store/staff/invitations') @Roles('STORE_OWNER') @HttpCode(201)
  inviteStaff(@Req() req: any, @Body() body: InviteStaffDto) {
    const scope = this.ownerScope(req);
    return this.service.createInvitation(scope.userId, scope.storeId, body, req.correlationId ?? '');
  }

  @Get('me/invitations') @Roles('CUSTOMER')
  listOwnInvitations(@Req() req: any, @Query() query: PageQueryDto) {
    return this.service.listOwnInvitations(this.context(req).userId, query.page, query.size);
  }

  @Post('store/staff/invitations/:id/revoke') @Roles('STORE_OWNER') @HttpCode(200)
  revokeStaffInvitation(@Req() req: any, @Param('id') id: string) {
    const scope = this.ownerScope(req);
    return this.service.revokeInvitation(scope.userId, scope.storeId, id, req.correlationId ?? '');
  }

  @Post('me/invitations/:id/accept') @Roles('CUSTOMER') @HttpCode(200)
  acceptInvitation(@Req() req: any, @Param('id') id: string) {
    return this.service.acceptInvitation(this.context(req).userId, id, req.correlationId ?? '');
  }
}

// GENERATED from OpenAPI; replace implementations deliberately, do not regenerate after editing.
import { Controller, Get, Post, Patch, Delete, UseGuards } from '@nestjs/common';
import { AuthGuard, Public, Roles } from '../../../shared/src/auth';
import { notImplemented } from '../../../shared/src/errors';
@Controller() @UseGuards(AuthGuard)
export class StaffSkeletonController {
  @Get('store/staff') @Roles("STORE_OWNER")
  listStoreStaff(): never { return notImplemented('listStoreStaff'); }
  @Get('store/staff/invitations') @Roles("STORE_OWNER")
  listStaffInvitations(): never { return notImplemented('listStaffInvitations'); }
  @Post('store/staff/invitations') @Roles("STORE_OWNER")
  inviteStaff(): never { return notImplemented('inviteStaff'); }
  @Get('me/invitations') @Roles("CUSTOMER")
  listOwnInvitations(): never { return notImplemented('listOwnInvitations'); }
  @Post('store/staff/invitations/:id/revoke') @Roles("STORE_OWNER")
  revokeStaffInvitation(): never { return notImplemented('revokeStaffInvitation'); }
  @Post('me/invitations/:id/accept') @Roles("CUSTOMER")
  acceptInvitation(): never { return notImplemented('acceptInvitation'); }
  @Patch('store/staff/:id') @Roles("STORE_OWNER")
  updateStaff(): never { return notImplemented('updateStaff'); }
}

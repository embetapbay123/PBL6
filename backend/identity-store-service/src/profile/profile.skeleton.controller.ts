// GENERATED from OpenAPI; replace implementations deliberately, do not regenerate after editing.
import { Controller, Get, Post, Patch, Delete, UseGuards } from '@nestjs/common';
import { AuthGuard, Public, Roles } from '../../../shared/src/auth';
import { notImplemented } from '../../../shared/src/errors';
@Controller() @UseGuards(AuthGuard)
export class ProfileSkeletonController {
  @Patch('me') @Roles("AUTHENTICATED")
  updateProfile(): never { return notImplemented('updateProfile'); }
  @Get('me/addresses') @Roles("CUSTOMER")
  listAddresses(): never { return notImplemented('listAddresses'); }
  @Post('me/addresses') @Roles("CUSTOMER")
  createAddress(): never { return notImplemented('createAddress'); }
  @Patch('me/addresses/:id') @Roles("CUSTOMER")
  updateAddress(): never { return notImplemented('updateAddress'); }
  @Delete('me/addresses/:id') @Roles("CUSTOMER")
  deleteAddress(): never { return notImplemented('deleteAddress'); }
}

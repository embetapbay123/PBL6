// GENERATED from OpenAPI; replace implementations deliberately, do not regenerate after editing.
import { Controller, Get, Post, Patch, Delete, UseGuards } from '@nestjs/common';
import { AuthGuard, Public, Roles } from '../../../shared/src/auth';
import { notImplemented } from '../../../shared/src/errors';
@Controller() @UseGuards(AuthGuard)
export class AuthSkeletonController {
  @Post('auth/register') @Public()
  register(): never { return notImplemented('register'); }
  @Post('auth/verify-email') @Public()
  verifyEmail(): never { return notImplemented('verifyEmail'); }
  @Post('auth/reset-password') @Public()
  resetPassword(): never { return notImplemented('resetPassword'); }
  @Post('auth/reset-password/confirm') @Public()
  confirmResetPassword(): never { return notImplemented('confirmResetPassword'); }
  @Post('auth/change-password') @Roles("AUTHENTICATED")
  changePassword(): never { return notImplemented('changePassword'); }
}

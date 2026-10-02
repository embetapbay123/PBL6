// GENERATED from OpenAPI; replace implementations deliberately, do not regenerate after editing.
import { Controller, Get, Post, Patch, Delete, UseGuards } from '@nestjs/common';
import { AuthGuard, Public, Roles } from '../../../shared/src/auth';
import { notImplemented } from '../../../shared/src/errors';
@Controller() @UseGuards(AuthGuard)
export class AdministrationSkeletonController {
  @Get('admin/users') @Roles("ADMIN")
  listUsers(): never { return notImplemented('listUsers'); }
  @Get('admin/stores') @Roles("ADMIN")
  listStores(): never { return notImplemented('listStores'); }
  @Patch('admin/users/:id') @Roles("ADMIN")
  updateUserState(): never { return notImplemented('updateUserState'); }
  @Patch('admin/stores/:id') @Roles("ADMIN")
  updateStoreState(): never { return notImplemented('updateStoreState'); }
  @Patch('admin/roles/:id') @Roles("ADMIN")
  updateRole(): never { return notImplemented('updateRole'); }
}

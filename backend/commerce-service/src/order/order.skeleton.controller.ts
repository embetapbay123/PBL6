// GENERATED from OpenAPI; replace implementations deliberately, do not regenerate after editing.
import { Controller, Get, Post, Patch, Delete, UseGuards } from '@nestjs/common';
import { AuthGuard, Public, Roles } from '../../../shared/src/auth';
import { notImplemented } from '../../../shared/src/errors';
@Controller() @UseGuards(AuthGuard)
export class OrderSkeletonController {
  @Post('store/orders/:id/cod-collection') @Roles("SELLER","STORE_OWNER")
  collectCod(): never { return notImplemented('collectCod'); }
}



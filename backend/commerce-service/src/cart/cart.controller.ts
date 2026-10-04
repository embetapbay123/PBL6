import { Controller, Get, Patch, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, Roles } from '../../../shared/src/auth';
import { UpdateCartItemBodyDto } from '../../../shared/src/dtos.generated';
import { CartService } from './cart.service';

@Controller()
@UseGuards(AuthGuard)
export class CartController {
  private readonly service = new CartService();

  @Get('cart/items')
  @Roles('CUSTOMER')
  listCartItems(@Req() req: any) {
    return this.service.list(req.contract?.query ?? req.query ?? {}, req.auth, req.correlationId);
  }

  @Patch('cart/items/:id')
  @Roles('CUSTOMER')
  updateCartItem(@Param('id') id: string, @Body() dto: UpdateCartItemBodyDto, @Req() req: any) {
    return this.service.update(id, dto, req.auth, req.correlationId);
  }

  @Delete('cart/items/:id')
  @Roles('CUSTOMER')
  removeCartItem(@Param('id') id: string, @Req() req: any) {
    return this.service.remove(id, req.auth, req.correlationId);
  }
}

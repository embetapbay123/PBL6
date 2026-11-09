import {Body,Controller,Get,Headers,HttpCode,Param,Post,Req,UseGuards} from '@nestjs/common';
import {AuthGuard,Public,Roles} from '../../../shared/src/auth';
import type {OperationInputs} from '../../../shared/src/operations.generated';
import {ShippingService} from './shipping.service';
import {getStorePickupStatus} from './store-pickup-status';
import {DeliverySync} from './delivery-sync';
import {PlatformDeliveryService} from './platform-delivery.service';

@Controller()
@UseGuards(AuthGuard)
export class ShippingController {
  private readonly service=new ShippingService();
  private readonly platform=new PlatformDeliveryService();
  private readonly delivery=new DeliverySync();
  @Post('shipping/webhooks/delivery') @HttpCode(200) @Public()
  deliveryCallback(@Req() req:any){return this.delivery.receive(req.rawBody,req.headers['x-delivery-timestamp'],req.headers['x-delivery-signature']);}
  @Post('admin/shipping/platform/locations') @HttpCode(200) @Roles('ADMIN')
  platformPickup(@Body() body:OperationInputs['savePlatformPickup']['body'],@Req() req:any){return this.platform.savePickup(body,req.auth,req.correlationId);}
  @Post('me/returns/:id/pickup') @HttpCode(200) @Roles('CUSTOMER')
  platformReturn(@Param('id') id:string,@Body() body:OperationInputs['requestPlatformReturnPickup']['body'],@Req() req:any){return this.platform.requestReturnPickup(id,body,req.auth);}
  @Get('admin/shipping/connection') @Roles('ADMIN')
  connection(@Req() req:any){return this.service.connection(req.auth);}
  @Get('admin/shipping/locations') @Roles('ADMIN')
  locations(@Req() req:any){return this.service.locations(req.auth);}
  @Post('admin/shipping/locations') @HttpCode(200) @Roles('ADMIN')
  save(@Body() body:OperationInputs['saveShippingLocation']['body'],@Req() req:any){return this.service.saveLocation(body,req.auth,req.correlationId);}
  @Get('store/shipping/pickup-status') @Roles('SELLER','STORE_OWNER')
  storePickupStatus(@Req() req:any){return getStorePickupStatus(req.auth);}
  @Get('store/shipping/shipments') @Roles('SELLER','STORE_OWNER')
  storeList(@Req() req:any){return this.service.list(req.contract.query,req.auth,'STORE');}
  @Get('admin/shipping/shipments') @Roles('ADMIN')
  adminList(@Req() req:any){return this.service.list(req.contract.query,req.auth,'ADMIN');}
  @Get('store/orders/:id/shipping') @Roles('SELLER','STORE_OWNER')
  storeTimeline(@Param('id') id:string,@Req() req:any){return this.service.timeline(id,req.auth,'STORE');}
  @Get('me/orders/:id/shipping') @Roles('CUSTOMER')
  ownTimeline(@Param('id') id:string,@Req() req:any){return this.service.timeline(id,req.auth,'CUSTOMER');}
  @Post('store/orders/:id/shipping') @HttpCode(200) @Roles('SELLER','STORE_OWNER')
  book(@Param('id') id:string,@Body() body:OperationInputs['bookStoreShipment']['body'],@Req() req:any){return this.service.book(id,body,req.auth,req.correlationId);}
  @Post('store/shipping/shipments/:id/commands') @HttpCode(200) @Roles('SELLER','STORE_OWNER')
  storeCommand(@Param('id') id:string,@Body() body:OperationInputs['storeShippingCommand']['body'],@Req() req:any){return this.service.command(id,body,req.auth,'STORE',req.correlationId);}
  @Post('admin/shipping/shipments/:id/commands') @HttpCode(200) @Roles('ADMIN')
  adminCommand(@Param('id') id:string,@Body() body:OperationInputs['adminShippingCommand']['body'],@Req() req:any){return this.service.command(id,body,req.auth,'ADMIN',req.correlationId);}
  @Post('store/shipping/shipments/:id/label') @HttpCode(200) @Roles('SELLER','STORE_OWNER')
  storeLabel(@Param('id') id:string,@Req() req:any){return this.service.label(id,req.auth,'STORE');}
  @Post('admin/shipping/shipments/:id/label') @HttpCode(200) @Roles('ADMIN')
  adminLabel(@Param('id') id:string,@Req() req:any){return this.service.label(id,req.auth,'ADMIN');}
  @Post('admin/shipping/shipments/:id/cod') @HttpCode(200) @Roles('ADMIN')
  cod(@Param('id') id:string,@Body() body:OperationInputs['confirmShippingCod']['body'],@Req() req:any){return this.service.confirmCod(id,body,req.auth,req.correlationId);}
  @Post('me/return-requests/:id/shipping') @HttpCode(200) @Roles('CUSTOMER')
  externalReturn(@Param('id') id:string,@Body() body:OperationInputs['registerReturnShipping']['body'],@Req() req:any){return this.service.externalReturn(id,body,req.auth);}
  @Post('store/shipping/shipments/:id/exchange-receipt') @HttpCode(200) @Roles('SELLER','STORE_OWNER')
  inspectExchange(@Param('id') id:string,@Body() body:OperationInputs['storeInspectExchangeReturn']['body'],@Req() req:any){return this.service.inspectExchange(id,body,req.auth,'STORE',req.correlationId);}
  @Post('admin/shipping/shipments/:id/exchange-receipt') @HttpCode(200) @Roles('ADMIN')
  adminInspectExchange(@Param('id') id:string,@Body() body:OperationInputs['adminInspectExchangeReturn']['body'],@Req() req:any){return this.service.inspectExchange(id,body,req.auth,'ADMIN',req.correlationId);}
  @Post('shipping/webhooks/ghn') @HttpCode(200) @Public()
  callback(@Headers('x-ghn-webhook-secret') secret:string,@Body() body:unknown){return this.service.webhook(secret,body);}
}

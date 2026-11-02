import { Controller, Get, Post, Patch, HttpCode, Param, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, Roles } from '../../../shared/src/auth';
import { ReturnsService } from './returns.service';
import {AfterSaleHistoryService} from './after-sale-history.service';
@Controller() @UseGuards(AuthGuard)
export class ReturnsController {
  private readonly service=new ReturnsService();
  private readonly history=new AfterSaleHistoryService();
  @Get('me/orders/:id/after-sale-history') @Roles('CUSTOMER') ownHistory(@Param('id') id:string,@Req() req:any){return this.history.list(id,req.auth,'CUSTOMER',req.contract.query);}
  @Get('store/orders/:id/after-sale-history') @Roles('STORE_OWNER','SELLER') storeHistory(@Param('id') id:string,@Req() req:any){return this.history.list(id,req.auth,'STORE',req.contract.query);}
  @Get('admin/orders/:id/after-sale-history') @Roles('ADMIN') adminHistory(@Param('id') id:string,@Req() req:any){return this.history.list(id,req.auth,'ADMIN',req.contract.query);}
  @Post('me/orders/:id/returns') @Roles('CUSTOMER') create(@Param('id') id:string,@Req() req:any){return this.service.create(id,req.contract.body,req.auth,req.correlationId);}
  @Get('me/returns') @Roles('CUSTOMER') own(@Req() req:any){return this.service.list(req.auth,'CUSTOMER',req.contract.query);}
  @Get('store/returns') @Roles('STORE_OWNER','SELLER') store(@Req() req:any){return this.service.list(req.auth,'STORE',req.contract.query);}
  @Get('admin/returns') @Roles('ADMIN') admin(@Req() req:any){return this.service.list(req.auth,'ADMIN',req.contract.query);}
  @Patch('store/returns/:id') @Roles('STORE_OWNER','SELLER') updateStore(@Param('id') id:string,@Req() req:any){return this.service.transition(id,req.contract.body,req.auth,'STORE',req.correlationId);}
  @Patch('admin/returns/:id') @Roles('ADMIN') updateAdmin(@Param('id') id:string,@Req() req:any){return this.service.transition(id,req.contract.body,req.auth,'ADMIN',req.correlationId);}
  @Post('me/returns/:id/confirm') @Roles('CUSTOMER') confirm(@Param('id') id:string,@Req() req:any){return this.service.transition(id,{...req.contract.body,status:'COMPLETED'},req.auth,'CUSTOMER',req.correlationId);}
  @Post('store/returns/:id/resolution') @HttpCode(200) @Roles('STORE_OWNER','SELLER') resolveStore(@Param('id') id:string,@Req() req:any){return this.service.resolve(id,req.contract.body,req.auth,'STORE',req.correlationId);}
  @Post('me/returns/:id/resolution') @HttpCode(200) @Roles('CUSTOMER') respond(@Param('id') id:string,@Req() req:any){return this.service.resolve(id,req.contract.body,req.auth,'CUSTOMER',req.correlationId);}
  @Post('admin/returns/:id/resolution') @HttpCode(200) @Roles('ADMIN') resolveAdmin(@Param('id') id:string,@Req() req:any){return this.service.resolve(id,req.contract.body,req.auth,'ADMIN',req.correlationId);}
}

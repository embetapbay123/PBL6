import {Controller,Get,Post,Put,Req,Res,UseGuards,HttpCode,Header} from '@nestjs/common';
import {AuthGuard,Public,Roles} from '../../../shared/src/auth';
import {StorefrontService} from './storefront.service';
@Controller() @UseGuards(AuthGuard)
export class StorefrontController {
 private readonly service=new StorefrontService();
 @Get('stores/:id/storefront') @Public() @Header('Cache-Control','no-store')
 public(@Req()r:any){return this.service.public(r.params.id,r.correlationId);}
 @Get('store/storefront') @Roles('STORE_OWNER') @Header('Cache-Control','private, no-store')
 own(@Req()r:any){return this.service.own(r.auth);}
 @Put('store/storefront') @Roles('STORE_OWNER') @Header('Cache-Control','private, no-store')
 save(@Req()r:any){return this.service.save(r.contract.body,r.auth,r.correlationId);}
 @Get('store/storefront/preview') @Roles('STORE_OWNER') @Header('Cache-Control','private, no-store')
 preview(@Req()r:any){return this.service.preview(r.auth,r.correlationId);}
 @Post('store/storefront/publish') @HttpCode(200) @Roles('STORE_OWNER')
 publish(@Req()r:any){return this.service.publish(r.contract.body,r.auth,r.correlationId);}
 @Post('store/storefront/banners') @Roles('STORE_OWNER')
 create(@Req()r:any){return this.service.createBanner(r.contract.body,r.auth);}
 @Put('store/storefront/banners/:banner_id/content') @Roles('STORE_OWNER')
 async upload(@Req()r:any){r.setTimeout(120000,()=>r.destroy());try{return await this.service.uploadBanner(r.params.banner_id,r.auth,r,r.headers['content-type']??'',r.headers['content-length']);}finally{r.setTimeout(0);}}
 @Get('store/storefront/banners/:banner_id/content') @Roles('STORE_OWNER')
 async ownContent(@Req()r:any,@Res()s:any){this.content(s,await this.service.ownBanner(r.params.banner_id,r.auth));}
 @Get('stores/:id/storefront/banners/:banner_id/content') @Public()
 async publicContent(@Req()r:any,@Res()s:any){this.content(s,await this.service.banner(r.params.banner_id,r.params.id));}
 private content(s:any,bytes:Buffer){s.set({'Content-Type':'image/webp','Content-Length':String(bytes.length),'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"});s.send(bytes);}
}

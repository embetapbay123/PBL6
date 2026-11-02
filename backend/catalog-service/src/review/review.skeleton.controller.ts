// GENERATED from OpenAPI; replace implementations deliberately, do not regenerate after editing.
import { Controller, Get, Post, Patch, Param, Req, HttpCode, UseGuards } from '@nestjs/common';
import { AuthGuard, Public, Roles } from '../../../shared/src/auth';
import { ReviewService } from './review.service';
@Controller() @UseGuards(AuthGuard)
export class ReviewSkeletonController {
  private readonly service=new ReviewService();
  @Get('admin/reviews') @Roles('ADMIN')
  listAdmin(@Req() req:any){return this.service.listAdmin(req.contract.query);}
  @Post('me/reviews') @Roles("CUSTOMER")
  createReview(@Req() req:any){return this.service.create(req.contract.body,req.auth.user_id,req.correlationId);}
  @Get('me/reviews') @Roles('CUSTOMER')
  own(@Req() req:any){return this.service.listOwn(req.auth.user_id,req.contract.query);}
  @Get('products/:id/reviews') @Public()
  listProductReviews(@Param('id') id:string,@Req() req:any){return this.service.list(id,req.contract.query,req.correlationId);}
  @Patch('me/reviews/:id') @Roles("CUSTOMER")
  updateReview(@Param('id') id:string,@Req() req:any){return this.service.update(id,req.contract.body,req.auth.user_id,req.correlationId);}
  @Post('admin/reviews/:id/hide') @Roles("ADMIN")
  @HttpCode(200) hideReview(@Param('id') id:string,@Req() req:any){return this.service.moderate(id,req.contract.body,req.auth.user_id,req.correlationId,false);}
  @Post('admin/reviews/:id/restore') @Roles("ADMIN")
  @HttpCode(200) restoreReview(@Param('id') id:string,@Req() req:any){return this.service.moderate(id,req.contract.body,req.auth.user_id,req.correlationId,true);}
}

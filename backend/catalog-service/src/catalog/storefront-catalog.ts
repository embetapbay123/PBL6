import {Controller,Post,Req,UseGuards,HttpCode} from '@nestjs/common';
import type {DataSource} from 'typeorm';
import {database} from '../../../shared/src/database';
import {ServiceGuard,ServiceCallers} from '../../../shared/src/auth';
import {config,required} from '../../../shared/src/config';
import {InternalClients} from '../../../shared/src/internal-clients';
import {CatalogRepository} from './catalog.repository';
import {ApiError} from '../../../shared/src/errors';
import type {OperationInputs} from '../../../shared/src/operations.generated';

export class StorefrontCatalog {
 constructor(private readonly db:DataSource=database,private readonly factory?:()=>InternalClients){}
 private clients(){if(this.factory)return this.factory();const c=config('M1');return new InternalClients('M1',c.internalKeys.M1,{M1:c.catalogUrl,M2:required('COMMERCE_URL'),M3:c.identityUrl});}
 async resolve(input:OperationInputs['ResolveStorefrontCatalog']['body'],trace:string){
  const client=this.clients();
  if(!(await client.call('ActiveStores',undefined,trace)).ids.includes(input.store_id))throw new ApiError(404,'NOT_FOUND','Không tìm thấy gian hàng đang hoạt động.');
  const repo=new CatalogRepository(this.db.manager),empty:any[]=[];
  const curated=input.product_ids.length?(await repo.page([input.store_id],{page:1,size:49,ids:input.product_ids.join(',')})).items:empty;
  let newest=empty,bestsellers=empty,bestsellers_complete=true;
  if(input.include_new){
   const rows=await this.db.query(`SELECT id FROM product WHERE store_id=$1 AND status='ACTIVE' AND moderation_status='VISIBLE'
    AND first_published_at IS NOT NULL ORDER BY first_published_at DESC,id LIMIT 12`,[input.store_id]);
   if(rows.length){const all=(await repo.page([input.store_id],{page:1,size:12,ids:rows.map((r:any)=>r.id).join(',')})).items;const byId=new Map(all.map(p=>[p.id,p]));newest=rows.flatMap((r:any)=>byId.has(r.id)?[byId.get(r.id)]:[]);}
  }
  if(input.include_bestsellers){
   const started=Date.now();
   let after: {after_sold:number;after_id:string}|undefined;
   // Hide an incomplete ranking rather than label an arbitrary fallback as best-selling.
   for(let page=0;page<10;page++){
    if(Date.now()-started>4500){bestsellers_complete=false;bestsellers=[];break;}
    const ranked=await client.call('RankStorefrontSales',{store_id:input.store_id,...after},trace);
    if(!ranked.items.length){if(ranked.has_more)throw new ApiError(503,'DEPENDENCY_CONTRACT_INVALID','Phân trang số bán không tiến tới.');break;}
    if(ranked.items.some((r,n)=>after&&(r.quantity>after.after_sold||r.quantity===after.after_sold&&r.product_id<=after.after_id)||n>0&&(r.quantity>ranked.items[n-1].quantity||r.quantity===ranked.items[n-1].quantity&&r.product_id<=ranked.items[n-1].product_id)))throw new ApiError(503,'DEPENDENCY_CONTRACT_INVALID','Thứ tự số bán không hợp lệ.');
    const current=(await repo.page([input.store_id],{page:1,size:100,ids:ranked.items.map(r=>r.product_id).join(',')})).items;
    const byId=new Map(current.map(p=>[p.id,p]));bestsellers.push(...ranked.items.flatMap(r=>byId.has(r.product_id)?[byId.get(r.product_id)]:[]));
    if(bestsellers.length>=12||!ranked.has_more)break;
    const last=ranked.items.at(-1)!;after={after_sold:last.quantity,after_id:last.product_id};
    if(page===9){bestsellers_complete=false;bestsellers=[];}
   }
  }
  return {curated,newest,bestsellers:bestsellers.slice(0,12),bestsellers_complete};
 }
}
@Controller('internal/storefront') @UseGuards(ServiceGuard)
export class StorefrontCatalogController {
 private readonly service=new StorefrontCatalog();
 @Post('catalog') @HttpCode(200) @ServiceCallers('M3') resolve(@Req()r:any){return this.service.resolve(r.contract.body,r.correlationId);}
}

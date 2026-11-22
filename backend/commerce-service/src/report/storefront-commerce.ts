import {Controller,Post,Req,UseGuards,HttpCode} from '@nestjs/common';
import type {DataSource} from 'typeorm';
import {database} from '../../../shared/src/database';
import {ServiceGuard,ServiceCallers} from '../../../shared/src/auth';
import {ApiError} from '../../../shared/src/errors';
import {VoucherRepository} from '../voucher/voucher.repository';
import {voucherResponse} from '../voucher/voucher.service';

export class StorefrontCommerce {
 constructor(private readonly db:DataSource=database){}
 async voucher(input:{store_id:string;voucher_id:string}){
  const row=await new VoucherRepository(this.db.manager).findStoreVoucherById(input.voucher_id,input.store_id);
  if(!row||row.status!=='ACTIVE')return {};
  // Same distinct purchase-group accounting as checkout; no customer-specific eligibility claim.
  const [usage]=await this.db.query(`SELECT count(*)::int AS n FROM (
   SELECT purchase_group_id FROM voucher_redemption WHERE voucher_id=$1
   UNION SELECT purchase_group_id FROM voucher_reservation WHERE voucher_id=$1 AND status IN ('ACTIVE','RESERVED') AND expires_at>now()
  ) q`,[row.id]);
  if(usage.n>=row.usage_limit)return {};
  return {voucher:voucherResponse(row)};
 }
 async sales(input:{store_id:string;after_sold?:number;after_id?:string}){
  if((input.after_sold===undefined)!==(input.after_id===undefined))throw new ApiError(422,'INVALID_CURSOR','Mốc phân trang chưa đủ.');
  const rows=await this.db.query(`WITH completed AS (
   SELECT order_id,min(created_at) AS at FROM order_status_history WHERE to_status='COMPLETED' GROUP BY order_id
  ), totals AS (
   SELECT i.product_id,sum(greatest(0,i.quantity-CASE
    WHEN r.status IN ('RECEIVED','EXCHANGE_SENT','COMPLETED') AND r.inspection_json IS NULL THEN i.quantity
    WHEN r.status IN ('RECEIVED','EXCHANGE_SENT','COMPLETED') THEN coalesce((
     SELECT sum(CASE WHEN line->>'received_quantity' ~ '^[0-9]{1,9}$' THEN (line->>'received_quantity')::int ELSE 0 END)
     FROM jsonb_array_elements(CASE WHEN jsonb_typeof(r.inspection_json)='array' THEN r.inspection_json ELSE '[]'::jsonb END) line
     WHERE line->>'order_item_id'=i.id::text),0)
    ELSE 0 END))::bigint AS quantity
   FROM order_item i JOIN "order" o ON o.id=i.order_id JOIN completed c ON c.order_id=o.id
   LEFT JOIN order_return_request r ON r.order_id=o.id
   WHERE o.store_id=$1 AND o.status='COMPLETED' AND c.at>now()-interval '30 days' AND c.at<=now()
   GROUP BY i.product_id
  ) SELECT product_id,quantity FROM totals WHERE quantity>0
   AND ($2::bigint IS NULL OR quantity<$2 OR (quantity=$2 AND product_id>$3::uuid))
   ORDER BY quantity DESC,product_id LIMIT 101`,[input.store_id,input.after_sold??null,input.after_id??null]);
  return {items:rows.slice(0,100).map((r:any)=>{const quantity=Number(r.quantity);if(!Number.isSafeInteger(quantity))throw new ApiError(503,'SALES_COUNT_INVALID','Chưa đọc được số lượng bán.');return {product_id:r.product_id,quantity};}),has_more:rows.length>100};
 }
}
@Controller('internal/storefront') @UseGuards(ServiceGuard)
export class StorefrontCommerceController {
 private readonly service=new StorefrontCommerce();
 @Post('sales') @HttpCode(200) @ServiceCallers('M1') sales(@Req()r:any){return this.service.sales(r.contract.body);}
 @Post('voucher') @HttpCode(200) @ServiceCallers('M3') voucher(@Req()r:any){return this.service.voucher(r.contract.body);}
}

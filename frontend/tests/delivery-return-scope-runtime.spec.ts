import {test,expect} from '@playwright/test';
import {randomUUID,createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {afterSaleMarket} from './runtime/after-sale-market';

test.skip(process.env.CORE_FIX_DELIVERY_SCOPE!=='1','Private tagged scope validation only.');
test('another real Store Owner cannot read, inspect, settle or refund accepted delivery-return orders',async({},info)=>{
 test.setTimeout(120000);const f=await afterSaleMarket(),proof=JSON.parse(readFileSync('../artifacts/core-fix/fix-20261030T100153Z/delivery-final-state39.json','utf8')),orders=proof.orders;
 expect(orders).toHaveLength(6);expect(orders.every((o:any)=>o.store_id!==f.store.id)).toBe(true);
 const cases=async()=>{const list=await f.api('/admin/delivery-returns?size=100',f.admin);return list.items.filter((c:any)=>orders.some((o:any)=>o.case_id===c.id)).sort((a:any,b:any)=>a.id.localeCompare(b.id));};
 const before=await cases();expect(before).toHaveLength(6);const attempts:unknown[]=[];
 try{
  for(const order of orders){
   const read=await f.raw('/store/orders/'+order.id,f.owner.access);expect(read.status).toBe(404);
   const list=await f.api('/store/delivery-returns?order_id='+order.id,f.owner.access);expect(list.items).toEqual([]);
   const original=before.find((c:any)=>c.id===order.case_id);expect(original).toBeDefined();
   const receipt={operation_id:randomUUID(),expected_version:0,lines:original.inspection,note:f.tag+' Denied wrong Store receipt'};
   const commands=[
    ['/store/orders/'+order.id+'/delivery-return',{operation_id:randomUUID(),expected_order_version:0,reason:f.tag+' Denied wrong Store open'}],
    ['/store/delivery-returns/'+order.case_id+'/inspection',receipt],
    ['/store/delivery-returns/'+order.case_id+'/settle',{operation_id:randomUUID(),expected_version:0}],
    ['/store/orders/'+order.id+'/cod-refund',{operation_id:randomUUID(),expected_order_version:0,expected_case_version:0,receipt_reference:f.tag+'-DENIED',recipient_name:f.tag+' Fixture',refunded_at:new Date().toISOString(),full_amount_confirmed:true}],
   ] as const;
   const denied=[];for(const [path,body] of commands){const r=await f.raw(path,f.owner.access,'POST',body);expect(r.status,path).toBe(404);denied.push({path,status:r.status,code:r.value.code});}
   attempts.push({order_id:order.id,case_id:order.case_id,foreign_order_read:read.status,foreign_list_count:0,commands:denied});
  }
  const after=await cases();expect(after).toEqual(before);
  writeFileSync(info.outputPath('delivery-scope-checkpoints.json'),JSON.stringify({status:'PASS',tag:f.tag,store_id:f.store.id,runtime:'Node37/AI37/frontend39',evidence:'REAL_M3_AUTH_AND_SCOPED_M2_HTTP',known_existing_cases:6,attempts,unchanged_admin_readback:true,admin_case_projection_sha256:createHash('sha256').update(JSON.stringify(after)).digest('hex'),limits:['Cases are terminal; real open-case races are covered by isolated PostgreSQL tests, not claimed here.']},null,2));
 }finally{await f.cleanup();}
});

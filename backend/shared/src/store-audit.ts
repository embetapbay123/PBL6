import {Controller,Get,Req,UseGuards} from '@nestjs/common';
import type {DataSource} from 'typeorm';
import {AuthGuard,Roles} from './auth';
import {database} from './database';
import {ApiError} from './errors';
import {auditActionSql,auditExecutorSql,SYSTEM_AUDIT_ACTOR} from './audit-actor';

type Source='M1'|'M2'|'M3';
const sources={M1:{table:'m1_audit',path:'catalog'},M2:{table:'m2_audit',path:'commerce'},M3:{table:'m3_audit',path:'identity'}} as const;
const allowed=new Set(['id','store_id','product_id','variant_id','order_id','receipt_id','operation_id','status','version','role','permissions','type','original_type','quantity','reserved_quantity','available_quantity','delta_quantity','delta_reserved','state','method','collectible_vnd','disposition','provider','price_vnd','unit_price_vnd','line_total_vnd','payable_vnd','amount_vnd','shipping_fee_vnd','goods_vnd','store_discount_vnd','platform_discount_vnd','refunded_vnd','collected_vnd','sku','title','attributes','variant_values','variant_values_json','variants','is_default','inventory_status','exchange_status','reason','action','fault_party','fee_payer','conversion_status','image_id','image_ids','position']);
const sensitive=/password|secret|token|phone|email|address|recipient|bank|credential|cookie|authorization/i;
const safeText=(value:string)=>value.slice(0,500).replace(/[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}/g,'[ẩn email]').replace(/\b(?:0\d{9,10}|84\d{9})\b/g,'[ẩn số điện thoại]').replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,'[ẩn token]');
/** Whitelist business changes, never expose raw audit snapshots to a Store. */
export function auditPreview(value:unknown):Record<string,unknown>{
 const visit=(input:unknown,depth:number,attributes=false):unknown=>{
  if(depth>4)return '[rút gọn]';
  if(typeof input==='string')return safeText(input);
  if(input===null||typeof input==='number'||typeof input==='boolean')return input;
  if(Array.isArray(input))return input.slice(0,50).map(item=>visit(item,depth+1,attributes));
  if(!input||typeof input!=='object')return undefined;
  return Object.fromEntries(Object.entries(input).filter(([key])=>!sensitive.test(key)&&(attributes||allowed.has(key))).slice(0,50).map(([key,item])=>[key,visit(item,depth+1,key==='attributes'||key==='variant_values'||key==='variant_values_json')]));
 };
 return value&&typeof value==='object'&&!Array.isArray(value)?visit(value,0) as Record<string,unknown>:{};
}
export function ownerStore(auth:any):string{
 const member=auth?.store_membership;
 if(!auth?.user_id||!auth.roles?.includes('STORE_OWNER')||member?.role!=='OWNER'||member.status!=='ACTIVE'||!(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(member.store_id??'')))throw new ApiError(403,'OWNER_REQUIRED','Chỉ Owner hiện hành được đọc nhật ký trong Store của mình.');
 return member.store_id;
}
type Filters={page?:number;size?:number;action?:string;target_type?:string;actor_user_id?:string;target_id?:string;from?:string;to?:string};
export class StoreAuditService{
 constructor(private readonly source:Source,private readonly db:DataSource=database){}
 async list(query:Filters,auth:any){
  const store=ownerStore(auth),page=query.page??1,size=query.size??20;
  if((query.from&&!Number.isFinite(Date.parse(query.from)))||(query.to&&!Number.isFinite(Date.parse(query.to)))||(query.from&&query.to&&Date.parse(query.from)>=Date.parse(query.to)))throw new ApiError(422,'INVALID_AUDIT_PERIOD','Khoảng nhật ký cần mốc bắt đầu trước mốc kết thúc.');
  const executor=auditExecutorSql(this.source),action=auditActionSql(this.source),args:unknown[]=[store],conditions=['a.store_id=$1'];
  for(const [key,value] of Object.entries(query)){if(value===undefined)continue;const column=({action,target_type:'a.target_type',actor_user_id:executor,target_id:'a.target_id',from:'a.created_at',to:'a.created_at'} as Record<string,string>)[key];if(!column)continue;args.push(value);conditions.push(`${column}${key==='from'?'>=':key==='to'?'<':'='}$${args.length}`);}
  const table=sources[this.source].table,where=' WHERE '+conditions.join(' AND ');
  const [count]=await this.db.manager.query(`SELECT count(*)::int AS total FROM ${table} a`+where,args);
  const label=this.source==='M1'?`coalesce(a.after_json->>'title',a.before_json->>'title',CASE WHEN a.target_type='Product' THEN (SELECT p.title FROM product p WHERE p.id=a.target_id AND p.store_id=a.store_id) WHEN a.target_type='Inventory' THEN (SELECT p.title||' · '||v.sku FROM inventory i JOIN product_variant v ON v.id=i.variant_id JOIN product p ON p.id=v.product_id WHERE i.id=a.target_id AND i.store_id=a.store_id) END,a.target_type)`:
   this.source==='M3'?`coalesce(CASE WHEN a.target_type='StoreMembership' THEN (SELECT coalesce(p.display_name,'Nhân viên')||' · '||right(m.user_id::text,8) FROM store_membership m LEFT JOIN customer_profile p ON p.user_id=m.user_id WHERE m.id=a.target_id AND m.store_id=a.store_id) WHEN a.target_type='Store' THEN (SELECT s.name FROM store s WHERE s.id=a.target_id AND s.id=a.store_id) END,a.target_type)`:`CASE WHEN a.target_type='Order' THEN 'Đơn '||a.target_id::text ELSE a.target_type END`;
  const rows=await this.db.manager.query(`SELECT a.id,${executor} AS actor_user_id,a.target_type,a.target_id,${action} AS action,a.action AS recorded_action,a.request_id,a.created_at,a.before_json,a.after_json,${label} AS target_label FROM ${table} a`+where+` ORDER BY a.created_at DESC,a.id LIMIT $${args.length+1} OFFSET $${args.length+2}`,[...args,size,(page-1)*size]);
  return {items:rows.map((row:any)=>({id:row.id,service:this.source,store_id:store,...(row.actor_user_id?{actor_user_id:row.actor_user_id}:{}),actor_kind:!row.actor_user_id?'UNKNOWN':row.actor_user_id===SYSTEM_AUDIT_ACTOR?'SYSTEM':'ACCOUNT',target_type:row.target_type,target_id:row.target_id,target_label:safeText(String(row.target_label)).slice(0,400),action:row.action,request_id:row.request_id,created_at:new Date(row.created_at).toISOString(),before:auditPreview(row.before_json),after:auditPreview(this.source==='M2'&&row.action==='CANCEL_ORDER'&&row.recorded_action!==row.action?{...row.after_json,reason:row.after_json?.reason??row.recorded_action}:row.after_json)})),page,size,total:count.total};
 }
}
export function storeAuditController(source:Source){
 @Controller('store/audit') @UseGuards(AuthGuard) @Roles('STORE_OWNER')
 class StoreAuditController{
  private readonly service=new StoreAuditService(source);
  @Get(sources[source].path) list(@Req() req:any){return this.service.list(req.contract.query,req.auth);}
 }
 return StoreAuditController;
}

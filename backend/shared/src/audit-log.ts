import {Controller,Get,Req,UseGuards} from '@nestjs/common';
import {AuthGuard,Roles} from './auth';
import {database} from './database';
import {ApiError} from './errors';
import type {DataSource} from 'typeorm';
import {auditActionSql,auditExecutorSql,SYSTEM_AUDIT_ACTOR} from './audit-actor';
import type {OperationOutputs} from './operations.generated';

const sources={M1:{table:'m1_audit',path:'catalog'},M2:{table:'m2_audit',path:'commerce'},M3:{table:'m3_audit',path:'identity'}} as const;
type Source=keyof typeof sources;
export class AuditLogService {
  constructor(private readonly source:Source,private readonly db:DataSource=database){}
  async list(query:{page?:number;size?:number;action?:string;target_type?:string;actor_user_id?:string;target_id?:string;store_id?:string;from?:string;to?:string},auth:any):Promise<OperationOutputs['listCatalogAudit']>{
    if(!auth?.user_id)throw new ApiError(401,'UNAUTHENTICATED','Vui lòng đăng nhập.');
    if(!auth.roles?.includes('ADMIN')||!auth.role_permissions?.includes('platform.admin'))throw new ApiError(403,'FORBIDDEN','Không có quyền đọc nhật ký quản trị.');
    const table=sources[this.source]?.table;if(!table)throw new Error('Unknown audit source');
    const page=query.page ?? 1,size=query.size ?? 20;
    if(!Number.isSafeInteger(page)||page<1||page>1000000||!Number.isSafeInteger(size)||size<1||size>100)throw new ApiError(422,'INVALID_AUDIT_PAGE','Phân trang nhật ký không hợp lệ.');
    if(query.from&&!Number.isFinite(Date.parse(query.from))||query.to&&!Number.isFinite(Date.parse(query.to))||query.from&&query.to&&Date.parse(query.from)>=Date.parse(query.to))throw new ApiError(422,'INVALID_AUDIT_PERIOD','Khoảng thời gian nhật ký không hợp lệ; thời điểm kết thúc phải sau bắt đầu.');
    const executor=auditExecutorSql(this.source),action=auditActionSql(this.source);
    // Product/Variant/Inventory ownership is immutable. Recover only that provable legacy scope.
    const store=this.source==='M1'?`coalesce(a.store_id,(SELECT p.store_id FROM product p WHERE a.target_type='Product' AND p.id=a.target_id),(SELECT v.store_id FROM product_variant v WHERE a.target_type='Variant' AND v.id=a.target_id),(SELECT i.store_id FROM inventory i WHERE a.target_type='Inventory' AND i.id=a.target_id))`:'a.store_id';
    const args:unknown[]=[],conditions:string[]=[],columns:Record<string,string>={action,target_type:'a.target_type',actor_user_id:executor,target_id:'a.target_id',store_id:store,from:'a.created_at',to:'a.created_at'};
    for(const[key,column]of Object.entries(columns)){const value=query[key as keyof typeof query];if(value===undefined)continue;args.push(value);conditions.push(`${column}${key==='from'?'>=':key==='to'?'<':'='}$${args.length}`);}
    const where=conditions.length?' WHERE '+conditions.join(' AND '):'';
    const [count]=await this.db.manager.query(`SELECT count(*)::int AS total FROM ${table} a`+where,args);
    // Before/after snapshots can contain private account data: expose metadata only.
    const rows=await this.db.manager.query(`SELECT a.id,${executor} AS actor_user_id,${store} AS store_id,a.target_type,a.target_id,${action} AS action,a.request_id,a.created_at FROM ${table} a`+where+` ORDER BY a.created_at DESC,a.id LIMIT $${args.length+1} OFFSET $${args.length+2}`,[...args,size,(page-1)*size]);
    return {items:rows.map((row:any):OperationOutputs['listCatalogAudit']['items'][number]=>({id:row.id,service:this.source,...(row.actor_user_id?{actor_user_id:row.actor_user_id}:{}),actor_kind:!row.actor_user_id?'UNKNOWN':row.actor_user_id===SYSTEM_AUDIT_ACTOR?'SYSTEM':'ACCOUNT',...(row.store_id?{store_id:row.store_id}:{}),target_type:row.target_type,target_id:row.target_id,action:row.action,request_id:row.request_id,created_at:new Date(row.created_at).toISOString()})),page,size,total:count.total};
  }
}
export function auditLogController(source:Source){
  @Controller('admin/audit') @UseGuards(AuthGuard) @Roles('ADMIN')
  class AuditLogController {
    private readonly service=new AuditLogService(source);
    @Get(sources[source].path)
    list(@Req() req:any){return this.service.list(req.contract.query,req.auth);}
  }
  return AuditLogController;
}

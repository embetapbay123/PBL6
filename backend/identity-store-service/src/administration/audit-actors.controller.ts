import {Controller,Post,HttpCode,Req,UseGuards} from '@nestjs/common';
import type {DataSource} from 'typeorm';
import {AuthGuard,Roles} from '../../../shared/src/auth';
import {database} from '../../../shared/src/database';
import {ApiError} from '../../../shared/src/errors';
import {ownerStore} from '../../../shared/src/store-audit';
import type {OperationOutputs} from '../../../shared/src/operations.generated';
export class AuditActorsService{
 constructor(private readonly source:DataSource=database){}
 async lookup(ids:string[],auth:any,admin=false):Promise<OperationOutputs['lookupAdminAuditActors']>{
  let store:string|undefined;
  if(admin){if(!auth?.user_id||!auth.roles?.includes('ADMIN')||!auth.role_permissions?.includes('platform.admin'))throw new ApiError(403,'FORBIDDEN','Cần quyền quản trị để đọc nhãn tài khoản toàn sàn.');}else store=ownerStore(auth);
  if(!Array.isArray(ids)||ids.some(id=>typeof id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)))throw new ApiError(422,'INVALID_ACTOR_IDS','Mã tài khoản đối chiếu không hợp lệ.');
  const unique=[...new Set(ids)];if(unique.length>100)throw new ApiError(422,'LOOKUP_LIMIT_EXCEEDED','Chỉ đối chiếu tối đa 100 tài khoản mỗi lần.');if(!unique.length)return {users:[]};
  const rows=await this.source.query(`SELECT u.id,u.email,u.status,p.display_name FROM "user" u LEFT JOIN customer_profile p ON p.user_id=u.id WHERE u.id=ANY($1::uuid[])${admin?'':' AND EXISTS(SELECT 1 FROM store_membership m WHERE m.user_id=u.id AND m.store_id=$2)'}`,[unique,...(admin?[]:[store])]);
  return {users:rows.map((row:any)=>({id:row.id,label:String(row.display_name||(admin?row.email:'Tài khoản '+row.id.slice(0,8))).slice(0,400),...(admin?{email:row.email,...(['ACTIVE','LOCKED'].includes(row.status)?{status:row.status}:{})}:{})}))};
 }
}
@Controller() @UseGuards(AuthGuard)
export class AuditActorsController{
 private readonly service=new AuditActorsService();
 @Post('store/audit/actors') @HttpCode(200) @Roles('STORE_OWNER') store(@Req() req:any){return this.service.lookup(req.contract.body.user_ids,req.auth);}
 @Post('admin/audit/actors') @HttpCode(200) @Roles('ADMIN') admin(@Req() req:any){return this.service.lookup(req.contract.body.user_ids,req.auth,true);}
}

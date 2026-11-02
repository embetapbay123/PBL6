import 'reflect-metadata';
import {randomUUID} from 'node:crypto';
import {readdirSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {DataSource} from 'typeorm';
import {VoucherService} from '../../commerce-service/src/voucher/voucher.service';
import {validateOperation} from '../../shared/src/request-contract';
const suite=process.env.M2_DATABASE_URL?describe:describe.skip;
suite('Store and Platform voucher cap edits use explicit null and preserve history',()=>{
 let root:DataSource,db:DataSource,schema:string,service:VoucherService;
 const store=randomUUID(),owner=randomUUID(),admin={user_id:randomUUID(),roles:['ADMIN'],role_permissions:['platform.admin']},auth={user_id:owner,roles:['STORE_OWNER'],store_membership:{store_id:store,role:'OWNER',status:'ACTIVE',permissions:[]}};
 beforeAll(async()=>{root=await new DataSource({type:'postgres',url:process.env.M2_DATABASE_URL}).initialize();schema='voucher_admin_'+randomUUID().replace(/-/g,'');await root.query('CREATE SCHEMA '+schema);db=await new DataSource({type:'postgres',url:process.env.M2_DATABASE_URL,extra:{options:'-csearch_path='+schema+',public'}}).initialize();const dir=resolve(__dirname,'../../commerce-service/migrations');for(const f of readdirSync(dir).filter(n=>n.endsWith('.sql')).sort())await db.query(readFileSync(resolve(dir,f),'utf8'));service=new VoucherService(db);});
 afterAll(async()=>{if(db?.isInitialized)await db.destroy();if(root?.isInitialized){if(/^voucher_admin_[a-f0-9]{32}$/.test(schema))await root.query('DROP SCHEMA '+schema+' CASCADE');await root.destroy();}});
 test.each(['STORE','PLATFORM'] as const)('%s optional cap remains absent when changing quota and can be deliberately added/removed',async scope=>{
  const body={code:'CAP-'+randomUUID(),scope,discount_type:'PERCENT' as const,discount_value:90,starts_at:'2026-01-01T00:00:00.123Z',ends_at:'2030-01-01T00:00:00.456Z',usage_limit:100,per_customer_limit:10};
  const voucher=scope==='STORE'?await service.createStoreVoucher(body,auth,'create'):await service.createPlatformVoucher(body,admin,'create');expect(voucher.max_discount_vnd).toBeUndefined();let version=voucher.version!;const update=async(changes:Record<string,unknown>)=>{const request:any={...changes,expected_version:version},op=scope==='STORE'?'updateStoreVoucher':'updatePlatformVoucher';validateOperation(op,{path:{id:voucher.id!},body:request});const r=scope==='STORE'?await service.updateStoreVoucher(voucher.id!,request,auth,'update'):await service.updatePlatformVoucher(voucher.id!,request,admin,'update');version=r.version!;return r;};
  const quota=await update({usage_limit:200});expect(quota).toMatchObject({usage_limit:200,starts_at:body.starts_at,ends_at:body.ends_at});expect(quota.max_discount_vnd).toBeUndefined();expect((await update({max_discount_vnd:50000})).max_discount_vnd).toBe(50000);expect((await update({max_discount_vnd:0})).max_discount_vnd).toBe(0);expect((await update({max_discount_vnd:null})).max_discount_vnd).toBeUndefined();
  const audit=await db.query("SELECT before_json,after_json FROM m2_audit WHERE target_id=$1 AND action IN ('UPDATE_STORE_VOUCHER','UPDATE_PLATFORM_VOUCHER') ORDER BY created_at,id",[voucher.id]);expect(audit).toHaveLength(4);expect(audit.at(-1).before_json.max_discount_vnd).toBe(0);expect(audit.at(-1).after_json.max_discount_vnd).toBeUndefined();
  const stale:any={expected_version:0,status:'STOPPED'};await expect(scope==='STORE'?service.updateStoreVoucher(voucher.id!,stale,auth,'stale'):service.updatePlatformVoucher(voucher.id!,stale,admin,'stale')).rejects.toMatchObject({status:409});
 });
 test('null is accepted only for a cap reset; other malformed/unsafe cap values remain rejected',()=>{
  for(const op of ['updateStoreVoucher','updatePlatformVoucher'] as const)for(const cap of [-1,1.5,'50000',9007199254740992]){const input={path:{id:randomUUID()},body:{expected_version:0,max_discount_vnd:cap}};expect(()=>validateOperation(op,input as any)).toThrow();}
  expect(()=>validateOperation('createStoreVoucher',{body:{code:'NO-CREATE-NULL',scope:'STORE',discount_type:'PERCENT',discount_value:90,max_discount_vnd:null,starts_at:'2026-01-01T00:00:00Z',ends_at:'2030-01-01T00:00:00Z',usage_limit:1,per_customer_limit:1}} as any)).toThrow();
 });
});

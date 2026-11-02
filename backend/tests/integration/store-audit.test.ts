import 'reflect-metadata';
import {randomUUID} from 'node:crypto';
import {readdirSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {DataSource} from 'typeorm';
import {audit} from '../../shared/src/audit';
import {StoreAuditService} from '../../shared/src/store-audit';
import {StaffRepository} from '../../identity-store-service/src/staff/staff.repository';
import {schemaErrors} from '../../shared/src/contract-validation';
import contracts from '../../shared/src/contracts.runtime.generated.json';
import {AuditActorsService} from '../../identity-store-service/src/administration/audit-actors.controller';
const services=[['M1','catalog-service'],['M2','commerce-service'],['M3','identity-store-service']] as const;
for(const [source,folder] of services){
 const suite=process.env[source+'_DATABASE_URL']?describe:describe.skip;
 suite(source+' Store audit: isolated migrations, scope and atomic write',()=>{
  let root:DataSource,db:DataSource,schema:string;
  const store=randomUUID(),other=randomUUID(),actor=randomUUID(),foreign=randomUUID(),target=randomUUID(),otherTarget=randomUUID(),member=randomUUID();
  const auth={user_id:actor,roles:['STORE_OWNER'],store_membership:{store_id:store,role:'OWNER',status:'ACTIVE'}};
  const table=source.toLowerCase()+'_audit',kind=source==='M1'?'Product':source==='M2'?'Order':'Store';
  beforeAll(async()=>{
   root=await new DataSource({type:'postgres',url:process.env[source+'_DATABASE_URL']}).initialize();schema='audit_fix_'+randomUUID().replace(/-/g,'');await root.query('CREATE SCHEMA '+schema);
   db=await new DataSource({type:'postgres',url:process.env[source+'_DATABASE_URL'],extra:{options:'-csearch_path='+schema+',public'}}).initialize();
   const dir=resolve(__dirname,'../../'+folder+'/migrations'),files=readdirSync(dir).filter(f=>f.endsWith('.sql')).sort();
   const scopeMigration=files.find(file=>file.endsWith('store_audit_scope.sql'))!;
   for(const file of files.filter(file=>file!==scopeMigration))await db.query(readFileSync(resolve(dir,file),'utf8'));
   if(source==='M1'){
    const category=randomUUID(),type=randomUUID();await db.query("INSERT INTO category(id,name,slug,status) VALUES($1,'Kiểm thử',$2,'ACTIVE')",[category,category]);await db.query("INSERT INTO product_type(id,category_id,name,status) VALUES($1,$2,'Áo','ACTIVE')",[type,category]);
    for(const [id,s] of [[target,store],[otherTarget,other]])await db.query("INSERT INTO product(id,store_id,product_type_id,title,status,moderation_status) VALUES($1,$2,$3,'Áo đỏ','ACTIVE','VISIBLE')",[id,s,type]);
   }else if(source==='M2'){
    for(const [id,s] of [[target,store],[otherTarget,other]])await db.query(`INSERT INTO "order"(id,purchase_group_id,customer_user_id,store_id,status,payment_method,goods_vnd,store_discount_vnd,platform_discount_vnd,shipping_vnd,payable_vnd) VALUES($1,$1,$2,$3,'PREPARING','COD',100000,0,0,20000,120000)`,[id,actor,s]);
   }else{
    for(const u of [actor,foreign]){await db.query(`INSERT INTO "user"(id,email,password_hash,status) VALUES($1,$2,'test-placeholder','ACTIVE')`,[u,u+'@example.test']);await db.query("INSERT INTO customer_profile(user_id,display_name,updated_at) VALUES($1,$2,now())",[u,u===actor?'Nhân viên cũ':'Store khác']);}
    for(const [s,u] of [[store,actor],[other,foreign]]){const app=randomUUID();await db.query("INSERT INTO store_application(id,applicant_user_id,proposed_name,contact,status) VALUES($1,$2,'Store kiểm thử','private contact','APPROVED')",[app,u]);await db.query("INSERT INTO store(id,application_id,name,slug,contact,shipping_fee_vnd,status) VALUES($1,$2,'Store kiểm thử',$3,'private contact',20000,'ACTIVE')",[s,app,s]);await db.query("INSERT INTO store_membership(id,store_id,user_id,role,status,joined_at) VALUES($1,$2,$3,'SELLER','INACTIVE',now())",[s===store?member:randomUUID(),s,u]);}
   }
   // Insert before scope migration: backfill only resolvable entity links, never guessed JSON.
   await db.query(`INSERT INTO ${table}(id,actor_user_id,target_type,target_id,action,request_id,before_json,after_json) VALUES($1,$2,$3,$4,'OLD','audit-backfill','{}','{}')`,[randomUUID(),actor,kind,source==='M3'?store:target]);
   await db.query(readFileSync(resolve(dir,scopeMigration),'utf8'));
  });
  afterAll(async()=>{if(db?.isInitialized)await db.destroy();if(root?.isInitialized){if(/^audit_fix_[a-f0-9]{32}$/.test(schema))await root.query('DROP SCHEMA '+schema+' CASCADE');await root.destroy();}});
  test('migration associates reliable historical entities without changing the original event',async()=>{
   const rows=await db.query(`SELECT store_id,action,request_id FROM ${table} WHERE action='OLD'`);expect(rows).toEqual([{store_id:store,action:'OLD',request_id:'audit-backfill'}]);
  });
  test('current writes derive immutable Store scope and roll back with their transaction',async()=>{
   await db.transaction(m=>audit(m,source,actor,kind,source==='M3'?store:target,'UPDATE','audit-current',{quantity:10},{quantity:8,password_hash:'private',email:'private@example.test'}));
   await db.transaction(m=>audit(m,source,actor,kind,source==='M3'?other:otherTarget,'UPDATE','audit-other',{quantity:20},{quantity:19}));
   await expect(db.transaction(async m=>{await audit(m,source,actor,kind,source==='M3'?store:target,'ROLLBACK','audit-rollback',{},{});throw new Error('rollback test');})).rejects.toThrow('rollback test');
   expect(await db.query(`SELECT id FROM ${table} WHERE action='ROLLBACK'`)).toEqual([]);
   const service=new StoreAuditService(source,db),own=await service.list({action:'UPDATE'},auth);expect(own.total).toBe(1);expect(own.items[0]).toMatchObject({store_id:store,actor_user_id:actor,actor_kind:'ACCOUNT',before:{quantity:10},after:{quantity:8}});
   expect((await service.list({target_id:source==='M3'?other:otherTarget},auth)).total).toBe(0);
   expect((await service.list({action:'UPDATE'},{...auth,store_membership:{...auth.store_membership,store_id:other}})).items[0].after).toEqual({quantity:19});
  });
  test('date bounds are half-open and page/count share scope even beyond the first page',async()=>{
   for(let i=0;i<25;i++)await db.transaction(m=>audit(m,source,actor,kind,source==='M3'?store:target,'PAGE','audit-page',{},{}));
   await db.query(`UPDATE ${table} SET created_at='2026-10-30T17:00:00Z' WHERE action='PAGE'`);
   const service=new StoreAuditService(source,db),q={action:'PAGE',from:'2026-10-31T00:00:00+07:00',to:'2026-11-01T00:00:00+07:00'};
   const first=await service.list({...q,size:20},auth),second=await service.list({...q,page:2,size:20},auth);expect(first.total).toBe(25);expect(second.items).toHaveLength(5);expect(new Set([...first.items,...second.items].map(row=>row.id)).size).toBe(25);
   expect((await service.list({action:'PAGE',to:q.from},auth)).total).toBe(0);
  });
  if(source==='M3')test('staff update returns actual version/user IDs and both permission snapshots, then permits a correctly versioned lock',async()=>{
   const employee=randomUUID(),membership=randomUUID();const [permission]=await db.query("SELECT id FROM permission WHERE code='inventory.store.read_adjust'");
   await db.query(`INSERT INTO "user"(id,email,password_hash,status) VALUES($1,$2,'test-placeholder','ACTIVE')`,[employee,employee+'@example.test']);
   await db.query("INSERT INTO store_membership(id,store_id,user_id,role,status,joined_at) VALUES($1,$2,$3,'OWNER','ACTIVE',now()),($4,$2,$5,'SELLER','ACTIVE',now())",[randomUUID(),store,actor,membership,employee]);
   await db.query("INSERT INTO membership_permission(membership_id,permission_id,granted_at,version) VALUES($1,$2,now(),0)",[membership,permission.id]);
   const repo=new StaffRepository(db),changed=await repo.updateStaff(actor,store,membership,{expected_version:0,permissions:[]},'staff-result');expect(changed).toMatchObject({id:membership,user_id:employee,version:1,status:'ACTIVE',permissions:[]});expect(schemaErrors(changed,contracts.operations.updateStaff.responses['200'])).toEqual([]);
   const locked=await repo.updateStaff(actor,store,membership,{expected_version:changed.version,status:'LOCKED'},'staff-lock');expect(locked).toMatchObject({id:membership,user_id:employee,version:2,status:'LOCKED'});
   await expect(repo.updateStaff(actor,store,membership,{expected_version:0,status:'ACTIVE'},'staff-stale')).rejects.toMatchObject({status:409});
   const [row]=await db.query("SELECT before_json,after_json FROM m3_audit WHERE target_id=$1 AND request_id='staff-result'",[membership]);expect(row.before_json.permissions).toEqual(['inventory.store.read_adjust']);expect(row.after_json.permissions).toEqual([]);
   const events=await db.query("SELECT payload FROM outbox WHERE event_type='MembershipChanged' AND payload->>'user_id'=$1",[employee]);expect(events).toHaveLength(2);
  });
  if(source==='M3')test('Owner actor lookup includes former staff but excludes other Store users; Admin needs explicit permission',async()=>{
   const service=new AuditActorsService(db);expect(await service.lookup([actor,foreign],auth)).toEqual({users:[{id:actor,label:'Nhân viên cũ'}]});
   await expect(service.lookup([foreign],{user_id:actor,roles:['ADMIN']},true)).rejects.toMatchObject({status:403});
   expect(await service.lookup([foreign],{user_id:actor,roles:['ADMIN'],role_permissions:['platform.admin']},true)).toEqual({users:[{id:foreign,label:'Store khác',email:foreign+'@example.test',status:'ACTIVE'}]});
  });
  if(source==='M2')test('known legacy inventory-worker rows display System and actor filters use the same executor as the list',async()=>{
   // Historical writer stored the ordering customer in actor_user_id for automatic inventory effects.
   // Preserve that raw history; the Store view must not claim the customer executed a worker step.
   const id=randomUUID();await db.query("INSERT INTO m2_audit(id,actor_user_id,target_type,target_id,action,request_id,before_json,after_json,store_id) VALUES($1,$2,'Order',$3,'INVENTORY_RESTOCKED','legacy-worker','{\"state\":\"CONSUMED\"}','{\"state\":\"RESTOCKED\"}',$4)",[id,actor,target,store]);
   const service=new StoreAuditService(source,db),q={action:'INVENTORY_RESTOCKED'};expect((await service.list(q,auth)).items[0]).toMatchObject({actor_kind:'SYSTEM',before:{state:'CONSUMED'},after:{state:'RESTOCKED'}});expect((await service.list({...q,actor_user_id:actor},auth)).total).toBe(0);expect((await service.list({...q,actor_user_id:'00000000-0000-0000-0000-000000000000'},auth)).total).toBe(1);expect((await db.query('SELECT actor_user_id FROM m2_audit WHERE id=$1',[id]))[0].actor_user_id).toBe(actor);
  });
  if(source==='M2')test('new worker audit rows store System while human commands retain the employee, and missing legacy identity stays UNKNOWN',async()=>{
   const system='00000000-0000-0000-0000-000000000000';
   await db.transaction(m=>audit(m,'M2',actor,'Order',target,'INVENTORY_RELEASED','worker-write',{state:'HELD'},{state:'RELEASED'}));
   expect((await db.query("SELECT actor_user_id FROM m2_audit WHERE request_id='worker-write'"))[0].actor_user_id).toBe(system);
   await db.transaction(m=>audit(m,'M2',actor,'Order',target,'TRANSITION_ORDER','employee-write',{status:'PENDING'},{status:'CONFIRMED'}));expect((await db.query("SELECT actor_user_id FROM m2_audit WHERE request_id='employee-write'"))[0].actor_user_id).toBe(actor);
   await db.query("INSERT INTO m2_audit(actor_user_id,target_type,target_id,action,request_id,before_json,after_json,store_id) VALUES(NULL,'Order',$1,'LEGACY_MISSING_ACTOR','missing-actor','{}','{}',$2)",[target,store]);const result=await new StoreAuditService(source,db).list({action:'LEGACY_MISSING_ACTOR'},auth);expect(result.items[0].actor_kind).toBe('UNKNOWN');expect(result.items[0]).not.toHaveProperty('actor_user_id');expect(schemaErrors(result,contracts.operations.listStoreCommerceAudit.responses['200'])).toEqual([]);
  });
  if(source==='M2')test('a customer cancellation reason matching a worker code cannot hide the human executor',async()=>{
   await db.transaction(m=>audit(m,'M2',actor,'Order',target,'INVENTORY_CONSUMED','human-code-collision',{status:'PENDING',version:1},{status:'CANCELLED',version:2}));
   expect((await db.query("SELECT actor_user_id FROM m2_audit WHERE request_id='human-code-collision'"))[0].actor_user_id).toBe(actor);
   const service=new StoreAuditService(source,db),result=await service.list({action:'CANCEL_ORDER',actor_user_id:actor},auth);expect(result.items.some((r:any)=>r.request_id==='human-code-collision'&&r.actor_kind==='ACCOUNT'&&r.after.reason==='INVENTORY_CONSUMED')).toBe(true);
   await db.query("INSERT INTO m2_audit(actor_user_id,target_type,target_id,action,request_id,before_json,after_json,store_id) VALUES($1,'Order',$2,'INVENTORY_CONSUMED','legacy-human-collision','{\"status\":\"PENDING\"}','{\"status\":\"CANCELLED\"}',$3)",[actor,target,store]);
   await db.query("INSERT INTO m2_audit(actor_user_id,target_type,target_id,action,request_id,before_json,after_json,store_id) VALUES(NULL,'Order',$1,'DELIVERY_RETURN_CLOSED','legacy-missing-cancel-actor','{}','{\"status\":\"CANCELLED\"}',$2)",[target,store]);expect((await service.list({action:'CANCEL_ORDER'},auth)).items.find((r:any)=>r.request_id==='legacy-missing-cancel-actor')).toMatchObject({actor_kind:'UNKNOWN',action:'CANCEL_ORDER'});
   const legacy=await service.list({action:'CANCEL_ORDER',actor_user_id:actor},auth);expect(legacy.items.find((r:any)=>r.request_id==='legacy-human-collision')).toMatchObject({actor_kind:'ACCOUNT',actor_user_id:actor,action:'CANCEL_ORDER',after:{reason:'INVENTORY_CONSUMED'}});expect((await db.query("SELECT action FROM m2_audit WHERE request_id='legacy-human-collision'"))[0].action).toBe('INVENTORY_CONSUMED');
  });
 });
}

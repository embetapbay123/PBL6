import 'reflect-metadata';
import {randomUUID} from 'node:crypto';
import {readdirSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {DataSource} from 'typeorm';
import {StoreRepository} from '../../identity-store-service/src/store/store.repository';
const suite=process.env.M3_DATABASE_URL?describe:describe.skip;
suite('Admin applications filter/count before pagination in isolated M3 PostgreSQL',()=>{
 let root:DataSource,db:DataSource,schema:string,repo:StoreRepository;
 const actors:string[]=[],apps:string[]=[],admin=randomUUID();
 beforeAll(async()=>{
  root=await new DataSource({type:'postgres',url:process.env.M3_DATABASE_URL}).initialize();schema='app_search_'+randomUUID().replace(/-/g,'');await root.query('CREATE SCHEMA '+schema);db=await new DataSource({type:'postgres',url:process.env.M3_DATABASE_URL,extra:{options:'-csearch_path='+schema+',public'}}).initialize();
  const dir=resolve(__dirname,'../../identity-store-service/migrations');for(const f of readdirSync(dir).filter(f=>f.endsWith('.sql')).sort())await db.query(readFileSync(resolve(dir,f),'utf8'));
  repo=new StoreRepository(db);await db.query("INSERT INTO role(code,scope,status) VALUES('CUSTOMER','GLOBAL','ACTIVE'),('STORE_OWNER','GLOBAL','ACTIVE'),('SELLER','GLOBAL','ACTIVE'),('ADMIN','GLOBAL','ACTIVE') ON CONFLICT DO NOTHING");
  await db.query("INSERT INTO \"user\"(id,email,password_hash,status) VALUES($1,'app-review-admin@example.test','fixture-not-a-password','ACTIVE')",[admin]);
  for(let i=0;i<30;i++){const user=randomUUID(),app=randomUUID();actors.push(user);apps.push(app);await db.query("INSERT INTO \"user\"(id,email,password_hash,status) VALUES($1,$2,'fixture-not-a-password','ACTIVE')",[user,'application-'+i+'@example.test']);await db.query("INSERT INTO customer_profile(user_id,display_name,updated_at) VALUES($1,$2,now())",[user,'Nguyễn Ánh Đỏ '+i]);await db.query("INSERT INTO user_role(user_id,role_id,granted_at) SELECT $1,id,now() FROM role WHERE code='CUSTOMER'",[user]);await db.query("INSERT INTO store_application(id,applicant_user_id,proposed_name,contact,status,submitted_at) VALUES($1,$2,$3,$4,$5,now()-$6*interval '1 minute')",[app,user,i===29?'Điện tử Đỏ':'Store '+i,'Liên hệ '+i,i<20?'APPROVED':'PENDING',i]);}
 });
 afterAll(async()=>{if(db?.isInitialized)await db.destroy();if(root?.isInitialized){if(/^app_search_[a-f0-9]{32}$/.test(schema))await root.query('DROP SCHEMA '+schema+' CASCADE');await root.destroy();}});
 test('Pending applications beyond page two have truthful global counts and a reachable filtered page',async()=>{
  const all=await repo.listStoreApplications(null,1,10);expect(all.items.every((r:any)=>r.status==='APPROVED')).toBe(true);expect(all.status_counts).toEqual({ALL:30,PENDING:10,APPROVED:20,REJECTED:0});
  const pending=await repo.listStoreApplications(null,1,10,'PENDING');expect(pending.total).toBe(10);expect(pending.items).toHaveLength(10);expect(pending.items.every((r:any)=>r.status==='PENDING')).toBe(true);expect((await repo.listStoreApplications(null,2,10,'PENDING')).items).toEqual([]);
 });
 test('search by Vietnamese Store/person or exact application ID is server-side, with real applicant identity',async()=>{
  for(const q of ['dien tu do',apps[29],'application-29@example.test']){const result=await repo.listStoreApplications(null,1,10,'PENDING',q);expect(result.total).toBe(1);expect(result.items[0]).toMatchObject({id:apps[29],applicant_user_id:actors[29],applicant_email:'application-29@example.test',applicant_display_name:'Nguyễn Ánh Đỏ 29',applicant_status:'ACTIVE'});}
  expect((await repo.listStoreApplications(null,1,10,'PENDING','nguyen anh do')).total).toBe(10);
 });
 test('own history and counts cannot include another applicant even with matching search text',async()=>{
  const own=await repo.listStoreApplications(actors[29],1,10);expect(own.total).toBe(1);expect(own.items[0].id).toBe(apps[29]);expect((await repo.listStoreApplications(actors[28],1,10,undefined,apps[29])).total).toBe(0);
 });
 test('decision uses actual applicant/version and concurrent retry cannot create a second Store or Owner grant',async()=>{
  const [a,b]=await Promise.allSettled([repo.reviewStoreApplication(apps[29],{status:'APPROVED',expected_version:0},admin,'app-search-approve'),repo.reviewStoreApplication(apps[29],{status:'APPROVED',expected_version:0},admin,'app-search-race')]);expect([a,b].filter(r=>r.status==='fulfilled')).toHaveLength(1);
  const rows=await db.query("SELECT m.store_id,m.role FROM store_membership m WHERE m.user_id=$1",[actors[29]]);expect(rows).toHaveLength(1);expect(rows[0].role).toBe('OWNER');expect((await repo.listStoreApplications(null,1,10,'PENDING')).total).toBe(9);expect((await repo.listStoreApplications(null,1,10,'APPROVED',apps[29])).total).toBe(1);
 });
});

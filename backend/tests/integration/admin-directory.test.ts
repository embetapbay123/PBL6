import 'reflect-metadata';
import {randomUUID} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {DataSource} from 'typeorm';
import {AdministrationRepository} from '../../identity-store-service/src/administration/administration.repository';
import {schemaErrors} from '../../shared/src/contract-validation';
import contracts from '../../shared/src/contracts.runtime.generated.json';
const suite=process.env.M3_DATABASE_URL?describe:describe.skip;
suite('Admin directories and state decisions in an isolated M3 schema',()=>{
 let root:DataSource,db:DataSource,schema:string,repo:AdministrationRepository;
 const users=Array.from({length:31},()=>randomUUID()),stores=Array.from({length:31},()=>randomUUID()),admin=randomUUID();
 beforeAll(async()=>{
  root=await new DataSource({type:'postgres',url:process.env.M3_DATABASE_URL}).initialize();schema='directory_fix_'+randomUUID().replace(/-/g,'');await root.query('CREATE SCHEMA '+schema);
  db=await new DataSource({type:'postgres',url:process.env.M3_DATABASE_URL,extra:{options:'-csearch_path='+schema+',public'}}).initialize();const dir=resolve(__dirname,'../../identity-store-service/migrations');for(const file of readdirSync(dir).filter(f=>f.endsWith('.sql')).sort())await db.query(readFileSync(resolve(dir,file),'utf8'));repo=new AdministrationRepository(db);
  await db.query(`INSERT INTO "user"(id,email,password_hash,status) VALUES($1,'directory-admin@example.test','fixture-only','ACTIVE')`,[admin]);
  for(let i=0;i<31;i++){
   const name=i===30?'Điện Đỏ %_':i===29?'Nguyễn Ánh Đỏ'.normalize('NFD'):'Nguyễn Ánh Đỏ',app=randomUUID();
   await db.query(`INSERT INTO "user"(id,email,password_hash,status,created_at) VALUES($1,$2,'fixture-only',$3,now()-$4*interval '1 minute')`,[users[i],'directory-'+i+'@example.test',i===30?'LOCKED':'ACTIVE',i]);await db.query('INSERT INTO customer_profile(user_id,display_name,updated_at) VALUES($1,$2,now())',[users[i],name]);
   await db.query("INSERT INTO store_application(id,applicant_user_id,proposed_name,contact,status) VALUES($1,$2,$3,'fixture contact','APPROVED')",[app,users[i],'Store '+i]);await db.query("INSERT INTO store(id,application_id,name,slug,contact,shipping_fee_vnd,status) VALUES($1,$2,$3,$4,'fixture contact',20000,$5)",[stores[i],app,'Điện Đỏ '+i,'directory-'+i,i===30?'LOCKED':'ACTIVE']);
   if(i<30)await db.query("INSERT INTO store_membership(store_id,user_id,role,status,joined_at) VALUES($1,$2,'OWNER','ACTIVE',now())",[stores[i],users[i]]);
  }
 });
 afterAll(async()=>{if(db?.isInitialized)await db.destroy();if(root?.isInitialized){if(/^directory_fix_[a-f0-9]{32}$/.test(schema))await root.query('DROP SCHEMA '+schema+' CASCADE');await root.destroy();}});
 test('user name/email/ID search runs before pagination and matches Vietnamese decomposed or unaccented text',async()=>{
  for(const q of ['nguyen anh do','NGUYỄN ÁNH ĐỎ','Nguyễn Ánh Đỏ'.normalize('NFD')]){const result=await repo.listUsers(1,20,q,'ACTIVE');expect(result.total).toBe(30);expect(result.items).toHaveLength(20);expect((await repo.listUsers(2,20,q,'ACTIVE')).items).toHaveLength(10);}
  for(const q of [users[30],'directory-30@example.test']){const result=await repo.listUsers(1,20,q,'LOCKED');expect(result.total).toBe(1);expect(result.items[0]).toMatchObject({id:users[30],display_name:'Điện Đỏ %_',status:'LOCKED'});expect(schemaErrors(result,contracts.operations.listUsers.responses['200'])).toEqual([]);}
 });
 test('literal LIKE and SQL metacharacters cannot broaden user or Store results',async()=>{
  expect((await repo.listUsers(1,20,'%_')).total).toBe(1);expect((await repo.listUsers(1,20,"' OR 1=1 --")).total).toBe(0);expect((await repo.listStores(1,20,'%_')).total).toBe(0);
 });
 test('Store search identifies actual Owner, counts filtered rows and never fabricates a zero UUID for a missing Owner',async()=>{
  const result=await repo.listStores(1,20,'directory-29@example.test');expect(result.total).toBe(1);expect(result.items[0]).toMatchObject({id:stores[29],owner_user_id:users[29],owner_email:'directory-29@example.test'});
  const locked=await repo.listStores(1,20,'dien do','LOCKED');expect(locked.total).toBe(1);expect(locked.items[0].id).toBe(stores[30]);expect(locked.items[0]).not.toHaveProperty('owner_user_id');expect(schemaErrors(locked,contracts.operations.listStores.responses['200'])).toEqual([]);
 });
 test('concurrent user decisions persist one version and revoke sessions; unlocking does not revive those sessions or change Store state',async()=>{
  const user=users[0],session=randomUUID();await db.query("INSERT INTO refresh_session(id,user_id,token_hash,expires_at,family_id) VALUES($1,$2,'fixture-not-a-real-token',now()+interval '1 day',$1)",[session,user]);
  const results=await Promise.allSettled([repo.updateUserState(user,'LOCKED','Đã xác minh',0,admin,'lock-1'),repo.updateUserState(user,'LOCKED','Quyết định cạnh tranh',0,admin,'lock-2')]);expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(results.filter(r=>r.status==='rejected')).toHaveLength(1);
  const result=results.find(r=>r.status==='fulfilled') as PromiseFulfilledResult<any>;expect(result.value).toMatchObject({id:user,version:1,status:'LOCKED'});expect((await db.query('SELECT revoked_at FROM refresh_session WHERE id=$1',[session]))[0].revoked_at).not.toBeNull();
  await repo.updateUserState(user,'ACTIVE','Đã giải quyết',1,admin,'unlock');expect((await db.query('SELECT revoked_at FROM refresh_session WHERE id=$1',[session]))[0].revoked_at).not.toBeNull();expect((await db.query('SELECT status FROM store WHERE id=$1',[stores[0]]))[0].status).toBe('ACTIVE');
  expect(await db.query("SELECT action FROM m3_audit WHERE target_id=$1 ORDER BY created_at,id",[user])).toHaveLength(2);
 });
 test('Store decisions retain version/Owner and leave the Owner account active; stale changes cannot overwrite',async()=>{
  const result=await repo.updateStoreState(stores[1],'LOCKED','Xác minh nội dung Store',0,admin,'store-lock');expect(result).toMatchObject({id:stores[1],owner_user_id:users[1],status:'LOCKED',version:1});expect(schemaErrors(result,contracts.operations.updateStoreState.responses['200'])).toEqual([]);
  await expect(repo.updateStoreState(stores[1],'ACTIVE','Bản cũ',0,admin,'store-stale')).rejects.toMatchObject({status:409});expect((await db.query('SELECT status FROM "user" WHERE id=$1',[users[1]]))[0].status).toBe('ACTIVE');expect((await db.query('SELECT store_id FROM m3_audit WHERE target_id=$1',[stores[1]]))[0].store_id).toBe(stores[1]);
 });
 test('blank reasons and invalid state cannot write an audit or change versions',async()=>{
  await expect(repo.updateUserState(users[2],'LOCKED',' ',0,admin,'blank')).rejects.toMatchObject({status:422});await expect(repo.updateStoreState(stores[2],'UNKNOWN','Lý do',0,admin,'bad-state')).rejects.toMatchObject({status:422});expect((await db.query('SELECT version FROM "user" WHERE id=$1',[users[2]]))[0].version).toBe(0);
 });
});

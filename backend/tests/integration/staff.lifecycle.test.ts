import 'reflect-metadata';
import {randomUUID} from 'node:crypto';
import {readdirSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {DataSource} from 'typeorm';
import {StaffRepository} from '../../identity-store-service/src/staff/staff.repository';
import {StaffService} from '../../identity-store-service/src/staff/staff.service';

const suite=process.env.M3_DATABASE_URL?describe:describe.skip;
suite('Staff lifecycle in an isolated schema: consent, expiry, delivery failure and concurrent transitions',()=>{
 let root:DataSource,db:DataSource,schema:string,repo:StaffRepository;
 const owner=randomUUID(),otherOwner=randomUUID(),store=randomUUID(),otherStore=randomUUID(),permission='inventory.store.read_adjust';
 async function user(){const id=randomUUID(),email=id+'@example.test';await db.query(`INSERT INTO "user"(id,email,password_hash,status,email_verified_at) VALUES($1,$2,'test-placeholder-no-login','ACTIVE',now())`,[id,email]);return {id,email};}
 async function invite(actor:{email:string},s=store,o=owner){return repo.createInvitation(o,s,{invited_email:actor.email,permissions:[permission]},randomUUID());}
 async function count(table:string,condition:string,args:unknown[]){return (await db.query(`SELECT count(*)::int AS n FROM ${table} WHERE ${condition}`,args))[0].n;}
 beforeAll(async()=>{
  root=await new DataSource({type:'postgres',url:process.env.M3_DATABASE_URL}).initialize();schema='staff_lifecycle_'+randomUUID().replace(/-/g,'');await root.query('CREATE SCHEMA '+schema);
  db=await new DataSource({type:'postgres',url:process.env.M3_DATABASE_URL,extra:{options:'-csearch_path='+schema+',public'}}).initialize();
  const dir=resolve(__dirname,'../../identity-store-service/migrations');for(const file of readdirSync(dir).filter(f=>f.endsWith('.sql')).sort())await db.query(readFileSync(resolve(dir,file),'utf8'));
  for(const [u,s] of [[owner,store],[otherOwner,otherStore]]){
   await db.query(`INSERT INTO "user"(id,email,password_hash,status,email_verified_at) VALUES($1,$2,'test-placeholder-no-login','ACTIVE',now())`,[u,u+'@example.test']);
   const app=randomUUID();await db.query("INSERT INTO store_application(id,applicant_user_id,proposed_name,contact,status) VALUES($1,$2,'Private test Store','private','APPROVED')",[app,u]);await db.query("INSERT INTO store(id,application_id,name,slug,contact,shipping_fee_vnd,status) VALUES($1,$2,'Private test Store',$3,'private',0,'ACTIVE')",[s,app,s]);await db.query("INSERT INTO store_membership(id,store_id,user_id,role,status,joined_at) VALUES($1,$2,$3,'OWNER','ACTIVE',now())",[randomUUID(),s,u]);
  }
  repo=new StaffRepository(db);
 });
 afterAll(async()=>{if(db?.isInitialized)await db.destroy();if(root?.isInitialized){if(/^staff_lifecycle_[a-f0-9]{32}$/.test(schema))await root.query('DROP SCHEMA '+schema+' CASCADE');await root.destroy();}});
 test('normalizes email, refuses duplicate pending invitations and cannot invite Owner privileges',async()=>{
  const a=await user(),i=await repo.createInvitation(owner,store,{invited_email:' '+a.email.toUpperCase()+' ',permissions:[permission]},'normalized');expect(i.invited_email).toBe(a.email);
  await expect(invite(a)).rejects.toMatchObject({status:409,response:{code:'DUPLICATE_INVITATION'}});await expect(repo.createInvitation(owner,store,{invited_email:a.email,permissions:['platform.admin']},'forbidden')).rejects.toMatchObject({status:422});expect(await count('store_membership','user_id=$1',[a.id])).toBe(0);
 });
 test('GET labels expiry without writing; attempted acceptance commits one expiry audit and no membership',async()=>{
  const a=await user(),i=await invite(a);await db.query("UPDATE staff_invitation SET expires_at=now()-interval '1 second' WHERE id=$1",[i.id]);expect((await repo.listOwnInvitations(a.id)).items[0].status).toBe('EXPIRED');expect((await db.query('SELECT status FROM staff_invitation WHERE id=$1',[i.id]))[0].status).toBe('PENDING');
  await expect(repo.acceptInvitation(a.id,i.id,'expired-attempt')).rejects.toMatchObject({status:409,response:{code:'INVITATION_EXPIRED'}});expect((await db.query('SELECT status,version FROM staff_invitation WHERE id=$1',[i.id]))[0]).toEqual({status:'EXPIRED',version:1});expect(await count('store_membership','user_id=$1',[a.id])).toBe(0);expect(await count('m3_audit',"target_id=$1 AND action='STAFF_INVITATION_EXPIRED'",[i.id])).toBe(1);
 });
 test('another verified account and another Store Owner cannot consume or revoke an invitation',async()=>{
  const a=await user(),stranger=await user(),i=await invite(a);await expect(repo.acceptInvitation(stranger.id,i.id,'wrong-account')).rejects.toMatchObject({status:404});await expect(repo.revokeInvitation(otherOwner,otherStore,i.id,'wrong-store')).rejects.toMatchObject({status:404});expect((await db.query('SELECT status FROM staff_invitation WHERE id=$1',[i.id]))[0].status).toBe('PENDING');expect(await count('store_membership','user_id=$1',[stranger.id])).toBe(0);
 });
 test('two accept requests create exactly one employee and scoped permission, event and acceptance audit',async()=>{
  const a=await user(),i=await invite(a),results=await Promise.allSettled([repo.acceptInvitation(a.id,i.id,'accept-a'),repo.acceptInvitation(a.id,i.id,'accept-b')]);expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(results.find(r=>r.status==='rejected')).toMatchObject({reason:{status:409}});
  expect(await count('store_membership',"user_id=$1 AND role='SELLER' AND status='ACTIVE'",[a.id])).toBe(1);expect(await count('membership_permission mp JOIN store_membership m ON m.id=mp.membership_id','m.user_id=$1',[a.id])).toBe(1);expect(await count('user_role ur JOIN role r ON r.id=ur.role_id',"ur.user_id=$1 AND r.code='SELLER'",[a.id])).toBe(0);expect(await count('user_role ur JOIN role r ON r.id=ur.role_id',"ur.user_id=$1 AND r.code='STORE_OWNER'",[a.id])).toBe(0);expect(await count('outbox',"event_type='MembershipChanged' AND payload->>'user_id'=$1",[a.id])).toBe(1);expect(await count('m3_audit',"target_id=$1 AND action='STAFF_INVITATION_ACCEPTED'",[i.id])).toBe(1);
 });
 test('concurrent invitations to two Stores still admit a single active membership',async()=>{
  const a=await user(),ia=await invite(a),ib=await invite(a,otherStore,otherOwner),results=await Promise.allSettled([repo.acceptInvitation(a.id,ia.id,'two-stores-a'),repo.acceptInvitation(a.id,ib.id,'two-stores-b')]);expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(results.find(r=>r.status==='rejected')).toMatchObject({reason:{status:409,response:{code:'ACTIVE_MEMBERSHIP_EXISTS'}}});expect(await count('store_membership',"user_id=$1 AND status='ACTIVE'",[a.id])).toBe(1);
 });
 test('accept versus revoke has one terminal winner and no contradictory membership',async()=>{
  const a=await user(),i=await invite(a),results=await Promise.allSettled([repo.acceptInvitation(a.id,i.id,'race-accept'),repo.revokeInvitation(owner,store,i.id,'race-revoke')]);expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(results.find(r=>r.status==='rejected')).toMatchObject({reason:{status:409}});const row=(await db.query('SELECT status FROM staff_invitation WHERE id=$1',[i.id]))[0];expect(['ACCEPTED','REVOKED']).toContain(row.status);expect(await count('store_membership','user_id=$1',[a.id])).toBe(row.status==='ACCEPTED'?1:0);expect(await count('m3_audit',"target_id=$1 AND action IN ('STAFF_INVITATION_ACCEPTED','STAFF_INVITATION_REVOKED')",[i.id])).toBe(1);
 });
 test('a stale receiver cannot accept a revoked invitation, including a repeated revoke',async()=>{
  const a=await user(),i=await invite(a);expect((await repo.revokeInvitation(owner,store,i.id,'revoke-first')).status).toBe('REVOKED');await expect(repo.acceptInvitation(a.id,i.id,'stale-receiver')).rejects.toMatchObject({status:409,response:{code:'INVALID_STATE_TRANSITION'}});await expect(repo.revokeInvitation(owner,store,i.id,'revoke-again')).rejects.toMatchObject({status:409});expect(await count('store_membership','user_id=$1',[a.id])).toBe(0);expect(await count('m3_audit',"target_id=$1 AND action='STAFF_INVITATION_REVOKED'",[i.id])).toBe(1);
 });
 test('email failure revokes an unaccepted invitation and never grants membership',async()=>{
  const a=await user(),service=new StaffService(repo,async()=>{throw Error('Controlled capture delivery failure');});await expect(service.createInvitation(owner,store,{invited_email:a.email,permissions:[permission]},'delivery-failure')).rejects.toThrow('Controlled capture delivery failure');const row=(await db.query('SELECT id,status,version FROM staff_invitation WHERE invited_email=$1',[a.email]))[0];expect(row).toMatchObject({status:'REVOKED',version:1});expect(await count('store_membership','user_id=$1',[a.id])).toBe(0);expect(await count('m3_audit',"target_id=$1 AND action='STAFF_INVITATION_DELIVERY_FAILED' AND store_id=$2",[row.id,store])).toBe(1);
 });
 test('late email failure preserves an explicit concurrent acceptance',async()=>{
  const a=await user(),service=new StaffService(repo,async()=>{const [row]=await db.query('SELECT id FROM staff_invitation WHERE invited_email=$1',[a.email]);await repo.acceptInvitation(a.id,row.id,'accepted-before-delivery-error');throw Error('Late delivery error');});await expect(service.createInvitation(owner,store,{invited_email:a.email,permissions:[permission]},'late-delivery-failure')).rejects.toThrow('Late delivery error');expect((await db.query('SELECT status FROM staff_invitation WHERE invited_email=$1',[a.email]))[0].status).toBe('ACCEPTED');expect(await count('store_membership','user_id=$1',[a.id])).toBe(1);
 });
 test('delivery-failure audit retains the actual before and after version, matching the committed invitation',async()=>{
  const a=await user(),i=await invite(a);await repo.failInvitationDelivery(store,i.id,'delivery-version');const [row]=await db.query('SELECT status,version FROM staff_invitation WHERE id=$1',[i.id]);const [log]=await db.query("SELECT before_json,after_json FROM m3_audit WHERE target_id=$1 AND action='STAFF_INVITATION_DELIVERY_FAILED'",[i.id]);expect(row).toEqual({status:'REVOKED',version:1});expect(log).toEqual({before_json:{status:'PENDING',version:0},after_json:{status:'REVOKED',version:1}});
 });
 test('an audit write failure rolls back membership, permissions, role, invitation and outbox together',async()=>{
  const a=await user(),i=await invite(a);await db.query(`CREATE FUNCTION reject_staff_test_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.request_id='force-audit-rollback' THEN RAISE EXCEPTION 'Controlled audit failure'; END IF; RETURN NEW; END $$;CREATE TRIGGER reject_staff_test_audit BEFORE INSERT ON m3_audit FOR EACH ROW EXECUTE FUNCTION reject_staff_test_audit();`);
  await expect(repo.acceptInvitation(a.id,i.id,'force-audit-rollback')).rejects.toThrow('Controlled audit failure');expect((await db.query('SELECT status FROM staff_invitation WHERE id=$1',[i.id]))[0].status).toBe('PENDING');expect(await count('store_membership','user_id=$1',[a.id])).toBe(0);expect(await count('user_role','user_id=$1',[a.id])).toBe(0);expect(await count('outbox',"payload->>'user_id'=$1",[a.id])).toBe(0);
 });
});

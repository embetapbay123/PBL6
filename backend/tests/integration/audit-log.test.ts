import {DataSource} from 'typeorm';
import {randomUUID} from 'node:crypto';
const base=process.env.TEST_API_URL ?? 'http://gateway/api/v1',action='VERIFY_'+randomUUID();
const sources=[['M1','catalog','m1_audit'],['M2','commerce','m2_audit'],['M3','identity','m3_audit']] as const;
const databases:{source:typeof sources[number];db:DataSource;id:string}[]=[];
let admin='',buyer='';
async function call(path:string,token?:string){return fetch(base+path,{headers:token?{Authorization:'Bearer '+token}:{}});}
async function login(email:string){const response=await fetch(base+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:process.env.SEED_PASSWORD,client_type:'MOBILE'})});expect(response.status).toBe(200);return (await response.json() as any).access_token as string;}
beforeAll(async()=>{
  admin=await login('admin@pbl6.test');buyer=await login('customer1@pbl6.test');
  for(const source of sources){const db=new DataSource({type:'postgres',url:process.env[source[0]+'_DATABASE_URL']});await db.initialize();const id=randomUUID();databases.push({source,db,id});await db.query(`INSERT INTO ${source[2]}(id,actor_user_id,target_type,target_id,action,request_id,before_json,after_json) VALUES($1,$2,'Verification',$3,$4,$5,$6::jsonb,$6::jsonb)`,[id,'10000000-0000-4000-8000-000000000004',randomUUID(),action,randomUUID(),JSON.stringify({private_data:'must-not-be-exposed'})]);}
});
afterAll(async()=>{for(const {source,db,id} of databases){await db.query(`DELETE FROM ${source[2]} WHERE id=$1`,[id]);await db.destroy();}});
test('each gateway audit source requires Admin and returns only paginated metadata',async()=>{
  const profile=await call('/stores/10000000-0000-4000-8000-000000000061');expect(profile.status).toBe(200);const store=await profile.json() as any;expect(store).toMatchObject({id:'10000000-0000-4000-8000-000000000061',name:expect.any(String),shipping_fee_vnd:0});expect(store.name.length).toBeGreaterThan(0);expect(store).not.toHaveProperty('contact');expect(store).not.toHaveProperty('application_id');expect((await call('/stores/'+randomUUID())).status).toBe(404);
  for(const {source,id} of databases){
    const path='/admin/audit/'+source[1];expect((await call(path)).status).toBe(401);expect((await call(path,buyer)).status).toBe(403);
    const response=await call(path+'?action='+action+'&target_type=Verification&size=1',admin);expect(response.status).toBe(200);const json=await response.json() as any;expect(json).toMatchObject({page:1,size:1,total:1,items:[{id,service:source[0],action,target_type:'Verification'}]});expect(JSON.stringify(json)).not.toContain('private_data');expect(JSON.stringify(json)).not.toContain('before_json');
    const next=await (await call(path+'?action='+action+'&page=2&size=1',admin)).json() as any;expect(next).toMatchObject({items:[],total:1,page:2});
  }
});

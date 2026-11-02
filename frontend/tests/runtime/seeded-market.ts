import {expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {privateMarket} from './private-market';

/** Identity fixture provisioning, not registration acceptance. Never alters shared/demo users. */
export function seededMarket(prefix:string,{verified=false}:{verified?:boolean}={}){
 const market=privateMarket(prefix);
 async function actor(name:string){
  const email=market.tag+'.'+name+'@pbl6.test';
  const code=`const {Client}=require('pg'),bcrypt=require('bcryptjs'),{randomUUID}=require('crypto');(async()=>{let text='';for await(const chunk of process.stdin)text+=chunk;const x=JSON.parse(text);if(process.env.EMAIL_ADAPTER!=='capture'||!/^corecheckout-[0-9]+$/.test(x.tag)||!x.email.startsWith(x.tag+'.')||!x.email.endsWith('@pbl6.test'))throw Error('Private tagged fixture required');const c=new Client({connectionString:process.env.M3_DATABASE_URL});await c.connect();try{const hash=await bcrypt.hash(x.password,10),id=randomUUID();await c.query('BEGIN');const role=await c.query('SELECT id FROM role WHERE code=$1 AND status=$2',['CUSTOMER','ACTIVE']);if(role.rowCount!==1)throw Error('CUSTOMER role missing');await c.query('INSERT INTO "user"(id,email,password_hash,status,created_at,version,email_verified_at) VALUES($1,$2,$3,$4,now(),0,CASE WHEN $5::boolean THEN now() ELSE NULL END)',[id,x.email,hash,'ACTIVE',x.verified===true]);await c.query('INSERT INTO customer_profile(id,user_id,display_name,updated_at) VALUES($1,$2,$3,now())',[randomUUID(),id,x.tag+' '+x.name]);await c.query('INSERT INTO user_role(user_id,role_id,granted_at) VALUES($1,$2,now())',[id,role.rows[0].id]);await c.query('COMMIT');process.stdout.write(JSON.stringify({user:id}));}catch(e){await c.query('ROLLBACK');throw e;}finally{await c.end();}})();`;
  const row=JSON.parse(execFileSync('docker',['exec','-i','pbl6-fe-verify-m3-1','node','-e',code],{input:JSON.stringify({tag:market.tag,email,password:market.password,name,verified}),encoding:'utf8'}));
  expect(typeof row.user).toBe('string');const login=await market.api('/auth/login',undefined,'POST',{email,password:market.password,client_type:'MOBILE'});expect(login.context.user_id).toBe(row.user);return {email,user:row.user,access:login.access_token};
 }
 return {...market,actor};
}

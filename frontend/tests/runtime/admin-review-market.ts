import {execFileSync} from 'node:child_process';
import {seededMarket} from './seeded-market';

/** Twenty-five tagged applications; filler rows are setup data, not claimed review transactions. */
export async function adminReviewMarket(){
 const f=seededMarket('corecheckout',{verified:true}),applicant=await f.actor('queue-applicant');
 const admin=(await f.api('/auth/login',undefined,'POST',{email:'admin@pbl6.test',password:process.env.SEED_PASSWORD,client_type:'MOBILE'})).access_token;
 const script=`const {Client}=require('pg'),{randomUUID}=require('crypto');
(async()=>{let t='';for await(const b of process.stdin)t+=b;const x=JSON.parse(t);
 if(process.env.EMAIL_ADAPTER!=='capture'||!/^corecheckout-[0-9]+$/.test(x.tag))throw Error('Private fixture required');
 const c=new Client({connectionString:process.env.M3_DATABASE_URL});await c.connect();
 try{await c.query('BEGIN');const source=(await c.query('SELECT id,email FROM "user" WHERE id=$1 AND email=$2 AND email_verified_at IS NOT NULL',[x.user,x.email])).rows[0];if(!source)throw Error('Verified tagged applicant missing');const apps=[];
  for(let n=0;n<25;n++){const user=n===24?x.user:randomUUID(),id=randomUUID(),status=n<20?'REJECTED':'PENDING',name=x.tag+' Cửa hàng '+String(n).padStart(2,'0'),email=n===24?x.email:x.tag+'.queue-'+n+'@pbl6.test';
   if(n!==24){await c.query('INSERT INTO "user"(id,email,password_hash,status,created_at,email_verified_at) SELECT $1,$2,password_hash,$4,now(),now() FROM "user" WHERE id=$3',[user,email,x.user,'ACTIVE']);await c.query('INSERT INTO customer_profile(id,user_id,display_name,updated_at)VALUES($1,$2,$3,now())',[randomUUID(),user,x.tag+' Người nộp '+n]);await c.query('INSERT INTO user_role(user_id,role_id,granted_at) SELECT $1,id,now() FROM role WHERE code=$2 AND status=$3',[user,'CUSTOMER','ACTIVE']);}
   await c.query('INSERT INTO store_application(id,applicant_user_id,proposed_name,contact,status,version,submitted_at,decision_reason)VALUES($1,$2,$3,$4,$5,0,now()-make_interval(mins=>$6::int),$7)',[id,user,name,email,status,n,status==='REJECTED'?x.tag+' Seeded previously rejected filler':null]);apps.push({id,user,email,name,status});
  }await c.query('COMMIT');process.stdout.write(JSON.stringify(apps));
 }catch(e){await c.query('ROLLBACK');throw e;}finally{await c.end();}
})();`;
 const applications=JSON.parse(execFileSync('docker',['exec','-i','pbl6-fe-verify-m3-1','node','-e',script],{input:JSON.stringify({tag:f.tag,user:applicant.user,email:applicant.email}),encoding:'utf8'}));
 async function cleanup(){const apps=(await f.api('/admin/store-applications?size=100&q='+encodeURIComponent(f.tag),admin)).items;for(const app of apps)if(app.status==='PENDING')await f.api('/admin/store-applications/'+app.id,admin,'PATCH',{expected_version:app.version,status:'REJECTED',decision_reason:f.tag+' private queue fixture cleanup'});const fresh=(await f.api('/auth/login',undefined,'POST',{email:applicant.email,password:f.password,client_type:'MOBILE'})).access_token;const own=await f.raw('/store',fresh);if(own.status===200){if(!own.value.name.startsWith(f.tag+' '))throw Error('Unexpected Store outside fixture');if(own.value.status!=='LOCKED')await f.api('/admin/stores/'+own.value.id,admin,'PATCH',{expected_version:own.value.version,status:'LOCKED',reason:f.tag+' withdraw private queue fixture'});return own.value.id;}return undefined;}
 return {...f,applicant,admin,applications,cleanup};
}

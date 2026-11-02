#!/usr/bin/env node
/** Read-only role/guard verification, apart from creating and revoking its own sessions. */
const fs=require('node:fs');
async function main(){
 const base=process.env.DEMO_LOGIN_API_URL??'http://m3:3103/api/v1',origin=process.env.WEB_ORIGIN;
 if(!origin)throw Error('WEB_ORIGIN required');
 const results=[];
 async function send(path,body,headers={}){const r=await fetch(base+path,{method:body?'POST':'GET',signal:AbortSignal.timeout(10000),headers:{Origin:origin,'Content-Type':'application/json',...headers},...(body?{body:JSON.stringify(body)}:{})});return {r,value:await r.json()};}
 async function rejected(label,body,headers,status){const {r}=await send('/auth/demo-login',body,headers);if(r.status!==status)throw Error(label+' expected '+status+' got '+r.status);results.push({check:label,status:'PASS'});}
 await rejected('wrong-origin',{account:'admin'},{Origin:'https://other.example.test'},403);
 await rejected('unknown-account',{account:'unknown'},undefined,422);
 await rejected('cannot-inject-email',{account:'customerA',email:'other@example.test'},undefined,422);
 await rejected('cannot-request-mobile-refresh-token',{account:'customerA',client_type:'MOBILE'},undefined,422);
 const people=[['customerA','customer.a@pbl6.test','CUSTOMER'],['customerB','customer.b@pbl6.test','CUSTOMER'],['ownerA','owner.a@pbl6.test','STORE_OWNER'],['ownerB','owner.b@pbl6.test','STORE_OWNER'],['staffA','seller.a@pbl6.test','SELLER'],['staffB','seller.b@pbl6.test','SELLER'],['admin','admin@pbl6.test','ADMIN']];
 for(const [account,email,role] of people){
  const {r,value}=await send('/auth/demo-login',{account});
  if(r.status!==200||!value.access_token||value.refresh_token||!value.context?.roles?.includes(role))throw Error('Wrong demo session: '+account);
  const cookies=r.headers.getSetCookie(),refresh=cookies.find(x=>x.startsWith('pbl6_refresh=')),csrf=cookies.find(x=>x.startsWith('pbl6_csrf='));
  if(!refresh||!csrf||!/HttpOnly/i.test(refresh)||!/SameSite=Strict/i.test(refresh)||!/no-store/.test(r.headers.get('cache-control')??''))throw Error('Unsafe Web session delivery');
  if(process.env.COOKIE_SECURE!=='false'&&!/; Secure/i.test(refresh))throw Error('Missing secure refresh cookie');
  const authorization='Bearer '+value.access_token,{r:profile,value:person}=await send('/me',undefined,{Authorization:authorization});
  if(profile.status!==200||person.email!==email)throw Error('Wrong identity: '+account);
  const cookie=[refresh,csrf].map(x=>x.split(';')[0]).join('; '),csrfToken=csrf.split(';')[0].slice('pbl6_csrf='.length);
  const {r:logout}=await send('/auth/logout',{}, {Authorization:authorization,Cookie:cookie,'X-CSRF-Token':csrfToken});
  if(logout.status!==200)throw Error('Logout failed: '+account);
  const {r:revoked}=await send('/me',undefined,{Authorization:authorization});if(revoked.status!==401)throw Error('Session still active after logout');
  results.push({account,role,status:'PASS',cookie_delivery:'WEB',logout_revocation:'PASS'});
 }
 const report={status:'PASS',checks:results,credentials_recorded:false,token_values_recorded:false};
 if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({status:'PASS',checks:results.length,accounts:people.length,credentials_recorded:false}));
}
main().catch(error=>{console.error('Demo login verification failed: '+error.message);process.exitCode=1;});

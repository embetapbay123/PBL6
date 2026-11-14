// Opt-in live acceptance support. Secrets are kept in memory, never in evidence.
const {execFileSync}=require('node:child_process');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {randomUUID,randomBytes}=require('node:crypto');
if(process.env.DEMO_BUG_ACCEPTANCE!=='1')throw Error('Live acceptance must be explicitly enabled');
const root=path.resolve(__dirname,'../../..');
const outputName=process.env.DEMO_ACCEPTANCE_OUTPUT||'bug-acceptance-2026-11-14';
if(!/^bug-acceptance-2026-11-14(?:-[a-z-]+)?$/.test(outputName))throw Error('Invalid evidence folder');
const folder=path.join(root,'outputs',outputName);fs.mkdirSync(folder,{recursive:true});
const tmpRoot=fs.realpathSync(os.tmpdir()),tmp=fs.mkdtempSync(path.join(tmpRoot,'pbl6-acceptance-'));
const askpass=path.join(tmp,'askpass.cmd');
if(process.env.DEPLOY_PASSWORD)fs.writeFileSync(askpass,`@powershell.exe -NoLogo -NoProfile -NonInteractive -Command "[Console]::Write([Environment]::GetEnvironmentVariable('PBL6_SSH_PASSWORD'))"\r\n`);
const sshEnv={...process.env,...(process.env.DEPLOY_PASSWORD?{SSH_ASKPASS:askpass,SSH_ASKPASS_REQUIRE:'force',DISPLAY:':0',PBL6_SSH_PASSWORD:process.env.DEPLOY_PASSWORD}:{})};
function remote(service,code,input={}){
 if(!['m1','m2','m3','m4'].includes(service))throw Error('Unknown service');
 const prefix=service==='m4'?'python -':'node';
 const payload=Buffer.from(JSON.stringify(input)).toString('base64');
 const src=service==='m4'?`import json,base64\nx=json.loads(base64.b64decode('${payload}'))\n${code}`:`const x=JSON.parse(Buffer.from('${payload}','base64').toString());\n${code}`;
 const args=['-p','2122','-o','StrictHostKeyChecking=accept-new','-o','ConnectTimeout=15','realkhoa@alpine.khoav4.com',`cd ~/pbl6-demo && docker compose -p pbl6-demo --env-file infrastructure/.env -f infrastructure/compose.yaml exec -T ${service} ${prefix}`];
 const out=execFileSync('ssh.exe',args,{input:src,env:sshEnv,encoding:'utf8',timeout:45000,stdio:['pipe','pipe','pipe']});
 return JSON.parse(out.trim());
}
function sql(service,statement,values=[]){
 if(service==='m4')return remote('m4',`from sqlalchemy import create_engine,text\nimport os\ne=create_engine(os.environ['M4_DATABASE_URL'].replace('postgresql://','postgresql+psycopg://'))\nwith e.begin() as c:\n r=c.execute(text(x['statement']),x['values'])\n print(json.dumps([dict(v) for v in r.mappings()] if r.returns_rows else [],default=str))`,{statement,values});
 return remote(service,`const {Client}=require('pg');(async()=>{const c=new Client({connectionString:process.env.${service.toUpperCase()}_DATABASE_URL});await c.connect();try{const r=await c.query(x.statement,x.values);process.stdout.write(JSON.stringify(r.rows||[]));}finally{await c.end()}})().catch(e=>{console.error(e.message);process.exitCode=1});`,{statement,values});
}
const tag='acceptbug-'+Date.now(),password='Qa-'+randomBytes(20).toString('hex');
const evidence={tag,base:'https://demo.congnguyen.me',started_at:new Date().toISOString(),api_intercepts:0,checks:[],cleanup:[]};
function record(name,result,details={}){evidence.checks.push({name,result,...details});save();}
function save(){fs.writeFileSync(path.join(folder,'results.json'),JSON.stringify(evidence,null,2));}
async function raw(pathname,token,method='GET',body,headers={}){
 const r=await fetch(evidence.base+'/api/v1'+pathname,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...headers},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(25000)});
 const value=await r.json().catch(()=>({}));return {status:r.status,value,retryAfter:Number(r.headers.get('Retry-After')),correlation:r.headers.get('X-Correlation-Id')};
}
async function api(pathname,token,method='GET',body,headers){
 for(let n=0;;n++){const r=await raw(pathname,token,method,body,headers);
  if(r.status===429&&r.value.code==='RATE_LIMITED'&&r.retryAfter>0&&r.retryAfter<=60&&n<2){await new Promise(resolve=>setTimeout(resolve,(r.retryAfter+1)*1000));continue;}
  if(r.status>=400)throw Error(method+' '+pathname+' '+r.status+' '+r.value.code);return r.value;}
}
function dispose(){if(path.dirname(path.resolve(tmp))!==tmpRoot||!path.basename(tmp).startsWith('pbl6-acceptance-'))throw Error('Invalid temp cleanup path');fs.rmSync(tmp,{recursive:true,force:true});}
module.exports={root,folder,remote,sql,tag,password,evidence,record,save,raw,api,dispose,randomUUID};

import {spawn,execFileSync} from 'node:child_process';
/** Private SQL barrier: let the provider commit, block local money commit, then
 * kill the actual refund worker. This never expires a lease by editing SQL. */
export async function holdMoneyCommit(tag:string){
 const code=`const {Client}=require('pg');(async()=>{if(process.env.PBL6_TEST_STACK!=='pbl6-fe-verify'||!/^corecheckout-[0-9]+$/.test(process.argv[1]))throw Error('Private fixture only');const c=new Client({connectionString:process.env.M2_DATABASE_URL});await c.connect();try{await c.query('BEGIN');await c.query("SET LOCAL lock_timeout='5s'");await c.query('LOCK TABLE money_movement IN ACCESS EXCLUSIVE MODE');const q=await c.query('SELECT pg_backend_pid() AS pid');console.log(JSON.stringify({locked:true,pid:q.rows[0].pid}));for await(const b of process.stdin){}await c.query('COMMIT');}finally{await c.end();}})().catch(()=>{process.stderr.write('Private money barrier failed');process.exitCode=1;});`;
 const child=spawn('docker',['exec','-i','pbl6-fe-verify-m2-1','node','-e',code,tag],{stdio:['pipe','pipe','pipe'],windowsHide:true});let stdout='';
 const exited=new Promise<number|null>(resolve=>child.once('close',resolve));
 const locked=await new Promise<{pid:number}>((resolve,reject)=>{
  const timer=setTimeout(()=>{child.stdin.end();reject(Error('Money barrier did not acquire its lock'));},10000);
  child.stdout.on('data',chunk=>{
   stdout+=chunk.toString();
   if(stdout.includes('\n')){
    clearTimeout(timer);
    try{resolve(JSON.parse(stdout.trim()));}catch{reject(Error('Invalid barrier acknowledgement'));}
   }
  });
  child.once('error',()=>{clearTimeout(timer);reject(Error('Cannot start private SQL barrier'));});
  child.once('close',code=>{clearTimeout(timer);if(!stdout.includes('\n'))reject(Error('Money barrier ended before acquiring lock: '+code));});
 });
 return {pid:locked.pid,release:async()=>{child.stdin.end();const result=await exited;if(result!==0)throw Error('Money barrier failed to release: '+result);}};
}
export function blockedMoneyWriter(pid:number){
 const code=`const {Client}=require('pg');(async()=>{if(process.env.PBL6_TEST_STACK!=='pbl6-fe-verify')throw Error('Private stack required');const c=new Client({connectionString:process.env.M2_DATABASE_URL});await c.connect();try{const q=await c.query("SELECT pid FROM pg_stat_activity WHERE $1::int=ANY(pg_blocking_pids(pid)) AND query ILIKE '%INSERT INTO money_movement%'",[Number(process.argv[1])]);process.stdout.write(JSON.stringify(q.rows.map(r=>r.pid)));}finally{await c.end();}})();`;
 return JSON.parse(execFileSync('docker',['exec','pbl6-fe-verify-m2-1','node','-e',code,String(pid)],{encoding:'utf8'})) as number[];
}
export function workerStartedAt(){return execFileSync('docker',['inspect','--format','{{.State.StartedAt}}','pbl6-fe-verify-worker-refund-1'],{encoding:'utf8'}).trim();}
export function crashRefundWorker(){execFileSync('docker',['kill','--signal','KILL','pbl6-fe-verify-worker-refund-1'],{encoding:'utf8'});}
export function startRefundWorker(){execFileSync('docker',['start','pbl6-fe-verify-worker-refund-1'],{encoding:'utf8'});}

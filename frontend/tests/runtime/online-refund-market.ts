import {execFileSync} from 'node:child_process';
import {expect} from '@playwright/test';
import {afterSaleMarket} from './after-sale-market';
export function providerControl(path:string,body?:unknown,ids:string[]=[]){
 const code=`const fs=require('fs');(async()=>{let t='';for await(const b of process.stdin)t+=b;const x=JSON.parse(t);if(process.env.PBL6_TEST_STACK!=='pbl6-fe-verify'||!['/stats','/control','/control/rule','/control/resolve'].includes(x.path))throw Error('Private simulator only');const r=await fetch('http://integration-money:3900'+x.path,{method:x.body===undefined?'GET':'POST',headers:{'Content-Type':'application/json','X-Integration-Key':fs.readFileSync(process.env.INTEGRATION_KEY_FILE,'utf8').trim()},...(x.body===undefined?{}:{body:JSON.stringify(x.body)})});let v=await r.json();if(x.path==='/stats')v={mode:v.mode,commands:v.commands.filter(c=>x.ids.includes(c.operation_id))};process.stdout.write(JSON.stringify({status:r.status,value:v}));})();`;
 return JSON.parse(execFileSync('docker',['exec','-i','pbl6-fe-verify-m2-1','node','-e',code],{input:JSON.stringify({path,body,ids}),encoding:'utf8'}));
}
export function refundReadback(orderId:string){
 const code=`const {Client}=require('pg');(async()=>{let t='';for await(const b of process.stdin)t+=b;const x=JSON.parse(t);if(process.env.PBL6_TEST_STACK!=='pbl6-fe-verify')throw Error('Private stack required');const c=new Client({connectionString:process.env.M2_DATABASE_URL});await c.connect();try{const q=await c.query('SELECT o.id,o.status,p.status AS payment_status,p.collected_vnd,p.refunded_vnd,r.id AS refund_id,r.status AS refund_status,r.operation_id,j.status AS job_status,j.execution_operation_id,j.lease_until FROM "order" o JOIN payment p ON p.order_id=o.id JOIN refund r ON r.order_id=o.id JOIN refund_job j ON j.refund_id=r.id WHERE o.id=$1',[x.order]);process.stdout.write(JSON.stringify(q.rows[0]??null));}finally{await c.end();}})();`;
 return JSON.parse(execFileSync('docker',['exec','-i','pbl6-fe-verify-m2-1','node','-e',code],{input:JSON.stringify({order:orderId}),encoding:'utf8'}));
}
export function pendingProviderJobs(){
 const code=`const {Client}=require('pg');(async()=>{const c=new Client({connectionString:process.env.M2_DATABASE_URL});await c.connect();try{const q=await c.query("SELECT count(*)::int AS n FROM refund_job WHERE provider='INTEGRATION' AND status IN ('PENDING','RECONCILE','LEASED')");process.stdout.write(JSON.stringify(q.rows[0].n));}finally{await c.end();}})();`;
 return JSON.parse(execFileSync('docker',['exec','pbl6-fe-verify-m2-1','node','-e',code],{encoding:'utf8'}));
}
export async function paidOnline(f:Awaited<ReturnType<typeof afterSaleMarket>>){
 const order=await f.purchase('SANDBOX'),current=await f.own(order.id),attempt=await f.api('/orders/'+order.id+'/payment-attempts',f.buyer.access,'POST',{expected_order_version:current.version});expect(attempt.provider).toBe('INTEGRATION');
 const code=`const fs=require('fs'),crypto=require('crypto');(async()=>{let t='';for await(const b of process.stdin)t+=b;const raw=JSON.stringify(JSON.parse(t)),key=fs.readFileSync(process.env.INTEGRATION_KEY_FILE,'utf8').trim(),signature='sha256='+crypto.createHmac('sha256',key).update(raw).digest('hex');const r=await fetch('http://127.0.0.1:3102/api/v1/payment-callbacks/integration',{method:'POST',headers:{'Content-Type':'application/json','X-Integration-Signature':signature},body:raw});process.stdout.write(JSON.stringify({status:r.status}));})();`;
 expect(JSON.parse(execFileSync('docker',['exec','-i','pbl6-fe-verify-m2-1','node','-e',code],{input:JSON.stringify({provider_event_id:f.tag+'-'+order.id,provider_reference:attempt.provider_reference,amount_vnd:120000,result:'SUCCESS'}),encoding:'utf8'})).status).toBe(200);
 await f.ship(order.id);await f.transition(order.id,'COMPLETED');const request=await f.request(order.id);return {order,request,correlation:'return-refund-'+request.id};
}

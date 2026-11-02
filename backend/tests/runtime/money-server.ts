// Development simulator only. No bank/network side effects. Private Compose network, private key,
// durable command ledger in its own volume; never use as a production payment provider.
import {createServer,type IncomingMessage} from 'node:http';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {mkdir,readFile,open,rename} from 'node:fs/promises';
import {join} from 'node:path';
import {fingerprint} from '../../shared/src/idempotency';
import {integrationAdaptersEnabled} from '../../commerce-service/src/payment/integration-provider';
import type {RefundCommand} from '../../commerce-service/src/payment/refund.runner';
type Mode='SUCCEEDED'|'FAILED'|'UNKNOWN'|'UNKNOWN_THEN_SUCCESS'|'LOST_ACK';
type Record={command:RefundCommand;hash:string;status:'SUCCEEDED'|'FAILED'|'UNKNOWN';receipt_id:string;refund_calls:number;lookup_calls:number;effects:number};
type State={mode:Mode;commands:{[id:string]:Record};rules?:{[correlation:string]:Mode}};
const modes:Mode[]=['SUCCEEDED','FAILED','UNKNOWN','UNKNOWN_THEN_SUCCESS','LOST_ACK'];
async function body(req:IncomingMessage){let text='';for await(const chunk of req){text+=chunk.toString();if(text.length>65536)throw new Error('TOO_LARGE');}return JSON.parse(text||'{}');}
async function main(){
 if(!integrationAdaptersEnabled())throw new Error('TEST_PROVIDER_DISABLED');
 const directory=process.env.INTEGRATION_STATE_DIR??'/home/node/provider',statePath=join(directory,'ledger.json'),keyPath=join(directory,'key');
 await mkdir(directory,{recursive:true,mode:0o700});
 let key:string;
 try{key=(await readFile(keyPath,'utf8')).trim();}catch{const file=await open(keyPath,'wx',0o600);try{key=randomBytes(32).toString('hex');await file.writeFile(key);await file.sync();}finally{await file.close();}}
 if(!/^[a-f0-9]{64}$/.test(key!))throw new Error('INVALID_TEST_KEY');
 let state:State;
 try{state=JSON.parse(await readFile(statePath,'utf8'));if(!modes.includes(state.mode)||!state.commands)throw new Error('INVALID_TEST_LEDGER');}
 catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;state={mode:'UNKNOWN_THEN_SUCCESS',commands:{}};}
 const persist=async()=>{const temporary=join(directory,'write-'+randomBytes(8).toString('hex')+'.json');const file=await open(temporary,'wx',0o600);try{await file.writeFile(JSON.stringify(state));await file.sync();}finally{await file.close();}await rename(temporary,statePath);const dir=await open(directory,'r');try{await dir.sync();}finally{await dir.close();}};
 await persist();let serial=Promise.resolve();
 const server=createServer((req,res)=>{
  const reply=(status:number,value:unknown)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(value));};
  if(req.url==='/health'&&req.method==='GET'){reply(200,{service:'integration-money',mode:'TEST_ONLY',ready:true});return;}
  const supplied=req.headers['x-integration-key'];
  if(typeof supplied!=='string'||supplied.length!==key!.length||!timingSafeEqual(Buffer.from(supplied),Buffer.from(key!))){reply(403,{code:'FORBIDDEN'});return;}
  const handle=async()=>{
   if(req.url==='/stats'&&req.method==='GET'){reply(200,{mode:state.mode,commands:Object.values(state.commands).map(row=>({operation_id:row.command.operation_id,status:row.status,refund_calls:row.refund_calls,lookup_calls:row.lookup_calls,effects:row.effects,receipt_id:row.receipt_id}))});return;}
   if(req.method!=='POST'){reply(404,{code:'NOT_FOUND'});return;}
   const value=await body(req);
   if(req.url==='/control') {if(!modes.includes(value.mode)){reply(422,{code:'INVALID_MODE'});return;}state.mode=value.mode;await persist();reply(200,{mode:state.mode});return;}
   if(req.url==='/control/rule'){
    if(typeof value.correlation_id!=='string'||!/^[A-Za-z0-9_.:-]{1,64}$/.test(value.correlation_id)||value.mode!==null&&!modes.includes(value.mode)){reply(422,{code:'INVALID_RULE'});return;}
    state.rules??={};if(value.mode===null)delete state.rules[value.correlation_id];else state.rules[value.correlation_id]=value.mode;
    await persist();reply(200,{rule_set:value.mode!==null});return;
   }
   if(req.url==='/control/resolve') {
    const row=state.commands[value.operation_id];if(!row){reply(404,{code:'COMMAND_NOT_FOUND'});return;}
    if(!['SUCCEEDED','FAILED','UNKNOWN'].includes(value.status)||row.status==='SUCCEEDED'&&value.status!=='SUCCEEDED'){reply(409,{code:'INVALID_RESOLUTION'});return;}
    if(value.status==='SUCCEEDED'&&row.status!=='SUCCEEDED')row.effects++;
    row.status=value.status;await persist();reply(200,{status:row.status});return;
   }
   if(!['/refund','/lookup'].includes(req.url??'')){reply(404,{code:'NOT_FOUND'});return;}
   if(!/^[a-f0-9-]{36}$/i.test(value.operation_id)||value.provider!=='INTEGRATION'||typeof value.payment_reference!=='string'||value.payment_reference.length>128||!/^\d{1,16}$/.test(value.amount_vnd)||BigInt(value.amount_vnd)<=0n||BigInt(value.amount_vnd)>9007199254740991n||typeof value.correlation_id!=='string'||value.correlation_id.length>64){reply(422,{code:'INVALID_COMMAND'});return;}
   const command=value as RefundCommand,hash=fingerprint(command);let row=state.commands[command.operation_id];
   if(row&&row.hash!==hash){reply(409,{code:'COMMAND_CONFLICT'});return;}
   if(!row&&req.url==='/lookup'){reply(200,{...command,status:'NOT_FOUND'});return;}
   const first=!row,mode=state.rules?.[command.correlation_id]??state.mode;
   if(!row){const status=mode==='FAILED'?'FAILED':mode==='UNKNOWN'?'UNKNOWN':'SUCCEEDED';row={command,hash,status,receipt_id:'TEST-'+command.operation_id,refund_calls:0,lookup_calls:0,effects:status==='SUCCEEDED'?1:0};state.commands[command.operation_id]=row;}
   if(req.url==='/refund')row.refund_calls++;else row.lookup_calls++;
   await persist();
   if(first&&req.url==='/refund'&&mode==='LOST_ACK'){reply(503,{status:'UNKNOWN'});return;}
   if(row.status==='UNKNOWN'||first&&req.url==='/refund'&&mode==='UNKNOWN_THEN_SUCCESS'){reply(200,{status:'UNKNOWN'});return;}
   reply(200,{...command,status:row.status,...(row.status==='SUCCEEDED'?{receipt_id:row.receipt_id}:{})});
  };
  serial=serial.then(handle).catch(()=>reply(503,{code:'TEST_PROVIDER_UNAVAILABLE'}));
 });
 await new Promise<void>(resolve=>server.listen(3900,'0.0.0.0',resolve));
 console.log(JSON.stringify({service:'integration-money',mode:'TEST_ONLY',status:'READY'}));
}
main().catch(()=>{console.error('Integration money simulator startup failed.');process.exitCode=1;});

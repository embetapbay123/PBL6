import {createServer,type Server} from 'node:http';
import {randomBytes,randomUUID} from 'node:crypto';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {integrationAdaptersEnabled,IntegrationRefundProvider} from '../../commerce-service/src/payment/integration-provider';
import type {RefundCommand} from '../../commerce-service/src/payment/refund.runner';

test('simulator cannot be selected in production, without opt-in or outside the named test stack',()=>{
 for(const env of [{NODE_ENV:'production',PBL6_TEST_ADAPTERS:'1',PBL6_TEST_STACK:'pbl6-fe-verify'},{NODE_ENV:'development',PBL6_TEST_STACK:'pbl6-fe-verify'},{NODE_ENV:'development',PBL6_TEST_ADAPTERS:'1',PBL6_TEST_STACK:'pbl6'}]){
  expect(integrationAdaptersEnabled(env)).toBe(false);expect(()=>new IntegrationRefundProvider(env)).toThrow('TEST_PROVIDER_DISABLED');
 }
});
test('private simulator transport preserves command identity and treats bad scope, HTTP errors or timeout as UNKNOWN',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'pbl6-provider-test-')),key=randomBytes(32).toString('hex'),keyFile=join(directory,'key');await writeFile(keyFile,key,{mode:0o600});
 const calls:Array<{path:string;body:any;authenticated:boolean}>=[];let mode='SUCCESS';
 const server:Server=createServer(async(req,res)=>{let body='';for await(const c of req)body+=c.toString();const command=JSON.parse(body);calls.push({path:req.url!,body:command,authenticated:req.headers['x-integration-key']===key});
  if(mode==='TIMEOUT')return;
  res.writeHead(mode==='HTTP_ERROR'?503:200,{'Content-Type':'application/json'});
  res.end(JSON.stringify(mode==='HTTP_ERROR'?{code:'UNAVAILABLE'}:{...command,status:mode==='NOT_FOUND'?'NOT_FOUND':'SUCCEEDED',amount_vnd:mode==='MISMATCH'?'1':command.amount_vnd,...(mode==='MISSING_RECEIPT'?{}:{receipt_id:'TEST-'+command.operation_id})}));
 });
 await new Promise<void>(ready=>server.listen(0,'127.0.0.1',ready));
 const port=(server.address() as {port:number}).port;
 try{
  const provider=new IntegrationRefundProvider({NODE_ENV:'development',PBL6_TEST_ADAPTERS:'1',PBL6_TEST_STACK:'pbl6-fe-verify',INTEGRATION_KEY_FILE:keyFile,INTEGRATION_PROVIDER_URL:'http://127.0.0.1:'+port});
  const command:RefundCommand={operation_id:randomUUID(),provider:'INTEGRATION',payment_reference:'TEST-REFERENCE',amount_vnd:'320000',correlation_id:'test'};
  expect((await provider.refund(command)).status).toBe('SUCCEEDED');mode='NOT_FOUND';expect((await provider.lookup(command)).status).toBe('NOT_FOUND');
  for(const bad of ['MISMATCH','MISSING_RECEIPT','HTTP_ERROR','TIMEOUT']){mode=bad;expect(await provider.refund(command)).toEqual({status:'UNKNOWN'});}
  expect(calls.every(call=>call.authenticated)).toBe(true);for(const call of calls)expect(call.body).toEqual(command);expect(calls[1].path).toBe('/lookup');
 }finally{server.closeAllConnections();await new Promise<void>(done=>server.close(()=>done()));if(resolve(directory).startsWith(resolve(tmpdir())+sep+'pbl6-provider-test-'))await rm(directory,{recursive:true,force:true});}
});

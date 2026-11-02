import {readFileSync} from 'node:fs';
import {ApiError} from '../../../shared/src/errors';
import type {RefundCommand,RefundOutcome,RefundProvider} from './refund.runner';
export function integrationAdaptersEnabled(env:NodeJS.ProcessEnv=process.env):boolean {
 return env.NODE_ENV==='development'&&env.PBL6_TEST_ADAPTERS==='1'&&env.PBL6_TEST_STACK==='pbl6-fe-verify';
}
export function integrationProviderKey(env:NodeJS.ProcessEnv=process.env):string {
 if(!integrationAdaptersEnabled(env))throw new ApiError(503,'TEST_PROVIDER_DISABLED','Adapter kiểm thử chưa được bật trong stack riêng.');
 try{const key=readFileSync(env.INTEGRATION_KEY_FILE??'','utf8').trim();if(/^[a-f0-9]{64}$/.test(key))return key;}catch{/* no path/secret in response */}
 throw new ApiError(503,'TEST_PROVIDER_UNAVAILABLE','Chưa đọc được khóa adapter kiểm thử riêng.');
}
/** Private simulator transport. It never calls a bank or infers refund success from a timeout. */
export class IntegrationRefundProvider implements RefundProvider {
 readonly enabled=true;readonly name='INTEGRATION';
 private readonly url:string;
 constructor(private readonly env:NodeJS.ProcessEnv=process.env) {
  if(!integrationAdaptersEnabled(env))throw new Error('TEST_PROVIDER_DISABLED');
  const url=new URL(env.INTEGRATION_PROVIDER_URL??'http://integration-money:3900');
  if(url.protocol!=='http:'||!['integration-money','127.0.0.1','localhost'].includes(url.hostname)||url.username||url.password)throw new Error('INVALID_TEST_PROVIDER_URL');
  this.url=url.origin;integrationProviderKey(env);
 }
 private async send(path:string,command:RefundCommand):Promise<RefundOutcome> {
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),800);
  try {
   const response=await fetch(this.url+path,{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json','X-Integration-Key':integrationProviderKey(this.env)},body:JSON.stringify(command)});
   if(!response.ok)return {status:'UNKNOWN'};
   const result=await response.json() as RefundOutcome;
   if(!result||!['UNKNOWN','SUCCEEDED','FAILED','NOT_FOUND'].includes(result.status)||result.status==='UNKNOWN')return {status:'UNKNOWN'};
   if(result.operation_id!==command.operation_id||result.provider!==command.provider||result.payment_reference!==command.payment_reference||result.amount_vnd!==command.amount_vnd)return {status:'UNKNOWN'};
   if(result.status==='SUCCEEDED'&&(!result.receipt_id||!/^[A-Za-z0-9_.:-]{1,128}$/.test(result.receipt_id)))return {status:'UNKNOWN'};
   return result;
  }catch{return {status:'UNKNOWN'};}finally{clearTimeout(timer);}
 }
 refund(command:RefundCommand){return this.send('/refund',command);}
 lookup(command:RefundCommand){return this.send('/lookup',command);}
}

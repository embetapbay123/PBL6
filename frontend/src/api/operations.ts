import { request, ApiError } from './client';
import registry from './operations.registry.generated.json';
import type { OperationId, OperationInputs, OperationOutputs } from './operations.generated';
const fixtureMode=import.meta.env.VITE_API_MODE==='fixture';
export const dataMode=fixtureMode?'fixture':'api';
const monetaryCommands=new Set(['confirmCheckout','createPaymentAttempt','sepayCallback','sandboxCallback','collectCod']);

export async function callOperation<K extends OperationId>(operation:K,input:Partial<OperationInputs[K]>={}):Promise<OperationOutputs[K]> {
  const record=registry[operation];
  if(record.internal)throw new ApiError(0,'INTERNAL_API_BLOCKED','Web không gọi API nội bộ.');
  if(fixtureMode) {
    if(!import.meta.env.DEV)throw new ApiError(0,'FIXTURE_DISABLED','Fixture chỉ dùng trong development.');
    if(monetaryCommands.has(operation))throw new ApiError(501,'FIXTURE_TRANSACTION_DISABLED','Fixture không thực hiện checkout hoặc thanh toán.');
    const fixtures=(await import('./fixtures.generated.json')).default;
    return structuredClone((fixtures as any)[operation].response) as OperationOutputs[K];
  }
  let path=record.path.replace(/\{([^}]+)\}/g,(_,key)=>{
    const value=(input.path as Record<string,unknown>|undefined)?.[key];
    if(value===undefined)throw new ApiError(0,'MISSING_PATH_PARAMETER','Thiếu tham số '+key);
    return encodeURIComponent(String(value));
  });
  const params=new URLSearchParams();
  for(const [key,value] of Object.entries(input.query ?? {}))if(value!==undefined && value!==null)params.set(key,String(value));
  if(params.size)path+='?'+params;
  return request<OperationOutputs[K]>(path,{method:record.method,headers:input.headers as Record<string,string>,
    ...(input.body!==undefined?{body:JSON.stringify(input.body)}:{})});
}

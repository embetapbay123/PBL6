import { useRef,useState } from 'react';
import { useAuth } from '../api/auth-context';
import { ApiError } from '../api/client';
import { callOperation } from '../api/operations';
import type { OperationId,OperationInputs,OperationOutputs } from '../api/operations.generated';
export function useDurableOperation<K extends OperationId>(operation:K,resource='new') {
  const {session}=useAuth();
  const key=`pbl6_command_${session?.context?.user_id}_${session?.context?.store_membership?.store_id}_${operation}_${resource}`;
  const [pending,setPending]=useState<Partial<OperationInputs[K]>|undefined>(()=>{
    try{const v=JSON.parse(sessionStorage.getItem(key)??'null');return v?.headers?.['idempotency-key']?v:undefined}catch{return undefined}
  });
  const [busy,setBusy]=useState(false),[error,setError]=useState<unknown>();
  const flight=useRef(false);
  const run=async(input:Partial<OperationInputs[K]>):Promise<OperationOutputs[K]|undefined>=>{
    if(flight.current)return;
    flight.current=true;setBusy(true);setError(undefined);
    const command=pending??{...structuredClone(input),headers:{...input.headers,'idempotency-key':crypto.randomUUID()}};
    try{
      sessionStorage.setItem(key,JSON.stringify(command));setPending(command);
      const result=await callOperation(operation,command);
      sessionStorage.removeItem(key);setPending(undefined);return result;
    }catch(e){
      if(e instanceof ApiError && e.status>=400 && e.status<500 && ![408,429].includes(e.status)){
        sessionStorage.removeItem(key);setPending(undefined);
      }
      setError(e);throw e;
    }finally{flight.current=false;setBusy(false)}
  };
  return {run,busy,error,pending,locked:busy||!!pending};
}

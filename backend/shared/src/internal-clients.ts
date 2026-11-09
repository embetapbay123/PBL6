import type { OperationInputs, OperationOutputs } from './operations.generated';
import bundle from './contracts.runtime.generated.json';
import { internalRequest } from './http-client';
import { validateOperation } from './request-contract';
import { schemaErrors } from './contract-validation';
import { ApiError } from './errors';

export type InternalOperation = 'ResolveContext' | 'ResolveConversationOrder' | 'ActiveStores' | 'QuoteVariants' | 'ReserveInventory' |
  'ConsumeReservation' | 'ReleaseReservation' | 'RestockOrder' | 'RestockReceivedItems' | 'DispatchExchangeItems' | 'RestockExchangeItems' | 'VerifyReviewEligibility' |
  'ResolveCheckoutContext' | 'ListLowStockVariants' | 'ResolveAiMetricsScope';
export interface InternalTransport {
  request<T>(url:string,caller:string,key:string,correlation:string,body?:unknown,timeout?:number):Promise<T>;
}
export class InternalClients {
  constructor(private readonly caller:'M1'|'M2'|'M3'|'M4',private readonly key:string,
    private readonly urls:Record<'M1'|'M2'|'M3',string>,private readonly transport:InternalTransport={request:internalRequest}) {}
  async call<K extends InternalOperation>(operation:K,input:OperationInputs[K]['body'],correlation:string):Promise<OperationOutputs[K]> {
    const record=bundle.operations[operation];
    if (!(record.callers as string[]).includes(this.caller)) throw new ApiError(503,'SERVICE_AUTH_FAILED','Caller không thuộc contract.');
    const read=async(query:Record<string,string|number>={})=>{
      validateOperation(operation,{body:input,headers:{'x-correlation-id':correlation},path:{},query} as any);
      const params=new URLSearchParams(Object.entries(query).map(([key,value])=>[key,String(value)]));
      const url=this.urls[record.service as 'M1'|'M2'|'M3']+record.route+(params.size?'?'+params:'');
      const result=await this.transport.request<OperationOutputs[K]>(url,this.caller,this.key,correlation,input,1000);
      if(schemaErrors(result,Object.values(record.responses)[0]).length) throw new ApiError(503,'DEPENDENCY_CONTRACT_INVALID','Response nội bộ không khớp contract.');
      return result;
    };
    if(operation!=='ActiveStores')return read();
    // No partial allowlist or automatic retry: failure on any page fails this decision.
    const ids:string[]=[],seen=new Set<string>();let after:string|undefined;
    for(;;){
      let page:OperationOutputs['ActiveStores'];
      try{page=await read({size:100,...(after?{after}:{})}) as OperationOutputs['ActiveStores'];}
      catch(error){
        // Strict old servers reject the new query before execution. Negotiate once on
        // this read only; never repeat a failed page or fall back after partial results.
        const failure=error as any;
        if(after!==undefined||failure?.status!==422||failure?.response?.code!=='VALIDATION_FAILED'||
          !failure.response.details?.some((detail:any)=>detail.reason==='unknown field: size'))throw error;
        page=await read() as OperationOutputs['ActiveStores'];
        if(page.next_after)throw new ApiError(503,'DEPENDENCY_CONTRACT_INVALID','Server từ chối query nhưng trả danh sách chưa đủ.');
      }
      const next=page.next_after;
      if(page.ids.some(id=>seen.has(id)||(after!==undefined&&id<=after))||new Set(page.ids).size!==page.ids.length||
        (next&&(!page.ids.length||next!==page.ids[page.ids.length-1]||(after!==undefined&&next<=after))))
        throw new ApiError(503,'DEPENDENCY_CONTRACT_INVALID','Phân trang Store không tiến tới; không dùng kết quả chưa đủ.');
      for(const id of page.ids){seen.add(id);ids.push(id);}
      if(!next)return {ids} as OperationOutputs[K];
      after=next;
    }
  }
}

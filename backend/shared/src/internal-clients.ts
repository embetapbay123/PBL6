import type { OperationInputs, OperationOutputs } from './operations.generated';
import bundle from './contracts.runtime.generated.json';
import { internalRequest } from './http-client';
import { validateOperation } from './request-contract';
import { schemaErrors } from './contract-validation';
import { ApiError } from './errors';

export type InternalOperation = 'ResolveContext' | 'ActiveStores' | 'QuoteVariants' | 'ReserveInventory' |
  'ConsumeReservation' | 'ReleaseReservation' | 'RestockOrder' | 'VerifyReviewEligibility' |
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
    validateOperation(operation,{body:input,headers:{'x-correlation-id':correlation},path:{},query:{}} as any);
    const result=await this.transport.request<OperationOutputs[K]>(this.urls[record.service as 'M1'|'M2'|'M3']+record.route,this.caller,this.key,correlation,input,1000);
    const schema=Object.values(record.responses)[0];
    if(schemaErrors(result,schema).length) throw new ApiError(503,'DEPENDENCY_CONTRACT_INVALID','Response nội bộ không khớp contract.');
    return result;
  }
}

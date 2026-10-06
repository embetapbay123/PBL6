import { config } from '../../shared/src/config';
import { ApiError } from '../../shared/src/errors';
import { schemaErrors } from '../../shared/src/contract-validation';
import bundle from '../../shared/src/contracts.runtime.generated.json';

export interface IdentityStats {counts(token:string,correlation:string):Promise<{store_count:number;user_count:number}>}

/** M3 owns the Store/User totals, including entities that have no Order. */
export class IdentityStatsClient implements IdentityStats {
  async counts(token:string,correlation:string) {
    const read=async(operation:'listStores'|'listUsers'):Promise<number>=>{
      const contract=bundle.operations[operation];
      try {
        const response=await fetch(`${config('M2').identityUrl}/api/v1${contract.route}?page=1&size=1`,{
          headers:{Authorization:`Bearer ${token}`,'X-Correlation-Id':correlation},signal:AbortSignal.timeout(1000),
        });
        const body=await response.json();
        if(!response.ok) {
          if([401,403,404,409,422,501].includes(response.status)) throw new ApiError(response.status,body.code ?? 'IDENTITY_REJECTED',body.message ?? 'M3 từ chối yêu cầu.');
          throw new ApiError(503,'DEPENDENCY_UNAVAILABLE','M3 chưa sẵn sàng.');
        }
        if(schemaErrors(body,contract.responses['200']).length) throw new ApiError(503,'DEPENDENCY_CONTRACT_INVALID','M3 trả sai contract.');
        return body.total;
      } catch(error) {
        if(error instanceof ApiError) throw error;
        throw new ApiError(503,'DEPENDENCY_UNAVAILABLE','Không kết nối được M3.');
      }
    };
    const [store_count,user_count]=await Promise.all([read('listStores'),read('listUsers')]);
    return {store_count,user_count};
  }
}

import { config } from '../../shared/src/config';
import { ApiError } from '../../shared/src/errors';
import { schemaErrors } from '../../shared/src/contract-validation';
import bundle from '../../shared/src/contracts.runtime.generated.json';
import type { OperationOutputs } from '../../shared/src/operations.generated';

export type CatalogProduct = OperationOutputs['getProduct'] & {id:string;store_id:string;variants:NonNullable<OperationOutputs['getProduct']['variants']>};
export interface CatalogDirectory {product(id:string,correlation:string):Promise<CatalogProduct>}

/** Reads M1's public contract; M2 never reads M1's database. */
export class CatalogClient implements CatalogDirectory {
  async product(id: string, correlation: string): Promise<CatalogProduct> {
    try {
      const response = await fetch(`${config('M2').catalogUrl}/api/v1/products/${encodeURIComponent(id)}`, {
        headers: { 'X-Correlation-Id': correlation }, signal: AbortSignal.timeout(1000),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({})) as any;
        if ([404,409,422,501].includes(response.status)) {
          throw new ApiError(response.status, error.code ?? 'CATALOG_REJECTED', error.message ?? 'Catalog từ chối yêu cầu.');
        }
        throw new ApiError(503, 'DEPENDENCY_UNAVAILABLE', 'Catalog chưa sẵn sàng.');
      }
      const result = await response.json();
      if (schemaErrors(result, bundle.operations.getProduct.responses['200']).length) {
        throw new ApiError(503, 'DEPENDENCY_CONTRACT_INVALID', 'Catalog response không đúng contract.');
      }
      const product=result as OperationOutputs['getProduct'];
      if (product.id!==id || !product.store_id || !Array.isArray(product.variants)) {
        throw new ApiError(503,'DEPENDENCY_CONTRACT_INVALID','Catalog thiếu Product/Store/Variant.');
      }
      return product as CatalogProduct;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(503, 'DEPENDENCY_UNAVAILABLE', 'Không kết nối được Catalog.');
    }
  }
}

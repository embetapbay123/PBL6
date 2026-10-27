import { database } from '../../../shared/src/database';
import { config } from '../../../shared/src/config';
import { ApiError } from '../../../shared/src/errors';
import { InternalClients } from '../../../shared/src/internal-clients';
import { CatalogRepository } from '../catalog/catalog.repository';
import { attributeDefinitionResponse, categoryResponse, productTypeResponse } from '../catalog/catalog.mapper';
import { ModerationRepository } from './moderation.repository';

export class ModerationService {
  constructor(private readonly repository = new ModerationRepository()) {}

  private async activeStores(correlation: string): Promise<string[]> {
    const c = config('M1');
    return (await new InternalClients('M1', c.internalKeys.M1, { M1: c.catalogUrl, M2: '', M3: c.identityUrl })
      .call('ActiveStores', undefined, correlation)).ids;
  }

  /** The response schema is the full `Product`, so the projection comes from the catalogue mapper. */
  private async productProjection(row: any) {
    return (await new CatalogRepository(database.manager).withAllVariants([row]))[0];
  }

  async createCategory(b: any, a: string, r: string) { return categoryResponse(await this.repository.createCategory(b, a, r)); }
  async updateCategory(id: string, b: any, a: string, r: string) { return categoryResponse(await this.repository.updateCategory(id, b, a, r)); }
  async createProductType(b: any, a: string, r: string) { const row = await this.repository.createProductType(b, a, r); return productTypeResponse(row, row.attribute_definitions); }
  async updateProductType(id: string, b: any, a: string, r: string) { const row = await this.repository.updateProductType(id, b, a, r); return productTypeResponse(row, row.attribute_definitions); }
  async createAttributeDefinition(b: any, a: string, r: string) { return attributeDefinitionResponse(await this.repository.createAttributeDefinition(b, a, r)); }
  async updateAttributeDefinition(id: string, b: any, a: string, r: string) { return attributeDefinitionResponse(await this.repository.updateAttributeDefinition(id, b, a, r)); }

  async hideProduct(id: string, b: any, a: string, r: string) {
    return this.productProjection(await this.repository.setProductModeration(id, false, b, a, r));
  }

  /**
   * Restoring visibility must not resurrect a Product whose Store is no longer sellable: the public
   * catalogue would keep hiding it, so accepting the call would report a success that changes
   * nothing for a shopper.
   */
  async restoreProduct(id: string, b: any, a: string, r: string) {
    const storeId = await this.repository.storeOfProduct(id);
    if (!(await this.activeStores(r)).includes(storeId)) {
      throw new ApiError(409, 'STORE_UNAVAILABLE', 'Store is not allowed to sell, so the Product cannot be restored.');
    }
    return this.productProjection(await this.repository.setProductModeration(id, true, b, a, r));
  }

  async hideReview(id: string, b: any, a: string, r: string) { return this.repository.setReviewModeration(id, false, b, a, r); }
  async restoreReview(id: string, b: any, a: string, r: string) { return this.repository.setReviewModeration(id, true, b, a, r); }
}

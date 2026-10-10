import { database } from '../../../shared/src/database';
import { config } from '../../../shared/src/config';
import { audit } from '../../../shared/src/audit';
import { emitEvent } from '../../../shared/src/events';
import { ApiError } from '../../../shared/src/errors';
import { CatalogRepository } from './catalog.repository';
import type { OperationInputs, OperationOutputs } from '../../../shared/src/operations.generated';
import { InternalClients } from '../../../shared/src/internal-clients';
import { optionalUserId, recordInteraction } from './catalog.telemetry';
export class CatalogService {
  private async stores(correlation:string) {
    const c=config('M1');return (await new InternalClients('M1',c.internalKeys.M1,{M1:c.catalogUrl,M2:'',M3:c.identityUrl}).call('ActiveStores',undefined,correlation)).ids;
  }

  /**
   * Public list. Store visibility comes from M3 `ActiveStores`, so a locked Store disappears from
   * the catalog even though its rows still exist. Search telemetry is only written for an
   * authenticated caller with a non-empty query: guests never produce personal behaviour, and a
   * telemetry failure can never fail the read.
   */
  async list(query:OperationInputs['listProducts']['query'],authorization:unknown,correlation:string):Promise<OperationOutputs['listProducts']> {
    // The contract applies page/size defaults in the request DTO; the generated type keeps them
    // optional, so the boundary normalises them once before they reach the repository.
    const page=await new CatalogRepository(database.manager).page(await this.stores(correlation),
      {...query,page:query.page ?? 1,size:query.size ?? 20});
    const userId=await optionalUserId(authorization,correlation);
    if(userId && query.q) await recordInteraction('SearchRecorded',{user_id:userId,query:query.q},correlation);
    return page;
  }

  /** A hidden Product, a locked Store and an unknown id all answer 404 without leaking which one it was. */
  async detail(id:string,authorization:unknown,correlation:string):Promise<OperationOutputs['getProduct']> {
    const product=await new CatalogRepository(database.manager).publicProduct(id,await this.stores(correlation));
    if(!product)throw new ApiError(404,'NOT_FOUND','Không tìm thấy sản phẩm.');
    const userId=await optionalUserId(authorization,correlation);
    if(userId) await recordInteraction('InteractionRecorded',{user_id:userId,product_id:id,event_type:'VIEW'},correlation);
    return product;
  }

  /** Taxonomy lookups are public reference data; only ACTIVE rows are exposed. */
  async listCategories(query:OperationInputs['listCategories']['query']):Promise<OperationOutputs['listCategories']> {
    return new CatalogRepository(database.manager).pageCategories(query.page ?? 1,query.size ?? 20);
  }

  async listProductTypes(query:OperationInputs['listProductTypes']['query']):Promise<OperationOutputs['listProductTypes']> {
    return new CatalogRepository(database.manager).pageProductTypes(query.page ?? 1,query.size ?? 20);
  }

  async update(id:string,input:OperationInputs['updateProduct']['body'],context:any,correlation:string) {
    const membership=context.store_membership;
    if(!membership || (membership.role!=='OWNER' && !membership.permissions.includes('product.store.*')))throw new ApiError(403,'FORBIDDEN','Không có quyền quản lý sản phẩm.');
    if(Object.entries(input).some(([key,value])=>value!==undefined && !['title','description','expected_version'].includes(key)))throw new ApiError(501,'FEATURE_NOT_IMPLEMENTED','Mẫu Product chỉ hỗ trợ title/description; owner hoàn thiện các trường còn lại.');
    if(input.title===undefined && input.description===undefined)throw new ApiError(422,'VALIDATION_FAILED','Cần trường thay đổi.');
    const active=await this.stores(correlation);
    if(!active.includes(membership.store_id))throw new ApiError(403,'STORE_UNAVAILABLE','Store không được phép bán.');
    return database.transaction(async manager=>{
      const repository=new CatalogRepository(manager);
      const before=await repository.lockProduct(id,membership.store_id);
      if(!before)throw new ApiError(404,'NOT_FOUND','Không tìm thấy sản phẩm trong Store.');
      if(before.version!==input.expected_version)throw new ApiError(409,'VERSION_CONFLICT','Dữ liệu đã thay đổi. Vui lòng tải lại.');
      const after=await repository.updateText(id,input.title,input.description);
      await audit(manager,'M1',context.user_id,'Product',id,'BOOTSTRAP_UPDATE',correlation,before,{id,title:after.title,description:after.description,version:after.version});
      await emitEvent(manager,'bootstrap.example.v1',{product_id:id,version:after.version},correlation);
      return (await repository.withRelations([after]))[0];
    });
  }
}

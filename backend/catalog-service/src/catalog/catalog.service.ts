import { database } from '../../../shared/src/database';
import { config } from '../../../shared/src/config';
import { audit } from '../../../shared/src/audit';
import { emitEvent } from '../../../shared/src/events';
import { ApiError } from '../../../shared/src/errors';
import { CatalogRepository } from './catalog.repository';
import type { OperationInputs } from '../../../shared/src/operations.generated';
import { InternalClients } from '../../../shared/src/internal-clients';
export class CatalogService {
  private async stores(correlation:string) {
    const c=config('M1');return (await new InternalClients('M1',c.internalKeys.M1,{M1:c.catalogUrl,M2:'',M3:c.identityUrl}).call('ActiveStores',undefined,correlation)).ids;
  }
  async list(query:{page:number;size:number;q?:string},correlation:string) {return new CatalogRepository(database.manager).page(await this.stores(correlation),query);}
  async detail(id:string,correlation:string) {
    const product=await new CatalogRepository(database.manager).publicProduct(id,await this.stores(correlation));
    if(!product)throw new ApiError(404,'NOT_FOUND','Không tìm thấy sản phẩm.');return product;
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
      return (await repository.withVariants([after]))[0];
    });
  }
}

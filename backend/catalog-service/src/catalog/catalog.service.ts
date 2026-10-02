import { randomUUID } from 'node:crypto';
import { database } from '../../../shared/src/database';
import { config } from '../../../shared/src/config';
import { internalRequest } from '../../../shared/src/http-client';
import { audit } from '../../../shared/src/audit';
import { emitEvent } from '../../../shared/src/events';
import { ApiError } from '../../../shared/src/errors';
import { CatalogRepository } from './catalog.repository';
import { ProductUpdateSample } from './product-update.dto';
export class CatalogService {
  private async stores() {
    const c=config('M1');return (await internalRequest<{ids:string[]}>(`${c.identityUrl}/internal/stores/active`,'M1',c.internalKeys.M1,randomUUID())).ids;
  }
  async list(query:{page:number;size:number;q?:string}) {return new CatalogRepository(database.manager).page(await this.stores(),query);}
  async detail(id:string) {
    const product=await new CatalogRepository(database.manager).publicProduct(id,await this.stores());
    if(!product)throw new ApiError(404,'NOT_FOUND','Không tìm thấy sản phẩm.');return product;
  }
  async update(id:string,input:ProductUpdateSample,context:any,correlation:string) {
    const membership=context.store_membership;
    if(!membership || (membership.role!=='OWNER' && !membership.permissions.includes('product.store.*')))throw new ApiError(403,'FORBIDDEN','Không có quyền quản lý sản phẩm.');
    if(input.title===undefined && input.description===undefined)throw new ApiError(422,'VALIDATION_FAILED','Cần trường thay đổi.');
    const active=await this.stores();
    if(!active.includes(membership.store_id))throw new ApiError(403,'STORE_UNAVAILABLE','Store không được phép bán.');
    return database.transaction(async manager=>{
      const [before]=await manager.query('SELECT id,title,description,version FROM product WHERE id=$1 AND store_id=$2 FOR UPDATE',[id,membership.store_id]);
      if(!before)throw new ApiError(404,'NOT_FOUND','Không tìm thấy sản phẩm trong Store.');
      if(before.version!==input.expected_version)throw new ApiError(409,'VERSION_CONFLICT','Dữ liệu đã thay đổi. Vui lòng tải lại.');
      await manager.query('UPDATE product SET title=coalesce($1,title),description=coalesce($2,description),version=version+1 WHERE id=$3',[input.title,input.description,id]);
      const [after]=await manager.query('SELECT id,store_id,product_type_id,title,description,attributes_json AS attributes,status,moderation_status,version FROM product WHERE id=$1',[id]);
      await audit(manager,'M1',context.user_id,'Product',id,'BOOTSTRAP_UPDATE',correlation,before,{id,title:after.title,description:after.description,version:after.version});
      await emitEvent(manager,'bootstrap.example.v1',{product_id:id,version:after.version},correlation);
      return (await new CatalogRepository(manager).withVariants([after]))[0];
    });
  }
}

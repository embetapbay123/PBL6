import { DataSource } from 'typeorm';
import { database } from '../../../shared/src/database';
import { config } from '../../../shared/src/config';
import { InternalClients } from '../../../shared/src/internal-clients';
import { ApiError } from '../../../shared/src/errors';
import { OperationOutputs } from '../../../shared/src/operations.generated';
import { CatalogRepository } from './catalog.repository';
import { hasProductPermission } from './catalog.service';

export class CatalogManagementService {
  constructor(private readonly suppliedSource?:DataSource,private readonly activeStores?:()=>Promise<string[]>) {}
  private get source(){return this.suppliedSource??database}
  async own(id:string,auth:any):Promise<OperationOutputs['getOwnStoreProduct']> {
    const membership=auth?.store_membership;
    if(!membership?.store_id || !hasProductPermission(membership.role,membership.permissions??[]))
      throw new ApiError(403,'FORBIDDEN','Cần quyền quản lý sản phẩm.');
    const repo=new CatalogRepository(this.source.manager);
    const row=await repo.productRowForStore(id,membership.store_id);
    if(!row)throw new ApiError(404,'NOT_FOUND','Không tìm thấy sản phẩm trong Store.');
    return (await repo.withAllVariants([row]))[0];
  }
  async availability(id:string,correlation:string):Promise<OperationOutputs['getProductAvailability']> {
    const resolve=async()=>{const c=config('M1');return (await new InternalClients('M1',c.internalKeys.M1,{M1:c.catalogUrl,M2:'',M3:c.identityUrl}).call('ActiveStores',undefined,correlation)).ids};
    const stores=await (this.activeStores?this.activeStores():resolve());
    // One statement gates visibility and projects only public available quantities. Reserved
    // amounts, inventory IDs, supplier details and internal versions never leave this boundary.
    const [row]=await this.source.query(`SELECT p.id,statement_timestamp() AS observed_at,
      coalesce(json_agg(json_build_object('variant_id',v.id,'available_quantity',greatest(coalesce(i.quantity-i.reserved_quantity,0),0))) FILTER(WHERE v.id IS NOT NULL),'[]') AS items
      FROM product p LEFT JOIN product_variant v ON v.product_id=p.id AND v.status='ACTIVE'
      LEFT JOIN inventory i ON i.variant_id=v.id AND i.store_id=p.store_id
      WHERE p.id=$1 AND p.status='ACTIVE' AND p.moderation_status='VISIBLE' AND p.store_id=ANY($2::uuid[])
      GROUP BY p.id`,[id,stores]);
    if(!row)throw new ApiError(404,'NOT_FOUND','Không tìm thấy sản phẩm đang bán.');
    return {product_id:row.id,observed_at:new Date(row.observed_at).toISOString(),items:row.items};
  }
}

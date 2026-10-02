import { OwnedRepository } from '../../../shared/src/repository';
import { productResponse } from './catalog.mapper';
export class CatalogRepository extends OwnedRepository {
  async lockProduct(id:string,store:string) {
    const [row]=await this.manager.query('SELECT id,title,description,version FROM product WHERE id=$1 AND store_id=$2 FOR UPDATE',[id,store]);return row;
  }
  async updateText(id:string,title?:string,description?:string) {
    await this.manager.query('UPDATE product SET title=coalesce($1,title),description=coalesce($2,description),version=version+1 WHERE id=$3',[title,description,id]);
    const [row]=await this.manager.query('SELECT id,store_id,product_type_id,title,description,attributes_json AS attributes,status,moderation_status,version FROM product WHERE id=$1',[id]);return row;
  }

  async page(storeIds:string[],query:{page:number;size:number;q?:string}) {
    const params=[storeIds,query.q ? `%${query.q}%` : '%'];
    const [count]=await this.manager.query('SELECT count(*)::int AS total FROM product WHERE status=\'ACTIVE\' AND moderation_status=\'VISIBLE\' AND store_id=ANY($1::uuid[]) AND title ILIKE $2',params);
    const rows=await this.manager.query('SELECT id,store_id,product_type_id,title,description,attributes_json AS attributes,status,moderation_status,version FROM product WHERE status=\'ACTIVE\' AND moderation_status=\'VISIBLE\' AND store_id=ANY($1::uuid[]) AND title ILIKE $2 ORDER BY id LIMIT $3 OFFSET $4',[...params,query.size,(query.page-1)*query.size]);
    return {items:await this.withVariants(rows),total:count.total,page:query.page,size:query.size};
  }
  async publicProduct(id:string,storeIds:string[]) {
    const rows=await this.manager.query('SELECT id,store_id,product_type_id,title,description,attributes_json AS attributes,status,moderation_status,version FROM product WHERE id=$1 AND status=\'ACTIVE\' AND moderation_status=\'VISIBLE\' AND store_id=ANY($2::uuid[])',[id,storeIds]);
    return (await this.withVariants(rows))[0];
  }
  async withVariants(rows:any[]) {
    const variants=await this.manager.query('SELECT id,product_id,sku,price_vnd,variant_values_json AS variant_values,is_default,status FROM product_variant WHERE product_id=ANY($1::uuid[]) AND status=\'ACTIVE\'',[rows.map(r=>r.id)]);
    return rows.map(row=>productResponse(row,variants));
  }
}

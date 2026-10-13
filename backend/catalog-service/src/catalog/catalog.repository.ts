import { OwnedRepository } from '../../../shared/src/repository';
import { categoryResponse, productResponse, productTypeResponse } from './catalog.mapper';

const PRODUCT_COLUMNS = `p.id, p.store_id, p.product_type_id, p.title, p.description,
  p.attributes_json AS attributes, p.status, p.moderation_status, p.version`;

export interface ProductQuery {
  page: number;
  size: number;
  q?: string;
  category_id?: string;
  product_type_id?: string;
  sort?: 'title' | 'price_asc' | 'price_desc';
}

export class CatalogRepository extends OwnedRepository {
  async lockProduct(id:string,store:string) {
    const [row]=await this.manager.query('SELECT id,title,description,version FROM product WHERE id=$1 AND store_id=$2 FOR UPDATE',[id,store]);return row;
  }
  async updateText(id:string,title?:string,description?:string) {
    await this.manager.query('UPDATE product SET title=coalesce($1,title),description=coalesce($2,description),version=version+1 WHERE id=$3',[title,description,id]);
    const [row]=await this.manager.query('SELECT id,store_id,product_type_id,title,description,attributes_json AS attributes,status,moderation_status,version FROM product WHERE id=$1',[id]);return row;
  }

  /**
   * Public page. The count and the page share one predicate builder, so `total` can never disagree
   * with the returned rows. Filters are appended with their own placeholders; price sort uses a
   * correlated scalar subquery, which keeps ordering and pagination in a single statement.
   */
  async page(storeIds:string[],query:ProductQuery) {
    const filters:unknown[]=[storeIds,query.q ? `%${query.q}%` : '%'];
    const conditions=[`p.status='ACTIVE'`,`p.moderation_status='VISIBLE'`,`p.store_id=ANY($1::uuid[])`,
      `(p.title ILIKE $2 OR p.description ILIKE $2)`];
    if(query.category_id){filters.push(query.category_id);conditions.push(`pt.category_id=$${filters.length}`);}
    if(query.product_type_id){filters.push(query.product_type_id);conditions.push(`p.product_type_id=$${filters.length}`);}
    const where=conditions.join(' AND ');
    const order=query.sort==='price_asc' ? 'min_price ASC NULLS LAST, p.id'
      : query.sort==='price_desc' ? 'min_price DESC NULLS LAST, p.id' : 'p.title ASC, p.id';

    const [count]=await this.manager.query(
      `SELECT count(*)::int AS total FROM product p JOIN product_type pt ON pt.id=p.product_type_id WHERE ${where}`,filters);
    const rows=await this.manager.query(
      `SELECT ${PRODUCT_COLUMNS}, (SELECT min(v.price_vnd) FROM product_variant v WHERE v.product_id=p.id AND v.status='ACTIVE') AS min_price
         FROM product p JOIN product_type pt ON pt.id=p.product_type_id
        WHERE ${where} ORDER BY ${order} LIMIT $${filters.length+1} OFFSET $${filters.length+2}`,
      [...filters,query.size,(query.page-1)*query.size]);
    return {items:await this.withRelations(rows),total:count.total,page:query.page,size:query.size};
  }

  /** Detail is scoped to the Stores that are still active, so a locked Store looks like a 404. */
  async publicProduct(id:string,storeIds:string[]) {
    const rows=await this.manager.query(
      `SELECT ${PRODUCT_COLUMNS} FROM product p
        WHERE p.id=$1 AND p.status='ACTIVE' AND p.moderation_status='VISIBLE' AND p.store_id=ANY($2::uuid[])`,[id,storeIds]);
    return (await this.withRelations(rows))[0];
  }

  async pageCategories(page:number,size:number) {
    const [count]=await this.manager.query("SELECT count(*)::int AS total FROM category WHERE status='ACTIVE'");
    const rows=await this.manager.query(
      "SELECT id,parent_id,name,status FROM category WHERE status='ACTIVE' ORDER BY name,id LIMIT $1 OFFSET $2",
      [size,(page-1)*size]);
    return {items:rows.map(categoryResponse),total:count.total,page,size};
  }

  /** Attribute definitions for the whole page in one extra statement: no per-type query. */
  async pageProductTypes(page:number,size:number) {
    const [count]=await this.manager.query("SELECT count(*)::int AS total FROM product_type WHERE status='ACTIVE'");
    const rows=await this.manager.query(
      "SELECT id,category_id,name,status FROM product_type WHERE status='ACTIVE' ORDER BY name,id LIMIT $1 OFFSET $2",
      [size,(page-1)*size]);
    const definitions=rows.length ? await this.manager.query(
      `SELECT id,product_type_id,name,data_type,required,variant_factor,allowed_values,unit
         FROM attribute_definition WHERE product_type_id=ANY($1::uuid[]) ORDER BY name,id`,[rows.map((row:any)=>row.id)]) : [];
    return {items:rows.map((row:any)=>productTypeResponse(row,definitions)),total:count.total,page,size};
  }

  /** Variants and images for a whole page in two statements, independent of page size. */
  async withRelations(rows:any[]) {
    if(!rows.length) return [];
    const ids=rows.map(row=>row.id);
    const variants=await this.manager.query(
      `SELECT id,product_id,sku,price_vnd,variant_values_json AS variant_values,is_default,status
         FROM product_variant WHERE product_id=ANY($1::uuid[]) AND status='ACTIVE'`,[ids]);
    const images=await this.manager.query(
      `SELECT id,product_id,url AS image_url,position
         FROM product_image WHERE product_id=ANY($1::uuid[]) AND status='ACTIVE' ORDER BY position,id`,[ids]);
    return rows.map(row=>productResponse(row,variants,images));
  }
}

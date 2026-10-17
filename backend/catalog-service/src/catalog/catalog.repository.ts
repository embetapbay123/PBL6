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

  /* ---------------------------------------------- CAT-03: Variant and image writes */

  async productForWrite(id:string,storeId:string) {
    const [row]=await this.manager.query(
      'SELECT id,store_id,status,moderation_status,version FROM product WHERE id=$1 AND store_id=$2',[id,storeId]);
    return row;
  }

  /**
   * A Variant change alters price or availability, so the Product version advances and the
   * `ProductChanged` event carries it. M4 uses that version to invalidate stale embeddings.
   *
   * The UPDATE and the read-back are separate statements on purpose: `manager.query()` does not
   * return rows for `UPDATE ... RETURNING` on this driver, so `updateText` uses the same shape.
   */
  async touchProductRow(id:string) {
    await this.manager.query('UPDATE product SET version=version+1 WHERE id=$1',[id]);
    const [row]=await this.manager.query(
      'SELECT id,store_id,status,moderation_status,version FROM product WHERE id=$1',[id]);
    return row;
  }

  async skuUsedInStore(storeId:string,sku:string) {
    const [row]=await this.manager.query(
      'SELECT 1 AS found FROM product_variant WHERE store_id=$1 AND sku=$2 LIMIT 1',[storeId,sku]);
    return row!==undefined;
  }

  /** `variant_signature_unique (product_id, variant_signature)` keeps one row per attribute set. */
  async signatureUsedInProduct(productId:string,signature:string) {
    const [row]=await this.manager.query(
      'SELECT 1 AS found FROM product_variant WHERE product_id=$1 AND variant_signature=$2 LIMIT 1',[productId,signature]);
    return row!==undefined;
  }

  /** `variant_default_unique` allows one default per Product, so a new default clears the old one. */
  async unsetDefaultVariants(productId:string) {
    await this.manager.query('UPDATE product_variant SET is_default=false WHERE product_id=$1 AND is_default',[productId]);
  }

  async addVariantRow(input:{productId:string;storeId:string;sku:string;priceVnd:number;
    variantValues:Record<string,unknown>;signature:string;isDefault:boolean;status:string}) {
    const [row]=await this.manager.query(
      `INSERT INTO product_variant(id,product_id,store_id,sku,price_vnd,variant_values_json,variant_signature,is_default,status)
       VALUES(gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id,sku,price_vnd,variant_values_json AS variant_values,is_default,status`,
      [input.productId,input.storeId,input.sku,input.priceVnd,JSON.stringify(input.variantValues),
        input.signature,input.isDefault,input.status]);
    return row;
  }

  /** A new Variant starts at zero stock so inventory and quote can see it immediately. */
  async addInventoryRow(variantId:string,storeId:string) {
    await this.manager.query(
      'INSERT INTO inventory(id,variant_id,store_id,quantity,reserved_quantity,version) VALUES(gen_random_uuid(),$1,$2,0,0,0)',
      [variantId,storeId]);
  }

  async variantRowsOfProduct(productId:string) {
    return this.manager.query('SELECT id,sku FROM product_variant WHERE product_id=$1',[productId]);
  }

  /** Appended images get the next free position so the order the Seller added them is preserved. */
  async nextImagePosition(productId:string) {
    const [row]=await this.manager.query(
      'SELECT coalesce(max(position)+1,0)::int AS position FROM product_image WHERE product_id=$1',[productId]);
    return row.position;
  }

  async addImageRow(input:{productId:string;variantId:string|null;url:string;position:number}) {
    const [row]=await this.manager.query(
      `INSERT INTO product_image(id,product_id,variant_id,url,position,status)
       VALUES(gen_random_uuid(),$1,$2,$3,$4,'ACTIVE')
       RETURNING id,product_id,url AS image_url,position`,
      [input.productId,input.variantId,input.url,input.position]);
    return row;
  }
}

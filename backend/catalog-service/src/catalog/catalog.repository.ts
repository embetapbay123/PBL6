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

  /* ------------------------------------------- CAT-01: Store product lists */

  /**
   * Seller management page: **every** Product of the Store, including DRAFT/STOPPED and HIDDEN.
   * The Store id is a required argument because it always comes from the resolved membership, never
   * from the request — this is the view that must stay invisible to another Store.
   */
  async pageOwnStore(storeId:string,page:number,size:number) {
    const [count]=await this.manager.query('SELECT count(*)::int AS total FROM product WHERE store_id=$1',[storeId]);
    const rows=await this.manager.query(
      `SELECT ${PRODUCT_COLUMNS} FROM product p WHERE p.store_id=$1
        ORDER BY p.title ASC, p.id LIMIT $2 OFFSET $3`,[storeId,size,(page-1)*size]);
    return {items:await this.withAllVariants(rows),total:count.total,page,size};
  }

  /** Management read-back: variants and images in every status, so a write response is truthful. */
  async withAllVariants(rows:any[]) {
    if(!rows.length) return [];
    const ids=rows.map(row=>row.id);
    const variants=await this.manager.query(
      `SELECT id,product_id,sku,price_vnd,variant_values_json AS variant_values,is_default,status
         FROM product_variant WHERE product_id=ANY($1::uuid[]) ORDER BY sku,id`,[ids]);
    const images=await this.manager.query(
      `SELECT id,product_id,url AS image_url,position
         FROM product_image WHERE product_id=ANY($1::uuid[]) ORDER BY position,id`,[ids]);
    return rows.map(row=>productResponse(row,variants,images));
  }

  /* ------------------------------------------------ CAT-02: Product write */

  async productTypeForWrite(id:string) {
    const [row]=await this.manager.query('SELECT id,status FROM product_type WHERE id=$1',[id]);
    return row;
  }

  async attributeDefinitions(productTypeId:string) {
    return this.manager.query('SELECT code,required FROM attribute_definition WHERE product_type_id=$1 ORDER BY code',[productTypeId]);
  }

  async productRowForStore(id:string,storeId:string) {
    const [row]=await this.manager.query(
      `SELECT id,store_id,product_type_id,title,description,attributes_json AS attributes,
              status,moderation_status,version FROM product WHERE id=$1 AND store_id=$2`,[id,storeId]);
    return row;
  }

  async insertProduct(input:{storeId:string;productTypeId:string;title:string;description:string|null;
    attributes:Record<string,unknown>;status:string}) {
    const [row]=await this.manager.query(
      `INSERT INTO product(id,store_id,product_type_id,title,description,attributes_json,status,moderation_status,version)
       VALUES(gen_random_uuid(),$1,$2,$3,$4,$5,$6,'VISIBLE',0)
       RETURNING id,store_id,product_type_id,title,description,attributes_json AS attributes,status,moderation_status,version`,
      [input.storeId,input.productTypeId,input.title,input.description,JSON.stringify(input.attributes),input.status]);
    return row;
  }

  async updateProductFields(id:string,fields:{productTypeId?:string;title?:string;description?:string|null;
    attributes?:Record<string,unknown>;status?:string}) {
    await this.manager.query(
      `UPDATE product SET product_type_id=coalesce($2,product_type_id), title=coalesce($3,title),
              description=coalesce($4,description), attributes_json=coalesce($5::jsonb,attributes_json),
              status=coalesce($6,status), version=version+1 WHERE id=$1`,
      [id,fields.productTypeId ?? null,fields.title ?? null,fields.description ?? null,
        fields.attributes===undefined ? null : JSON.stringify(fields.attributes),fields.status ?? null]);
    const [row]=await this.manager.query(
      `SELECT id,store_id,product_type_id,title,description,attributes_json AS attributes,
              status,moderation_status,version FROM product WHERE id=$1`,[id]);
    return row;
  }

  async variantsOfProduct(productId:string) {
    return this.manager.query(
      `SELECT id,product_id,store_id,sku,price_vnd,variant_values_json AS variant_values,
              variant_signature,is_default,status FROM product_variant WHERE product_id=$1 ORDER BY sku,id`,[productId]);
  }

  /** `sku_store_unique` is unique per Store, so the check spans the whole Store, not just the Product. */
  async skuTakenInStore(storeId:string,sku:string,exceptVariantId:string|null) {
    const [row]=await this.manager.query(
      'SELECT 1 AS found FROM product_variant WHERE store_id=$1 AND sku=$2 AND ($3::uuid IS NULL OR id<>$3) LIMIT 1',
      [storeId,sku,exceptVariantId]);
    return row!==undefined;
  }

  async insertVariant(input:{productId:string;storeId:string;sku:string;priceVnd:number;
    variantValues:Record<string,unknown>;signature:string;isDefault:boolean;status:string}) {
    const [row]=await this.manager.query(
      `INSERT INTO product_variant(id,product_id,store_id,sku,price_vnd,variant_values_json,variant_signature,is_default,status)
       VALUES(gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [input.productId,input.storeId,input.sku,input.priceVnd,JSON.stringify(input.variantValues),
        input.signature,input.isDefault,input.status]);
    return row;
  }

  /**
   * The caller has already proved the Variant belongs to this Product, but the SQL repeats the
   * Product and Store condition. A write addressed by Variant id alone would let one Store change
   * another Store's Variant, so the scope is enforced where the row is actually touched.
   */
  async updateVariantFields(id:string,productId:string,storeId:string,
    fields:{sku?:string;priceVnd?:number;variantValues?:Record<string,unknown>;
      signature?:string;isDefault?:boolean;status?:string}) {
    await this.manager.query(
      `UPDATE product_variant SET sku=coalesce($4,sku), price_vnd=coalesce($5,price_vnd),
              variant_values_json=coalesce($6::jsonb,variant_values_json),
              variant_signature=coalesce($7,variant_signature), is_default=coalesce($8,is_default),
              status=coalesce($9,status) WHERE id=$1 AND product_id=$2 AND store_id=$3`,
      [id,productId,storeId,fields.sku ?? null,fields.priceVnd ?? null,
        fields.variantValues===undefined ? null : JSON.stringify(fields.variantValues),
        fields.signature ?? null,fields.isDefault ?? null,fields.status ?? null]);
  }

  /** `variant_default_unique` allows one default per Product, so callers clear before they set. */
  async clearDefaultVariants(productId:string) {
    await this.manager.query('UPDATE product_variant SET is_default=false WHERE product_id=$1 AND is_default',[productId]);
  }

  /**
   * A Variant that disappears from a payload is stopped, not deleted: `reservation_item` and
   * `stock_movement` keep referencing it, and deleting would destroy stock history.
   */
  async stopVariant(id:string,productId:string,storeId:string) {
    await this.manager.query(
      "UPDATE product_variant SET status='STOPPED' WHERE id=$1 AND product_id=$2 AND store_id=$3",
      [id,productId,storeId]);
  }

  /** A new Variant starts with zero stock so it is visible to inventory and quotable at once. */
  async insertInventoryForVariant(variantId:string,storeId:string) {
    await this.manager.query(
      'INSERT INTO inventory(id,variant_id,store_id,quantity,reserved_quantity,version) VALUES(gen_random_uuid(),$1,$2,0,0,0)',
      [variantId,storeId]);
  }
  /* ---------------------------------------------- CAT-03: Variant and image writes */

  async productForWrite(id:string,storeId:string) {
    const [row]=await this.manager.query(
      'SELECT id,store_id,status,moderation_status,version FROM product WHERE id=$1 AND store_id=$2',[id,storeId]);
    return row;
  }

  /**
   * Serializes Variant writes for one Product. Without it two requests both read the old Variant set
   * and both try to become the default, or both pass the same SKU/signature pre-check and then
   * collide on a unique index. The lock is taken on the Product row, which is also the row
   * `updateProduct` locks first, so both write paths share one lock order.
   */
  async lockProductForVariants(id:string,storeId:string) {
    const [row]=await this.manager.query(
      'SELECT id,store_id,status,moderation_status,version FROM product WHERE id=$1 AND store_id=$2 FOR UPDATE',
      [id,storeId]);
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

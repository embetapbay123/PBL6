import { OwnedRepository } from '../../../shared/src/repository';
import {searchPattern} from '../../../shared/src/search';
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
  min_price_vnd?: number;
  max_price_vnd?: number;
}

export class CatalogRepository extends OwnedRepository {
  async pageAdmin(query:{page?:number;size?:number;q?:string;status?:string;moderation_status?:string}){
    const page=query.page ?? 1,size=query.size ?? 20,args=[searchPattern(query.q)??null,query.status ?? null,query.moderation_status ?? null];
    const where=' WHERE ($1::text IS NULL OR marketplace_search(p.title) LIKE $1 OR EXISTS(SELECT 1 FROM product_variant v WHERE v.product_id=p.id AND marketplace_search(v.sku) LIKE $1)) AND ($2::text IS NULL OR p.status=$2) AND ($3::text IS NULL OR p.moderation_status=$3)';
    const [count]=await this.manager.query('SELECT count(*)::int AS total FROM product p'+where,args);
    const rows=await this.manager.query(`SELECT ${PRODUCT_COLUMNS} FROM product p`+where+' ORDER BY p.title,p.id LIMIT $4 OFFSET $5',[...args,size,(page-1)*size]);
    return {items:await this.withRelations(await this.withModerationDecisions(rows)),total:count.total,page,size};
  }
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
    const filters:unknown[]=[storeIds,searchPattern(query.q)??'%'];
    const conditions=[`p.status='ACTIVE'`,`p.moderation_status='VISIBLE'`,`p.store_id=ANY($1::uuid[])`,
      `(marketplace_search(p.title) LIKE $2 OR marketplace_search(p.description) LIKE $2)`];
    if(query.category_id){filters.push(query.category_id);conditions.push(`pt.category_id=$${filters.length}`);}
    if(query.product_type_id){filters.push(query.product_type_id);conditions.push(`p.product_type_id=$${filters.length}`);}
    if(query.min_price_vnd!==undefined||query.max_price_vnd!==undefined){
      const prices=["fv.product_id=p.id", "fv.status='ACTIVE'", 'fi.quantity>fi.reserved_quantity'];
      if(query.min_price_vnd!==undefined){filters.push(query.min_price_vnd);prices.push(`fv.price_vnd>=$${filters.length}`);}
      if(query.max_price_vnd!==undefined){filters.push(query.max_price_vnd);prices.push(`fv.price_vnd<=$${filters.length}`);}
      conditions.push(`EXISTS(SELECT 1 FROM product_variant fv JOIN inventory fi ON fi.variant_id=fv.id AND fi.store_id=fv.store_id WHERE ${prices.join(' AND ')})`);
    }
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
      "SELECT id,parent_id,name,status,version FROM category WHERE status='ACTIVE' ORDER BY name,id LIMIT $1 OFFSET $2",
      [size,(page-1)*size]);
    return {items:rows.map(categoryResponse),total:count.total,page,size};
  }

  /** Attribute definitions for the whole page in one extra statement: no per-type query. */
  async pageProductTypes(page:number,size:number) {
    const [count]=await this.manager.query("SELECT count(*)::int AS total FROM product_type WHERE status='ACTIVE'");
    const rows=await this.manager.query(
      "SELECT id,category_id,name,status,version FROM product_type WHERE status='ACTIVE' ORDER BY name,id LIMIT $1 OFFSET $2",
      [size,(page-1)*size]);
    const definitions=rows.length ? await this.manager.query(
      `SELECT id,product_type_id,code,name,data_type,required,variant_factor,allowed_values,unit,version
         FROM attribute_definition WHERE product_type_id=ANY($1::uuid[]) ORDER BY name,id`,[rows.map((row:any)=>row.id)]) : [];
    return {items:rows.map((row:any)=>productTypeResponse(row,definitions)),total:count.total,page,size};
  }

  /** Variants/available stock, images and axis names are batched for the whole page. */
  async withRelations(rows:any[]) {
    if(!rows.length) return [];
    const ids=rows.map(row=>row.id);
    const variants=await this.manager.query(
      `SELECT v.id,v.product_id,v.sku,v.price_vnd,v.variant_values_json AS variant_values,v.is_default,v.status,
              greatest(coalesce(i.quantity-i.reserved_quantity,0),0)::int AS available_quantity
         FROM product_variant v LEFT JOIN inventory i ON i.variant_id=v.id AND i.store_id=v.store_id
        WHERE v.product_id=ANY($1::uuid[]) AND v.status='ACTIVE'`,[ids]);
    const images=await this.manager.query(
      `SELECT id,product_id,variant_id,url AS image_url,position
         FROM product_image WHERE product_id=ANY($1::uuid[]) AND status='ACTIVE' ORDER BY position,id`,[ids]);
    const typeIds=[...new Set(rows.map(row=>row.product_type_id))];
    const axes=await this.manager.query('SELECT product_type_id,code,name FROM attribute_definition WHERE product_type_id=ANY($1::uuid[]) AND variant_factor=true ORDER BY code',[typeIds]);
    return rows.map(row=>productResponse({...row,variant_axes:axes.filter((axis:any)=>axis.product_type_id===row.product_type_id).map(({code,name}:any)=>({code,name}))},variants,images));
  }

  /* ------------------------------------------- CAT-01: Store product lists */

  /**
   * Seller management page: **every** Product of the Store, including DRAFT/STOPPED and HIDDEN.
   * The Store id is a required argument because it always comes from the resolved membership, never
   * from the request — this is the view that must stay invisible to another Store.
   */
  async pageOwnStore(storeId:string,page:number,size:number,query:{q?:string;status?:string}={}) {
    if(query.q||query.status){
      const args=[storeId,searchPattern(query.q)??null,query.status??null];
      const where=' WHERE p.store_id=$1 AND ($2::text IS NULL OR marketplace_search(p.title) LIKE $2 OR EXISTS(SELECT 1 FROM product_variant v WHERE v.product_id=p.id AND v.store_id=$1 AND marketplace_search(v.sku) LIKE $2)) AND ($3::text IS NULL OR p.status=$3)';
      const [count]=await this.manager.query('SELECT count(*)::int AS total FROM product p'+where,args);
      const rows=await this.manager.query(`SELECT ${PRODUCT_COLUMNS} FROM product p`+where+' ORDER BY p.title,p.id LIMIT $4 OFFSET $5',[...args,size,(page-1)*size]);
      return {items:await this.withAllVariants(rows),total:count.total,page,size};
    }
    const [count]=await this.manager.query('SELECT count(*)::int AS total FROM product WHERE store_id=$1',[storeId]);
    const rows=await this.manager.query(
      `SELECT ${PRODUCT_COLUMNS} FROM product p WHERE p.store_id=$1
        ORDER BY p.title ASC, p.id LIMIT $2 OFFSET $3`,[storeId,size,(page-1)*size]);
    return {items:await this.withAllVariants(rows),total:count.total,page,size};
  }

  async ownStoreProduct(id:string,storeId:string) {
    const rows=await this.manager.query(`SELECT ${PRODUCT_COLUMNS} FROM product p WHERE p.id=$1 AND p.store_id=$2`,[id,storeId]);
    return (await this.withAllVariants(rows))[0];
  }

  /** Management read-back: variants and images in every status, so a write response is truthful. */
  async withAllVariants(rows:any[]) {
    if(!rows.length) return [];
    const ids=rows.map(row=>row.id);
    const variants=await this.manager.query(
      `SELECT id,product_id,sku,price_vnd,variant_values_json AS variant_values,is_default,status
         FROM product_variant WHERE product_id=ANY($1::uuid[]) ORDER BY sku,id`,[ids]);
    const images=await this.manager.query(
      `SELECT id,product_id,variant_id,url AS image_url,position
         FROM product_image WHERE product_id=ANY($1::uuid[]) AND status='ACTIVE' ORDER BY position,id`,[ids]);
    return (await this.withModerationDecisions(rows)).map(row=>productResponse(row,variants,images));
  }

  /** Private management projection only. Never call this from public catalogue readers. */
  async withModerationDecisions(rows:any[]) {
    if(!rows.length)return [];
    const decisions=await this.manager.query(
      `SELECT DISTINCT ON (target_id) target_id,reason,created_at,after_json->>'moderation_status' AS status,
              CASE WHEN jsonb_typeof(after_json->'version')='number' THEN (after_json->>'version')::numeric END AS decision_version
         FROM m1_audit WHERE target_type='Product' AND target_id=ANY($1::uuid[])
          AND action IN ('PRODUCT_HIDDEN','PRODUCT_RESTORED')
        ORDER BY target_id,decision_version DESC NULLS LAST,created_at DESC,id DESC`,[rows.map(row=>row.id)]);
    const byId=new Map(decisions.map((decision:any)=>[decision.target_id,decision]));
    return rows.map(row=>{
      const d:any=byId.get(row.id),version=Number(d?.decision_version);
      // An old/mismatched audit must not be presented as the current decision.
      if(!d||d.decision_version==null||!Number.isSafeInteger(version)||version<0||version>row.version
        ||d.status!==row.moderation_status||!['VISIBLE','HIDDEN'].includes(d.status)
        ||typeof d.reason!=='string'||!d.reason.trim()||d.reason.length>200)return row;
      return {...row,moderation_decision:{status:d.status,reason:d.reason,decided_at:new Date(d.created_at).toISOString()}};
    });
  }

  /* ------------------------------------------------ CAT-02: Product write */

  async productTypeForWrite(id:string) {
    // All taxonomy writers lock this parent before changing its definitions.
    const [row]=await this.manager.query('SELECT id,status FROM product_type WHERE id=$1 FOR SHARE',[id]);
    return row;
  }

  async attributeDefinitions(productTypeId:string) {
    return this.manager.query('SELECT code,required,data_type,allowed_values,variant_factor FROM attribute_definition WHERE product_type_id=$1 ORDER BY code',[productTypeId]);
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

  /** Vacate identities only inside the owning Product's locked write transaction.
   * Readers see the old committed rows until all final identities have been written.
   */
  async stageVariantIdentities(productId:string,storeId:string,ids:string[],nonce:string){
    if(!ids.length)return;
    await this.manager.query(
      'UPDATE product_variant SET sku=$4||id::text,variant_signature=$4||id::text WHERE product_id=$1 AND store_id=$2 AND id=ANY($3::uuid[])',
      [productId,storeId,ids,'catalog-stage:'+nonce+':']);
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
      'SELECT id,store_id,product_type_id,status,moderation_status,version FROM product WHERE id=$1 AND store_id=$2 FOR UPDATE',
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
       RETURNING id,product_id,variant_id,url AS image_url,position`,
      [input.productId,input.variantId,input.url,input.position]);
    return row;
  }

  async lockImage(imageId:string,productId:string) {
    const [row]=await this.manager.query('SELECT id,status FROM product_image WHERE id=$1 AND product_id=$2 FOR UPDATE',[imageId,productId]);
    return row;
  }
  async stopImage(imageId:string,productId:string) {
    await this.manager.query("UPDATE product_image SET status='STOPPED' WHERE id=$1 AND product_id=$2",[imageId,productId]);
  }
  async activeImageIds(productId:string):Promise<string[]> {
    const rows=await this.manager.query("SELECT id FROM product_image WHERE product_id=$1 AND status='ACTIVE' ORDER BY position,id",[productId]);
    return rows.map((row:{id:string})=>row.id);
  }
  async setImagePosition(imageId:string,productId:string,position:number) {
    await this.manager.query('UPDATE product_image SET position=$3 WHERE id=$1 AND product_id=$2',[imageId,productId,position]);
  }
}

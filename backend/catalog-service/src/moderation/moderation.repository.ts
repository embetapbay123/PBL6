import { randomUUID } from 'node:crypto';
import { database } from '../../../shared/src/database';
import type { EntityManager } from 'typeorm';
import { ApiError } from '../../../shared/src/errors';
import { returnedRow } from '../../../shared/src/postgres-returning';
import { emitEvent } from '../../../shared/src/events';
import { assertDataType, attributeCode, createsCategoryCycle, taxonomySlug } from './taxonomy.validation';

/**
 * Admin taxonomy writes (CAT/TAX) and Product moderation (MOD).
 *
 * Every method is one transaction: the row change and its audit entry commit together, so an
 * accepted edit can always be explained and a rejected one leaves nothing behind. The database
 * constraints are named in the checks below because a raw `23505`/`23503` would surface as a 500.
 */
export class ModerationRepository {
  /* ------------------------------------------------------------------ helpers */

  private row<T>(result: unknown, what: string): T {
    const row = returnedRow<T>(result);
    if (!row) throw new Error(`${what} returned no row`);
    return row;
  }

  private async requireCategory(manager: EntityManager, id: string, code: string, message: string) {
    const [row] = await manager.query('SELECT id FROM category WHERE id=$1', [id]);
    if (!row) throw new ApiError(422, code, message);
  }

  private async requireProductType(manager: EntityManager, id: string) {
    const [row] = await manager.query('SELECT id FROM product_type WHERE id=$1', [id]);
    if (!row) throw new ApiError(422, 'PRODUCT_TYPE_NOT_FOUND', 'Product type does not exist.');
  }

  /** `category_slug_unique` would otherwise surface as a driver error. */
  private async assertSlugFree(manager: EntityManager, slug: string, exceptId?: string) {
    const [row] = await manager.query(
      'SELECT id FROM category WHERE slug=$1 AND ($2::uuid IS NULL OR id<>$2)', [slug, exceptId ?? null]);
    if (row) throw new ApiError(409, 'SLUG_CONFLICT', 'Another category already uses this name.');
  }

  /** `attribute_type_code_unique` keeps one definition per attribute per Product type. */
  private async assertCodeFree(manager: EntityManager, productTypeId: string, code: string) {
    const [row] = await manager.query(
      'SELECT id FROM attribute_definition WHERE product_type_id=$1 AND code=$2', [productTypeId, code]);
    if (row) throw new ApiError(409, 'ATTRIBUTE_CODE_CONFLICT', 'This Product type already defines that attribute.');
  }

  private async assertNoCycle(manager: EntityManager, id: string, parentId: string) {
    const rows = await manager.query('SELECT id,parent_id FROM category');
    const parents = new Map<string, string | null>(rows.map((row: any) => [row.id, row.parent_id]));
    if (createsCategoryCycle(id, parentId, parents)) {
      throw new ApiError(422, 'CATEGORY_CYCLE', 'That parent would make the category its own ancestor.');
    }
  }

  /**
   * Changing the declared type of an attribute that Products already store would silently
   * reinterpret existing values, so the definition stays frozen while any Product uses it.
   */
  private async assertAttributeUnused(manager: EntityManager, definition: { product_type_id: string; code: string }) {
    const [row] = await manager.query(
      'SELECT 1 AS found FROM product WHERE product_type_id=$1 AND attributes_json ? $2 LIMIT 1',
      [definition.product_type_id, definition.code]);
    if (row) {
      throw new ApiError(409, 'ATTRIBUTE_IN_USE',
        'Products of this type already use this attribute, so its data type cannot change.');
    }
  }

  /* ----------------------------------------------------------------- category */

  async createCategory(body: any, actor: string, requestId: string) {
    const name = body.name.trim();
    return database.transaction(async manager => {
      if (body.parent_id) {
        await this.requireCategory(manager, body.parent_id, 'PARENT_NOT_FOUND', 'Parent category does not exist.');
      }
      const slug = taxonomySlug(name);
      await this.assertSlugFree(manager, slug);
      const row = this.row<any>(await manager.query(
        `INSERT INTO category(id,parent_id,name,slug,status,version) VALUES($1,$2,$3,$4,'ACTIVE',0) RETURNING *`,
        [randomUUID(), body.parent_id ?? null, name, slug]), 'Category create');
      await this.audit(manager, 'Category', row.id, 'CATEGORY_CREATED', actor, requestId, {}, row, 'Created');
      return row;
    });
  }

  async updateCategory(id: string, body: any, actor: string, requestId: string) {
    return database.transaction(async manager => {
      const [old] = await manager.query('SELECT * FROM category WHERE id=$1 FOR UPDATE', [id]);
      if (!old) throw new ApiError(404, 'NOT_FOUND', 'Category not found.');
      if (old.version !== body.expected_version) throw new ApiError(409, 'VERSION_CONFLICT', 'Category version changed.');

      const name = body.name?.trim() ?? null;
      const slug = name ? taxonomySlug(name) : null;
      if (slug) await this.assertSlugFree(manager, slug, id);
      const touchesParent = Object.hasOwn(body, 'parent_id');
      if (touchesParent && body.parent_id) {
        await this.requireCategory(manager, body.parent_id, 'PARENT_NOT_FOUND', 'Parent category does not exist.');
        await this.assertNoCycle(manager, id, body.parent_id);
      }

      const row = this.row<any>(await manager.query(
        `UPDATE category SET name=coalesce($1,name), slug=coalesce($2,slug),
                parent_id=CASE WHEN $3 THEN $4 ELSE parent_id END, version=version+1
          WHERE id=$5 RETURNING *`,
        [name, slug, touchesParent, body.parent_id ?? null, id]), 'Category update');
      await this.audit(manager, 'Category', id, 'CATEGORY_UPDATED', actor, requestId, old, row, 'Updated');
      return row;
    });
  }

  /* ------------------------------------------------------------- product type */

  async createProductType(body: any, actor: string, requestId: string) {
    if (!body.category_id) throw new ApiError(422, 'VALIDATION_FAILED', 'category_id is required.');
    const name = body.name.trim();
    return database.transaction(async manager => {
      await this.requireCategory(manager, body.category_id, 'CATEGORY_NOT_FOUND', 'Category does not exist.');
      const row = this.row<any>(await manager.query(
        `INSERT INTO product_type(id,category_id,name,status,version) VALUES($1,$2,$3,'ACTIVE',0) RETURNING *`,
        [randomUUID(), body.category_id, name]), 'Product type create');
      await this.audit(manager, 'ProductType', row.id, 'PRODUCT_TYPE_CREATED', actor, requestId, {}, row, 'Created');
      return { ...row, attribute_definitions: [] };
    });
  }

  async updateProductType(id: string, body: any, actor: string, requestId: string) {
    return database.transaction(async manager => {
      const [old] = await manager.query('SELECT * FROM product_type WHERE id=$1 FOR UPDATE', [id]);
      if (!old) throw new ApiError(404, 'NOT_FOUND', 'Product type not found.');
      if (old.version !== body.expected_version) throw new ApiError(409, 'VERSION_CONFLICT', 'Product type version changed.');
      if (body.category_id) {
        await this.requireCategory(manager, body.category_id, 'CATEGORY_NOT_FOUND', 'Category does not exist.');
      }
      const row = this.row<any>(await manager.query(
        `UPDATE product_type SET name=coalesce($1,name), category_id=coalesce($2,category_id), version=version+1
          WHERE id=$3 RETURNING *`,
        [body.name?.trim() ?? null, body.category_id ?? null, id]), 'Product type update');
      await this.audit(manager, 'ProductType', id, 'PRODUCT_TYPE_UPDATED', actor, requestId, old, row, 'Updated');
      const definitions = await manager.query(
        'SELECT * FROM attribute_definition WHERE product_type_id=$1 ORDER BY name,id', [id]);
      return { ...row, attribute_definitions: definitions };
    });
  }

  /* ------------------------------------------------------ attribute definition */

  async createAttributeDefinition(body: any, actor: string, requestId: string) {
    if (!body.product_type_id || !body.data_type) {
      throw new ApiError(422, 'VALIDATION_FAILED', 'product_type_id and data_type are required.');
    }
    assertDataType(body.data_type);
    const name = body.name.trim();
    const code = attributeCode(name);
    return database.transaction(async manager => {
      await this.requireProductType(manager, body.product_type_id);
      await this.assertCodeFree(manager, body.product_type_id, code);
      const row = this.row<any>(await manager.query(
        `INSERT INTO attribute_definition(id,product_type_id,code,name,data_type,required,variant_factor,allowed_values,unit,version)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,0) RETURNING *`,
        [randomUUID(), body.product_type_id, code, name, body.data_type, body.required ?? false,
          body.variant_axis ?? false, JSON.stringify(body.allowed_values ?? []), body.unit ?? null]),
        'Attribute definition create');
      await this.audit(manager, 'AttributeDefinition', row.id, 'ATTRIBUTE_DEFINITION_CREATED', actor, requestId, {}, row, 'Created');
      return row;
    });
  }

  async updateAttributeDefinition(id: string, body: any, actor: string, requestId: string) {
    return database.transaction(async manager => {
      const [old] = await manager.query('SELECT * FROM attribute_definition WHERE id=$1 FOR UPDATE', [id]);
      if (!old) throw new ApiError(404, 'NOT_FOUND', 'Attribute definition not found.');
      if (old.version !== body.expected_version) throw new ApiError(409, 'VERSION_CONFLICT', 'Attribute definition version changed.');
      if (body.data_type !== undefined) {
        assertDataType(body.data_type);
        if (body.data_type !== old.data_type) await this.assertAttributeUnused(manager, old);
      }
      const row = this.row<any>(await manager.query(
        `UPDATE attribute_definition SET name=coalesce($1,name), data_type=coalesce($2,data_type),
                required=coalesce($3,required), variant_factor=coalesce($4,variant_factor),
                allowed_values=coalesce($5::jsonb,allowed_values),
                unit=CASE WHEN $6 THEN $7 ELSE unit END, version=version+1
          WHERE id=$8 RETURNING *`,
        [body.name?.trim() ?? null, body.data_type ?? null, body.required ?? null, body.variant_axis ?? null,
          body.allowed_values ? JSON.stringify(body.allowed_values) : null, Object.hasOwn(body, 'unit'),
          body.unit ?? null, id]), 'Attribute definition update');
      await this.audit(manager, 'AttributeDefinition', id, 'ATTRIBUTE_DEFINITION_UPDATED', actor, requestId, old, row, 'Updated');
      return row;
    });
  }

  /* ------------------------------------------------------- product moderation */

  /** Restoring visibility must not resurrect a Product whose Store is no longer sellable. */
  async storeOfProduct(id: string): Promise<string> {
    const [row] = await database.query('SELECT store_id FROM product WHERE id=$1', [id]);
    if (!row) throw new ApiError(404, 'NOT_FOUND', 'Product not found.');
    return row.store_id;
  }

  /**
   * Hiding and restoring only moves `moderation_status`; the sale status is deliberately left alone,
   * so a restored DRAFT or STOPPED Product stays out of the catalogue. The returned projection is the
   * contract `Product`, and the change publishes `ProductChanged` because a hidden Product must also
   * disappear from anything downstream that already cached it.
   */
  async setProductModeration(id: string, visible: boolean, body: any, actor: string, requestId: string) {
    if (!body.reason?.trim()) throw new ApiError(422, 'VALIDATION_FAILED', 'A moderation reason is required.');
    return database.transaction(async manager => {
      const [old] = await manager.query('SELECT id,status,moderation_status,version FROM product WHERE id=$1 FOR UPDATE', [id]);
      if (!old) throw new ApiError(404, 'NOT_FOUND', 'Product not found.');
      if (old.version !== body.expected_version) throw new ApiError(409, 'VERSION_CONFLICT', 'Product version changed.');
      if (old.moderation_status === (visible ? 'VISIBLE' : 'HIDDEN')) {
        throw new ApiError(409, 'NO_STATE_CHANGE', 'The Product is already in that moderation state.');
      }
      const row = this.row<any>(await manager.query(
        `UPDATE product SET moderation_status=$1,version=version+1 WHERE id=$2
         RETURNING id,store_id,product_type_id,title,description,attributes_json AS attributes,
                   status,moderation_status,version`,
        [visible ? 'VISIBLE' : 'HIDDEN', id]), 'Product moderation update');
      await this.audit(manager, 'Product', id, visible ? 'PRODUCT_RESTORED' : 'PRODUCT_HIDDEN',
        actor, requestId, old, row, body.reason.trim());
      await emitEvent(manager, 'ProductChanged', { product_id: row.id, store_id: row.store_id,
        version: row.version, sale_status: row.status, moderation_status: row.moderation_status }, requestId);
      return row;
    });
  }

  /* -------------------------------------------------------- review moderation */

  async setReviewModeration(id: string, visible: boolean, body: any, actor: string, requestId: string) {
    if (!body.reason?.trim()) throw new ApiError(422, 'VALIDATION_FAILED', 'A moderation reason is required.');
    return database.transaction(async manager => {
      const [old] = await manager.query('SELECT * FROM review WHERE id=$1 FOR UPDATE', [id]);
      if (!old) throw new ApiError(404, 'NOT_FOUND', 'Review not found.');
      if (old.version !== body.expected_version) throw new ApiError(409, 'VERSION_CONFLICT', 'Review version changed.');
      if (old.status === (visible ? 'VISIBLE' : 'HIDDEN')) {
        throw new ApiError(409, 'NO_STATE_CHANGE', 'The Review is already in that moderation state.');
      }
      const row = this.row<any>(await manager.query(
        `UPDATE review SET status=$1, hidden_reason=$2, updated_at=now(), version=version+1
          WHERE id=$3 RETURNING id,order_item_id,product_id,rating,body,status,version`,
        [visible ? 'VISIBLE' : 'HIDDEN', visible ? null : body.reason.trim(), id]), 'Review moderation update');
      await this.audit(manager, 'Review', id, visible ? 'REVIEW_RESTORED' : 'REVIEW_HIDDEN',
        actor, requestId, old, row, body.reason.trim());
      return row;
    });
  }

  private async audit(manager: EntityManager, type: string, id: string, action: string, actor: string,
    requestId: string, before: any, after: any, reason: string) {
    await manager.query(
      `INSERT INTO m1_audit(actor_user_id,target_type,target_id,action,reason,request_id,before_json,after_json)
       VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb)`,
      [actor, type, id, action, reason, requestId || randomUUID(), JSON.stringify(before), JSON.stringify(after)]);
  }
}

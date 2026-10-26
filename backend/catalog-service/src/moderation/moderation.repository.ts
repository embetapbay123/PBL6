import { randomUUID } from 'node:crypto';
import { database } from '../../../shared/src/database';
import type { EntityManager } from 'typeorm';
import { ApiError } from '../../../shared/src/errors';
import { returnedRow } from '../../../shared/src/postgres-returning';

const slug = (value: string) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export class ModerationRepository {
  async createCategory(body: any, actor: string, requestId: string) {
    return database.transaction(async manager => {
      const [row] = await manager.query(`INSERT INTO category(id,parent_id,name,slug,status) VALUES($1,$2,$3,$4,'ACTIVE') RETURNING *`, [randomUUID(), body.parent_id ?? null, body.name.trim(), slug(body.name)]);
      await this.audit(manager,'Category', row.id, 'CATEGORY_CREATED', actor, requestId, {}, row, 'Created'); return row;
    });
  }
  async updateCategory(id: string, body: any, actor: string, requestId: string) {
    return database.transaction(async manager => {
      const [old] = await manager.query('SELECT * FROM category WHERE id=$1 FOR UPDATE', [id]); if (!old) throw new ApiError(404,'NOT_FOUND','Category not found.');
      if (old.version !== body.expected_version) throw new ApiError(409,'VERSION_CONFLICT','Category version changed.');
      const row = returnedRow<any>(await manager.query(`UPDATE category SET name=coalesce($1,name),slug=coalesce($2,slug),parent_id=CASE WHEN $3 THEN $4 ELSE parent_id END,version=version+1 WHERE id=$5 RETURNING *`, [body.name?.trim() ?? null, body.name ? slug(body.name) : null, Object.hasOwn(body,'parent_id'), body.parent_id ?? null, id])); if (!row) throw new Error("Taxonomy update returned no row");
      await this.audit(manager,'Category', id, 'CATEGORY_UPDATED', actor, requestId, old, row, 'Updated'); return row;
    });
  }
  async createProductType(body: any, actor: string, requestId: string) {
    if (!body.category_id) throw new ApiError(422,'VALIDATION_FAILED','category_id is required.');
    return database.transaction(async manager => {
      const [row] = await manager.query(`INSERT INTO product_type(id,category_id,name,status) VALUES($1,$2,$3,'ACTIVE') RETURNING *`, [randomUUID(), body.category_id, body.name.trim()]);
      await this.audit(manager,'ProductType', row.id, 'PRODUCT_TYPE_CREATED', actor, requestId, {}, row, 'Created'); return {...row,attribute_definitions:[]};
    });
  }
  async updateProductType(id: string, body: any, actor: string, requestId: string) {
    return database.transaction(async manager => {
      const [old] = await manager.query('SELECT * FROM product_type WHERE id=$1 FOR UPDATE', [id]); if (!old) throw new ApiError(404,'NOT_FOUND','Product type not found.');
      if (old.version !== body.expected_version) throw new ApiError(409,'VERSION_CONFLICT','Product type version changed.');
      const row = returnedRow<any>(await manager.query('UPDATE product_type SET name=coalesce($1,name),category_id=coalesce($2,category_id),version=version+1 WHERE id=$3 RETURNING *', [body.name?.trim() ?? null, body.category_id ?? null, id])); if (!row) throw new Error("Taxonomy update returned no row");
      await this.audit(manager,'ProductType', id, 'PRODUCT_TYPE_UPDATED', actor, requestId, old, row, 'Updated');
      const definitions=await manager.query('SELECT * FROM attribute_definition WHERE product_type_id=$1 ORDER BY name,id',[id]);
      return {...row,attribute_definitions:definitions};
    });
  }
  async createAttributeDefinition(body: any, actor: string, requestId: string) {
    if (!body.product_type_id || !body.data_type) throw new ApiError(422,'VALIDATION_FAILED','product_type_id and data_type are required.');
    const code = (body.code ?? slug(body.name).replace(/-/g,'_')).slice(0,200);
    return database.transaction(async manager => {
      const [row] = await manager.query(`INSERT INTO attribute_definition(id,product_type_id,code,name,data_type,required,variant_factor,allowed_values,unit) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9) RETURNING *`, [randomUUID(), body.product_type_id, code, body.name.trim(), body.data_type, body.required ?? false, body.variant_axis ?? false, JSON.stringify(body.allowed_values ?? []), body.unit ?? null]);
      await this.audit(manager,'AttributeDefinition', row.id, 'ATTRIBUTE_DEFINITION_CREATED', actor, requestId, {}, row, 'Created'); return row;
    });
  }
  async updateAttributeDefinition(id: string, body: any, actor: string, requestId: string) {
    return database.transaction(async manager => {
      const [old] = await manager.query('SELECT * FROM attribute_definition WHERE id=$1 FOR UPDATE', [id]); if (!old) throw new ApiError(404,'NOT_FOUND','Attribute definition not found.');
      if (old.version !== body.expected_version) throw new ApiError(409,'VERSION_CONFLICT','Attribute definition version changed.');
      const row = returnedRow<any>(await manager.query(`UPDATE attribute_definition SET name=coalesce($1,name),data_type=coalesce($2,data_type),required=coalesce($3,required),variant_factor=coalesce($4,variant_factor),allowed_values=coalesce($5::jsonb,allowed_values),unit=CASE WHEN $6 THEN $7 ELSE unit END,version=version+1 WHERE id=$8 RETURNING *`, [body.name?.trim() ?? null, body.data_type ?? null, body.required ?? null, body.variant_axis ?? null, body.allowed_values ? JSON.stringify(body.allowed_values) : null, Object.hasOwn(body,'unit'), body.unit ?? null, id])); if (!row) throw new Error("Taxonomy update returned no row");
      await this.audit(manager,'AttributeDefinition', id, 'ATTRIBUTE_DEFINITION_UPDATED', actor, requestId, old, row, 'Updated'); return row;
    });
  }
  async setProductModeration(id: string, visible: boolean, body: any, actor: string, requestId: string) {
    if (!body.reason?.trim()) throw new ApiError(422,'VALIDATION_FAILED','A moderation reason is required.');
    return database.transaction(async manager => {
      const [old] = await manager.query('SELECT id,status,moderation_status,version FROM product WHERE id=$1 FOR UPDATE', [id]);
      if (!old) throw new ApiError(404,'NOT_FOUND','Product not found.');
      if (old.version !== body.expected_version) throw new ApiError(409,'VERSION_CONFLICT','Product version changed.');
      const row = returnedRow<any>(await manager.query('UPDATE product SET moderation_status=$1,version=version+1 WHERE id=$2 RETURNING id,status,moderation_status,version', [visible ? 'VISIBLE' : 'HIDDEN', id])); if (!row) throw new Error("Taxonomy update returned no row");
      await manager.query(`INSERT INTO m1_audit(actor_user_id,target_type,target_id,action,reason,request_id,before_json,after_json) VALUES($1,'Product',$2,$3,$4,$5,$6::jsonb,$7::jsonb)`, [actor,id,visible?'PRODUCT_RESTORED':'PRODUCT_HIDDEN',body.reason,requestId,JSON.stringify(old),JSON.stringify(row)]);
      return row;
    });
  }
  private async audit(manager: EntityManager, type: string, id: string, action: string, actor: string, requestId: string, before: any, after: any, reason: string) {
    await manager.query(`INSERT INTO m1_audit(actor_user_id,target_type,target_id,action,reason,request_id,before_json,after_json) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb)`, [actor,type,id,action,reason,requestId || randomUUID(),JSON.stringify(before),JSON.stringify(after)]);
  }
}

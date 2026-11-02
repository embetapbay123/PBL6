import { randomUUID } from 'node:crypto';
import { database } from '../../../shared/src/database';
import type { EntityManager } from 'typeorm';
import { ApiError } from '../../../shared/src/errors';
import { returnedRow } from '../../../shared/src/postgres-returning';
import { CatalogRepository } from '../catalog/catalog.repository';

const slug = (value: string) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function validateTaxonomy(body:any,creating=false){
  if((creating||body.name!==undefined)&&(typeof body.name!=='string'||!body.name.trim()||body.name.trim().length>200))throw new ApiError(422,'VALIDATION_FAILED','Tên taxonomy phải có từ 1 đến 200 ký tự.');
  if(body.data_type!==undefined&&!['STRING','TEXT','NUMBER','BOOLEAN'].includes(body.data_type))throw new ApiError(422,'VALIDATION_FAILED','Kiểu dữ liệu thuộc tính không hợp lệ.');
}

export class ModerationRepository {
  private async run<T>(work:(manager:EntityManager)=>Promise<T>):Promise<T>{
    try{return await database.transaction(work);}
    catch(error){
      const cause=(error as any)?.driverError ?? error;
      if(cause?.code==='23505')throw new ApiError(409,'TAXONOMY_CONFLICT','Tên hoặc mã taxonomy đã tồn tại.');
      if(cause?.code==='23503')throw new ApiError(422,'REFERENCE_INVALID','Danh mục hoặc loại sản phẩm liên quan không tồn tại.');
      throw error;
    }
  }
  async createCategory(body: any, actor: string, requestId: string) {
    validateTaxonomy(body,true);
    return this.run(async manager => {
      const [row] = await manager.query(`INSERT INTO category(id,parent_id,name,slug,status) VALUES($1,$2,$3,$4,'ACTIVE') RETURNING *`, [randomUUID(), body.parent_id ?? null, body.name.trim(), slug(body.name)]);
      await this.audit(manager,'Category', row.id, 'CATEGORY_CREATED', actor, requestId, {}, row, 'Created'); return row;
    });
  }
  async updateCategory(id: string, body: any, actor: string, requestId: string) {
    validateTaxonomy(body);
    if(body.parent_id===id)throw new ApiError(422,'VALIDATION_FAILED','Danh mục không thể là cấp cha của chính nó.');
    return this.run(async manager => {
      if(body.parent_id)await manager.query("SELECT pg_advisory_xact_lock(hashtextextended('M1.category.parent',0))");
      const [old] = await manager.query('SELECT * FROM category WHERE id=$1 FOR UPDATE', [id]); if (!old) throw new ApiError(404,'NOT_FOUND','Category not found.');
      if (old.version !== body.expected_version) throw new ApiError(409,'VERSION_CONFLICT','Category version changed.');
      if(body.parent_id){
        const cycle=await manager.query('WITH RECURSIVE ancestors AS (SELECT id,parent_id FROM category WHERE id=$1 UNION SELECT c.id,c.parent_id FROM category c JOIN ancestors a ON c.id=a.parent_id) SELECT id FROM ancestors WHERE id=$2',[body.parent_id,id]);
        if(cycle.length)throw new ApiError(422,'CATEGORY_CYCLE','Không thể tạo vòng lặp trong cây danh mục.');
      }
      const row = returnedRow<any>(await manager.query(`UPDATE category SET name=coalesce($1,name),slug=coalesce($2,slug),parent_id=CASE WHEN $3 THEN $4 ELSE parent_id END,version=version+1 WHERE id=$5 RETURNING *`, [body.name?.trim() ?? null, body.name ? slug(body.name) : null, Object.hasOwn(body,'parent_id'), body.parent_id ?? null, id])); if (!row) throw new Error("Taxonomy update returned no row");
      await this.audit(manager,'Category', id, 'CATEGORY_UPDATED', actor, requestId, old, row, 'Updated'); return row;
    });
  }
  async createProductType(body: any, actor: string, requestId: string) {
    validateTaxonomy(body,true);
    if (!body.category_id) throw new ApiError(422,'VALIDATION_FAILED','category_id is required.');
    return this.run(async manager => {
      const [row] = await manager.query(`INSERT INTO product_type(id,category_id,name,status) VALUES($1,$2,$3,'ACTIVE') RETURNING *`, [randomUUID(), body.category_id, body.name.trim()]);
      await this.audit(manager,'ProductType', row.id, 'PRODUCT_TYPE_CREATED', actor, requestId, {}, row, 'Created'); return {...row,attribute_definitions:[]};
    });
  }
  async updateProductType(id: string, body: any, actor: string, requestId: string) {
    validateTaxonomy(body);
    return this.run(async manager => {
      const [old] = await manager.query('SELECT * FROM product_type WHERE id=$1 FOR UPDATE', [id]); if (!old) throw new ApiError(404,'NOT_FOUND','Product type not found.');
      if (old.version !== body.expected_version) throw new ApiError(409,'VERSION_CONFLICT','Product type version changed.');
      const row = returnedRow<any>(await manager.query('UPDATE product_type SET name=coalesce($1,name),category_id=coalesce($2,category_id),version=version+1 WHERE id=$3 RETURNING *', [body.name?.trim() ?? null, body.category_id ?? null, id])); if (!row) throw new Error("Taxonomy update returned no row");
      await this.audit(manager,'ProductType', id, 'PRODUCT_TYPE_UPDATED', actor, requestId, old, row, 'Updated');
      const definitions=await manager.query('SELECT * FROM attribute_definition WHERE product_type_id=$1 ORDER BY name,id',[id]);
      return {...row,attribute_definitions:definitions};
    });
  }
  async createAttributeDefinition(body: any, actor: string, requestId: string) {
    validateTaxonomy(body,true);
    if (!body.product_type_id || !body.data_type) throw new ApiError(422,'VALIDATION_FAILED','product_type_id and data_type are required.');
    const code = (body.code ?? slug(body.name).replace(/-/g,'_')).slice(0,200);
    if(!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(code))throw new ApiError(422,'VALIDATION_FAILED','Mã thuộc tính phải bắt đầu bằng chữ và chỉ gồm chữ, số hoặc dấu gạch dưới.');
    return this.run(async manager => {
      const parent=await manager.query('SELECT id FROM product_type WHERE id=$1 FOR UPDATE',[body.product_type_id]);
      if(!parent.length)throw new ApiError(422,'REFERENCE_INVALID','Loại sản phẩm liên quan không tồn tại.');
      const [row] = await manager.query(`INSERT INTO attribute_definition(id,product_type_id,code,name,data_type,required,variant_factor,allowed_values,unit) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9) RETURNING *`, [randomUUID(), body.product_type_id, code, body.name.trim(), body.data_type, body.required ?? false, body.variant_axis ?? false, JSON.stringify(body.allowed_values ?? []), body.unit ?? null]);
      await this.audit(manager,'AttributeDefinition', row.id, 'ATTRIBUTE_DEFINITION_CREATED', actor, requestId, {}, row, 'Created'); return row;
    });
  }
  async updateAttributeDefinition(id: string, body: any, actor: string, requestId: string) {
    validateTaxonomy(body);
    return this.run(async manager => {
      const [parent]=await manager.query('SELECT product_type_id FROM attribute_definition WHERE id=$1',[id]);
      if(!parent)throw new ApiError(404,'NOT_FOUND','Attribute definition not found.');
      await manager.query('SELECT id FROM product_type WHERE id=$1 FOR UPDATE',[parent.product_type_id]);
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
      const row = returnedRow<any>(await manager.query('UPDATE product SET moderation_status=$1,version=version+1 WHERE id=$2 RETURNING id,store_id,product_type_id,title,description,attributes_json AS attributes,status,moderation_status,version', [visible ? 'VISIBLE' : 'HIDDEN', id])); if (!row) throw new Error("Taxonomy update returned no row");
      await manager.query(`INSERT INTO m1_audit(actor_user_id,target_type,target_id,action,reason,request_id,before_json,after_json,store_id) VALUES($1,'Product',$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8)`, [actor,id,visible?'PRODUCT_RESTORED':'PRODUCT_HIDDEN',body.reason,requestId,JSON.stringify(old),JSON.stringify(row),row.store_id]);
      const repository=new CatalogRepository(manager);
      return (await repository.withRelations(await repository.withModerationDecisions([row])))[0];
    });
  }
  private async audit(manager: EntityManager, type: string, id: string, action: string, actor: string, requestId: string, before: any, after: any, reason: string) {
    await manager.query(`INSERT INTO m1_audit(actor_user_id,target_type,target_id,action,reason,request_id,before_json,after_json) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb)`, [actor,type,id,action,reason,requestId || randomUUID(),JSON.stringify(before),JSON.stringify(after)]);
  }
}

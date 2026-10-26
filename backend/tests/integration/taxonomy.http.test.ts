import { DataSource } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { schemaErrors } from '../../shared/src/contract-validation';
import bundle from '../../shared/src/contracts.runtime.generated.json';
const enabled=process.env.PBL6_ISOLATED_TEST_REDIS==='1' && process.env.TEST_API_URL && process.env.M1_DATABASE_URL && process.env.SEED_PASSWORD;
(enabled?describe:describe.skip)('Taxonomy HTTP contract round trip (explicit isolated integration stack)',()=>{
 test('create/read/update preserve versions, definitions and strict response projections',async()=>{
  const base=process.env.TEST_API_URL!,trace='taxonomy-http-'+randomUUID();
  const db=new DataSource({type:'postgres',url:process.env.M1_DATABASE_URL});await db.initialize();
  const created:{category?:string;type?:string;attribute?:string}={};let token:string;
  async function request(op:string,body?:unknown,id?:string,status?:number){
   const spec=(bundle.operations as any)[op];const route=spec.route.replace('{id}',id);
   const response=await fetch(base+route,{method:spec.method,headers:{'content-type':'application/json','x-correlation-id':trace,...(token?{authorization:'Bearer '+token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
   expect(response.status).toBe(status??Number(Object.keys(spec.responses)[0]));const data=await response.json();
   if(response.ok)expect(schemaErrors(data,spec.responses[String(response.status)])).toEqual([]);
   return data;
  }
  try{
   token=(await request('login',{email:'admin@pbl6.test',password:process.env.SEED_PASSWORD,client_type:'MOBILE'})).access_token;
   const category=await request('createCategory',{name:'Taxonomy '+randomUUID()});created.category=category.id;
   expect(category.version).toBe(0);expect(category).not.toHaveProperty('slug');expect(category).not.toHaveProperty('parent_id');
   const categories=await request('listCategories');expect(categories.items.find((x:any)=>x.id===category.id)?.version).toBe(0);
   const changed=await request('updateCategory',{name:category.name+' updated',expected_version:category.version},category.id);
   expect(changed.version).toBe(1);await request('updateCategory',{name:'Stale',expected_version:0},category.id,409);
   const type=await request('createProductType',{name:'Fixture Type',category_id:category.id});created.type=type.id;
   expect(type.attribute_definitions).toEqual([]);expect(type.version).toBe(0);
   const attribute=await request('createAttributeDefinition',{product_type_id:type.id,name:'Fixture Size',data_type:'STRING',variant_axis:true,allowed_values:['A','B']});created.attribute=attribute.id;
   expect(attribute.variant_axis).toBe(true);expect(attribute).not.toHaveProperty('unit');expect(attribute).not.toHaveProperty('variant_factor');
   const types=await request('listProductTypes');const read=types.items.find((x:any)=>x.id===type.id);
   expect(read.version).toBe(0);expect(read.attribute_definitions[0].version).toBe(0);
   const updated=await request('updateProductType',{name:'Updated Type',expected_version:read.version},type.id);
   expect(updated.version).toBe(1);expect(updated.attribute_definitions[0].id).toBe(attribute.id);
   expect((await request('updateAttributeDefinition',{name:'Updated Size',expected_version:0},attribute.id)).version).toBe(1);
  }finally{
   await db.query('DELETE FROM m1_audit WHERE request_id=$1',[trace]);
   if(created.attribute)await db.query('DELETE FROM attribute_definition WHERE id=$1',[created.attribute]);
   if(created.type)await db.query('DELETE FROM product_type WHERE id=$1',[created.type]);
   if(created.category)await db.query('DELETE FROM category WHERE id=$1',[created.category]);
   await db.destroy();
  }
 });
});

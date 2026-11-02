jest.mock('../../shared/src/database',()=>({database:{transaction:jest.fn(),manager:undefined}}));
import {DataSource} from 'typeorm';
import {randomUUID} from 'node:crypto';
import {readdirSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {database} from '../../shared/src/database';
import {CatalogService} from '../../catalog-service/src/catalog/catalog.service';
import {variantSignature} from '../../catalog-service/src/catalog/catalog.validation';

const suite=process.env.M1_DATABASE_URL?describe:describe.skip;
suite('catalog identity batch uses real unique indexes and rolls back scoped intermediate changes',()=>{
 let admin:DataSource,db:DataSource,schema:string;
 const store=randomUUID(),otherStore=randomUUID(),product=randomUUID(),otherProduct=randomUUID(),category=randomUUID(),type=randomUUID(),red=randomUUID(),blue=randomUUID(),foreign=randomUUID();
 const context={user_id:randomUUID(),store_membership:{store_id:store,role:'OWNER',permissions:[]}},service=new CatalogService();
 const input=(over:any={})=>({expected_version:0,title:'Updated',variants:[{id:red,sku:'BLUE',price_vnd:100,variant_values:{color:'blue'},is_default:true},{id:blue,sku:'RED',price_vnd:200,variant_values:{color:'red'},is_default:false}],...over});
 const rows=()=>db.query('SELECT id,sku,variant_signature,variant_values_json FROM product_variant WHERE product_id=$1 ORDER BY id',[product]);
 beforeAll(async()=>{
  admin=await new DataSource({type:'postgres',url:process.env.M1_DATABASE_URL}).initialize();schema='catalog_batch_'+randomUUID().replace(/-/g,'');await admin.query('CREATE SCHEMA '+schema);db=await new DataSource({type:'postgres',url:process.env.M1_DATABASE_URL,extra:{options:'-csearch_path='+schema+',public',statement_timeout:10000}}).initialize();const dir=resolve(__dirname,'../../catalog-service/migrations');for(const f of readdirSync(dir).filter(x=>x.endsWith('.sql')).sort())await db.query(readFileSync(resolve(dir,f),'utf8'));
  (database as any).manager=db.manager;(database.transaction as jest.Mock).mockImplementation(cb=>db.transaction(cb));jest.spyOn(service as any,'stores').mockResolvedValue([store,otherStore]);
 });
 beforeEach(async()=>{
  await db.query('TRUNCATE '+schema+'.category CASCADE');await db.query("INSERT INTO category(id,name,slug,status,version) VALUES($1,'Fixture','fixture','ACTIVE',0)",[category]);await db.query("INSERT INTO product_type(id,category_id,name,status,version) VALUES($1,$2,'Fixture','ACTIVE',0)",[type,category]);
  await db.query("INSERT INTO attribute_definition(id,product_type_id,code,name,data_type,required,variant_factor,allowed_values) VALUES($1,$2,'color','Color','STRING',true,true,$3)",[randomUUID(),type,JSON.stringify(['red','blue'])]);
  for(const [id,s] of [[product,store],[otherProduct,otherStore]])await db.query("INSERT INTO product(id,store_id,product_type_id,title,attributes_json,status,moderation_status,version) VALUES($1,$2,$3,'Original','{\"color\":\"red\"}','ACTIVE','VISIBLE',0)",[id,s,type]);
  for(const [id,p,s,sku,color,def] of [[red,product,store,'RED','red',true],[blue,product,store,'BLUE','blue',false],[foreign,otherProduct,otherStore,'RED','red',true]]){
   await db.query("INSERT INTO product_variant(id,product_id,store_id,sku,price_vnd,variant_values_json,variant_signature,is_default,status) VALUES($1,$2,$3,$4,100,$5,$6,$7,'ACTIVE')",[id,p,s,sku,{color},variantSignature({color}),def]);await db.query('INSERT INTO inventory(id,variant_id,store_id,quantity,reserved_quantity,version) VALUES($1,$2,$3,10,0,0)',[randomUUID(),id,s]);
  }
 });
 afterAll(async()=>{jest.restoreAllMocks();if(db?.isInitialized)await db.destroy();if(admin?.isInitialized){if(/^catalog_batch_[a-f0-9]{32}$/.test(schema))await admin.query('DROP SCHEMA '+schema+' CASCADE');await admin.destroy();}});
 test('swaps SKU and attribute combinations while retaining variant and inventory IDs',async()=>{
  const before=await db.query('SELECT id,variant_id,quantity FROM inventory ORDER BY id');const result=await service.updateProduct(product,input(),context,'swap');expect(result.version).toBe(1);expect(result.variants).toEqual(expect.arrayContaining([expect.objectContaining({id:red,sku:'BLUE',variant_values:{color:'blue'},price_vnd:100}),expect.objectContaining({id:blue,sku:'RED',variant_values:{color:'red'},price_vnd:200})]));expect(await db.query('SELECT id,variant_id,quantity FROM inventory ORDER BY id')).toEqual(before);expect(await db.query("SELECT id FROM product_variant WHERE sku LIKE 'catalog-stage:%' OR variant_signature LIKE 'catalog-stage:%'")).toEqual([]);
 });
 test('duplicate IDs fail before any version, audit or row can change',async()=>{
  const before=await rows();const body=input();body.variants[1].id=red;await expect(service.updateProduct(product,body,context,'duplicate-id')).rejects.toMatchObject({status:422,response:{code:'DUPLICATE_VARIANT_ID'}});expect(await rows()).toEqual(before);expect((await db.query('SELECT version FROM product WHERE id=$1',[product]))[0].version).toBe(0);
 });
 test('duplicate final attribute combinations are rejected without intermediate writes',async()=>{
  const before=await rows(),body=input();body.variants[1].variant_values={color:'blue'};await expect(service.updateProduct(product,body,context,'duplicate-combination')).rejects.toMatchObject({status:422,response:{code:'VARIANT_DUPLICATE'}});expect(await rows()).toEqual(before);
 });
 test('an ID belonging to a different Store cannot be parked or edited',async()=>{
  const before=await db.query('SELECT id,sku,variant_signature FROM product_variant ORDER BY id'),body=input();body.variants[1].id=foreign;await expect(service.updateProduct(product,body,context,'foreign')).rejects.toMatchObject({status:404});expect(await db.query('SELECT id,sku,variant_signature FROM product_variant ORDER BY id')).toEqual(before);
 });
 test('a conflict with another Product in the same Store rolls the whole batch back',async()=>{
  const another=randomUUID();await db.query("INSERT INTO product(id,store_id,product_type_id,title,attributes_json,status,moderation_status,version) VALUES($1,$2,$3,'Other','{\"color\":\"red\"}','ACTIVE','VISIBLE',0)",[another,store,type]);await db.query("INSERT INTO product_variant(id,product_id,store_id,sku,price_vnd,variant_values_json,variant_signature,is_default,status) VALUES($1,$2,$3,'TAKEN',1,'{}',$4,true,'ACTIVE')",[randomUUID(),another,store,variantSignature({})]);const before=await rows(),body=input();body.variants[1].sku='TAKEN';await expect(service.updateProduct(product,body,context,'sku-conflict')).rejects.toMatchObject({status:409,response:{code:'SKU_CONFLICT'}});expect(await rows()).toEqual(before);expect((await db.query('SELECT title,version FROM product WHERE id=$1',[product]))[0]).toEqual({title:'Original',version:0});
 });
 test('unique signature against an omitted row returns409 and restores all parked identities',async()=>{
  const before=await rows();await expect(service.updateProduct(product,input({variants:[{id:red,sku:'NEW',price_vnd:100,variant_values:{color:'blue'}}]}),context,'signature-conflict')).rejects.toMatchObject({status:409,response:{code:'VARIANT_DUPLICATE'}});expect(await rows()).toEqual(before);expect((await db.query('SELECT version FROM product WHERE id=$1',[product]))[0].version).toBe(0);
 });
 test('two concurrent version0 writes commit one final state and reject the obsolete write',async()=>{
  const outcomes=await Promise.allSettled([service.updateProduct(product,input(),context,'one'),service.updateProduct(product,input({title:'Another'}),context,'two')]);expect(outcomes.filter(r=>r.status==='fulfilled')).toHaveLength(1);const rejected=outcomes.find(r=>r.status==='rejected') as PromiseRejectedResult;expect(rejected.reason).toMatchObject({status:409,response:{code:'VERSION_CONFLICT'}});expect((await db.query('SELECT version FROM product WHERE id=$1',[product]))[0].version).toBe(1);expect((await rows()).some((r:any)=>r.sku.startsWith('catalog-stage:'))).toBe(false);
 });
 test('create collision also translates database identity errors without leaving orphan Product rows',async()=>{
  const before=await db.query('SELECT id FROM product ORDER BY id');await expect(service.createProduct({product_type_id:type,title:'Rejected',attributes:{color:'red'},variants:[{sku:'RED',price_vnd:1,variant_values:{color:'red'}}]},context,'create-conflict')).rejects.toMatchObject({status:409,response:{code:'SKU_CONFLICT'}});expect(await db.query('SELECT id FROM product ORDER BY id')).toEqual(before);
 });
 test.each([['missing',{}],['choice',{color:'green'}],['type',{color:1}],['blank',{color:' '}],['unknown',{color:'red',serial:'x'}]])('new Product rejects invalid variant axes (%s) with no orphan writes',async(_name,values)=>{
  const before=await db.query('SELECT id FROM product ORDER BY id');await expect(service.createProduct({product_type_id:type,title:'Invalid',attributes:{color:'red'},variants:[{sku:'AXIS-INVALID',price_vnd:1,variant_values:values as any}]},context,'invalid-axes')).rejects.toMatchObject({status:422,response:{code:'INVALID_VARIANT_ATTRIBUTES'}});expect(await db.query('SELECT id FROM product ORDER BY id')).toEqual(before);
 });
 test('adding a Variant enforces axes before inserting inventory, touching version or publishing an event',async()=>{
  const before=await rows(),inventory=await db.query('SELECT id FROM inventory ORDER BY id');await expect(service.createVariant(product,{sku:'NO-COLOR',price_vnd:1,variant_values:{}},context,'add-invalid')).rejects.toMatchObject({status:422,response:{code:'INVALID_VARIANT_ATTRIBUTES'}});expect(await rows()).toEqual(before);expect(await db.query('SELECT id FROM inventory ORDER BY id')).toEqual(inventory);expect((await db.query('SELECT version FROM product WHERE id=$1',[product]))[0].version).toBe(0);
 });
 test('replacement payload validates before changing Product metadata or parking identities',async()=>{
  const before=await rows(),body=input();body.variants[0].variant_values={} as any;await expect(service.updateProduct(product,body,context,'update-invalid')).rejects.toMatchObject({status:422,response:{code:'INVALID_VARIANT_ATTRIBUTES'}});expect(await rows()).toEqual(before);expect((await db.query('SELECT title,version FROM product WHERE id=$1',[product]))[0]).toEqual({title:'Original',version:0});
 });
 test('a Product type change revalidates existing sellable Variant values',async()=>{
  const target=randomUUID();await db.query("INSERT INTO product_type(id,category_id,name,status,version) VALUES($1,$2,'Descriptors only','ACTIVE',0)",[target,category]);await db.query("INSERT INTO attribute_definition(id,product_type_id,code,name,data_type,required,variant_factor) VALUES($1,$2,'color','Color descriptor','STRING',true,false)",[randomUUID(),target]);await expect(service.updateProduct(product,{expected_version:0,product_type_id:target},context,'type-change')).rejects.toMatchObject({status:422,response:{code:'INVALID_VARIANT_ATTRIBUTES'}});expect((await db.query('SELECT product_type_id,version FROM product WHERE id=$1',[product]))[0]).toEqual({product_type_id:type,version:0});
 });
 test('publishing malformed historical Variant data is refused without rewriting the historical row',async()=>{
  await db.query("UPDATE product SET status='DRAFT' WHERE id=$1",[product]);await db.query("UPDATE product_variant SET variant_values_json='{}',variant_signature='historical-missing' WHERE id=$1",[red]);const before=await rows();await expect(service.updateProduct(product,{expected_version:0,status:'ACTIVE'},context,'publish')).rejects.toMatchObject({status:422,response:{code:'INVALID_VARIANT_ATTRIBUTES'}});expect(await rows()).toEqual(before);expect((await db.query('SELECT status,version FROM product WHERE id=$1',[product]))[0]).toEqual({status:'DRAFT',version:0});
 });
 test('Seller can retire a malformed historical row but must repair it before reopening it',async()=>{
  await db.query("UPDATE product_variant SET variant_values_json='{}',variant_signature='historical-missing' WHERE id=$1",[red]);const retired=input({variants:[{id:red,sku:'RED',price_vnd:100,variant_values:{},status:'STOPPED'},{id:blue,sku:'BLUE',price_vnd:100,variant_values:{color:'blue'},status:'ACTIVE'}]});const stopped=await service.updateProduct(product,retired,context,'retire');expect(stopped.variants?.find(v=>v.id===red)).toMatchObject({status:'STOPPED',variant_values:{}});await expect(service.updateProduct(product,{expected_version:1,variants:[{...retired.variants[0],status:'ACTIVE'},retired.variants[1]]},context,'reopen')).rejects.toMatchObject({status:422,response:{code:'INVALID_VARIANT_ATTRIBUTES'}});expect((await db.query('SELECT status FROM product_variant WHERE id=$1',[red]))[0].status).toBe('STOPPED');
 });
 test('retired taxonomy cannot trap a Seller into keeping an unwanted public listing active',async()=>{
  const before=await rows();await db.query("UPDATE product_type SET status='STOPPED' WHERE id=$1",[type]);const result=await service.updateProduct(product,{expected_version:0,status:'STOPPED'},context,'stop-inactive-type');expect(result.status).toBe('STOPPED');expect(await rows()).toEqual(before);
 });
 test('optional numeric zero and boolean false persist without coercion',async()=>{
  for(const [code,kind] of [['width','NUMBER'],['coated','BOOLEAN']])await db.query('INSERT INTO attribute_definition(id,product_type_id,code,name,data_type,required,variant_factor) VALUES($1,$2,$3,$3,$4,false,true)',[randomUUID(),type,code,kind]);const result=await service.createVariant(product,{sku:'TYPED',price_vnd:1,variant_values:{color:'red',width:0,coated:false}},context,'typed');expect(result.variant_values).toEqual({color:'red',width:0,coated:false});
 });
});

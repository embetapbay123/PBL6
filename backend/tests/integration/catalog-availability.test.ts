import 'reflect-metadata';
import {randomUUID} from 'node:crypto';
import {readdirSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {DataSource} from 'typeorm';
import {CatalogRepository} from '../../catalog-service/src/catalog/catalog.repository';
import {InventoryService} from '../../catalog-service/src/inventory/inventory.service';
import {schemaErrors} from '../../shared/src/contract-validation';
import bundle from '../../shared/src/contracts.runtime.generated.json';
const suite=process.env.M1_DATABASE_URL?describe:describe.skip;
suite('public catalog availability reads real stock and reservations in isolated PostgreSQL',()=>{
 let root:DataSource,db:DataSource,schema:string,repo:CatalogRepository,inventory:InventoryService;
 const store=randomUUID(),other=randomUUID(),type=randomUUID(),category=randomUUID(),product=randomUUID(),foreignProduct=randomUUID(),variants=Array.from({length:4},()=>randomUUID());
 beforeAll(async()=>{
  root=await new DataSource({type:'postgres',url:process.env.M1_DATABASE_URL}).initialize();schema='catalog_available_'+randomUUID().replace(/-/g,'');await root.query('CREATE SCHEMA '+schema);db=await new DataSource({type:'postgres',url:process.env.M1_DATABASE_URL,extra:{options:'-csearch_path='+schema+',public'}}).initialize();
  const dir=resolve(__dirname,'../../catalog-service/migrations');for(const file of readdirSync(dir).filter(f=>f.endsWith('.sql')).sort())await db.query(readFileSync(resolve(dir,file),'utf8'));repo=new CatalogRepository(db.manager);inventory=new InventoryService(undefined,db);
  await db.query("INSERT INTO category(id,name,slug,status) VALUES($1,'Fixture','fixture','ACTIVE')",[category]);await db.query("INSERT INTO product_type(id,category_id,name,status) VALUES($1,$2,'Fixture','ACTIVE')",[type,category]);
  await db.query("INSERT INTO attribute_definition(product_type_id,code,name,data_type,required,variant_factor) VALUES($1,'size','Kích cỡ','STRING',false,true),($1,'color','Màu sắc','STRING',false,true),($1,'material','Chất liệu','STRING',false,false)",[type]);
  for(const [id,owner] of [[product,store],[foreignProduct,other]])await db.query("INSERT INTO product(id,store_id,product_type_id,title,status,moderation_status) VALUES($1,$2,$3,'Áo','ACTIVE','VISIBLE')",[id,owner,type]);
  for(const [index,id] of variants.entries()){await db.query("INSERT INTO product_variant(id,product_id,store_id,sku,price_vnd,variant_values_json,variant_signature,is_default,status) VALUES($1,$2,$3,$4,100000,$5,$4,$6,'ACTIVE')",[id,index===3?foreignProduct:product,index===3?other:store,'OPAQUE-'+index,{color:'Đỏ',size:String(index)},index===0]);if(index!==2)await db.query('INSERT INTO inventory(variant_id,store_id,quantity,reserved_quantity) VALUES($1,$2,$3,0)',[id,index===3?other:store,index===0?5:index===1?1:99]);}
 });
 afterAll(async()=>{if(db?.isInitialized)await db.destroy();if(root?.isInitialized){if(/^catalog_available_[a-f0-9]{32}$/.test(schema))await root.query('DROP SCHEMA '+schema+' CASCADE');await root.destroy();}});
 async function read(){const page=await repo.page([store],{page:1,size:20});expect(page.items).toHaveLength(1);return page.items[0];}
 test('public page returns sellable units, not raw reserved/quantity, with only configured axis labels',async()=>{
  const p=await read();expect(p.variant_axes).toEqual([{code:'color',name:'Màu sắc'},{code:'size',name:'Kích cỡ'}]);expect(p.variants).toHaveLength(3);expect(p.variants!.find(v=>v.id===variants[0])?.available_quantity).toBe(5);expect(p.variants!.find(v=>v.id===variants[1])?.available_quantity).toBe(1);expect(p.variants!.find(v=>v.id===variants[2])?.available_quantity).toBe(0);
  for(const v of p.variants!){expect(v).not.toHaveProperty('quantity');expect(v).not.toHaveProperty('reserved_quantity');expect(v.id).not.toBe(variants[3]);}
  expect(schemaErrors(p,bundle.operations.getProduct.responses['200'])).toEqual([]);
 });
 test('reserve, release and consume change public availability without manufacturing a new balance',async()=>{
  const order=randomUUID(),input={operation_id:randomUUID(),purchase_group_id:order,expires_at:new Date(Date.now()+600000).toISOString(),items:[{variant_id:variants[0],store_id:store,order_id:order,quantity:3}]};const held=await inventory.reserve(input);
  expect((await read()).variants!.find(v=>v.id===variants[0])?.available_quantity).toBe(2);
  await inventory.release({operation_id:randomUUID(),order_id:order,reservation_ids:held.reservations.map(r=>r.id)});expect((await read()).variants!.find(v=>v.id===variants[0])?.available_quantity).toBe(5);
  const second=randomUUID(),all=await inventory.reserve({...input,operation_id:randomUUID(),purchase_group_id:second,items:[{...input.items[0],order_id:second,quantity:5}]});expect((await read()).variants!.find(v=>v.id===variants[0])?.available_quantity).toBe(0);
  await inventory.consume({operation_id:randomUUID(),order_id:second,reservation_ids:all.reservations.map(r=>r.id)});expect((await read()).variants!.find(v=>v.id===variants[0])?.available_quantity).toBe(0);
  expect((await db.query('SELECT quantity,reserved_quantity FROM inventory WHERE variant_id=$1',[variants[0]]))[0]).toMatchObject({quantity:0,reserved_quantity:0});
 });
 test('public projection never exposes a stopped variant or stock belonging to another product or Store',async()=>{
  await db.query("UPDATE product_variant SET status='STOPPED' WHERE id=$1",[variants[1]]);const p=await read();expect(p.variants!.map(v=>v.id)).not.toContain(variants[1]);expect(p.variants!.map(v=>v.id)).not.toContain(variants[3]);expect((await repo.page([other],{page:1,size:20})).items[0].variants?.[0].available_quantity).toBe(99);
 });
});

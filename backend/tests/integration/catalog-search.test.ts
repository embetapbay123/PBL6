import 'reflect-metadata';
import {randomUUID} from 'node:crypto';
import {readdirSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {DataSource} from 'typeorm';
import {CatalogRepository} from '../../catalog-service/src/catalog/catalog.repository';
const suite=process.env.M1_DATABASE_URL?describe:describe.skip;
suite('whole Store Vietnamese search with isolated PostgreSQL',()=>{
 let root:DataSource,db:DataSource,schema:string,repo:CatalogRepository;
 const store=randomUUID(),foreign=randomUUID(),category=randomUUID(),type=randomUUID(),target=randomUUID();
 beforeAll(async()=>{
  root=await new DataSource({type:'postgres',url:process.env.M1_DATABASE_URL}).initialize();schema='search_fix_'+randomUUID().replace(/-/g,'');await root.query('CREATE SCHEMA '+schema);
  db=await new DataSource({type:'postgres',url:process.env.M1_DATABASE_URL,extra:{options:'-csearch_path='+schema+',public'}}).initialize();
  const dir=resolve(__dirname,'../../catalog-service/migrations');for(const f of readdirSync(dir).filter(f=>f.endsWith('.sql')).sort())await db.query(readFileSync(resolve(dir,f),'utf8'));
  repo=new CatalogRepository(db.manager);await db.query("INSERT INTO category(id,name,slug,status) VALUES($1,'Kiểm thử','search-test','ACTIVE')",[category]);await db.query("INSERT INTO product_type(id,category_id,name,status) VALUES($1,$2,'Điện tử','ACTIVE')",[type,category]);
  await db.query("INSERT INTO product(store_id,product_type_id,title,status,moderation_status) SELECT $1,$2,'Món khác '||n,'ACTIVE','VISIBLE' FROM generate_series(1,300) n",[store,type]);
  for(const [owner,title,status,pid] of [[store,'Điện thoại Đỏ','ACTIVE',target],[store,'Điện thoại Đỏ'.normalize('NFD'),'ACTIVE',randomUUID()],[store,'Điện thoại Đỏ','STOPPED',randomUUID()],[foreign,'Điện thoại Đỏ','ACTIVE',randomUUID()],[store,'Giảm 20%_thật','ACTIVE',randomUUID()]] as const)await db.query("INSERT INTO product(id,store_id,product_type_id,title,status,moderation_status) VALUES($1,$2,$3,$4,$5,'VISIBLE')",[pid,owner,type,title,status]);
  await db.query("INSERT INTO product_variant(product_id,store_id,sku,price_vnd,variant_values_json,variant_signature,is_default,status) VALUES($1,$2,'009264',100500,'{}','default',true,'ACTIVE')",[target,store]);
 });
 afterAll(async()=>{if(db?.isInitialized)await db.destroy();if(root?.isInitialized){if(/^search_fix_[a-f0-9]{32}$/.test(schema))await root.query('DROP SCHEMA '+schema+' CASCADE');await root.destroy();}});
 test('non-accented, uppercase, Đ and decomposed Unicode find the same public products',async()=>{
  for(const q of ['dien thoai do','ĐIỆN THOẠI ĐỎ','điện thoại đỏ'.normalize('NFD')]){const page=await repo.page([store],{page:1,size:20,q});expect(page.total).toBe(2);expect(page.items).toHaveLength(2);expect(page.items.every((p:any)=>p.store_id===store&&p.status==='ACTIVE')).toBe(true);}
 });
 test('management search filters before count/page, reaches beyond300 rows, and keeps Store scope',async()=>{
  const result=await repo.pageOwnStore(store,1,20,{q:'009264'});expect(result.total).toBe(1);expect(result.items[0].id).toBe(target);expect(result.items[0].variants?.[0]?.sku).toBe('009264');
  const stopped=await repo.pageOwnStore(store,1,20,{q:'dien thoai',status:'STOPPED'});expect(stopped.total).toBe(1);expect(stopped.items).toHaveLength(1);
  expect((await repo.pageOwnStore(foreign,1,20,{q:'009264'})).total).toBe(0);const emptyPage=await repo.pageOwnStore(store,2,20,{q:'009264'});expect(emptyPage).toMatchObject({items:[],total:1,page:2});
 });
 test('LIKE metacharacters and SQL syntax are literal user input',async()=>{
  expect((await repo.page([store],{page:1,size:20,q:'%_'})).total).toBe(1);expect((await repo.pageOwnStore(store,1,20,{q:"' OR 1=1 --"})).total).toBe(0);
 });
 test('sort and total remain stable while matching all Store products',async()=>{
  const a=await repo.pageOwnStore(store,1,20,{q:'mon khac'}),b=await repo.pageOwnStore(store,2,20,{q:'mon khac'});expect(a.total).toBe(300);expect(b.total).toBe(300);expect(new Set([...a.items,...b.items].map((p:any)=>p.id)).size).toBe(40);
 });
});

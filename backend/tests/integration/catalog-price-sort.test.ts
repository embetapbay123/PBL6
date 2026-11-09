import 'reflect-metadata';
import {randomUUID} from 'node:crypto';
import {readdirSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {DataSource} from 'typeorm';
import {CatalogRepository} from '../../catalog-service/src/catalog/catalog.repository';

const suite=process.env.M1_DATABASE_URL?describe:describe.skip;
suite('S01: catalog price sort synchronizes with in-stock variants and filter range in isolated PostgreSQL',()=>{
  let root:DataSource,db:DataSource,schema:string,repo:CatalogRepository;
  const store=randomUUID(),category=randomUUID(),type=randomUUID();
  const prodA=randomUUID(),prodB=randomUUID(),prodC=randomUUID(),prodD=randomUUID();

  beforeAll(async()=>{
    root=await new DataSource({type:'postgres',url:process.env.M1_DATABASE_URL}).initialize();
    schema='price_sort_'+randomUUID().replace(/-/g,'');
    await root.query('CREATE SCHEMA '+schema);
    db=await new DataSource({type:'postgres',url:process.env.M1_DATABASE_URL,extra:{options:'-csearch_path='+schema+',public'}}).initialize();
    const dir=resolve(__dirname,'../../catalog-service/migrations');
    for(const f of readdirSync(dir).filter(f=>f.endsWith('.sql')).sort()) {
      await db.query(readFileSync(resolve(dir,f),'utf8'));
    }
    repo=new CatalogRepository(db.manager);

    await db.query("INSERT INTO category(id,name,slug,status) VALUES($1,'Thời trang','thoi-trang','ACTIVE')",[category]);
    await db.query("INSERT INTO product_type(id,category_id,name,status) VALUES($1,$2,'Áo','ACTIVE')",[type,category]);

    // Product A: 100k (out of stock), 180k (in stock)
    await db.query("INSERT INTO product(id,store_id,product_type_id,title,status,moderation_status) VALUES($1,$2,$3,'Áo A','ACTIVE','VISIBLE')",[prodA,store,type]);
    const vA1=randomUUID(), vA2=randomUUID();
    await db.query("INSERT INTO product_variant(id,product_id,store_id,sku,price_vnd,variant_values_json,variant_signature,is_default,status) VALUES($1,$2,$3,'A1',100000,'{}','A1',true,'ACTIVE')",[vA1,prodA,store]);
    await db.query("INSERT INTO product_variant(id,product_id,store_id,sku,price_vnd,variant_values_json,variant_signature,is_default,status) VALUES($1,$2,$3,'A2',180000,'{}','A2',false,'ACTIVE')",[vA2,prodA,store]);
    await db.query("INSERT INTO inventory(variant_id,store_id,quantity,reserved_quantity) VALUES($1,$2,0,0)",[vA1,store]);
    await db.query("INSERT INTO inventory(variant_id,store_id,quantity,reserved_quantity) VALUES($1,$2,5,0)",[vA2,store]);

    // Product B: 150k (in stock)
    await db.query("INSERT INTO product(id,store_id,product_type_id,title,status,moderation_status) VALUES($1,$2,$3,'Áo B','ACTIVE','VISIBLE')",[prodB,store,type]);
    const vB1=randomUUID();
    await db.query("INSERT INTO product_variant(id,product_id,store_id,sku,price_vnd,variant_values_json,variant_signature,is_default,status) VALUES($1,$2,$3,'B1',150000,'{}','B1',true,'ACTIVE')",[vB1,prodB,store]);
    await db.query("INSERT INTO inventory(variant_id,store_id,quantity,reserved_quantity) VALUES($1,$2,5,0)",[vB1,store]);

    // Product C: 300k (in stock)
    await db.query("INSERT INTO product(id,store_id,product_type_id,title,status,moderation_status) VALUES($1,$2,$3,'Áo C','ACTIVE','VISIBLE')",[prodC,store,type]);
    const vC1=randomUUID();
    await db.query("INSERT INTO product_variant(id,product_id,store_id,sku,price_vnd,variant_values_json,variant_signature,is_default,status) VALUES($1,$2,$3,'C1',300000,'{}','C1',true,'ACTIVE')",[vC1,prodC,store]);
    await db.query("INSERT INTO inventory(variant_id,store_id,quantity,reserved_quantity) VALUES($1,$2,5,0)",[vC1,store]);

    // Product D: 50k (out of stock entirely)
    await db.query("INSERT INTO product(id,store_id,product_type_id,title,status,moderation_status) VALUES($1,$2,$3,'Áo D','ACTIVE','VISIBLE')",[prodD,store,type]);
    const vD1=randomUUID();
    await db.query("INSERT INTO product_variant(id,product_id,store_id,sku,price_vnd,variant_values_json,variant_signature,is_default,status) VALUES($1,$2,$3,'D1',50000,'{}','D1',true,'ACTIVE')",[vD1,prodD,store]);
    await db.query("INSERT INTO inventory(variant_id,store_id,quantity,reserved_quantity) VALUES($1,$2,0,0)",[vD1,store]);
  });

  afterAll(async()=>{
    if(db?.isInitialized)await db.destroy();
    if(root?.isInitialized){
      if(/^price_sort_[a-f0-9]{32}$/.test(schema))await root.query('DROP SCHEMA '+schema+' CASCADE');
      await root.destroy();
    }
  });

  test('price_asc with filter 140k-200k orders Product B (150k) before Product A (180k), ignoring out-of-stock A1 (100k)',async()=>{
    const res = await repo.page([store],{page:1,size:20,min_price_vnd:140000,max_price_vnd:200000,sort:'price_asc'});
    expect(res.total).toBe(2);
    expect(res.items.map(p=>p.id)).toEqual([prodB,prodA]);
  });

  test('price_desc with filter 140k-200k orders Product A (180k) before Product B (150k), keeping representative min_price in range',async()=>{
    const res = await repo.page([store],{page:1,size:20,min_price_vnd:140000,max_price_vnd:200000,sort:'price_desc'});
    expect(res.total).toBe(2);
    expect(res.items.map(p=>p.id)).toEqual([prodA,prodB]);
  });

  test('without price filter, price_asc orders D (fallback 50k) -> B (150k) -> A (in-stock 180k) -> C (300k)',async()=>{
    const res = await repo.page([store],{page:1,size:20,sort:'price_asc'});
    expect(res.total).toBe(4);
    expect(res.items.map(p=>p.id)).toEqual([prodD,prodB,prodA,prodC]);
  });
});

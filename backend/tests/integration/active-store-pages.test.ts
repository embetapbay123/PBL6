import 'reflect-metadata';
import {randomUUID} from 'node:crypto';
import {readdirSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {DataSource} from 'typeorm';
import {StoreRepository} from '../../identity-store-service/src/store/store.repository';
import {InternalClients} from '../../shared/src/internal-clients';

const suite=process.env.M3_DATABASE_URL?describe:describe.skip;
suite('Active Store cursor pages in isolated M3 PostgreSQL',()=>{
  let root:DataSource,db:DataSource,schema:string,repository:StoreRepository;
  beforeAll(async()=>{
    root=await new DataSource({type:'postgres',url:process.env.M3_DATABASE_URL}).initialize();
    schema='store_pages_'+randomUUID().replace(/-/g,'');await root.query('CREATE SCHEMA '+schema);
    db=await new DataSource({type:'postgres',url:process.env.M3_DATABASE_URL,extra:{options:'-csearch_path='+schema+',public'}}).initialize();
    const dir=resolve(__dirname,'../../identity-store-service/migrations');
    for(const f of readdirSync(dir).filter(f=>f.endsWith('.sql')).sort())await db.query(readFileSync(resolve(dir,f),'utf8'));
    repository=new StoreRepository(db);
    const owner=randomUUID();await db.query(`INSERT INTO "user"(id,email,password_hash,status) VALUES($1,'store-pages@example.test','not-a-credential','ACTIVE')`,[owner]);
    await db.query(`WITH applications AS (
      INSERT INTO store_application(id,applicant_user_id,proposed_name,contact,status)
      SELECT gen_random_uuid(),$1,'Page Store '||n,'fixture','APPROVED' FROM generate_series(1,207) n RETURNING id,proposed_name
    ) INSERT INTO store(id,application_id,name,slug,contact,shipping_fee_vnd,status)
      SELECT gen_random_uuid(),id,proposed_name,id::text,'fixture',0,CASE WHEN proposed_name IN ('Page Store 206','Page Store 207') THEN 'LOCKED' ELSE 'ACTIVE' END FROM applications`,[owner]);
  });
  afterAll(async()=>{
    if(db?.isInitialized)await db.destroy();
    if(root?.isInitialized){if(/^store_pages_[a-f0-9]{32}$/.test(schema))await root.query('DROP SCHEMA '+schema+' CASCADE');await root.destroy();}
  });
  test('205 ACTIVE Stores occupy three ordered, disjoint pages; locked Stores never appear',async()=>{
    const expected=(await db.query(`SELECT id FROM store WHERE status='ACTIVE' ORDER BY id`)).map((r:any)=>r.id);
    const one=await repository.listActiveStoreIds({size:100});expect(one.ids).toHaveLength(100);expect(one.next_after).toBe(one.ids[99]);
    const two=await repository.listActiveStoreIds({size:100,after:one.next_after!});expect(two.ids).toHaveLength(100);
    const three=await repository.listActiveStoreIds({size:100,after:two.next_after!});expect(three.ids).toHaveLength(5);expect(three.next_after).toBeNull();
    expect([...one.ids,...two.ids,...three.ids]).toEqual(expected);
    expect(await repository.listActiveStoreIds({size:100,after:three.ids[4]})).toEqual({ids:[],next_after:null});
  });
  test('small pages and the legacy unpaged response contain the same complete allowlist',async()=>{
    const legacy=await repository.listActiveStoreIds();expect(legacy.ids).toHaveLength(205);expect(legacy).not.toHaveProperty('next_after');
    const first=await repository.listActiveStoreIds({size:1});expect(first.ids).toEqual([legacy.ids[0]]);expect(first.next_after).toBe(legacy.ids[0]);
  });
  test('real SQL pages consumed through the shared client do not drop Stores after the first100',async()=>{
    const urls:string[]=[];
    const transport={request:async<T>(url:string)=>{
      urls.push(url);const q=new URL(url).searchParams;
      return await repository.listActiveStoreIds({size:Number(q.get('size')),after:q.get('after')??undefined}) as T;
    }};
    const client=new InternalClients('M1','test-only',{M1:'',M2:'',M3:'http://identity'},transport);
    expect(await client.call('ActiveStores',undefined,'sql-pages')).toEqual(await repository.listActiveStoreIds());expect(urls).toHaveLength(3);
  });
  test('a Store locked before reading its page is excluded from that live page',async()=>{
    const first=await repository.listActiveStoreIds({size:100});
    const [target]=await db.query(`SELECT id FROM store WHERE status='ACTIVE' AND id>$1 ORDER BY id LIMIT 1`,[first.next_after]);
    await db.query(`UPDATE store SET status='LOCKED' WHERE id=$1`,[target.id]);
    try{const next=await repository.listActiveStoreIds({size:100,after:first.next_after!});expect(next.ids).not.toContain(target.id);expect(next.ids).toHaveLength(100);}
    finally{await db.query(`UPDATE store SET status='ACTIVE' WHERE id=$1`,[target.id]);}
  });
});

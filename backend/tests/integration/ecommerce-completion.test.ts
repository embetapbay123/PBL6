import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { readFileSync,readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { DataSource } from 'typeorm';
import { CatalogService } from '../../catalog-service/src/catalog/catalog.service';
import { CatalogManagementService } from '../../catalog-service/src/catalog/catalog-management.service';
import { ReviewService } from '../../catalog-service/src/review/review.service';
import { ReviewRepository } from '../../catalog-service/src/review/review.repository';

(process.env.M1_DATABASE_URL?describe:describe.skip)('Ecommerce lifecycle and Review transaction controls',()=>{
  let admin:DataSource,db:DataSource,schema:string,service:CatalogService,management:CatalogManagementService;
  const store=randomUUID(),otherStore=randomUUID(),actor=randomUUID(),customer=randomUUID(),type=randomUUID(),category=randomUUID();
  const owner={user_id:actor,store_membership:{store_id:store,role:'OWNER',permissions:[]}};
  beforeAll(async()=>{
    const url=process.env.M1_DATABASE_URL!;schema='completion_'+randomUUID().replace(/-/g,'');
    admin=new DataSource({type:'postgres',url});await admin.initialize();await admin.query('CREATE SCHEMA '+schema);
    db=new DataSource({type:'postgres',url,extra:{options:'-csearch_path='+schema+',public',statement_timeout:10000}});await db.initialize();
    const folder=resolve(__dirname,'../../catalog-service/migrations');
    for(const f of readdirSync(folder).filter(f=>f.endsWith('.sql')).sort())await db.query(readFileSync(resolve(folder,f),'utf8'));
    await db.query("INSERT INTO category(id,name,slug,status) VALUES($1,'Test','test','ACTIVE')",[category]);
    await db.query("INSERT INTO product_type(id,category_id,name,status) VALUES($1,$2,'Type','ACTIVE')",[type,category]);
    service=new CatalogService(db);jest.spyOn(service as any,'stores').mockResolvedValue([store]);
    management=new CatalogManagementService(db,async()=>[store]);
  });
  afterAll(async()=>{if(db?.isInitialized)await db.destroy();if(admin?.isInitialized){if(/^completion_[a-f0-9]{32}$/.test(schema))await admin.query('DROP SCHEMA '+schema+' CASCADE');await admin.destroy()}});
  const body=()=>({product_type_id:type,title:'Draft',attributes:{},status:'DRAFT' as const});
  async function reviewFixture(){
    const p=await service.createProduct(body(),owner,'review-fixture');
    const item=randomUUID();
    const lookup=jest.fn(async()=>({eligible:true,product_id:p.id!}));
    const reviews=new ReviewService(new ReviewRepository(db.manager),db,lookup);
    return {p,item,lookup,reviews};
  }
  test('concurrent/lost-ACK Product create reuses identity, audit and outbox exactly once',async()=>{
    const input=body(),operation=randomUUID();
    const result=await Promise.all([service.createProduct(input,owner,'one',operation),service.createProduct(input,owner,'two',operation)]);
    expect(result[0].id).toBe(result[1].id);
    expect(await db.query("SELECT id FROM m1_audit WHERE target_id=$1 AND action='CREATE'",[result[0].id])).toHaveLength(1);
    expect(await db.query("SELECT id FROM outbox WHERE payload->>'product_id'=$1",[result[0].id])).toHaveLength(1);
    await expect(service.createProduct({...input,title:'different'},owner,'three',operation)).rejects.toMatchObject({status:409});
    await expect(service.createProduct(input,{...owner,user_id:randomUUID()},'four',operation)).rejects.toMatchObject({status:409});
  });
  test('management read reaches arbitrary draft/hidden/stopped rows and rejects another Store',async()=>{
    const p=await service.createProduct(body(),owner,'scope');
    await db.query("UPDATE product SET status='STOPPED',moderation_status='HIDDEN' WHERE id=$1",[p.id]);
    expect(await management.own(p.id!,owner)).toMatchObject({status:'STOPPED',moderation_status:'HIDDEN'});
    await expect(management.own(p.id!,{store_membership:{role:'OWNER',store_id:otherStore}})).rejects.toMatchObject({status:404});
    await expect(management.own(p.id!,{store_membership:{role:'SELLER',store_id:store,permissions:[]}})).rejects.toMatchObject({status:403});
    await expect(management.availability(p.id!,'hidden')).rejects.toMatchObject({status:404});
  });
  test('failed publication rolls back status/version/event, then Variant and image replay once',async()=>{
    const p=await service.createProduct(body(),owner,'publication');
    await expect(service.updateProduct(p.id!,{status:'ACTIVE',expected_version:0},owner,'invalid')).rejects.toMatchObject({status:422});
    expect(await management.own(p.id!,owner)).toMatchObject({status:'DRAFT',version:0});
    const operation=randomUUID(),input={sku:'SKU-'+randomUUID(),price_vnd:100,variant_values:{}};
    const variants=await Promise.all([service.createVariant(p.id!,input,owner,'v1',operation),service.createVariant(p.id!,input,owner,'v2',operation)]);
    expect(variants[0].id).toBe(variants[1].id);
    const imageKey=randomUUID(),image={image_url:'https://example.invalid/test.png'};
    const images=await Promise.all([service.addProductImage(p.id!,image,owner,'i1',imageKey),service.addProductImage(p.id!,image,owner,'i2',imageKey)]);
    expect(images[0].id).toBe(images[1].id);
    const current=await management.own(p.id!,owner);
    const active=await service.updateProduct(p.id!,{status:'ACTIVE',expected_version:current.version!},owner,'active');
    await db.query('UPDATE inventory SET quantity=7,reserved_quantity=2 WHERE variant_id=$1',[variants[0].id]);
    const publicStock=await management.availability(p.id!,'public');
    expect(publicStock.items).toEqual([{variant_id:variants[0].id,available_quantity:5}]);
    expect(publicStock).not.toHaveProperty('reserved_quantity');
    await service.updateProduct(p.id!,{status:'STOPPED',expected_version:active.version!},owner,'stop');
    const stopped=await management.own(p.id!,owner);
    expect(await service.updateProduct(p.id!,{status:'ACTIVE',expected_version:stopped.version!},owner,'resume')).toMatchObject({status:'ACTIVE'});
  });
  test('authoritative eligibility drives Review creation; retries create one Review and audit',async()=>{
    const f=await reviewFixture(),body={order_item_id:f.item,rating:5,body:'Good'};
    const rows=await Promise.all([f.reviews.createReview(body,{user_id:customer},'r1'),f.reviews.createReview(body,{user_id:customer},'r2')]);
    expect(rows[0].id).toBe(rows[1].id);expect(f.lookup).toHaveBeenCalledWith({order_item_id:f.item,customer_user_id:customer});
    expect(await db.query('SELECT id FROM review_audit WHERE review_id=$1',[rows[0].id])).toHaveLength(1);
    await expect(f.reviews.createReview({...body,rating:4},{user_id:customer},'r3')).rejects.toMatchObject({status:409});
    f.lookup.mockResolvedValueOnce({eligible:false} as any);
    await expect(f.reviews.createReview({...body,order_item_id:randomUUID()},{user_id:randomUUID()},'foreign')).rejects.toMatchObject({status:409});
  });
  test('concurrent author edits accept one current version; foreign author cannot edit',async()=>{
    const f=await reviewFixture(),row=await f.reviews.createReview({order_item_id:f.item,rating:5},{user_id:customer},'edit-create');
    const results=await Promise.allSettled([f.reviews.updateReview(row.id!,{rating:3,expected_version:0},{user_id:customer},'edit1'),f.reviews.updateReview(row.id!,{rating:4,expected_version:0},{user_id:customer},'edit2')]);
    expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
    expect((results.find(r=>r.status==='rejected') as PromiseRejectedResult).reason).toMatchObject({status:409});
    await expect(f.reviews.updateReview(row.id!,{rating:1,expected_version:1},{user_id:randomUUID()},'foreign')).rejects.toMatchObject({status:404});
  });
  test('an audit failure rolls back Review updates and creation',async()=>{
    const f=await reviewFixture(),row=await f.reviews.createReview({order_item_id:f.item,rating:5},{user_id:customer},'audit-create');
    await db.query("CREATE FUNCTION reject_review_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'audit failed'; END $$");
    await db.query('CREATE TRIGGER reject_review_audit BEFORE INSERT ON review_audit FOR EACH ROW EXECUTE FUNCTION reject_review_audit()');
    try{
      await expect(f.reviews.updateReview(row.id!,{rating:1,expected_version:0},{user_id:customer},'audit-update')).rejects.toThrow();
      expect((await db.query('SELECT rating,version FROM review WHERE id=$1',[row.id]))[0]).toEqual({rating:5,version:0});
      const item=randomUUID();await expect(f.reviews.createReview({order_item_id:item,rating:4},{user_id:customer},'audit-new')).rejects.toThrow();
      expect(await db.query('SELECT id FROM review WHERE order_item_id=$1',[item])).toEqual([]);
    }finally{await db.query('DROP TRIGGER reject_review_audit ON review_audit');await db.query('DROP FUNCTION reject_review_audit()')}
    await db.query("UPDATE review SET status='HIDDEN' WHERE id=$1",[row.id]);
    const page=await f.reviews.listProductReviews(f.p.id!,{});expect(page.summary?.count).toBe(0);
  });
});

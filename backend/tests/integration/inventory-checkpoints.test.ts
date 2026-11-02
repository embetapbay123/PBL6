import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DataSource } from 'typeorm';
import { InventoryService } from '../../catalog-service/src/inventory/inventory.service';

// A unique M1 schema: never alter seeded/demo balances. The service uses real transactions.
const suite = process.env.M1_DATABASE_URL ? describe : describe.skip;
suite('commercial inventory metadata and movement checkpoints', () => {
  let admin: DataSource, db: DataSource, schema: string, service: InventoryService;
  const store = randomUUID(), otherStore = randomUUID(), actor = randomUUID(), type = randomUUID();
  const context = {user_id: actor, store_membership: {store_id: store, role: 'SELLER', permissions: ['inventory.store.read_adjust']}};
  const variants: string[] = [];
  let target: string;
  beforeAll(async () => {
    admin = await new DataSource({type: 'postgres', url: process.env.M1_DATABASE_URL}).initialize();
    schema = 'inventory_fix_' + randomUUID().replace(/-/g, '');
    await admin.query('CREATE SCHEMA ' + schema);
    db = await new DataSource({type: 'postgres', url: process.env.M1_DATABASE_URL, extra: {options: '-csearch_path=' + schema + ',public', statement_timeout: 10000}}).initialize();
    const dir = resolve(__dirname, '../../catalog-service/migrations');
    for (const file of readdirSync(dir).filter(f => f.endsWith('.sql')).sort()) await db.query(readFileSync(resolve(dir, file), 'utf8'));
    const category = randomUUID();
    await db.query("INSERT INTO category(id,name,slug,status) VALUES($1,'Test','test','ACTIVE')", [category]);
    await db.query("INSERT INTO product_type(id,category_id,name,status) VALUES($1,$2,'Áo','ACTIVE')", [type, category]);
    for(const code of ['color','size'])await db.query("INSERT INTO attribute_definition(id,product_type_id,code,name,data_type,required,variant_factor) VALUES($1,$2,$3,$3,'STRING',false,true)",[randomUUID(),type,code]);
    for (let n = 0; n < 300; n++) {
      const product = randomUUID();
      await db.query("INSERT INTO product(id,store_id,product_type_id,title,status,moderation_status) VALUES($1,$2,$3,$4,'ACTIVE','VISIBLE')", [product, store, type, 'Áo kiểm thử ' + n]);
      for (let v = 0; v < (n === 299 ? 12 : 1); v++) {
        const variant = randomUUID(); variants.push(variant); if (n === 299 && v === 11) target = variant;
        await db.query("INSERT INTO product_variant(id,product_id,store_id,sku,price_vnd,variant_values_json,variant_signature,is_default,status) VALUES($1,$2,$3,$4,100000,$5,$6,$7,'ACTIVE')", [variant, product, store, `OPAQUE-${n}-${v}`, {color: ['Đỏ','Xanh','Đen'][v % 3], size: ['S','M','L','XL'][Math.floor(v / 3)]}, String(v), v === 0]);
        await db.query('INSERT INTO inventory(variant_id,store_id,quantity) VALUES($1,$2,10)', [variant, store]);
      }
    }
    service = new InventoryService(undefined, db);
  });
  afterAll(async () => {
    if (db?.isInitialized) await db.destroy();
    if (admin?.isInitialized) {
      if (/^inventory_fix_[a-f0-9]{32}$/.test(schema)) await admin.query('DROP SCHEMA ' + schema + ' CASCADE');
      await admin.destroy();
    }
  });
  test('inventory-only employee can identify all 311 variants without catalog edit permission or a first-100 lookup', async () => {
    const rows = [];
    for (let page = 1; page <= 16; page++) rows.push(...(await service.listStoreInventory({page, size: 20}, context)).items);
    expect(rows).toHaveLength(311);
    expect(rows.find(x => x.variant_id === target)).toMatchObject({product_title: 'Áo kiểm thử 299', sku: 'OPAQUE-299-11', variant_values: {color: 'Đen', size: 'XL'}, quantity: 10});
    expect((await service.listStoreInventory({page: 1, size: 20}, {...context, store_membership: {...context.store_membership, store_id: otherStore}})).total).toBe(0);
    await expect(service.listStoreInventory({page: 1, size: 20}, {...context, store_membership: {...context.store_membership, permissions: []}})).rejects.toMatchObject({status: 403});
  });
  test('adjustment and compensation keep before/after, actor, operation and version; concurrent replay applies once', async () => {
    const input = {variant_id: target, delta_quantity: 4, expected_version: 0, reason: 'Nhập thêm', operation_id: randomUUID()};
    const results = await Promise.all([service.adjustInventory(input, context, randomUUID()), service.adjustInventory(input, context, randomUUID())]);
    expect(results[0]).toEqual(results[1]);
    await expect(service.adjustInventory({...input, delta_quantity: 5}, context, randomUUID())).rejects.toMatchObject({status: 409});
    await service.adjustInventory({...input, operation_id: randomUUID(), delta_quantity: -4, expected_version: 1, reason: 'Bù lần nhập nhầm'}, context, randomUUID());
    const page = await service.listStockMovements({page: 1, size: 20}, context);
    expect(page.total).toBe(2);
    expect(page.items.find(x => x.reason === 'Nhập thêm')).toMatchObject({quantity_before: 10, quantity_after: 14, reserved_before: 0, reserved_after: 0, delta_reserved: 0, inventory_version: 1, actor_user_id: actor, operation_id: input.operation_id, product_title: 'Áo kiểm thử 299'});
    expect(page.items.find(x => x.reason === 'Bù lần nhập nhầm')).toMatchObject({quantity_before: 14, quantity_after: 10, inventory_version: 2});
  });
  test('reserve, consume and idempotent restock reconcile quantity separately from reservations', async () => {
    const order = randomUUID(), group = randomUUID(), expiry = new Date(Date.now() + 600000).toISOString();
    const held = await service.reserve({operation_id: randomUUID(), purchase_group_id: group, expires_at: expiry, items: [{order_id: order, variant_id: target, store_id: store, quantity: 3}]});
    const settle = {operation_id: randomUUID(), order_id: order, reservation_ids: [held.reservations[0].id]};
    await service.consume(settle); await service.consume({...settle, operation_id: randomUUID()});
    const restock = {operation_id: randomUUID(), order_id: order, items: [{variant_id: target, store_id: store, quantity: 3}]};
    await service.restockOrder(restock); await service.restockOrder({...restock, operation_id: randomUUID()});
    const page = await service.listStockMovements({page: 1, size: 20}, context), rows = page.items.filter(x => x.order_id === order);
    expect(rows).toHaveLength(3);
    expect(rows.find(x => x.reason === 'RESERVE')).toMatchObject({quantity_before: 10, quantity_after: 10, reserved_before: 0, reserved_after: 3, delta_quantity: 0, delta_reserved: 3});
    expect(rows.find(x => x.reason === 'CONSUME')).toMatchObject({quantity_before: 10, quantity_after: 7, reserved_before: 3, reserved_after: 0, delta_quantity: -3, delta_reserved: -3});
    expect(rows.find(x => x.reason === 'RESTOCK')).toMatchObject({quantity_before: 7, quantity_after: 10, delta_quantity: 3, delta_reserved: 0});
  });
  test('inventory-only Seller searches all 311 variants and follows a product or variant link before count/page, within the same Store',async()=>{
    const exact=await service.listStoreInventory({page:1,size:20,q:'OPAQUE-299-11'},context);expect(exact.total).toBe(1);expect(exact.items[0]).toMatchObject({variant_id:target,product_title:'Áo kiểm thử 299'});
    const product=exact.items[0].product_id!;const grouped=await service.listStoreInventory({page:1,size:5,product_id:product},context);expect(grouped.total).toBe(12);expect(grouped.items).toHaveLength(5);expect((await service.listStoreInventory({page:3,size:5,product_id:product},context)).items).toHaveLength(2);
    expect((await service.listStoreInventory({page:1,size:20,q:'ao kiem thu 299'},context)).total).toBe(12);expect((await service.listStoreInventory({page:1,size:20,q:'%'},context)).total).toBe(0);
    expect((await service.listStoreInventory({page:1,size:20,variant_id:target},{...context,store_membership:{...context.store_membership,store_id:otherStore}})).total).toBe(0);
    expect((await service.listStockMovements({page:1,size:2,variant_id:target},context)).total).toBeGreaterThan(2);expect((await service.listStockMovements({page:1,size:2,variant_id:target},context)).items.every(row=>row.variant_id===target)).toBe(true);
    expect((await service.listStockMovements({page:1,size:20,product_id:product},{...context,store_membership:{...context.store_membership,store_id:otherStore}})).total).toBe(0);
  });
  test('legacy movements stay readable without inventing balance checkpoints', async () => {
    await db.query("INSERT INTO stock_movement(inventory_id,operation_id,delta_quantity,delta_reserved,reason,actor_user_id) SELECT id,$2,0,0,'Legacy',$3 FROM inventory WHERE variant_id=$1", [target, randomUUID(), actor]);
    const row = (await service.listStockMovements({page: 1, size: 20}, context)).items.find(x => x.reason === 'Legacy')!;
    expect(row).toBeDefined(); expect(row).not.toHaveProperty('quantity_before'); expect(row.delta_reserved).toBe(0);
  });
  test('period reconciliation uses recorded checkpoints, scopes inventory-only Seller, and filters source movements with the same half-open dates',async()=>{
    const variant=variants[10],before=new Date(Date.now()-1000).toISOString(),stock=await service.listStoreInventory({page:1,size:1,variant_id:variant},context);
    await service.adjustInventory({variant_id:variant,delta_quantity:5,expected_version:stock.items[0].version,operation_id:randomUUID(),reason:'Wrong entry'},context,'period-wrong');
    const [first]=await db.query('SELECT recorded_at FROM stock_movement m JOIN inventory i ON i.id=m.inventory_id WHERE i.variant_id=$1 ORDER BY inventory_version LIMIT 1',[variant]);
    const holding=await service.reserve({operation_id:randomUUID(),purchase_group_id:randomUUID(),expires_at:new Date(Date.now()+600000).toISOString(),items:[{order_id:randomUUID(),variant_id:variant,store_id:store,quantity:3}]});
    const fresh=(await service.listStoreInventory({page:1,size:1,variant_id:variant},context)).items[0];await service.adjustInventory({variant_id:variant,delta_quantity:-5,expected_version:fresh.version,operation_id:randomUUID(),reason:'Compensating entry'},context,'period-fix');
    const to=new Date(Date.now()+1000).toISOString(),query={variant_id:variant,from:new Date(first.recorded_at).toISOString(),to};
    const result=await service.getInventoryReconciliation(query,context);expect(result).toMatchObject({coverage:'COMPLETE',opening:{quantity:10,reserved_quantity:0},closing:{quantity:10,reserved_quantity:3},totals:{quantity_in:5,quantity_out:5,reserved_in:3,reserved_out:0,movement_count:3}});
    expect((await service.listStockMovements({page:1,size:20,...query},context)).items).toHaveLength(3);
    const old=await service.getInventoryReconciliation({...query,from:before},context);expect(old.coverage).toBe('INCOMPLETE');expect(old).not.toHaveProperty('opening');
    await expect(service.getInventoryReconciliation(query,{...context,store_membership:{...context.store_membership,store_id:otherStore}})).rejects.toMatchObject({status:404});
    await expect(service.getInventoryReconciliation(query,{...context,store_membership:{...context.store_membership,permissions:[]}})).rejects.toMatchObject({status:403});
    await expect(service.getInventoryReconciliation({...query,to:query.from},context)).rejects.toMatchObject({status:422});
    expect(holding.reservations).toHaveLength(1);
  });
  test('recorded-time migration leaves existing dates unknown and timestamps only subsequent inserts at millisecond precision',async()=>{
    const runner=db.createQueryRunner();await runner.connect();await runner.startTransaction();try{
      await runner.query('CREATE TEMP TABLE stock_movement(inventory_id uuid,inventory_version integer,created_at timestamptz DEFAULT now())');
      await runner.query("INSERT INTO stock_movement(inventory_id,inventory_version,created_at) VALUES($1,1,'2026-01-01T00:00:00Z')",[randomUUID()]);
      await runner.query(readFileSync(resolve(__dirname,'../../catalog-service/migrations/013_inventory_recorded_time.sql'),'utf8'));
      const [old]=await runner.query('SELECT recorded_at,created_at FROM stock_movement');expect(old.recorded_at).toBeNull();expect(new Date(old.created_at).toISOString()).toBe('2026-01-01T00:00:00.000Z');
      await runner.query('INSERT INTO stock_movement(inventory_id,inventory_version) VALUES($1,2)',[randomUUID()]);const [newRow]=await runner.query("SELECT recorded_at IS NOT NULL AS present,recorded_at=date_trunc('milliseconds',recorded_at) AS exact FROM stock_movement WHERE inventory_version=2");expect(newRow).toEqual({present:true,exact:true});
    }finally{await runner.rollbackTransaction();await runner.release();}
  });
  test('only inspected sellable quantity is restored; receipt replay and the old full cancellation cannot restore it twice',async()=>{
    const variant=variants[0],order=randomUUID();
    const held=await service.reserve({operation_id:randomUUID(),purchase_group_id:randomUUID(),expires_at:new Date(Date.now()+600000).toISOString(),items:[{order_id:order,variant_id:variant,store_id:store,quantity:3}]});
    await service.consume({operation_id:randomUUID(),order_id:order,reservation_ids:[held.reservations[0].id]});
    const command={operation_id:randomUUID(),receipt_id:randomUUID(),order_id:order,actor_user_id:actor,items:[{variant_id:variant,store_id:store,quantity:2}]};
    const [a,b]=await Promise.all([service.restockReceived(command),service.restockReceived(command)]);expect(a).toEqual(b);
    expect((await service.restockReceived({...command,operation_id:randomUUID()})).status).toBe('ALREADY_APPLIED');
    await expect(service.restockReceived({...command,operation_id:randomUUID(),items:[{variant_id:variant,store_id:store,quantity:3}]})).rejects.toMatchObject({status:409});
    await expect(service.restockReceived({...command,operation_id:randomUUID(),receipt_id:randomUUID(),items:[{variant_id:variant,store_id:store,quantity:2}]})).rejects.toMatchObject({status:409});
    await expect(service.restockOrder({operation_id:randomUUID(),order_id:order,items:[{variant_id:variant,store_id:store,quantity:3}]})).rejects.toMatchObject({status:409,response:{code:'INSPECTED_RETURN_EXISTS'}});
    const [balance]=await db.query('SELECT quantity,reserved_quantity FROM inventory WHERE variant_id=$1',[variant]);expect(balance).toEqual({quantity:9,reserved_quantity:0});
    expect((await db.query("SELECT count(*)::int AS n FROM stock_movement WHERE order_id=$1 AND reason='RETURN_RECEIVED'",[order]))[0].n).toBe(1);
  });
});

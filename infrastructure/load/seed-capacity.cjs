// Synthetic volume fixture only. Never run against the demo databases or publish its sessions.
const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomBytes, createHash } = require('node:crypto');
const fs = require('node:fs');
const uid = n => '20000000-0000-4000-8000-' + String(n).padStart(12, '0');
const db = {};
const sqlId = n => `('20000000-0000-4000-8000-'||lpad((${n})::text,12,'0'))::uuid`;
async function query(service, sql, args) { return (await db[service].query(sql, args)).rows; }
async function main() {
  if (process.env.PBL6_CAPACITY_ISOLATED !== '1' || process.env.PBL6_ACCEPTANCE_ISOLATED !== '1' ||
      !/^pbl6-acceptance-[a-f0-9]{12}$/.test(process.env.ACCEPTANCE_RUN_ID || '')) throw new Error('CAPACITY_ISOLATION_REQUIRED');
  for (const service of ['M1', 'M2', 'M3', 'M4']) {
    db[service] = new Client({ connectionString: process.env[service + '_DATABASE_URL'], statement_timeout: 120000 });
    await db[service].connect();
    const table = { M1: 'product', M2: '"order"', M3: '"user"', M4: 'inbox' }[service];
    if ((await query(service, 'SELECT count(*)::int AS n FROM ' + table))[0].n !== 0) throw new Error('CAPACITY_DATABASE_NOT_EMPTY');
    await query(service, 'CREATE SCHEMA capacity; CREATE TABLE capacity.environment(run_id text PRIMARY KEY)');
    await query(service, 'INSERT INTO capacity.environment(run_id) VALUES($1)', [process.env.ACCEPTANCE_RUN_ID]);
  }
  const password = await bcrypt.hash(process.env.SEED_PASSWORD, 10);
  await query('M3', `INSERT INTO role(id,code,scope,status) VALUES($1,'CUSTOMER','GLOBAL','ACTIVE')`, [uid(999001)]);
  await query('M3', `INSERT INTO "user"(id,email,email_verified_at,password_hash,status)
    SELECT ${sqlId('n')},'capacity-'||n||'@pbl6.test',now(),$1,'ACTIVE' FROM generate_series(1,1000) n`, [password]);
  await query('M3', `INSERT INTO user_role(user_id,role_id,granted_at) SELECT id,$1,now() FROM "user"`, [uid(999001)]);
  await query('M3', `INSERT INTO customer_profile(id,user_id,display_name,updated_at)
    SELECT gen_random_uuid(),id,'Synthetic capacity fixture',now() FROM "user"`);
  await query('M3', `INSERT INTO address(id,customer_user_id,recipient_name,phone,line1,ward,district,city,is_default,status)
    SELECT ${sqlId('10000+n')},${sqlId('n')},'Capacity fixture','0900000000','Synthetic load dataset','Test','Test','Test',true,'ACTIVE'
    FROM generate_series(1,1000) n`);
  await query('M3', `INSERT INTO store_application(id,applicant_user_id,proposed_name,contact,status,submitted_at)
    SELECT ${sqlId('3000+n')},${sqlId('n')},'Capacity Store '||n,'fixture','APPROVED',now() FROM generate_series(1,10) n`);
  await query('M3', `INSERT INTO store(id,application_id,name,slug,contact,shipping_fee_vnd,status)
    SELECT ${sqlId('2000+n')},${sqlId('3000+n')},'Capacity Store '||n,'capacity-'||n,'fixture',1000,'ACTIVE' FROM generate_series(1,10) n`);
  await query('M3', `INSERT INTO store_membership(id,store_id,user_id,role,status,joined_at)
    SELECT ${sqlId('4000+n')},${sqlId('2000+n')},${sqlId('n')},'OWNER','ACTIVE',now() FROM generate_series(1,10) n`);
  const sessions = [];
  const key = fs.readFileSync('/run/secrets/jwt-private.pem', 'utf8');
  const issued_at = Date.now();
  for (let n = 1; n <= 1000; n++) {
    const session = uid(1000000 + n), refresh = randomBytes(48).toString('base64url');
    sessions.push({ user_id: uid(n), address_id: uid(10000 + n), issued_at,
      access_token: jwt.sign({ sid: session }, key, { algorithm: 'RS256', subject: uid(n), issuer: 'pbl6-identity', audience: 'pbl6-clients', expiresIn: '15m' }),
      refresh_token: refresh, session_id: session, refresh_hash: createHash('sha256').update(refresh).digest('hex') });
  }
  await query('M3', `INSERT INTO refresh_session(id,user_id,token_hash,expires_at,family_id)
    SELECT s,u,h,now()+interval '7 days',s FROM unnest($1::uuid[],$2::uuid[],$3::text[]) t(s,u,h)`,
    [sessions.map(s => s.session_id), sessions.map(s => s.user_id), sessions.map(s => s.refresh_hash)]);
  await query('M1', "INSERT INTO category(id,name,slug,status) VALUES($1,'Capacity','capacity','ACTIVE')", [uid(9000)]);
  await query('M1', "INSERT INTO product_type(id,category_id,name,status) VALUES($1,$2,'Capacity type','ACTIVE')", [uid(9001), uid(9000)]);
  await query('M1', `INSERT INTO attribute_definition(id,product_type_id,code,name,data_type,required,variant_factor,allowed_values)
    VALUES($1,$2,'size','Size','STRING',false,true,'["A","B"]')`, [uid(9002), uid(9001)]);
  await query('M1', `INSERT INTO product(id,store_id,product_type_id,title,description,attributes_json,status,moderation_status)
    SELECT ${sqlId('100000+n')},${sqlId('2001+(n-1)%10')},$1,'Capacity Product '||lpad(n::text,5,'0'),
      'Synthetic capacity product, not AI quality evidence','{}','ACTIVE','VISIBLE' FROM generate_series(1,10000) n`, [uid(9001)]);
  await query('M1', `INSERT INTO product_variant(id,product_id,store_id,sku,price_vnd,variant_values_json,variant_signature,is_default,status)
    SELECT ${sqlId('200000+n')},${sqlId('100001+(n-1)/2')},${sqlId('2001+((n-1)/2)%10')},'CAPACITY-'||n,
      100000+(((n-1)/2)%100)*1000+((n-1)%2)*500,
      jsonb_build_object('size',CASE WHEN n%2=1 THEN 'A' ELSE 'B' END),
      encode(digest(CASE WHEN n%2=1 THEN '[["size","A"]]' ELSE '[["size","B"]]' END,'sha256'),'hex'),n%2=1,'ACTIVE'
      FROM generate_series(1,20000) n`);
  await query('M1', `INSERT INTO inventory(id,variant_id,store_id,quantity,reserved_quantity,version)
    SELECT ${sqlId('300000+n')},${sqlId('200000+n')},${sqlId('2001+((n-1)/2)%10')},100000,0,0 FROM generate_series(1,20000) n`);
  await query('M1', 'CREATE TABLE capacity.inventory_start AS SELECT id,quantity,reserved_quantity FROM inventory');
  await query('M2', `INSERT INTO "order"(id,purchase_group_id,customer_user_id,store_id,address_snapshot,status,payment_method,
      goods_vnd,store_discount_vnd,platform_discount_vnd,shipping_vnd,payable_vnd,version,created_at)
    SELECT ${sqlId('400000+n')},${sqlId('500000+n')},${sqlId('1+(n-1)%1000')},${sqlId('2001+(n-1)%10')},
      jsonb_build_object('recipient_name','Historical synthetic fixture','city','Test'),
      'COMPLETED','COD',100000+((n-1)%100)*1000,0,0,1000,101000+((n-1)%100)*1000,4,
      now()-((n%365)+1)*interval '1 day' FROM generate_series(1,50000) n`);
  await query('M2', 'CREATE TABLE capacity.history_orders AS SELECT id FROM "order"; ALTER TABLE capacity.history_orders ADD PRIMARY KEY(id)');
  await query('M2', `INSERT INTO order_item(id,order_id,product_id,variant_id,product_snapshot,sku_snapshot,unit_price_vnd,quantity,line_total_vnd)
    SELECT ${sqlId('700000+n')},${sqlId('400000+n')},${sqlId('100001+(n-1)%10000')},${sqlId('200001+2*((n-1)%10000)')},
      jsonb_build_object('title','Historical capacity fixture'),'CAPACITY-'||(1+2*((n-1)%10000)),100000+((n-1)%100)*1000,1,
      100000+((n-1)%100)*1000 FROM generate_series(1,50000) n`);
  await query('M2', `INSERT INTO payment(id,order_id,method,status,payable_vnd,collectible_vnd,collected_vnd,refunded_vnd,version)
    SELECT ${sqlId('600000+n')},${sqlId('400000+n')},'COD','SUCCEEDED',101000+((n-1)%100)*1000,
      101000+((n-1)%100)*1000,101000+((n-1)%100)*1000,0,1 FROM generate_series(1,50000) n`);
  await query('M2', `INSERT INTO c_o_d_collection(id,order_id,amount_due_vnd,amount_collected_vnd,status,operation_id,collected_at)
    SELECT ${sqlId('800000+n')},${sqlId('400000+n')},101000+((n-1)%100)*1000,101000+((n-1)%100)*1000,
      'COLLECTED',gen_random_uuid(),now()-interval '1 day' FROM generate_series(1,50000) n`);
  await query('M2', `INSERT INTO shipment(id,order_id,status,tracking_code,shipped_at,delivered_at)
    SELECT gen_random_uuid(),id,'DELIVERED','CAPACITY-'||id,created_at,created_at FROM "order"`);
  await query('M2', `INSERT INTO order_status_history(id,order_id,from_status,to_status,actor_user_id,operation_id,created_at)
    SELECT gen_random_uuid(),id,'SHIPPED','COMPLETED',customer_user_id,gen_random_uuid(),created_at FROM "order"`);
  await query('M2', `INSERT INTO cart(id,customer_user_id,updated_at) SELECT ${sqlId('1100000+n')},${sqlId('n')},now() FROM generate_series(1,1000) n`);
  await query('M2', `INSERT INTO cart_item(id,cart_id,variant_id,product_id,store_id,quantity,added_at)
    SELECT ${sqlId('1200000+n')},${sqlId('1100000+n')},${sqlId('200001+2*(n-1)')},${sqlId('100000+n')},${sqlId('2001+(n-1)%10')},1,now()
      FROM generate_series(1,1000) n`);
  for (const service of ['M1', 'M2', 'M3', 'M4']) await query(service, 'ANALYZE');
  const counts = {};
  for (const [name, service, table, expected] of [
    ['stores', 'M3', 'store', 10], ['customers', 'M3', 'customer_profile', 1000],
    ['products', 'M1', 'product', 10000], ['variants', 'M1', 'product_variant', 20000],
    ['historical_orders', 'M2', '"order"', 50000],
  ]) {
    counts[name] = (await query(service, 'SELECT count(*)::int AS n FROM ' + table))[0].n;
    if (counts[name] !== expected) throw new Error('CAPACITY_VOLUME_MISMATCH');
  }
  fs.writeFileSync('/evidence/users.private.json', JSON.stringify(sessions.map(({ session_id, refresh_hash, ...s }) => s)), { mode: 0o600 });
  const dataset = { version: 'capacity-volume-v1', source: 'SYNTHETIC_VOLUME_ONLY', ...counts,
    auth: 'Isolated signed 15-minute sessions; live context and refresh; login cost excluded',
    limits: ['Synthetic volume is not actual sales, financial evidence, consented behavior or AI quality data', 'No serving model is trained or published'] };
  fs.writeFileSync('/evidence/dataset.json', JSON.stringify(dataset, null, 2));
  console.log(JSON.stringify(dataset));
}
main().catch(e => { console.error('CAPACITY_SEED_FAILED:' + (/^[A-Z0-9_]{1,50}$/.test(e.code || '') ? e.code : 'ISOLATION_OR_FIXTURE')); process.exitCode = 1; })
  .finally(async () => { await Promise.allSettled(Object.values(db).map(d => d.end())); });

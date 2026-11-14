const fs=require('node:fs'),path=require('node:path'),f=require('./demo-acceptance.cjs');
const target=process.env.DEMO_ACCEPTANCE_CLEANUP_FOLDER||'bug-acceptance-2026-11-14';
if(!/^bug-acceptance-2026-11-14(?:-[a-z-]+)?$/.test(target))throw Error('Invalid cleanup folder');
const file=path.join(f.root,'outputs',target,'results.json'),r=JSON.parse(fs.readFileSync(file,'utf8')),ids=r.fixture_ids;
try{
 if(!/^acceptbug-[0-9]+$/.test(r.tag))throw Error('Invalid private tag');
 const users=f.sql('m3','SELECT id FROM "user" WHERE id=ANY($1::uuid[]) AND email LIKE $2',[ids.users,r.tag+'.%']);if(users.length!==3)throw Error('Private identity guard failed');
 const orders=f.sql('m2',"SELECT count(*)::int AS n FROM \"order\" WHERE customer_user_id=ANY($1::uuid[]) AND status NOT IN ('CANCELLED','EXPIRED','COMPLETED')",[ids.users]);if(orders[0].n)throw Error('Open test orders require API cancellation before cleanup');
 const inv=f.sql('m1','SELECT coalesce(sum(reserved_quantity),0)::int AS n FROM inventory WHERE store_id=$1',[ids.store]);if(inv[0].n)throw Error('Test stock remains reserved');
 f.sql('m4','DELETE FROM chat_message WHERE session_id IN (SELECT id FROM chat_session WHERE user_id IN (:a,:b,:c))',{a:ids.users[0],b:ids.users[1],c:ids.users[2]});
 f.sql('m4','DELETE FROM chat_session WHERE user_id IN (:a,:b,:c)',{a:ids.users[0],b:ids.users[1],c:ids.users[2]});
 f.sql('m2','DELETE FROM cart_item WHERE cart_id IN (SELECT id FROM cart WHERE customer_user_id=ANY($1::uuid[]))',[ids.users]);
 f.sql('m2',"UPDATE voucher SET status='STOPPED',version=version+1 WHERE store_id=$1 AND code LIKE $2",[ids.store,r.tag.toUpperCase()+'-%']);
 f.sql('m1',"UPDATE product SET status='STOPPED',version=version+1 WHERE product_type_id=$1 AND title LIKE $2",[ids.type,r.tag+' %']);
 f.sql('m1',"UPDATE product_type SET status='STOPPED' WHERE id=$1 AND name=$2",[ids.type,r.tag]);f.sql('m1',"UPDATE category SET status='STOPPED' WHERE id=$1 AND name=$2",[ids.category,r.tag]);
 f.sql('m3',"UPDATE store SET status='LOCKED',version=version+1 WHERE id=$1 AND name=$2",[ids.store,r.tag]);f.sql('m3','UPDATE refresh_session SET revoked_at=coalesce(revoked_at,now()) WHERE user_id=ANY($1::uuid[])',[ids.users]);
 f.sql('m3',"UPDATE \"user\" SET status='LOCKED',version=version+1 WHERE id=ANY($1::uuid[]) AND email LIKE $2",[ids.users,r.tag+'.%']);
 r.cleanup.push({name:'guarded_recovery_after_harness_timeout',result:'PASS',open_orders:0,reserved_stock:0,at:new Date().toISOString()});r.finished_at=new Date().toISOString();fs.writeFileSync(file,JSON.stringify(r,null,2));console.log('Private fixture recovery cleanup passed');
}finally{f.dispose()}

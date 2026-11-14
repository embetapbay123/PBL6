const fs=require('node:fs'),path=require('node:path'),f=require('./demo-acceptance.cjs');
try{
 const folders=['bug-acceptance-2026-11-14/harness-first-run','bug-acceptance-2026-11-14/harness-second-run','bug-acceptance-2026-11-14','bug-acceptance-2026-11-14-checkout'];
 if(process.env.DEMO_ACCEPTANCE_EXTRA_FOLDER){if(!/^bug-acceptance-2026-11-14-[a-z-]+$/.test(process.env.DEMO_ACCEPTANCE_EXTRA_FOLDER))throw Error('Invalid extra fixture folder');folders.push(process.env.DEMO_ACCEPTANCE_EXTRA_FOLDER);}
 const data=folders.map(p=>JSON.parse(fs.readFileSync(path.join(f.root,'outputs',p,'results.json'),'utf8')));
 const users=[...new Set(data.flatMap(r=>r.fixture_ids.users))],stores=[...new Set(data.map(r=>r.fixture_ids.store))];
 const guards=f.sql('m3','SELECT id,status FROM "user" WHERE id=ANY($1::uuid[]) AND email LIKE $2',[users,'acceptbug-%.%@pbl6.test']);if(guards.length!==users.length)throw Error('Identity guard failed');
 const orders=f.sql('m2','SELECT id,status,payment_method,payable_vnd FROM "order" WHERE customer_user_id=ANY($1::uuid[])',[users]);
 const open=orders.filter(o=>!['CANCELLED','EXPIRED','COMPLETED'].includes(o.status));
 const inventory=f.sql('m1','SELECT store_id,coalesce(sum(reserved_quantity),0)::int AS reserved FROM inventory WHERE store_id=ANY($1::uuid[]) GROUP BY store_id',[stores]);
 const products=f.sql('m1',"SELECT count(*)::int AS active FROM product WHERE store_id=ANY($1::uuid[]) AND status='ACTIVE'",[stores]);
 const cart=f.sql('m2','SELECT count(i.id)::int AS rows FROM cart c JOIN cart_item i ON i.cart_id=c.id WHERE c.customer_user_id=ANY($1::uuid[])',[users]);
 const args=Object.fromEntries(users.map((u,i)=>['u'+i,u])),placeholders=users.map((_,i)=>':u'+i).join(',');
 const chat=f.sql('m4','SELECT count(*)::int AS sessions FROM chat_session WHERE user_id IN ('+placeholders+')',args)[0];
 const result={private_users:users.length,all_users_locked:guards.every(u=>u.status==='LOCKED'),orders,open_orders:open.length,inventory,active_products:products[0].active,cart_rows:cart[0].rows,chat_sessions:chat.sessions};
 result.passed=!open.length&&result.all_users_locked&&!result.active_products&&!result.cart_rows&&!result.chat_sessions&&inventory.every(v=>v.reserved===0);
 fs.writeFileSync(path.join(f.folder,'final-cleanup-verification.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));if(!result.passed)process.exitCode=1;
}finally{f.dispose()}

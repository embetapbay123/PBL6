/** Narrow cleanup of the recorded TEST-CONG fixture namespace. Business history is immutable. */
const fs=require('node:fs'),path=require('node:path'),{randomUUID}=require('node:crypto');
module.exports=async function cleanup({db,api,admin,Client,env,report,file,save}){
 const checkpoint=path.join(path.dirname(file),'cleanup.json');
 let state=fs.existsSync(checkpoint)?JSON.parse(fs.readFileSync(checkpoint,'utf8')):null;
 const persist=()=>{fs.writeFileSync(checkpoint,JSON.stringify(state,null,2));report.cleanup=state;save();};
 if(!state){
  state={namespace:'TEST-CONG',started_at:new Date().toISOString(),status:'RUNNING',products:await db('M1',"SELECT id,title,store_id FROM product WHERE title LIKE 'TEST-CONG-%' ORDER BY id"),types:await db('M1',"SELECT id,name FROM product_type WHERE name LIKE 'TEST-CONG-%' ORDER BY id"),categories:await db('M1',"SELECT id,name FROM category WHERE name LIKE 'TEST-CONG-%' ORDER BY id"),stores:await db('M3',"SELECT id,name FROM store WHERE name LIKE 'TEST-CONG-%' ORDER BY id"),users:await db('M3',`SELECT u.id,u.email FROM "user" u JOIN customer_profile p ON p.user_id=u.id WHERE u.email LIKE 'qa.cong.%@pbl6.test' AND p.display_name LIKE '%TEST-CONG-%' ORDER BY u.id`)};
  if(state.products.length!==182||state.stores.length!==2||state.users.length!==6||state.categories.length!==7||state.types.length!==10)throw Error('TEST cleanup scope differs from reviewed audit');
  persist();
 }
 const ids=state.products.map(p=>p.id),correlation=randomUUID();
 async function digest(service,table){return (await db(service,`SELECT count(*)::int n,md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' ORDER BY id),'')) hash FROM "${table}" t`))[0];}
 const protectedTables=[['M2','order'],['M2','order_item'],['M2','money_movement'],['M2','cart_item'],['M1','stock_movement'],['M1','reservation_item']];
 const before=await Promise.all(protectedTables.map(([s,t])=>digest(s,t)));
 for(const p of await db('M1','SELECT id,title,moderation_status,version FROM product WHERE id=ANY($1::uuid[])',[ids])){
  if(!p.title.startsWith('TEST-CONG-')&&!p.title.startsWith('Hồ sơ kiểm thử đã lưu · '))throw Error('Fixture product renamed externally; refusing cleanup');
  if(p.moderation_status!=='HIDDEN')await api('/admin/products/'+p.id+'/hide',admin,'POST',{expected_version:p.version,reason:'Lưu trữ dữ liệu kiểm thử để làm sạch bản demo.'});
 }
 for(const s of await db('M3','SELECT id,name,status,version FROM store WHERE id=ANY($1::uuid[])',[state.stores.map(s=>s.id)])){
  if(!s.name.startsWith('TEST-CONG-')&&!s.name.startsWith('Gian hàng đã lưu · '))throw Error('Fixture Store changed externally');
  if(s.status!=='LOCKED')await api('/admin/stores/'+s.id,admin,'PATCH',{status:'LOCKED',reason:'Lưu trữ gian hàng kiểm thử.',expected_version:s.version});
 }
 for(const u of await db('M3','SELECT id,status,version FROM "user" WHERE id=ANY($1::uuid[])',[state.users.map(u=>u.id)])){
  if(u.status!=='LOCKED')await api('/admin/users/'+u.id,admin,'PATCH',{status:'LOCKED',reason:'Lưu trữ tài khoản kiểm thử.',expected_version:u.version});
 }
 const variants=await db('M1','SELECT id,product_id FROM product_variant WHERE product_id=ANY($1::uuid[])',[ids]);
 const references=await db('M2','SELECT DISTINCT product_id FROM order_item WHERE product_id=ANY($1::uuid[])',[ids]);
 const cartVariants=await db('M2','SELECT variant_id FROM cart_item WHERE variant_id=ANY($1::uuid[])',[variants.map(v=>v.id)]);
 const used=new Set([...references.map(r=>r.product_id),...cartVariants.map(c=>variants.find(v=>v.id===c.variant_id)?.product_id)]);
 const c=new Client({connectionString:env.M1_DATABASE_URL});await c.connect();
 try{
  await c.query('BEGIN');
  const rows=(await c.query('SELECT * FROM product WHERE id=ANY($1::uuid[]) ORDER BY id FOR UPDATE',[ids])).rows;
  const deleted=[],archived=[];
  for(const p of rows){
   if(p.status==='STOPPED'&&p.moderation_status==='HIDDEN'&&p.title==='Hồ sơ kiểm thử đã lưu · '+p.id.slice(0,8)){archived.push(p.id);continue;}
   const counts=(await c.query(`SELECT (SELECT count(*) FROM review WHERE product_id=$1)::int reviews,(SELECT count(*) FROM customer_favorite WHERE product_id=$1)::int favorites,(SELECT count(*) FROM stock_movement m JOIN inventory i ON i.id=m.inventory_id JOIN product_variant v ON v.id=i.variant_id WHERE v.product_id=$1)::int movements,(SELECT count(*) FROM reservation_item r JOIN inventory i ON i.id=r.inventory_id JOIN product_variant v ON v.id=i.variant_id WHERE v.product_id=$1)::int reservations,(SELECT coalesce(sum(quantity+reserved_quantity),0) FROM inventory i JOIN product_variant v ON v.id=i.variant_id WHERE v.product_id=$1)::int stock`,[p.id])).rows[0];
   const safe=!used.has(p.id)&&Object.values(counts).every(n=>n===0),version=p.version+1;
   if(safe){
    await c.query('DELETE FROM product_image WHERE product_id=$1',[p.id]);
    await c.query('DELETE FROM inventory WHERE variant_id IN (SELECT id FROM product_variant WHERE product_id=$1)',[p.id]);
    await c.query('DELETE FROM product_variant WHERE product_id=$1',[p.id]);
    await c.query('DELETE FROM product WHERE id=$1',[p.id]);deleted.push(p.id);
   }else{
    await c.query("UPDATE product SET status='STOPPED',moderation_status='HIDDEN',title=$2,description='Hồ sơ kiểm thử đã lưu để đối chiếu lịch sử.',version=$3 WHERE id=$1",[p.id,'Hồ sơ kiểm thử đã lưu · '+p.id.slice(0,8),version]);archived.push(p.id);
   }
   await c.query(`INSERT INTO m1_audit(actor_user_id,target_type,target_id,action,reason,request_id,before_json,after_json,store_id) VALUES($1,'Product',$2,$3,'Dọn dữ liệu TEST-CONG đã rà soát',$4,$5::jsonb,$6::jsonb,$7)`,[admin.id,p.id,safe?'DEMO_FIXTURE_DELETED':'DEMO_FIXTURE_ARCHIVED',correlation,JSON.stringify(p),JSON.stringify({deleted:safe,status:'STOPPED',moderation_status:'HIDDEN',version}),p.store_id]);
   await c.query("INSERT INTO outbox(event_type,payload,correlation_id) VALUES('ProductChanged',$1::jsonb,$2)",[JSON.stringify({product_id:p.id,store_id:p.store_id,version,sale_status:'STOPPED',moderation_status:'HIDDEN'}),correlation]);
  }
  for(const t of state.types){
   const row=(await c.query('SELECT * FROM product_type WHERE id=$1 FOR UPDATE',[t.id])).rows[0];if(!row)continue;
   const refs=(await c.query('SELECT count(*)::int n FROM product WHERE product_type_id=$1',[t.id])).rows[0].n;
   if(!refs){await c.query('DELETE FROM attribute_definition WHERE product_type_id=$1',[t.id]);await c.query('DELETE FROM product_type WHERE id=$1',[t.id]);}
   else await c.query("UPDATE product_type SET status='STOPPED',name=$2,version=version+1 WHERE id=$1 AND status<>'STOPPED'",[t.id,'Loại đã lưu · '+t.id.slice(0,8)]);
   await c.query(`INSERT INTO m1_audit(actor_user_id,target_type,target_id,action,reason,request_id,before_json,after_json) VALUES($1,'ProductType',$2,'DEMO_FIXTURE_CLEANUP','Dọn loại sản phẩm kiểm thử',$3,$4::jsonb,$5::jsonb)`,[admin.id,t.id,correlation,JSON.stringify(row),JSON.stringify({deleted:!refs,status:'STOPPED'})]);
  }
  for(const t of state.categories){
   const row=(await c.query('SELECT * FROM category WHERE id=$1 FOR UPDATE',[t.id])).rows[0];if(!row)continue;
   const refs=(await c.query('SELECT (SELECT count(*) FROM product_type WHERE category_id=$1)+(SELECT count(*) FROM category WHERE parent_id=$1) n',[t.id])).rows[0].n;
   if(Number(refs)===0)await c.query('DELETE FROM category WHERE id=$1',[t.id]);
   else await c.query("UPDATE category SET status='STOPPED',name=$2,version=version+1 WHERE id=$1 AND status<>'STOPPED'",[t.id,'Danh mục đã lưu · '+t.id.slice(0,8)]);
   await c.query(`INSERT INTO m1_audit(actor_user_id,target_type,target_id,action,reason,request_id,before_json,after_json) VALUES($1,'Category',$2,'DEMO_FIXTURE_CLEANUP','Dọn danh mục kiểm thử',$3,$4::jsonb,$5::jsonb)`,[admin.id,t.id,correlation,JSON.stringify(row),JSON.stringify({deleted:Number(refs)===0,status:'STOPPED'})]);
  }
  await c.query('COMMIT');
  state.deleted_product_ids=[...new Set([...(state.deleted_product_ids??[]),...deleted])];state.archived_product_ids=archived;persist();
 }catch(e){await c.query('ROLLBACK');throw e;}finally{await c.end();}
 // Names can be cleaned without changing the historical order-item snapshots or audit trail.
 await db('M3',"UPDATE store SET name='Gian hàng đã lưu · '||left(id::text,8),version=version+1 WHERE id=ANY($1::uuid[]) AND name LIKE 'TEST-CONG-%' AND status='LOCKED'",[state.stores.map(s=>s.id)]);
 await db('M3',"UPDATE customer_profile SET display_name='[DEMO] Tài khoản đã lưu · '||left(user_id::text,8),updated_at=now() WHERE user_id=ANY($1::uuid[]) AND display_name LIKE '%TEST-CONG-%'",[state.users.map(u=>u.id)]);
 const after=await Promise.all(protectedTables.map(([s,t])=>digest(s,t)));
 if(JSON.stringify(before)!==JSON.stringify(after))throw Error('Protected history changed during cleanup; inspect concurrent activity');
 state.protected_history=protectedTables.map(([service,table],i)=>({service,table,...after[i],preserved:true}));state.status='PASS';state.finished_at=new Date().toISOString();persist();
 console.log('TEST cleanup: '+state.deleted_product_ids.length+' unreferenced products deleted, '+state.archived_product_ids.length+' archived, 2 Stores and 6 identities locked.');
};

// Synthetic fixture identities only, inside the guarded disposable acceptance stack.
module.exports = async function twoStores({ query, uid }) {
  if (process.env.PBL6_ACCEPTANCE_ISOLATED !== '1' || !/^pbl6-acceptance-[a-f0-9]{12}$/.test(process.env.ACCEPTANCE_RUN_ID || '')) throw new Error('ACCEPTANCE_ISOLATION_REQUIRED');
  const storeA = uid(61), storeB = uid(1061), ownerB = uid(1005), sellerA = uid(1006), sellerB = uid(1007);
  for (const [id, email] of [[ownerB, 'owner-two@pbl6.test'], [sellerA, 'seller-one@pbl6.test'], [sellerB, 'seller-two@pbl6.test']]) {
    await query('M3', `INSERT INTO "user"(id,email,email_verified_at,password_hash,status,created_at,version)
      SELECT $1,$2,now(),password_hash,'ACTIVE',now(),0 FROM "user" WHERE id=$3`, [id, email, uid(3)]);
    await query('M3', 'INSERT INTO user_role(user_id,role_id,granted_at) VALUES($1,$2,now())', [id, uid(20)]);
    await query('M3', 'INSERT INTO customer_profile(id,user_id,display_name,updated_at) VALUES(gen_random_uuid(),$1,$2,now())', [id, 'Isolated fixture']);
  }
  await query('M3', `INSERT INTO store_application(id,applicant_user_id,proposed_name,contact,status,submitted_at,version)
    VALUES($1,$2,'Secondary fixture Store','fixture','APPROVED',now(),0)`, [uid(1060), ownerB]);
  await query('M3', `INSERT INTO store(id,application_id,name,slug,description,contact,shipping_fee_vnd,status,version)
    VALUES($1,$2,'Secondary fixture Store','secondary-fixture','Controlled acceptance','fixture',7000,'ACTIVE',0)`, [storeB, uid(1060)]);
  for (const [id, user, store, role] of [[uid(1062), ownerB, storeB, 'OWNER'], [uid(1063), sellerA, storeA, 'SELLER'], [uid(1064), sellerB, storeB, 'SELLER']]) {
    await query('M3', "INSERT INTO store_membership(id,store_id,user_id,role,status,joined_at,version) VALUES($1,$2,$3,$4,'ACTIVE',now(),0)", [id, store, user, role]);
  }
  for (const code of ['product.store.read_write', 'inventory.store.read_adjust', 'order.store.read_status_cancel', 'cod.store.collect']) {
    const permission = (await query('M3', `INSERT INTO permission(id,code,resource,action) VALUES(gen_random_uuid(),$1,$2,'fixture')
      ON CONFLICT(code) DO UPDATE SET code=EXCLUDED.code RETURNING id`, [code, code.split('.')[0]]))[0];
    for (const member of [uid(1063), uid(1064)]) await query('M3', 'INSERT INTO membership_permission(membership_id,permission_id,granted_at) VALUES($1,$2,now())', [member, permission.id]);
  }
  await query('M1', `INSERT INTO product(id,store_id,product_type_id,title,description,attributes_json,status,moderation_status,version)
    VALUES($1,$2,$3,'Secondary wrench','Controlled second Store fixture','{}','ACTIVE','VISIBLE',0)`, [uid(1080), storeB, uid(71)]);
  await query('M1', `INSERT INTO product_variant(id,product_id,store_id,sku,price_vnd,variant_values_json,variant_signature,is_default,status)
    VALUES($1,$2,$3,'SECONDARY-WRENCH',100001,'{}','default',true,'ACTIVE')`, [uid(1090), uid(1080), storeB]);
  await query('M1', 'INSERT INTO inventory(id,variant_id,store_id,quantity,reserved_quantity,version) VALUES($1,$2,$3,10,0,0)', [uid(1100), uid(1090), storeB]);
  return { storeA, storeB, ownerB, sellerA, sellerB };
};

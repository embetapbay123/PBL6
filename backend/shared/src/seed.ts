import { Client } from 'pg';
import bcrypt from 'bcryptjs';
import { required } from './config';
const uid=(n:number)=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
async function main() {
  const password=required('SEED_PASSWORD');
  if(process.env.NODE_ENV==='production') throw new Error('Demo seed is disabled in production');
  const hash=await bcrypt.hash(password,10);
  const m3=new Client({connectionString:required('M3_DATABASE_URL')}); await m3.connect();
  try {
    await m3.query('BEGIN');
    for(const [i,role] of ['CUSTOMER','ADMIN'].entries()) await m3.query('INSERT INTO role(id,code,scope,status) VALUES($1,$2,\'GLOBAL\',\'ACTIVE\') ON CONFLICT DO NOTHING',[uid(20+i),role]);
    for(const [i,email] of ['customer1@pbl6.test','customer2@pbl6.test','owner@pbl6.test','admin@pbl6.test'].entries()) {
      await m3.query('INSERT INTO "user"(id,email,email_verified_at,password_hash,status,created_at,version) VALUES($1,$2,now(),$3,\'ACTIVE\',now(),0) ON CONFLICT DO NOTHING',[uid(i+1),email,hash]);
      await m3.query('INSERT INTO customer_profile(id,user_id,display_name,phone,updated_at) VALUES($1,$2,$3,NULL,now()) ON CONFLICT DO NOTHING',[uid(40+i),uid(i+1),`Demo ${i+1}`]);
      await m3.query('INSERT INTO user_role(user_id,role_id,granted_at) VALUES($1,$2,now()) ON CONFLICT DO NOTHING',[uid(i+1),uid(i===3?21:20)]);
    }
    await m3.query('INSERT INTO store_application(id,applicant_user_id,proposed_name,contact,status,submitted_at,version) VALUES($1,$2,\'Demo Store\',\'demo\',\'APPROVED\',now(),0) ON CONFLICT DO NOTHING',[uid(60),uid(3)]);
    await m3.query('INSERT INTO store(id,application_id,name,slug,description,contact,shipping_fee_vnd,status,version) VALUES($1,$2,\'Demo Store\',\'demo-store\',\'Seed only\',\'demo\',0,\'ACTIVE\',0) ON CONFLICT DO NOTHING',[uid(61),uid(60)]);
    await m3.query('INSERT INTO store_membership(id,store_id,user_id,role,status,joined_at,version) VALUES($1,$2,$3,\'OWNER\',\'ACTIVE\',now(),0) ON CONFLICT DO NOTHING',[uid(62),uid(61),uid(3)]);
    await m3.query('COMMIT');
  } catch(e){await m3.query('ROLLBACK');throw e;} finally {await m3.end();}
  const m1=new Client({connectionString:required('M1_DATABASE_URL')});await m1.connect();
  try {
    await m1.query('BEGIN');
    await m1.query('INSERT INTO category(id,name,slug,status) VALUES($1,\'Demo\',\'demo\',\'ACTIVE\') ON CONFLICT DO NOTHING',[uid(70)]);
    await m1.query('INSERT INTO product_type(id,category_id,name,status) VALUES($1,$2,\'Demo type\',\'ACTIVE\') ON CONFLICT DO NOTHING',[uid(71),uid(70)]);
    for(let i=0;i<3;i++) {
      await m1.query('INSERT INTO product(id,store_id,product_type_id,title,description,attributes_json,status,moderation_status,version) VALUES($1,$2,$3,$4,\'Sản phẩm mẫu cho luồng tích hợp\',\'{}\',\'ACTIVE\',\'VISIBLE\',0) ON CONFLICT DO NOTHING',[uid(80+i),uid(61),uid(71),`Sản phẩm mẫu ${i+1}`]);
      await m1.query('INSERT INTO product_variant(id,product_id,store_id,sku,price_vnd,variant_values_json,variant_signature,is_default,status) VALUES($1,$2,$3,$4,$5,\'{}\',\'default\',true,\'ACTIVE\') ON CONFLICT DO NOTHING',[uid(90+i),uid(80+i),uid(61),`DEMO-${i}`,100000+i*50000]);
      await m1.query('INSERT INTO inventory(id,variant_id,store_id,quantity,reserved_quantity,version) VALUES($1,$2,$3,10,0,0) ON CONFLICT DO NOTHING',[uid(100+i),uid(90+i),uid(61)]);
    }
    await m1.query('COMMIT');
  } catch(e){await m1.query('ROLLBACK');throw e;} finally {await m1.end();}
  console.log('Seed ready: customer1/customer2/owner/admin @pbl6.test. Password is SEED_PASSWORD from your local .env.');
}
main().catch(error=>{console.error('Seed failed:',error instanceof Error?error.message:'unknown');process.exit(1);});

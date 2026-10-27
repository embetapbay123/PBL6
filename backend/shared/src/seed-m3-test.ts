import { Client } from 'pg';
import bcrypt from 'bcryptjs';
import { required } from './config';

const uid = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

async function main() {
  const client = new Client({ connectionString: required('M3_TEST_DATABASE_URL') });
  const passwordHash = await bcrypt.hash(required('SEED_PASSWORD'), 10);
  const users = [
    { id: uid(1), email: 'customer1@pbl6.test', role: 'CUSTOMER' },
    { id: uid(2), email: 'customer2@pbl6.test', role: 'CUSTOMER' },
    { id: uid(3), email: 'owner@pbl6.test', role: 'CUSTOMER' },
    { id: process.env.SEED_ADMIN_USER_ID ?? uid(4), email: 'admin@pbl6.test', role: 'ADMIN' },
  ];

  await client.connect();
  try {
    await client.query('BEGIN');
    for (const [index, role] of ['CUSTOMER', 'ADMIN'].entries()) {
      await client.query(`INSERT INTO role(id,code,scope,status) VALUES($1,$2,'GLOBAL','ACTIVE')
        ON CONFLICT(code) DO UPDATE SET scope='GLOBAL',status='ACTIVE'`, [uid(20 + index), role]);
    }
    const permissionCodes = [
      ['platform.admin', 'platform', 'admin'],
      ['product.store.read_write', 'product.store', 'read_write'],
      ['inventory.store.read_adjust', 'inventory.store', 'read_adjust'],
      ['order.store.read_status_cancel', 'order.store', 'read_status_cancel'],
      ['cod.store.collect', 'cod.store', 'collect'],
    ];
    for (const [code, resource, action] of permissionCodes) {
      await client.query(`INSERT INTO permission(code,resource,action) VALUES($1,$2,$3) ON CONFLICT(code) DO NOTHING`, [code, resource, action]);
    }
    await client.query(`INSERT INTO role_permission(role_id,permission_id)
      SELECT r.id,p.id FROM role r CROSS JOIN permission p
      WHERE r.code='ADMIN' AND p.code='platform.admin' ON CONFLICT DO NOTHING`);

    for (const [index, user] of users.entries()) {
      await client.query(`INSERT INTO "user"(id,email,email_verified_at,password_hash,status,created_at,version)
        VALUES($1,$2,now(),$3,'ACTIVE',now(),0)
        ON CONFLICT(id) DO UPDATE SET email=EXCLUDED.email,email_verified_at=now(),password_hash=EXCLUDED.password_hash,status='ACTIVE'`,
      [user.id, user.email, passwordHash]);
      await client.query(`INSERT INTO customer_profile(id,user_id,display_name,phone,updated_at)
        VALUES($1,$2,$3,NULL,now()) ON CONFLICT(id) DO NOTHING`, [uid(40 + index), user.id, `M3 test user ${index + 1}`]);
      await client.query(`INSERT INTO user_role(user_id,role_id,granted_at)
        VALUES($1,(SELECT id FROM role WHERE code=$2),now()) ON CONFLICT DO NOTHING`, [user.id, user.role]);
    }

    await client.query(`INSERT INTO store_application(id,applicant_user_id,proposed_name,contact,status,submitted_at,version)
      VALUES($1,$2,'M3 integration store','test','APPROVED',now(),0) ON CONFLICT(id) DO NOTHING`, [uid(60), uid(3)]);
    await client.query(`INSERT INTO store(id,application_id,name,slug,description,contact,shipping_fee_vnd,status,version)
      VALUES($1,$2,'M3 integration store','m3-integration-store','Isolated test fixture','test',0,'ACTIVE',0)
      ON CONFLICT(id) DO NOTHING`, [uid(61), uid(60)]);
    await client.query(`INSERT INTO store_membership(id,store_id,user_id,role,status,joined_at,version)
      VALUES($1,$2,$3,'OWNER','ACTIVE',now(),0) ON CONFLICT(id) DO NOTHING`, [uid(62), uid(61), uid(3)]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
  console.log('Seeded isolated M3 integration accounts and Store fixture.');
}

main().catch(error => {
  console.error('M3 integration seed failed:', error instanceof Error ? error.message : 'unknown');
  process.exit(1);
});

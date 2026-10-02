"""Verify real PostgreSQL constraints in isolated transaction schemas; always rollback.
Requires the local Compose postgres service. Never resets member databases.
"""
from pathlib import Path
import subprocess
import uuid

ROOT = Path(__file__).resolve().parents[1]
COMPOSE = ['docker', 'compose', '--env-file', 'infrastructure/.env', '-f', 'infrastructure/compose.yaml']

def rejected(statement, state):
    # No exception means the invariant failed; only the expected SQLSTATE is swallowed.
    return f"DO $test$ BEGIN BEGIN {statement}; EXCEPTION WHEN SQLSTATE '{state}' THEN RETURN; END; RAISE EXCEPTION 'Expected SQLSTATE {state}'; END $test$;\n"

u="'00000000-0000-4000-8000-000000000001'"
v="'00000000-0000-4000-8000-000000000002'"
w="'00000000-0000-4000-8000-000000000003'"
x="'00000000-0000-4000-8000-000000000004'"
suites = {
'catalog-service': f"""
INSERT INTO category(id,name,slug,status) VALUES({u},'Category','category','ACTIVE');
INSERT INTO product_type(id,category_id,name,status) VALUES({u},{u},'Type','ACTIVE');
INSERT INTO product(id,store_id,product_type_id,title,status,moderation_status) VALUES({u},{u},{u},'Product','ACTIVE','VISIBLE');
INSERT INTO product_variant(id,product_id,store_id,sku,price_vnd,variant_signature,is_default,status) VALUES({u},{u},{u},'SKU',100,'default',true,'ACTIVE');
INSERT INTO inventory(id,variant_id,store_id,quantity) VALUES({u},{u},{u},5);
""" + rejected(f"UPDATE inventory SET reserved_quantity=6 WHERE id={u}",'23514')
 + rejected(f"INSERT INTO product_variant(product_id,store_id,sku,price_vnd,variant_signature,is_default,status) VALUES({u},{v},'SKU2',100,'v2',false,'ACTIVE')",'23503')
 + rejected(f"INSERT INTO product_variant(product_id,store_id,sku,price_vnd,variant_signature,is_default,status) VALUES({u},{u},'SKU2',100,'v2',true,'ACTIVE')",'23505'),
'commerce-service': f"""
INSERT INTO cart(id,customer_user_id,updated_at) VALUES({u},{u},now());
INSERT INTO cart_item(cart_id,variant_id,store_id,quantity,added_at) VALUES({u},{u},{u},1,now());
INSERT INTO "order"(id,purchase_group_id,customer_user_id,store_id,status,payment_method,goods_vnd,store_discount_vnd,platform_discount_vnd,shipping_vnd,payable_vnd) VALUES({u},{u},{u},{u},'PENDING','COD',100,0,0,0,100),({v},{u},{u},{v},'PENDING','COD',100,0,0,0,100);
INSERT INTO payment(id,order_id,method,status,payable_vnd,collectible_vnd) VALUES({u},{u},'COD','PENDING',100,100);
""" + rejected(f"INSERT INTO cart_item(cart_id,variant_id,store_id,quantity,added_at) VALUES({u},{u},{u},1,now())",'23505')
 + rejected("UPDATE cart_item SET quantity=0",'23514')
 + rejected(f'UPDATE "order" SET payable_vnd=99 WHERE id={u}','23514')
 + rejected(f"INSERT INTO refund(payment_id,order_id,amount_vnd,status,operation_id) VALUES({u},{v},10,'REQUESTED',{w})",'23503'),
'identity-store-service': f"""
INSERT INTO "user"(id,email,password_hash,status) VALUES({u},'test@example.invalid','hash','ACTIVE');
INSERT INTO address(customer_user_id,recipient_name,phone,line1,ward,district,city,is_default,status) VALUES({u},'A','1','L','W','D','C',true,'ACTIVE');
""" + rejected(f"INSERT INTO address(customer_user_id,recipient_name,phone,line1,ward,district,city,is_default,status) VALUES({u},'B','1','L','W','D','C',true,'ACTIVE')",'23505')
 + rejected("UPDATE address SET status='DELETED'",'23514'),
'ai-service': f"""
INSERT INTO chat_session(id,user_id,status) VALUES({u},{u},'ACTIVE');
INSERT INTO chat_session(anonymous_key,status) VALUES('guest-key','ACTIVE');
INSERT INTO recommendation_interaction(user_id,product_id,event_id,event_type,weight,occurred_at) VALUES({u},{u},'M1:event-1','VIEW',1,now());
""" + rejected(f"INSERT INTO chat_session(user_id,anonymous_key,status) VALUES({u},'guest','ACTIVE')",'23514')
 + rejected("INSERT INTO chat_session(status) VALUES('ACTIVE')",'23514')
 + rejected(f"INSERT INTO recommendation_interaction(user_id,product_id,event_id,event_type,weight,occurred_at) VALUES({u},{u},'M1:event-1','VIEW',1,now())",'23505')}

def main():
    for service, tests in suites.items():
        schema='schema_test_'+uuid.uuid4().hex
        migrations='\n'.join(p.read_text(encoding='utf-8-sig') for p in sorted((ROOT/'backend'/service/'migrations').glob('*.sql')))
        sql=f'BEGIN; CREATE SCHEMA {schema}; SET LOCAL search_path TO {schema},public;\n'+migrations+'\n'+tests+'\nROLLBACK;'
        result=subprocess.run(COMPOSE+['exec','-T','postgres','psql','-X','-q','-v','ON_ERROR_STOP=1','-U','postgres','-d','postgres'],cwd=ROOT,input=sql,capture_output=True,text=True,encoding='utf-8')
        if result.returncode:
            raise RuntimeError(f'{service}: {result.stderr}')
        print(f'{service}: fresh migrations + constraint checks passed (rolled back)')
    print('12 negative invariant checks passed; valid fixture inserts passed.')

if __name__ == '__main__': main()

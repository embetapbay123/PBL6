"""Deterministic synthetic controls. Never import into business/training tables."""
from datetime import datetime,timezone,timedelta
from uuid import uuid5,NAMESPACE_URL
from ..runtime_contracts import OPERATIONS,schema_errors

DATASET_VERSION='pbl6-synthetic-controls-v1'

def id_for(name):return str(uuid5(NAMESPACE_URL,'pbl6:evaluation:v1:'+name))

def product(name,title,price_vnd=100000,group=0):
    return {'id':id_for(name),'store_id':id_for('store-'+str(group)),'product_type_id':id_for('type-'+str(group)),
            'title':title,'description':None,'attributes':{},'status':'ACTIVE','moderation_status':'VISIBLE','version':1,
            'variants':[{'id':id_for('variant-'+name),'sku':'EVAL-'+name,'price_vnd':price_vnd,'variant_values':{},'status':'ACTIVE'}]}

def recommendation_data():
    families=['Máy ảnh','Laptop','Giày chạy bộ','Sách học','Bàn làm việc','Tai nghe']
    products=[product(f'group-{g}-item-{i}',f'{title} mẫu {i}',100000+i*10000,g) for g,title in enumerate(families) for i in range(12)]
    rows=[];start=datetime(2026,1,1,tzinfo=timezone.utc)
    for group in range(6):
        for member in range(10):
            # Rotations let other TRAIN users observe items held out for this user.
            user=id_for(f'user-{group}-{member}')
            sequence=[(member+i)%12 for i in range(6)]*2+[(member+i)%12 for i in (6,7,8,9,10,11,6,7)]
            for step,item in enumerate(sequence):
                rows.append({'user_id':user,'product_id':products[group*12+item]['id'],'event_id':id_for(f'event-{group}-{member}-{step}'),
                             'weight':1 if step%3 else 5,'occurred_at':start+timedelta(hours=step)})
    validate(products,rows)
    return products,rows

def chat_products():
    return [product('camera-cheap','Máy ảnh compact',90000),product('camera-exact','Máy ảnh du lịch',100000),
            product('camera-expensive','Máy ảnh chuyên nghiệp',200000),product('laptop','Laptop học tập',500000,1)]

def validate(products,rows):
    ids={p['id'] for p in products}
    if len(ids)!=len(products):raise ValueError('Duplicate Product')
    for p in products:
        if schema_errors(p,OPERATIONS['getProduct']['responses']['200']):raise ValueError('Product fixture violates public contract')
    if len({r['event_id'] for r in rows})!=len(rows):raise ValueError('Duplicate event')
    for r in rows:
        if r['product_id'] not in ids or type(r['weight']) is not int or r['weight']<=0 or not isinstance(r['occurred_at'],datetime) or r['occurred_at'].tzinfo is None:
            raise ValueError('Invalid synthetic observation')

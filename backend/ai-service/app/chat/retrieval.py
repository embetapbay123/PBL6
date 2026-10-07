"""Versioned pgvector lexical-hash index. Explicit baseline, not semantic embeddings."""
import asyncio, os, uuid, json
import numpy as np
from sqlalchemy import create_engine,text
from ..safety import embedding,public_text,tokens,budget,price
from ..catalog import LiveCatalog

def retrieve(engine,question,candidates):
    if not candidates:return []
    maximum=budget(question)
    candidates=[p for p in candidates if maximum is None or price(p)<=maximum]
    if not candidates:return []
    live={p['id']:p for p in candidates};query=embedding(question);terms={t for t in tokens(question) if not t.isdigit() and t not in ('toi','da','khong','qua','trieu','tr')}
    with engine.connect() as db:
        # Compare versions with BOTH current Catalog and durable ProductChanged state.
        indexed=db.execute(text("SELECT e.product_id,e.source_version,e.vector::text AS vector FROM product_embedding e JOIN product_document d ON d.product_id=e.product_id AND d.source_version=e.source_version LEFT JOIN event_entity_state s ON s.kind='ProductChanged' AND s.entity_id=e.product_id WHERE e.status='ACTIVE' AND (s.version IS NULL OR s.version<=e.source_version) AND e.product_id=ANY(CAST(:ids AS uuid[]))"),{'ids':list(live)}).mappings().all()
    vectors={str(r['product_id']):np.array(json.loads(r['vector'])) for r in indexed if r['source_version']==live[str(r['product_id'])].get('version')}
    ranked=[]
    for id,p in live.items():
        if terms and not terms.intersection(tokens(public_text(p))):continue
        if not terms and maximum is None:continue
        vector=vectors.get(id)
        if vector is None:vector=embedding(public_text(p))
        ranked.append((-float(query@vector),id,p))
    return [p for _,_,p in sorted(ranked,key=lambda r:(r[0],r[1]))[:8]]

def index(engine,products):
    with engine.begin() as db:
        for p in products:
            payload={'id':p['id'],'store_id':p['store_id'],'title':public_text(p),'version':p['version']}
            params={'p':p['id'],'s':p['store_id'],'v':p['version'],'payload':json.dumps(payload),'vector':json.dumps(embedding(public_text(p)).tolist())}
            db.execute(text('INSERT INTO product_document(product_id,store_id,source_version,payload) VALUES(:p,:s,:v,CAST(:payload AS jsonb)) ON CONFLICT(product_id) DO UPDATE SET store_id=EXCLUDED.store_id,source_version=EXCLUDED.source_version,payload=EXCLUDED.payload,updated_at=now() WHERE product_document.source_version<=EXCLUDED.source_version'),params)
            db.execute(text("INSERT INTO product_embedding(product_id,source_version,vector,status,updated_at) VALUES(:p,:v,CAST(:vector AS vector),'ACTIVE',now()) ON CONFLICT(product_id) DO UPDATE SET source_version=EXCLUDED.source_version,vector=EXCLUDED.vector,status='ACTIVE',updated_at=now() WHERE product_embedding.source_version<=EXCLUDED.source_version"),params)
    return len(products)

async def main():
    engine=create_engine(os.environ['M4_DATABASE_URL'].replace('postgresql://','postgresql+psycopg://',1))
    try:print(json.dumps({'indexed':index(engine,await LiveCatalog().snapshot(str(uuid.uuid4()),pages=50)),'encoder':'lexical-hash-v1'}))
    finally:engine.dispose()

if __name__=='__main__':asyncio.run(main())

"""Synthetic controls, not marketplace/model acceptance. No financial/provider calls.

python -m app.evaluation.benchmark --output /artifacts/report.json
"""
import argparse,asyncio,copy,hashlib,json,math,re,time,platform
import numpy as np
from datetime import datetime,timezone
from pathlib import Path
from sqlalchemy import text
from .dataset import recommendation_data,chat_products,validate,id_for,DATASET_VERSION
from .pipeline import run
from .ranking import split_temporal
from ..recommendation.als import rank
from ..chat.runtime import ChatRuntime
from ..chat.provider import CatalogSelector,PROMPT_VERSION
from ..chat.retrieval import index
from ..internal_client import InternalError
from ..runtime_contracts import OPERATIONS,schema_errors
from ..safety import price

CASES=Path(__file__).parent/'data/chat_cases.json'

def hash_json(value):return hashlib.sha256(json.dumps(value,sort_keys=True,default=str,ensure_ascii=False).encode()).hexdigest()

def recommendation_suite():
    started=time.monotonic();products,rows=recommendation_data();candidates=[p['id'] for p in products]
    artifact,result=run(rows,candidates,products)
    training,_,_=split_temporal(rows)
    seen={r['product_id'] for r in training if r['user_id']==rows[0]['user_id']}
    controls={'cold_user_no_model_prediction':not rank(artifact,id_for('new-user'),candidates),
              'train_seen_products_excluded':not seen.intersection(rank(artifact,rows[0]['user_id'],candidates,seen))}
    return {'status':'PASS' if all(controls.values()) else 'FAIL','data_source':'SYNTHETIC_CONTROL','dataset_version':DATASET_VERSION,
            'dataset_sha256':hash_json(rows),'catalog_sha256':hash_json(products),'artifact_sha256':hash_json(artifact),
            'statistics':{'users':60,'products':len(products),'events':len(rows),'train_observed_sparsity':1-len({(r['user_id'],r['product_id']) for r in training})/(60*len(products))},
            'consent_policy':'All actors are synthetic opt-in controls; no real User behavior imported',
            'latency_ms':round((time.monotonic()-started)*1000),'controls':controls,'ranking':result,
            'acceptance':'NOT_RUN_ON_REAL_DATA','limits':['Artificial preference clusters','Fixed current Catalog; not a historical availability simulation','No real consented behavior or serving model published','Synthetic quality_pass does not certify marketplace quality']}

class ScenarioCatalog:
    """Explicit test double; simulate changes between retrieval and final lookup."""
    def __init__(self,products,scenario):self.products=copy.deepcopy(products);self.scenario=scenario;self.verified={}
    async def snapshot(self,correlation):
        if self.scenario=='unavailable':raise InternalError(503,'DEPENDENCY_UNAVAILABLE','Synthetic unavailable')
        return copy.deepcopy(self.products)
    async def product(self,id,correlation):
        if self.scenario in ('hidden','store-locked'):raise InternalError(404,'NOT_FOUND','Synthetic hidden')
        p=copy.deepcopy(next(p for p in self.products if p['id']==id))
        if self.scenario=='price-change':p['variants'][0]['price_vnd']+=50000;p['version']+=1
        self.verified[id]=p
        return p

def percentile(values,p):
    ordered=sorted(values)
    return ordered[max(0,math.ceil(len(ordered)*p)-1)] if ordered else None

async def chat_suite(engine):
    spec=json.loads(CASES.read_text(encoding='utf-8'));products=chat_products();validate(products,[]);index(engine,products)
    raw=[];latencies=[];card_count=0;invalid_cards=0
    for case in spec['cases']:
        catalog=ScenarioCatalog(products,case['scenario']);runtime=ChatRuntime(engine,catalog,CatalogSelector(provider='none'))
        if case['scenario']=='stale-index':
            for p in catalog.products:p['version']=2
            with engine.begin() as db:
                db.execute(text("INSERT INTO event_entity_state(kind,entity_id,version,payload) VALUES('ProductChanged',:p,2,'{}'::jsonb) ON CONFLICT(kind,entity_id) DO UPDATE SET version=2"),{'p':products[0]['id']})
        session=runtime.create(None,'benchmark-'+case['id']);key=session['anonymous_key']
        if case.get('history_question'):await runtime.answer(session['id'],None,key,case['history_question'],'eval-'+case['id'])
        with engine.connect() as db:before=db.execute(text('SELECT count(*) FROM chat_message WHERE session_id=:s'),{'s':session['id']}).scalar_one()
        started=time.monotonic();checks={};response=None;error=None
        try:response=await runtime.answer(session['id'],None,key,case['question'],'eval-'+case['id'])
        except InternalError as caught:error=caught.status
        elapsed=round((time.monotonic()-started)*1000,3);latencies.append(elapsed)
        with engine.connect() as db:after=db.execute(text('SELECT count(*) FROM chat_message WHERE session_id=:s'),{'s':session['id']}).scalar_one()
        if case['expect']=='error':
            checks={'expected_error':error==case['status'],'no_partial_messages':after==before}
        elif response is not None:
            cards=response['product_cards'];card_count+=len(cards)
            valid=all(c['product_id'] in catalog.verified and c['current_price_vnd']==price(catalog.verified[c['product_id']]) and c['status']=='ACTIVE' for c in cards)
            invalid_cards+=0 if valid else len(cards)
            checks={'response_contract':not schema_errors(response,OPERATIONS['sendChatMessage']['responses']['200']),
                    'current_cards':valid,'atomic_message_pair':after==before+2,'explicit_fallback':response['fallback'] is True,
                    'card_expectation':len(cards)==0 if case['expect']=='empty' else len(cards)>=case.get('min_cards',1)}
            if case.get('reason'):checks['reason']=response['fallback_reason']==case['reason']
            if case.get('expected_products') is not None:checks['expected_ids']={c['product_id'] for c in cards}=={id_for(name) for name in case['expected_products']}
            if case.get('max_price_vnd') is not None:checks['price_budget']=all(c['current_price_vnd']<=case['max_price_vnd'] for c in cards)
        else:checks={'unexpected_error':False}
        raw.append({'case_id':case['id'],'status':'PASS' if checks and all(checks.values()) else 'FAIL','checks':checks,'latency_ms':elapsed,
                    'error_status':error,'fallback_reason':response['fallback_reason'] if response else None,
                    'cards':response['product_cards'] if response else [],'answer':response['content'] if response else None})
    return {'status':'PASS' if all(r['status']=='PASS' for r in raw) else 'FAIL','data_source':spec['data_source'],'dataset_version':spec['dataset_version'],
            'dataset_sha256':hashlib.sha256(CASES.read_bytes()).hexdigest(),'prompt_version':PROMPT_VERSION,'index_version':'lexical-hash-v1','provider':'none','model':'NOT_CONFIGURED',
            'generation_quality_status':'NOT_RUN','human_review_status':'REQUIRED','actual_tokens':None,'cost_usd':None,
            'metrics':{'cases':len(raw),'passed':sum(r['status']=='PASS' for r in raw),'cards':card_count,'invalid_cards':invalid_cards,
                       'current_card_rate':(card_count-invalid_cards)/card_count if card_count else None,'latency_ms':{'method':'nearest_rank','p50':percentile(latencies,.5),'p95':percentile(latencies,.95),'max':max(latencies)}},
            'raw':raw,'manual_review_required':spec['manual_review_required'],
            'limits':['Catalog is a scenario test double; no live M1/M3 or real model benchmark','Latency is isolated DB/runtime control latency, not end-to-end gateway/provider load','Automated card checks do not grade free-form groundedness/relevance/hallucination','No model/provider calls; fallback is intentional']}

def provenance():
    app=Path(__file__).parents[1]
    paths=['evaluation/benchmark.py','evaluation/dataset.py','evaluation/pipeline.py','evaluation/ranking.py','chat/runtime.py','chat/retrieval.py','chat/provider.py','recommendation/als.py','safety.py']
    return {path:hashlib.sha256((app/path).read_bytes()).hexdigest() for path in paths}

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--output',required=True,type=Path);parser.add_argument('--suite',choices=['all','recommendation','chat'],default='all')
    parser.add_argument('--commit',default='UNKNOWN');parser.add_argument('--fail-on-quality',action='store_true');args=parser.parse_args()
    if args.commit!='UNKNOWN' and not re.fullmatch('[a-f0-9]{7,40}',args.commit):parser.error('Commit must be a Git SHA')
    report={'report_version':'1.0','created_at':datetime.now(timezone.utc).isoformat(),'commit':args.commit,'source_sha256':provenance(),'runtime':{'python':platform.python_version(),'numpy':np.__version__},'data_source':'SYNTHETIC_CONTROL','marketplace_acceptance':'NOT_RUN'}
    if args.suite in ('all','recommendation'):report['recommendation']=recommendation_suite()
    if args.suite in ('all','chat'):
        from .isolation import database
        with database() as engine:report['chat']=asyncio.run(chat_suite(engine))
    report['status']='PASS' if all(report[s]['status']=='PASS' for s in ('recommendation','chat') if s in report) else 'FAIL'
    args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(json.dumps(report,ensure_ascii=False,indent=2,allow_nan=False)+'\n',encoding='utf-8')
    if 'chat' in report:
        review={'data_source':'SYNTHETIC_CONTROL','report_sha256':hashlib.sha256(args.output.read_bytes()).hexdigest(),'provider':'none','generation_quality_status':'NOT_RUN',
                'instructions':'Human review template only. Fill rubric scores after reviewing evidence; no model-quality claim for provider none.',
                'rubric':{'groundedness':'0 unsupported; 1 partial; 2 all factual claims verified','relevance':'0 irrelevant; 1 partial; 2 meets question','hallucination':'true if unsupported product/price/fact; false only after review'},
                'cases':[{'case_id':r['case_id'],'reviewer_alias':None,'groundedness':None,'relevance':None,'hallucination':None,'notes':None} for r in report['chat']['raw']]}
        args.output.with_suffix('.review-template.json').write_text(json.dumps(review,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'status':report['status'],'data_source':report['data_source'],'output':str(args.output),'marketplace_acceptance':'NOT_RUN'}))
    if report['status']!='PASS':raise SystemExit(1)
    if args.fail_on_quality and 'recommendation' in report and not report['recommendation']['ranking']['quality_pass']:raise SystemExit(2)

if __name__=='__main__':main()

import asyncio,copy,json
import pytest
from app.evaluation.dataset import recommendation_data,validate
from app.evaluation.benchmark import recommendation_suite,chat_suite
from app.evaluation.ranking import content_rank,split_temporal,evaluate
from app.evaluation.pipeline import run
from test_consent_tracking import engine

def test_synthetic_data_is_versioned_deterministic_and_contract_valid():
    products,rows=recommendation_data()
    assert (products,rows)==recommendation_data()
    assert len(products)==72 and len(rows)==1200
    train,validation,test=split_temporal(rows)
    assert (len(train),len(validation),len(test))==(720,240,240)
    assert max(r['occurred_at'] for r in train)<min(r['occurred_at'] for r in validation)<min(r['occurred_at'] for r in test)
    bad=copy.deepcopy(rows);bad[0]['product_id']='foreign'
    with pytest.raises(ValueError):validate(products,bad)
    with pytest.raises(ValueError):validate(products,rows+[rows[0]])

def test_content_baseline_uses_only_train_and_same_candidate_exclusions():
    products,rows=recommendation_data();train,_,_=split_temporal(rows)
    user=rows[0]['user_id'];candidates={p['id'] for p in products};seen={r['product_id'] for r in train if r['user_id']==user}
    prediction=content_rank(train,user,products,candidates,seen)
    assert not seen.intersection(prediction) and set(prediction)<=candidates
    family={p['id'] for p in products if p['product_type_id']==products[0]['product_type_id']}
    assert set(prediction[:6])==family-seen
    assert content_rank(train,'new-user',products,candidates)==[]
    assert not content_rank(train,user,products,[],seen)

def test_benchmark_reports_real_comparisons_without_claiming_marketplace_quality():
    report=recommendation_suite();ranking=report['ranking']
    assert report['status']=='PASS' and report['acceptance']=='NOT_RUN_ON_REAL_DATA'
    assert ranking['users']==60 and ranking['content_baseline_status']=='COMPLETED'
    assert ranking['model']['ndcg_at_k']>ranking['content_baseline']['ndcg_at_k']>ranking['baseline']['ndcg_at_k']
    assert 'user_id' not in json.dumps(ranking['raw'])
    assert all('content_baseline' in case for case in ranking['raw'])
    assert ranking['selection_metric']=='validation model NDCG@10'
    products,rows=recommendation_data()
    _,same=run(rows,[p['id'] for p in products],products)
    assert ranking==same

def test_quality_is_not_claimed_without_content_baseline_or_eligible_test_cases():
    products,rows=recommendation_data();train,_,test=split_temporal(rows)
    artifact,_=run(rows,[p['id'] for p in products],products)
    missing=evaluate(artifact,train,test,[p['id'] for p in products])
    assert not missing['quality_pass'] and missing['quality_status']=='NOT_RUN'
    empty=evaluate(artifact,train,[],[p['id'] for p in products],products=products)
    assert not empty['quality_pass'] and empty['quality_status']=='NOT_EVALUABLE' and empty['users']==0

def test_chat_safety_benchmark_is_isolated_explicit_fallback_and_current_cards(engine):
    report=asyncio.run(chat_suite(engine))
    assert report['status']=='PASS',[(r['case_id'],r['checks']) for r in report['raw'] if r['status']=='FAIL']
    assert report['metrics']['cases']==13 and report['metrics']['invalid_cards']==0
    assert report['metrics']['current_card_rate']==1
    assert report['generation_quality_status']=='NOT_RUN' and report['provider']=='none'
    assert report['cost_usd'] is None and report['human_review_status']=='REQUIRED'
    raw=json.dumps(report['raw']);assert 'anonymous_key' not in raw and 'session_id' not in raw
    errors=[r for r in report['raw'] if r['error_status']]
    assert {r['error_status'] for r in errors}=={404,503}
    assert all(r['checks']['no_partial_messages'] for r in errors)

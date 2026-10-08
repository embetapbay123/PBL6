from collections import defaultdict,Counter
from math import log2
from ..recommendation.als import rank
from ..safety import tokens,public_text,price

def content_rank(train,user,products,candidates,exclude=()):
    """Content/behavior baseline fitted only to this user's TRAIN observations."""
    catalog={p['id']:p for p in products};weights=Counter()
    for row in train:
        if row['user_id']==user:weights[row['product_id']]+=row['weight']
    terms=Counter();types=Counter()
    for id,weight in weights.items():
        if id not in catalog:continue
        p=catalog[id];types[p.get('product_type_id')]+=weight
        for term in set(tokens(public_text(p))):terms[term]+=weight
    if not terms and not types:return []
    eligible=set(candidates)-set(exclude)
    score=lambda p:(-(10*types[p.get('product_type_id')]+sum(terms[t] for t in set(tokens(public_text(p))))),p['id'])
    return [p['id'] for p in sorted((p for id,p in catalog.items() if id in eligible and price(p) is not None),key=score)]

def split_temporal(rows):
    # Per-user 60/20/20; ties at boundaries stay in the same fold, never leak equal timestamps.
    grouped=defaultdict(list)
    for r in rows:grouped[r['user_id']].append(r)
    folds=[[],[],[]]
    for user,data in sorted(grouped.items()):
        times=sorted({r['occurred_at'] for r in data})
        if len(times)<3:folds[0].extend(data);continue
        a=times[max(0,int(len(times)*.6)-1)];b=times[max(1,int(len(times)*.8)-1)]
        for r in sorted(data,key=lambda r:(r['occurred_at'],r['event_id'])):folds[0 if r['occurred_at']<=a else 1 if r['occurred_at']<=b else 2].append(r)
    return folds

def metrics(predicted,relevant,k=10):
    predicted=list(dict.fromkeys(predicted))[:k];relevant=set(relevant)
    hits=[int(p in relevant) for p in predicted]
    ideal=sum(1/log2(i+2) for i in range(min(k,len(relevant))))
    return {'precision_at_k':sum(hits)/k,'recall_at_k':sum(hits)/len(relevant) if relevant else 0,
            'ndcg_at_k':sum(hit/log2(i+2) for i,hit in enumerate(hits))/ideal if ideal else 0}

def evaluate(artifact,train,test,candidates,k=10,products=None):
    if not 1<=k<=100:raise ValueError('Invalid K')
    candidate_set=set(candidates);popular=Counter();seen=defaultdict(set);truth=defaultdict(set)
    for r in train:popular[r['product_id']]+=r['weight'];seen[r['user_id']].add(r['product_id'])
    for r in test:
        if r['product_id'] in candidate_set and r['product_id'] not in seen[r['user_id']]:truth[r['user_id']].add(r['product_id'])
    baseline=sorted(candidate_set,key=lambda p:(-popular[p],p));raw=[];covered=set();cold=0;content_covered=set()
    for user,relevant in sorted(truth.items()):
        if not relevant:continue
        prediction=rank(artifact,user,candidate_set,seen[user]);cold+=not bool(prediction)
        base=[p for p in baseline if p not in seen[user]][:k]
        prediction=prediction[:k];covered.update(prediction)
        # No User identifier in raw results; only case number/counts/rank positions.
        raw.append({'case':len(raw)+1,'relevant_count':len(relevant),'model':metrics(prediction,relevant,k),'baseline':metrics(base,relevant,k),'cold_start':not bool(prediction)})
        if products is not None:
            content=content_rank(train,user,products,candidate_set,seen[user])[:k];content_covered.update(content)
            raw[-1]['content_baseline']=metrics(content,relevant,k)
    average=lambda name:{key:sum(r[name][key] for r in raw)/len(raw) if raw else 0 for key in ('precision_at_k','recall_at_k','ndcg_at_k')}
    model,base=average('model'),average('baseline')
    result={'k':k,'users':len(raw),'cold_start_users':cold,'catalog_coverage':len(covered)/len(candidate_set) if candidate_set else 0,
            'model':model,'baseline':base,'raw':raw,'quality_pass':bool(raw) and any(model[key]>base[key] for key in model)}
    result['quality_pass_vs_popularity']=result['quality_pass']
    result['content_baseline_status']='NOT_RUN' if products is None else 'COMPLETED'
    result['quality_pass']=False
    result['quality_status']='NOT_RUN' if products is None else 'NOT_EVALUABLE'
    if products is not None:
        content=average('content_baseline');result['content_baseline']=content
        result['content_catalog_coverage']=len(content_covered)/len(candidate_set) if candidate_set else 0
        result['quality_pass_vs_content']=bool(raw) and any(model[key]>content[key] for key in model)
        result['quality_pass']=result['quality_pass_vs_popularity'] and result['quality_pass_vs_content']
        if raw:result['quality_status']='PASS' if result['quality_pass'] else 'FAIL'
    return result

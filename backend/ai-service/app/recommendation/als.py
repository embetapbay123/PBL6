"""Hu/Koren/Volinsky implicit ALS: confidence=1+alpha*weight, p=1 for observed items.

Reference: https://yifanhu.net/PUB/cf.pdf. Sparse observations, finite JSON artifacts.
"""
from collections import defaultdict
import numpy as np

def fit(rows,*,factors=8,iterations=6,regularization=.1,alpha=20,seed=17):
    if not 1<=factors<=32 or not 1<=iterations<=30 or not .001<=regularization<=10 or not 0<alpha<=100:raise ValueError('ALS configuration')
    users=sorted({r['user_id'] for r in rows});items=sorted({r['product_id'] for r in rows})
    if not users or not items:raise ValueError('Empty ALS dataset')
    if len(users)>1000 or len(items)>5000:raise ValueError('Dataset exceeds demo training budget')
    ui={u:i for i,u in enumerate(users)};ii={p:i for i,p in enumerate(items)}
    observed=defaultdict(dict)
    for r in rows:
        if not np.isfinite(float(r['weight'])) or float(r['weight'])<=0:raise ValueError('Invalid observation weight')
        u,i=ui[r['user_id']],ii[r['product_id']]
        observed[u][i]=min(100,observed[u].get(i,0)+float(r['weight']))
    reverse=defaultdict(dict)
    for u,values in observed.items():
        for i,value in values.items():reverse[i][u]=value
    rng=np.random.default_rng(seed);x=rng.normal(0,.01,(len(users),factors));y=rng.normal(0,.01,(len(items),factors));eye=np.eye(factors)*regularization
    def solve(other,data,target):
        gram=other.T@other
        for index,values in data.items():
            ids=list(values);v=other[ids];c=1+alpha*np.array(list(values.values()))
            target[index]=np.linalg.solve(gram+(v.T*(c-1))@v+eye,v.T@c)
    for _ in range(iterations):solve(y,observed,x);solve(x,reverse,y)
    if not np.isfinite(x).all() or not np.isfinite(y).all():raise ValueError('Non-finite model')
    return {'users':users,'items':items,'user_factors':x.tolist(),'item_factors':y.tolist(),'algorithm':'implicit-als-v1'}

def rank(artifact,user,candidates,exclude=()):
    if user not in artifact['users']:return []
    scores=np.asarray(artifact['item_factors'])@np.asarray(artifact['user_factors'][artifact['users'].index(user)])
    eligible=set(candidates)-set(exclude)
    return [p for _,p in sorted([(-float(s),p) for p,s in zip(artifact['items'],scores) if p in eligible])]

from sqlalchemy import text

def read_metrics(engine,scope):
    from ..internal_client import InternalError
    if scope.get('scope') not in ('STORE','PLATFORM') or scope.get('scope')=='STORE' and not scope.get('store_id'):
        raise InternalError(503,'DEPENDENCY_CONTRACT_INVALID','Scope metrics không hợp lệ.')
    store=scope.get('store_id')
    with engine.connect() as db:
        params={'store':store}
        # Owner aggregates only traces with exactly that one Store; mixed/global traces are excluded.
        condition="WHERE store_ids=CAST(:stores AS jsonb)" if store else ''
        import json
        params['stores']=json.dumps([store]) if store else '[]'
        trace=db.execute(text('SELECT count(*) AS requests,avg(latency_ms) AS latency_ms,percentile_cont(0.95) WITHIN GROUP(ORDER BY latency_ms) AS latency_p95_ms,avg(CASE WHEN fallback THEN 1.0 ELSE 0 END) AS fallback_rate,CASE WHEN count(actual_tokens)=count(*) AND count(*)>0 THEN sum(actual_tokens) END AS actual_tokens,CASE WHEN count(cost_usd)=count(*) AND count(*)>0 THEN sum(cost_usd) END AS cost_usd,count(actual_tokens) AS token_samples,count(cost_usd) AS cost_samples FROM ai_request_trace '+condition),params).mappings().one()
        evaluation_condition='WHERE scope_store_id=:store' if store else ''
        evaluation=db.execute(text('SELECT raw_result FROM model_evaluation '+evaluation_condition+' ORDER BY evaluated_at DESC LIMIT 1'),params).scalar()
        metrics={k:float(v) if v is not None and k not in ('requests','actual_tokens') else v for k,v in trace.items()}
        metrics['sample_window']='ALL_RETAINED_TRACES'
        metrics['sample_limitations']='Seed/test traffic may be present; unknown costs/tokens are not zero. Owner excludes mixed-Store traces.'
        if evaluation:metrics['ranking']=evaluation
        versions=db.execute(text('SELECT provider,model_name,prompt_version,index_version,count(*) AS samples FROM ai_request_trace '+condition+' GROUP BY provider,model_name,prompt_version,index_version ORDER BY samples DESC LIMIT 20'),params).mappings().all()
        metrics['versions']=[dict(v) for v in versions]
        # Model IDs/training dates and global dataset counts are Admin-only.
        model=None if store else db.execute(text("SELECT version,trained_at FROM model_version WHERE status='ACTIVE' ORDER BY trained_at DESC LIMIT 1")).mappings().first()
        result={'index_status':'LIVE_LEXICAL_BASELINE','evaluation_status':'COMPLETED' if evaluation else 'NOT_RUN','metrics':metrics,'mode':'real'}
        if model:result.update(model_version=model['version'],last_training_at=model['trained_at'].isoformat())
        return result

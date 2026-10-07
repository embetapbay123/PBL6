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
        trace=db.execute(text('SELECT count(*) AS requests,avg(latency_ms) AS latency_ms,avg(CASE WHEN fallback THEN 1.0 ELSE 0 END) AS fallback_rate,sum(actual_tokens) AS actual_tokens,sum(cost_usd) AS cost_usd FROM ai_request_trace '+condition),params).mappings().one()
        condition='WHERE scope_store_id=:store' if store else ''
        evaluation=db.execute(text('SELECT raw_result FROM model_evaluation '+condition+' ORDER BY evaluated_at DESC LIMIT 1'),params).scalar()
        metrics={k:float(v) if v is not None and k not in ('requests','actual_tokens') else v for k,v in trace.items()}
        if evaluation:metrics['ranking']=evaluation
        # Model IDs/training dates and global dataset counts are Admin-only.
        model=None if store else db.execute(text("SELECT version,trained_at FROM model_version WHERE status='ACTIVE' ORDER BY trained_at DESC LIMIT 1")).mappings().first()
        result={'index_status':'LIVE_LEXICAL_BASELINE','evaluation_status':'COMPLETED' if evaluation else 'NOT_RUN','metrics':metrics,'mode':'real'}
        if model:result.update(model_version=model['version'],last_training_at=model['trained_at'].isoformat())
        return result

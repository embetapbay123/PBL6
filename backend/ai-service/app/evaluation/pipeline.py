"""Same pure train/validation/test pipeline for DB jobs and isolated benchmarks."""
from ..recommendation.als import fit
from .ranking import split_temporal,evaluate

def run(rows,candidates,products=None):
    training,validation,test=split_temporal(rows);choices=[]
    for regularization in (.1,1):
        config={'factors':8,'iterations':6,'alpha':20,'regularization':regularization,'seed':17}
        artifact=fit(training,**config)
        validation_result=evaluate(artifact,training,validation,candidates,products=products)
        choices.append((validation_result['model']['ndcg_at_k'],config,artifact,validation_result))
    _,config,artifact,validation_result=max(choices,key=lambda c:c[0])
    result=evaluate(artifact,training,test,candidates,products=products)
    result.update({'split':'per-user timestamp 60/20/20; ties grouped','validation_events':len(validation),'train_events':len(training),'test_events':len(test),'config':config,'selection_metric':'validation model NDCG@10','validation_model_metrics':validation_result['model']})
    return artifact,result

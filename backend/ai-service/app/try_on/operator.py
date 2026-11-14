"""Local operator controls, requiring the service's database credentials. No public cost override endpoint."""
import argparse
import json
import os
import uuid

from sqlalchemy import create_engine, text

from .config import Settings
from .repository import Repository, row


def apply(repo, action, actor, reference, job_id=None, cost=None):
    if not actor.strip() or len(actor) > 100 or not reference.strip() or len(reference) > 200:
        raise ValueError('Provide a short operator identity and reconciliation reference, without secrets.')
    with repo.engine.begin() as db:
        repo.guard(db)
        if action in ('PAUSE', 'RESUME'):
            if action == 'RESUME' and not repo.settings.ready:
                raise ValueError('Configure key, signing secret and budgets before resuming.')
            db.execute(text('UPDATE try_on_guard SET paused=:paused,updated_at=now() WHERE id=1'), {'paused': action == 'PAUSE'})
        elif action == 'RECONCILE':
            if type(cost) is not int or not 0 <= cost <= 1000000000:
                raise ValueError('Verified cost in USD micro-units is required.')
            job = row(db.execute(text('SELECT * FROM try_on_job WHERE id=:id FOR UPDATE'), {'id': str(uuid.UUID(str(job_id)))}))
            if not job or job['status'] not in ('UNKNOWN', 'FAILED') or job['cost_state'] == 'RELEASED':
                raise ValueError('Only a completed/unknown provider attempt can be reconciled.')
            db.execute(text("""UPDATE try_on_job SET status='FAILED',cost_state='SETTLED',charged_micro_usd=:cost,
              message='Không còn ảnh kết quả. Bạn có thể tạo lại trong hạn mức.',updated_at=now() WHERE id=:id"""), {'cost': cost, 'id': job_id})
            if cost > job['reserved_micro_usd']:
                db.execute(text('UPDATE try_on_guard SET paused=true,updated_at=now() WHERE id=1'))
        else:
            raise ValueError('Unknown action')
        db.execute(text('INSERT INTO try_on_budget_audit(id,job_id,action,actor,reference,charged_micro_usd) VALUES(:id,:job,:action,:actor,:ref,:cost)'),
                   {'id': str(uuid.uuid4()), 'job': job_id, 'action': action, 'actor': actor, 'ref': reference, 'cost': cost})


def main():
    parser = argparse.ArgumentParser(description='Read metadata, pause, or reconcile after checking OpenAI usage. Never pass a key on the command line.')
    parser.add_argument('action', choices=['status', 'pause', 'resume', 'reconcile'])
    parser.add_argument('--actor'); parser.add_argument('--reference'); parser.add_argument('--job-id'); parser.add_argument('--cost-micro-usd', type=int)
    args = parser.parse_args()
    settings = Settings.load()
    engine = create_engine(os.environ['M4_DATABASE_URL'].replace('postgresql://', 'postgresql+psycopg://', 1), hide_parameters=True)
    repo = Repository(engine, settings)
    try:
        if args.action != 'status':
            apply(repo, args.action.upper(), args.actor or '', args.reference or '', args.job_id, args.cost_micro_usd)
        with engine.connect() as db:
            stats = repo.stats(db)
            # Only counters and money; never personal images, raw IPs or API credentials.
            value = {key: int(stats[key]) for key in ['day_calls', 'month_calls', 'day_spend', 'month_spend', 'unknown_jobs']}
            value.update(configured=settings.ready, key_configured=bool(settings.api_key), signing_key_configured=len(settings.signing_key)>=32,
                         demo_mode=settings.demo_mode,
                         daily_budget_micro_usd=settings.daily_budget, monthly_budget_micro_usd=settings.monthly_budget,
                         paused=db.execute(text('SELECT paused FROM try_on_guard WHERE id=1')).scalar_one())
            print(json.dumps(value))
    finally:
        engine.dispose()


if __name__ == '__main__':
    main()

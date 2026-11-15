"""Local reconciliation only. Provider usage must be verified outside this tool."""
import argparse
import json
import os
import uuid

from sqlalchemy import create_engine, text
from ..paid_budget import shared_spend
from ..try_on.config import periods


def reconcile(engine, call_id, cost, actor, reference):
    if type(cost) is not int or not 0 <= cost <= 1000000000 or not actor.strip() or len(actor) > 100 or not reference.strip() or len(reference) > 200:
        raise ValueError('Supply verified cost, an operator identity and a reconciliation reference; never a provider key.')
    call_id = str(uuid.UUID(call_id))
    with engine.begin() as db:
        db.execute(text('SELECT paused FROM try_on_guard WHERE id=1 FOR UPDATE'))
        row = db.execute(text('SELECT * FROM paid_ai_call WHERE id=:id FOR UPDATE'), {'id': call_id}).mappings().first()
        if not row or row['status'] not in ('UNKNOWN', 'FAILED', 'CANCELLED') or row['cost_state'] != 'UNKNOWN':
            raise ValueError('Only a finished/unknown call with unconfirmed monetary usage can be reconciled.')
        db.execute(text("""UPDATE paid_ai_call SET status=CASE WHEN content_deleted_at IS NULL THEN 'FAILED' ELSE 'CANCELLED' END,
          cost_state='SETTLED',charged_micro_usd=:cost,charge_basis=NULL,error_code='CHAT_MEDIA_RECONCILED',lease_until=NULL,updated_at=now() WHERE id=:id"""), {'id': call_id, 'cost': cost})
        db.execute(text("UPDATE ai_chat_attachment SET turn_id=NULL,expires_at=least(expires_at,created_at+interval '24 hours'),version=version+1,updated_at=now() WHERE turn_id=:id AND message_id IS NULL"), {'id': call_id})
        if cost > row['reserved_micro_usd']:
            db.execute(text('UPDATE try_on_guard SET paused=true,updated_at=now() WHERE id=1'))
        db.execute(text('INSERT INTO paid_ai_budget_audit(id,call_id,actor,reference,charged_micro_usd) VALUES(:audit,:id,:actor,:ref,:cost)'), {'audit': str(uuid.uuid4()), 'id': call_id, 'actor': actor, 'ref': reference, 'cost': cost})


def main():
    parser = argparse.ArgumentParser(description='Read aggregate AI budget or reconcile a verified media call. No public cost override endpoint.')
    parser.add_argument('action', choices=['status', 'reconcile'])
    parser.add_argument('--call-id');parser.add_argument('--cost-micro-usd', type=int);parser.add_argument('--actor');parser.add_argument('--reference')
    args = parser.parse_args()
    engine = create_engine(os.environ['M4_DATABASE_URL'].replace('postgresql://', 'postgresql+psycopg://', 1), hide_parameters=True)
    try:
        if args.action == 'reconcile':
            reconcile(engine, args.call_id or '', args.cost_micro_usd, args.actor or '', args.reference or '')
        with engine.connect() as db:
            day, month, _ = periods()
            state = shared_spend(db, day, month)
            state['paused'] = db.execute(text('SELECT paused FROM try_on_guard WHERE id=1')).scalar_one()
            state['unknown_media_calls'] = db.execute(text("SELECT count(*) FROM paid_ai_call WHERE cost_state='UNKNOWN'")).scalar_one()
        print(json.dumps(state))
    finally:
        engine.dispose()


if __name__ == '__main__':
    main()

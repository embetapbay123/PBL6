import asyncio
import io
import os
import uuid
from concurrent.futures import ThreadPoolExecutor
from dataclasses import replace
from datetime import timedelta
from pathlib import Path

import pytest
from PIL import Image
from sqlalchemy import create_engine, text

from app.try_on.config import CONSENT_VERSION, Settings, TryOnError, now
from app.try_on.provider import Outcome
from app.try_on.repository import Repository
from app.try_on.service import TryOnService
from app.try_on.storage import PrivateStorage
from app.try_on.worker import Worker

pytestmark = pytest.mark.skipif(not os.getenv('M4_DATABASE_URL'), reason='Requires PostgreSQL; creates isolated schemas only')


@pytest.fixture
def engine():
    url = os.environ['M4_DATABASE_URL'].replace('postgresql://', 'postgresql+psycopg://', 1)
    root = create_engine(url, hide_parameters=True)
    schema = 'test_try_on_' + uuid.uuid4().hex
    with root.begin() as db:
        db.execute(text('CREATE SCHEMA ' + schema))
        db.execute(text('SET LOCAL search_path TO ' + schema + ',public'))
        db.exec_driver_sql((Path(__file__).resolve().parents[1] / 'migrations/009_virtual_try_on.sql').read_text())
    scoped = create_engine(url, connect_args={'options': '-csearch_path=' + schema + ',public'}, hide_parameters=True)
    try: yield scoped
    finally:
        scoped.dispose()
        with root.begin() as db: db.execute(text('DROP SCHEMA ' + schema + ' CASCADE'))
        root.dispose()


@pytest.fixture
def setup(engine, tmp_path):
    cfg = Settings(enabled=True, api_key='fake-not-an-openai-key', signing_key='s' * 32, daily_budget=10000000, monthly_budget=100000000,
                   storage_dir=str(tmp_path), cooldown_seconds=0)
    return Repository(engine, cfg), PrivateStorage(tmp_path), cfg


def image_bytes():
    data = io.BytesIO(); Image.new('RGB', (720, 960), 'tan').save(data, 'JPEG'); return data.getvalue()


def inputs(repo, storage, user=None):
    user = user or str(uuid.uuid4())
    photo = repo.add_photo(user, storage.new(image_bytes(), 'photo'))
    payload = {'photo_id': str(photo['id']), 'product_id': str(uuid.uuid4()), 'variant_id': str(uuid.uuid4()), 'consent_version': CONSENT_VERSION}
    return user, payload


def create(repo, storage, user, payload, key=None):
    return repo.create(user, payload, key or str(uuid.uuid4()), 'a' * 64, storage.new(image_bytes(), 'garment'), str(uuid.uuid4()), 1, 'tops')[0]


def test_same_key_is_idempotent_and_different_payload_is_rejected(setup):
    repo, storage, cfg = setup; user, payload = inputs(repo, storage); key = str(uuid.uuid4())
    job = create(repo, storage, user, payload, key)
    again = create(repo, storage, user, payload, key)
    assert job['id'] == again['id']
    with pytest.raises(TryOnError) as error: create(repo, storage, user, {**payload, 'variant_id': str(uuid.uuid4())}, key)
    assert error.value.code == 'IDEMPOTENCY_CONFLICT'
    with repo.engine.connect() as db:
        assert db.execute(text('SELECT count(*) FROM try_on_job')).scalar_one() == 1
        assert repo.stats(db, user)['day_spend'] == cfg.reservation


def test_concurrent_last_budget_admission_is_atomic(setup):
    original, storage, cfg = setup
    repo = Repository(original.engine, replace(cfg, daily_budget=cfg.reservation, monthly_budget=cfg.reservation))
    attempts = [inputs(repo, storage), inputs(repo, storage)]
    def submit(value):
        try: return create(repo, storage, *value)['status']
        except TryOnError as error: return error.code
    with ThreadPoolExecutor(2) as pool: results = list(pool.map(submit, attempts))
    assert sorted(results) == ['QUEUED', 'TRY_ON_BUDGET']
    with repo.engine.connect() as db: assert repo.stats(db)['day_spend'] == cfg.reservation


def test_per_user_daily_limit_and_ownership(setup):
    repo, storage, cfg = setup; user, payload = inputs(repo, storage)
    for _ in range(3):
        job = create(repo, storage, user, payload); claimed = repo.claim(); assert claimed['id'] == job['id']
        assert repo.dispatch(claimed)
        repo.finish(claimed, 'SUCCEEDED', cost=10000)
    with pytest.raises(TryOnError) as error: create(repo, storage, user, payload)
    assert error.value.code == 'TRY_ON_QUOTA'
    assert repo.capability(user)['quota']['remaining'] == 0
    other = str(uuid.uuid4())
    for call in [lambda: repo.get(other, job['id']), lambda: repo.delete(other, job['id']), lambda: repo.delete_photo(other, payload['photo_id'])]:
        with pytest.raises(TryOnError) as error: call()
        assert error.value.status == 404


class Provider:
    def __init__(self, status='SUCCEEDED', during=None): self.calls = 0; self.status = status; self.during = during
    async def edit(self, *args):
        self.calls += 1
        if self.during: self.during()
        return Outcome(self.status, image=image_bytes() if self.status == 'SUCCEEDED' else None, cost=12000 if self.status == 'SUCCEEDED' else None, request_id='req_fixture')


def test_unknown_submission_stays_reserved_and_never_retries_even_after_delete(setup):
    repo, storage, cfg = setup; user, payload = inputs(repo, storage)
    job = create(repo, storage, user, payload); provider = Provider('UNKNOWN'); worker = Worker(repo, storage, cfg, provider)
    assert asyncio.run(worker.once()); worker.recover(); assert not asyncio.run(worker.once())
    assert provider.calls == 1 and repo.get(user, job['id'])['status'] == 'UNKNOWN'
    repo.delete(user, job['id'])
    with repo.engine.connect() as db: assert repo.stats(db)['day_spend'] == cfg.reservation
    with pytest.raises(TryOnError) as error: create(repo, storage, user, payload)
    assert error.value.code == 'TRY_ON_PENDING'


def test_receipt_recovers_database_failure_without_second_provider_call(setup, monkeypatch):
    repo, storage, cfg = setup; user, payload = inputs(repo, storage); job = create(repo, storage, user, payload)
    provider = Provider(); worker = Worker(repo, storage, cfg, provider); finish = repo.finish
    monkeypatch.setattr(repo, 'finish', lambda *a, **k: (_ for _ in ()).throw(RuntimeError('DB unavailable')))
    assert asyncio.run(worker.once()); assert provider.calls == 1
    monkeypatch.setattr(repo, 'finish', finish)
    with repo.engine.begin() as db: db.execute(text("UPDATE try_on_job SET lease_until=now()-interval '1 second' WHERE id=:id"), {'id': job['id']})
    worker.recover(); assert not asyncio.run(worker.once())
    result = repo.get(user, job['id']); assert result['status'] == 'SUCCEEDED' and result['charged_micro_usd'] == 12000
    assert provider.calls == 1


def test_signed_result_is_short_lived_and_delete_prevents_resurrection(setup):
    repo, storage, cfg = setup; user, payload = inputs(repo, storage); job = create(repo, storage, user, payload)
    worker = Worker(repo, storage, cfg, Provider()); assert asyncio.run(worker.once())
    svc = TryOnService(repo, storage, cfg, None); result = repo.get(user, job['id'])
    expiry = int((now() + timedelta(minutes=4)).timestamp()); signature = svc.signature(result, expiry)
    assert svc.result_path(str(job['id']), expiry, signature).is_file()
    for at, token in [(expiry, 'a' * 64), (int(now().timestamp()) - 1, signature)]:
        with pytest.raises(TryOnError): svc.result_path(str(job['id']), at, token)
    repo.delete(user, job['id']); worker.cleanup()
    with pytest.raises(TryOnError): svc.result_path(str(job['id']), expiry, signature)
    assert not storage.path(job['id'].hex + '.result.jpg').exists()


def test_delete_during_provider_call_never_republishes_output(setup):
    repo, storage, cfg = setup; user, payload = inputs(repo, storage); job = create(repo, storage, user, payload)
    provider = Provider(during=lambda: repo.delete_photo(user, payload['photo_id']))
    worker = Worker(repo, storage, cfg, provider); assert asyncio.run(worker.once()); worker.cleanup()
    assert not storage.path(job['id'].hex + '.result.jpg').exists()
    assert provider.calls == 1
    with repo.engine.connect() as db:
        assert repo.stats(db)['day_spend'] == 12000


def test_deleted_or_expired_queue_releases_hold_without_openai_call(setup):
    repo, storage, cfg = setup; user, payload = inputs(repo, storage); job = create(repo, storage, user, payload)
    repo.delete(user, job['id']); provider = Provider(); worker = Worker(repo, storage, cfg, provider)
    assert not asyncio.run(worker.once()); worker.cleanup(); assert provider.calls == 0
    with repo.engine.connect() as db: assert repo.stats(db, user)['day_spend'] == repo.stats(db, user)['user_calls'] == 0


def test_cost_above_reservation_pauses_new_admission(setup):
    repo, storage, cfg = setup; user, payload = inputs(repo, storage); create(repo, storage, user, payload)
    claimed = repo.claim(); repo.dispatch(claimed); repo.finish(claimed, 'SUCCEEDED', cost=cfg.reservation + 1)
    assert not repo.capability(user)['enabled']
    with pytest.raises(TryOnError): create(repo, storage, *inputs(repo, storage))


def test_operator_reconciles_verified_cost_without_erasing_attempt_or_audit(setup):
    from app.try_on.operator import apply
    repo, storage, cfg = setup; user, payload = inputs(repo, storage); job = create(repo, storage, user, payload)
    claimed = repo.claim(); repo.dispatch(claimed); repo.finish(claimed, 'UNKNOWN')
    apply(repo, 'PAUSE', 'test-operator', 'Investigate unknown attempt')
    assert not repo.capability(user)['enabled']
    apply(repo, 'RECONCILE', 'test-operator', 'Verified fixture usage export', str(job['id']), 7000)
    apply(repo, 'RESUME', 'test-operator', 'Reconciliation complete')
    assert repo.get(user, job['id'])['status'] == 'FAILED'
    with repo.engine.connect() as db:
        value = repo.stats(db, user)
        assert value['day_spend'] == 7000 and value['user_calls'] == 1 and value['pending'] == 0
        assert db.execute(text('SELECT count(*) FROM try_on_budget_audit')).scalar_one() == 3


def test_ip_limit_is_shared_by_different_accounts(setup):
    original, storage, cfg = setup
    repo = Repository(original.engine, replace(cfg, ip_daily_limit=1))
    user, payload = inputs(repo, storage); create(repo, storage, user, payload)
    claimed = repo.claim(); repo.dispatch(claimed); repo.finish(claimed, 'SUCCEEDED', cost=10000)
    other, second = inputs(repo, storage)
    with pytest.raises(TryOnError) as error: create(repo, storage, other, second)
    assert error.value.code == 'TRY_ON_QUOTA'


def test_monthly_budget_survives_daily_reset(setup):
    original, storage, cfg = setup
    repo = Repository(original.engine, replace(cfg, monthly_budget=cfg.reservation))
    user, payload = inputs(repo, storage); job = create(repo, storage, user, payload)
    claimed = repo.claim(); repo.dispatch(claimed); repo.finish(claimed, 'SUCCEEDED', cost=cfg.reservation)
    with repo.engine.begin() as db: db.execute(text("UPDATE try_on_job SET budget_day=budget_day-1,created_at=created_at-interval '1 day' WHERE id=:id"), {'id': job['id']})
    assert repo.capability(user)['quota']['remaining'] == 3
    other, second = inputs(repo, storage)
    with pytest.raises(TryOnError) as error: create(repo, storage, other, second)
    assert error.value.code == 'TRY_ON_BUDGET'


def test_unknown_reservation_carries_across_month_and_day(setup):
    original, storage, cfg = setup
    repo = Repository(original.engine, replace(cfg, daily_budget=cfg.reservation))
    user, payload = inputs(repo, storage); job = create(repo, storage, user, payload)
    claimed = repo.claim(); repo.dispatch(claimed); repo.finish(claimed, 'UNKNOWN')
    with repo.engine.begin() as db: db.execute(text("UPDATE try_on_job SET budget_day=budget_day-35,budget_month='2020-01' WHERE id=:id"), {'id': job['id']})
    with repo.engine.connect() as db: assert repo.stats(db)['day_spend'] == repo.stats(db)['month_spend'] == cfg.reservation
    other, second = inputs(repo, storage)
    with pytest.raises(TryOnError) as error: create(repo, storage, other, second)
    assert error.value.code == 'TRY_ON_BUDGET'


def test_global_worker_concurrency_is_shared_between_instances(setup):
    repo, storage, cfg = setup
    for _ in range(3): create(repo, storage, *inputs(repo, storage))
    with ThreadPoolExecutor(3) as pool: claimed = list(pool.map(lambda _: repo.claim(), range(3)))
    jobs = [job for job in claimed if job]
    assert len(jobs) == cfg.concurrency == 2
    assert len({job['id'] for job in jobs}) == 2


def test_stale_worker_before_dispatch_releases_but_after_dispatch_holds(setup):
    repo, storage, cfg = setup
    first, payload = inputs(repo, storage); before = create(repo, storage, first, payload); a = repo.claim()
    second, payload2 = inputs(repo, storage); after = create(repo, storage, second, payload2); b = repo.claim(); repo.dispatch(b)
    with repo.engine.begin() as db: db.execute(text("UPDATE try_on_job SET lease_until=now()-interval '1 second'"))
    worker = Worker(repo, storage, cfg, Provider()); worker.recover()
    assert repo.get(first, before['id'])['status'] == 'FAILED'
    assert repo.get(second, after['id'])['status'] == 'UNKNOWN'
    with repo.engine.connect() as db:
        assert repo.stats(db, first)['user_calls'] == 0
        assert repo.stats(db, second)['user_calls'] == 1
        assert repo.stats(db)['day_spend'] == cfg.reservation


def test_pause_between_claim_and_dispatch_prevents_paid_call(setup):
    repo, storage, cfg = setup; user, payload = inputs(repo, storage); job = create(repo, storage, user, payload)
    claimed = repo.claim()
    with repo.engine.begin() as db: db.execute(text('UPDATE try_on_guard SET paused=true'))
    assert not repo.dispatch(claimed)
    assert repo.get(user, job['id'])['status'] == 'CANCELLED'
    with repo.engine.connect() as db: assert repo.stats(db)['day_spend'] == 0

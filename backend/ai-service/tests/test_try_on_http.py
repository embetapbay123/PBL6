import asyncio
import io
import os
import uuid

import httpx
import pytest
from fastapi.testclient import TestClient
from PIL import Image

import app.main as main
from app.try_on.config import CONSENT_VERSION
from app.try_on.provider import Outcome
from app.try_on.repository import Repository
from app.try_on.config import Settings
from app.try_on.storage import PrivateStorage
from app.try_on.worker import Worker
from test_try_on_postgres import engine  # Shared isolated-schema fixture, never the live schema.

pytestmark = [pytest.mark.usefixtures('engine'), pytest.mark.skipif(not os.getenv('M4_DATABASE_URL'), reason='Requires isolated PostgreSQL schemas')]


@pytest.fixture
def client(engine, tmp_path, monkeypatch):
    user, other, product, variant, photo = (str(uuid.uuid4()) for _ in range(5))
    state = {'verified': True, 'calls': 0}
    for key, value in {'TRY_ON_ENABLED': '1', 'OPENAI_API_KEY': 'fixture-not-real', 'TRY_ON_SIGNING_KEY': 's' * 32,
                       'TRY_ON_DEMO_MODE': '0', 'TRY_ON_DEMO_PASSWORD_HASH': '',
                       'TRY_ON_DAILY_BUDGET_MICRO_USD': '1000000', 'TRY_ON_MONTHLY_BUDGET_MICRO_USD': '10000000',
                       'TRY_ON_STORAGE_DIR': str(tmp_path), 'M4_INTERNAL_KEY': 'fixture', 'IDENTITY_URL': 'http://identity'}.items():
        monkeypatch.setenv(key, value)
    class Redis:
        async def eval(self, *args): return 1
    async def context(self, operation, body, correlation):
        if body['token'] == 'not-customer': return {'user_id': other, 'roles': ['SELLER']}
        return {'user_id': other if body['token'] == 'other' else user, 'roles': ['CUSTOMER']}
    class Identity:
        async def get(self, url, **kwargs):
            person = other if kwargs['headers']['Authorization'] == 'Bearer other' else user
            return httpx.Response(200, json={'user_id': person, 'email_verified_at': '2026-11-13T00:00:00Z' if state['verified'] else None})
    async def selection(self, product_id, variant_id, correlation):
        assert product_id == product and variant_id == variant
        return {'version': 1}, {'id': photo, 'image_url': 'https://demo.congnguyen.me/catalog/a.jpg'}, 'tops'
    async def garment(self, source): return image_bytes()
    monkeypatch.setattr(main, 'engine', engine); monkeypatch.setattr(main, 'limiter', Redis()); monkeypatch.setattr(main, 'http_client', Identity())
    monkeypatch.setattr(main.InternalClient, 'call', context)
    from app.try_on.service import TryOnService
    monkeypatch.setattr(TryOnService, 'selection', selection); monkeypatch.setattr(TryOnService, 'garment', garment)
    return TestClient(main.app), {'Authorization': 'Bearer own', 'X-PBL6-Client-IP': '203.0.113.10'}, {'user': user, 'other': other, 'product': product, 'variant': variant}, state


def image_bytes():
    data = io.BytesIO(); Image.new('RGB', (720, 960), 'tan').save(data, 'JPEG'); return data.getvalue()


def upload(c, headers):
    response = c.post('/api/v1/ai/try-on/photos', headers=headers, files={'photo': ('portrait.jpg', image_bytes(), 'image/jpeg')})
    assert response.status_code == 201, response.text
    return response.json()['id']


def test_verified_auth_precedes_upload_and_contract_validation(client):
    c, headers, ids, state = client
    assert c.post('/api/v1/ai/try-on/photos').status_code == 401
    assert c.post('/api/v1/ai/try-on/photos', headers={'Authorization': 'Bearer not-customer'}).status_code == 403
    state['verified'] = False
    assert c.post('/api/v1/ai/try-on/photos', headers=headers).status_code == 403
    state['verified'] = True
    assert c.post('/api/v1/ai/try-on/photos', headers=headers, json={}).status_code == 422
    response = c.post('/api/v1/ai/try-on/photos', headers=headers, files={'photo': ('fake.jpg', b'<script/>', 'image/jpeg')})
    assert response.status_code == 422


def test_http_upload_admission_worker_result_and_revocation(client):
    c, headers, ids, state = client
    params = {'product_id': ids['product'], 'variant_id': ids['variant']}
    response = c.get('/api/v1/ai/try-on/capabilities', headers=headers, params=params)
    assert response.status_code == 200 and response.json()['quota']['remaining'] == 3
    assert response.headers['cache-control'] == 'no-store, private'
    photo = upload(c, headers)
    body = {**params, 'photo_id': photo, 'consent_version': CONSENT_VERSION}
    key = str(uuid.uuid4())
    response = c.post('/api/v1/ai/try-on/jobs', headers={**headers, 'Idempotency-Key': key}, json=body)
    assert response.status_code == 202, response.text
    job = response.json()
    assert c.post('/api/v1/ai/try-on/jobs', headers={**headers, 'Idempotency-Key': key}, json=body).json()['id'] == job['id']
    assert c.get('/api/v1/ai/try-on/jobs/' + job['id'], headers={'Authorization': 'Bearer other'}).status_code == 404
    class Provider:
        async def edit(self, *args): state['calls'] += 1; return Outcome('SUCCEEDED', image_bytes(), cost=14000)
    cfg = Settings.load(); storage = PrivateStorage(cfg.storage_dir)
    assert asyncio.run(Worker(Repository(main.engine, cfg), storage, cfg, Provider()).once())
    result = c.get('/api/v1/ai/try-on/jobs/' + job['id'], headers=headers).json()
    assert result['status'] == 'SUCCEEDED' and result['result_url'].startswith('/api/v1/ai/try-on/results/')
    image = c.get(result['result_url'])
    assert image.status_code == 200 and image.headers['content-type'] == 'image/jpeg' and image.headers['cache-control'] == 'no-store, private'
    assert c.delete('/api/v1/ai/try-on/jobs/' + job['id'], headers=headers).status_code == 204
    assert c.get(result['result_url']).status_code == 404
    assert c.get('/api/v1/ai/try-on/jobs', headers=headers, params=params).json() == {'items': []}
    assert state['calls'] == 1


def test_missing_budget_disables_upload_and_truthfully_returns_quota(client, monkeypatch):
    c, headers, ids, state = client
    monkeypatch.setenv('TRY_ON_DAILY_BUDGET_MICRO_USD', '0')
    response = c.get('/api/v1/ai/try-on/capabilities', headers=headers, params={'product_id': ids['product'], 'variant_id': ids['variant']})
    assert response.status_code == 200 and response.json()['enabled'] is False
    assert response.json()['quota']['remaining'] == 3
    assert c.post('/api/v1/ai/try-on/photos', headers=headers, files={'photo': ('p.jpg', image_bytes(), 'image/jpeg')}).status_code == 503


def test_upload_and_job_are_owned_and_body_cannot_choose_model_or_price(client):
    c, headers, ids, state = client
    photo = upload(c, headers)
    body = {'photo_id': photo, 'product_id': ids['product'], 'variant_id': ids['variant'], 'consent_version': CONSENT_VERSION}
    key = str(uuid.uuid4())
    assert c.post('/api/v1/ai/try-on/jobs', headers={**headers, 'Idempotency-Key': key}, json={**body, 'model': 'expensive'}).status_code == 422
    assert c.post('/api/v1/ai/try-on/jobs', headers=headers, json=body).status_code == 422
    assert c.post('/api/v1/ai/try-on/jobs', headers={**headers, 'Authorization': 'Bearer other', 'Idempotency-Key': key}, json=body).status_code == 404
    assert c.delete('/api/v1/ai/try-on/photos/' + photo, headers={'Authorization': 'Bearer other'}).status_code == 404
    assert c.delete('/api/v1/ai/try-on/photos/' + photo, headers=headers).status_code == 204


def test_upload_is_bounded_and_does_not_trust_external_forwarded_for(client):
    c, headers, ids, state = client
    # Caddy overwrites X-PBL6-Client-IP; X-Forwarded-For alone never supplies quota identity.
    response = c.post('/api/v1/ai/try-on/photos', headers={'Authorization': 'Bearer own', 'X-Forwarded-For': '203.0.113.1'}, files={'photo': ('p.jpg', image_bytes(), 'image/jpeg')})
    assert response.status_code == 503
    response = c.post('/api/v1/ai/try-on/photos', headers=headers, files={'photo': ('p.jpg', b'x' * (8 * 1024 * 1024 + 65537), 'image/jpeg')})
    assert response.status_code == 413


def test_demo_password_is_enforced_before_upload_admission_and_replay(client, monkeypatch):
    from app.try_on.demo import hash_password
    from sqlalchemy import text
    c, headers, ids, state = client
    password = 'fixture-demo-access'
    monkeypatch.setenv('TRY_ON_DEMO_MODE', '1')
    monkeypatch.setenv('TRY_ON_DEMO_PASSWORD_HASH', hash_password(password))
    params = {'product_id': ids['product'], 'variant_id': ids['variant']}
    capabilities = c.get('/api/v1/ai/try-on/capabilities', headers=headers, params=params).json()
    assert capabilities['enabled'] and capabilities['demo_password_required']
    for supplied in ('', 'incorrect'):
        response = c.post('/api/v1/ai/try-on/photos', headers={**headers, 'X-Try-On-Demo-Password': supplied}, files={'photo': ('p.jpg', image_bytes(), 'image/jpeg')})
        assert response.status_code == 403
    with main.engine.connect() as db:
        assert db.execute(text('SELECT count(*) FROM try_on_photo')).scalar_one() == 0
        assert db.execute(text('SELECT count(*) FROM try_on_job')).scalar_one() == 0
    allowed = {**headers, 'X-Try-On-Demo-Password': password}
    photo = upload(c, allowed)
    body = {**params, 'photo_id': photo, 'consent_version': CONSENT_VERSION}
    key = str(uuid.uuid4())
    for supplied in ('', 'incorrect'):
        response = c.post('/api/v1/ai/try-on/jobs', headers={**headers, 'Idempotency-Key': key, 'X-Try-On-Demo-Password': supplied}, json=body)
        assert response.status_code == 403
    accepted = c.post('/api/v1/ai/try-on/jobs', headers={**allowed, 'Idempotency-Key': key}, json=body)
    assert accepted.status_code == 202
    # A replay also passes through the demo gate; none of the credential material enters the job row.
    assert c.post('/api/v1/ai/try-on/jobs', headers={**headers, 'Idempotency-Key': key}, json=body).status_code == 403
    with main.engine.connect() as db:
        saved = dict(db.execute(text('SELECT * FROM try_on_job')).mappings().one())
        assert password not in str(saved) and 'incorrect' not in str(saved)
    assert password not in accepted.text


def test_demo_guard_refuses_when_rate_limiter_is_unavailable(client, monkeypatch):
    from app.try_on.demo import hash_password
    from redis.exceptions import RedisError
    c, headers, ids, state = client
    monkeypatch.setenv('TRY_ON_DEMO_MODE', '1')
    monkeypatch.setenv('TRY_ON_DEMO_PASSWORD_HASH', hash_password('fixture-demo-access'))
    class Unavailable:
        async def eval(self, *args): raise RedisError('offline')
    monkeypatch.setattr(main, 'limiter', Unavailable())
    response = c.post('/api/v1/ai/try-on/photos', headers={**headers, 'X-Try-On-Demo-Password': 'fixture-demo-access'})
    assert response.status_code == 503

import asyncio
import hashlib
import io
import os
import uuid
from dataclasses import replace

import pytest
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import text
from test_consent_tracking import engine
from app.chat.media_service import AiChatMedia
from app.chat.media_routes import install
from app.chat.runtime import ChatRuntime
from app.chat.provider import CatalogSelector, Selection
from app.chat.vision import VisionOutcome, CONSENT_VERSION
from app.try_on.config import Settings
from app.try_on.demo import hash_password
from app.internal_client import InternalError
from test_chat_media_native import video

pytestmark = pytest.mark.skipif(os.getenv('AI_CHAT_MEDIA_NATIVE_TEST') != '1', reason='Requires PostgreSQL and isolated FFmpeg container')


class Catalog:
    async def snapshot(self, correlation):
        return []
    async def product(self, id, correlation):
        raise AssertionError('No products were selected')


class Provider:
    def __init__(self):
        self.calls = []
    async def select(self, question, products, history, images, **kwargs):
        self.calls.append((images, kwargs))
        assert all(data.startswith(b'\xff\xd8') for _, data in images)
        return VisionOutcome(selection=Selection((), False, 'MODEL_GENERATED', 'openai_vision', 1100, 'Trong ảnh có màu đỏ.', 'gpt-6-luna', 'none'), cost_bound=550, usage={'total_tokens': 1100})


@pytest.fixture
def setup(engine, tmp_path):
    settings = Settings(enabled=True, api_key='fixture-only-key', signing_key='s' * 32, daily_budget=1000000, monthly_budget=10000000)
    provider = Provider()
    svc = AiChatMedia(engine, Catalog(), settings, directory=str(tmp_path), enabled=True, provider=provider)
    svc.initialize()
    owner, stranger, session = [str(uuid.uuid4()) for _ in range(3)]
    with engine.begin() as db:
        db.execute(text("INSERT INTO chat_session(id,user_id,status) VALUES(:s,:u,'ACTIVE')"), {'s': session, 'u': owner})
    app = FastAPI()
    async def authorize(request, roles):
        user = request.headers.get('authorization', '').removeprefix('Bearer ')
        if not user:
            raise InternalError(401, 'UNAUTHENTICATED', 'Đăng nhập.')
        if user == 'wrong-role':
            raise InternalError(403, 'FORBIDDEN', 'Không có quyền.')
        return {'user_id': user, 'roles': ['CUSTOMER']}
    async def error(request, exception):
        return JSONResponse(status_code=exception.status, content={'code': exception.code, 'message': exception.message, 'details': []})
    class Limiter:
        async def eval(self, *args):
            return 1
    install(app, lambda: svc, authorize, lambda: Limiter(), error)
    client = TestClient(app)
    client.headers.update({'Authorization': 'Bearer ' + owner, 'X-PBL6-Client-IP': '192.0.2.1'})
    return svc, provider, client, owner, stranger, session


def png():
    out = io.BytesIO();Image.new('RGB', (96, 64), 'red').save(out, 'PNG');return out.getvalue()


def upload(setup, data=None, kind='IMAGE'):
    svc, _, client, _, _, session = setup
    data = png() if data is None else data
    base = '/api/v1/chat/sessions/' + session + '/attachments'
    created = client.post(base, json={'client_upload_id': str(uuid.uuid4()), 'kind': kind, 'size_bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()})
    assert created.status_code == 201, created.text
    asset = created.json()
    uploaded = client.put(base + '/' + asset['id'] + '/content', content=data, headers={'Content-Type': 'application/octet-stream'})
    assert uploaded.status_code == 200, uploaded.text
    asyncio.run(svc.tick())
    ready = client.get(base + '/' + asset['id'])
    assert ready.json()['status'] == 'READY', ready.text
    return ready.json()


def turn_payload(asset):
    return {'content': '', 'client_message_id': str(uuid.uuid4()), 'attachment_ids': [asset['id']], 'consent_version': CONSENT_VERSION}


def test_http_raw_upload_private_range_roles_and_a_complete_paid_media_turn(setup):
    svc, provider, client, owner, stranger, session = setup
    cap = client.get('/api/v1/chat/media-capabilities')
    assert cap.status_code == 200 and cap.json()['enabled'] and cap.json()['remaining'] == 3
    assert client.get('/api/v1/chat/media-capabilities', headers={'Authorization': ''}).status_code == 401
    assert client.get('/api/v1/chat/media-capabilities', headers={'Authorization': 'Bearer wrong-role'}).status_code == 403
    asset = upload(setup)
    base = '/api/v1/chat/sessions/' + session
    path = base + '/attachments/' + asset['id'] + '/content'
    full = client.get(path)
    assert full.status_code == 200 and full.content[8:12] == b'WEBP' and full.headers['Cache-Control'] == 'private, no-store'
    partial = client.get(path, headers={'Range': 'bytes=0-11'})
    assert partial.status_code == 206 and partial.content == full.content[:12]
    assert client.head(path).status_code == 200 and not client.head(path).content
    assert client.get(path, headers={'Range': 'bytes=999999-'}).status_code == 416
    assert client.head(base + '/attachments/bad/content').status_code == 422
    assert client.get(path, headers={'Authorization': 'Bearer ' + stranger}).status_code == 404
    payload = turn_payload(asset)
    admitted = client.post(base + '/media-messages', json=payload)
    assert admitted.status_code == 202 and admitted.json()['status'] == 'QUEUED'
    assert client.post(base + '/media-messages', json=payload).json()['id'] == admitted.json()['id']
    assert client.delete(base + '/attachments/' + asset['id']).status_code == 409
    asyncio.run(svc.tick())
    answer = client.get(base + '/media-messages/' + payload['client_message_id'])
    assert answer.status_code == 200 and answer.json()['status'] == 'SUCCEEDED'
    assert answer.json()['assistant']['content'] == 'Trong ảnh có màu đỏ.' and len(provider.calls) == 1
    assert client.get(base + '/media-messages/' + payload['client_message_id'], headers={'Authorization': 'Bearer ' + stranger}).status_code == 404
    history = ChatRuntime(svc.repo.engine, None, CatalogSelector(provider='none')).list(owner, {'session_id': session})
    assert history['items'][0]['messages']['total'] == 2
    assert history['items'][0]['messages']['items'][0]['attachments'][0]['id'] == asset['id']


def test_video_pipeline_passes_actual_eight_frames_to_the_adapter(setup):
    svc, provider, client, _, _, session = setup
    key = video(svc.files)
    asset = upload(setup, svc.files.path(key).read_bytes(), 'VIDEO')
    svc.files.remove(key)
    payload = turn_payload(asset)
    assert client.post('/api/v1/chat/sessions/' + session + '/media-messages', json=payload).status_code == 202
    asyncio.run(svc.tick())
    assert len(provider.calls) == 1 and len(provider.calls[0][0]) == 8 and provider.calls[0][1]['video']
    result = client.get('/api/v1/chat/sessions/' + session + '/media-messages/' + payload['client_message_id']).json()
    assert result['status'] == 'SUCCEEDED' and result['assistant']['media_analysis'] == 'VIDEO_FRAMES'


def test_lost_database_ack_recovers_the_local_receipt_without_another_paid_call(setup, monkeypatch):
    svc, provider, client, _, _, session = setup
    asset = upload(setup)
    payload = turn_payload(asset)
    client.post('/api/v1/chat/sessions/' + session + '/media-messages', json=payload)
    finish = svc.repo.finish_turn
    def unavailable(*args, **kwargs):
        raise RuntimeError('synthetic database outage')
    monkeypatch.setattr(svc.repo, 'finish_turn', unavailable)
    asyncio.run(svc.tick())
    assert len(list(svc.files.root.glob('*.receipt.json'))) == 1 and len(provider.calls) == 1
    monkeypatch.setattr(svc.repo, 'finish_turn', finish)
    with svc.repo.engine.begin() as db:
        db.execute(text("UPDATE paid_ai_call SET lease_until=now()-interval '1 second'"))
    asyncio.run(svc.recover())
    result = client.get('/api/v1/chat/sessions/' + session + '/media-messages/' + payload['client_message_id']).json()
    assert result['status'] == 'SUCCEEDED' and len(provider.calls) == 1 and not list(svc.files.root.glob('*.receipt.json'))


def test_delete_during_analysis_revokes_access_and_cleanup_removes_files_without_resurrecting_messages(setup):
    svc, provider, client, owner, _, session = setup
    asset = upload(setup)
    payload = turn_payload(asset)
    client.post('/api/v1/chat/sessions/' + session + '/media-messages', json=payload)
    original = provider.select
    async def deleting(*args, **kwargs):
        ChatRuntime(svc.repo.engine, None, CatalogSelector(provider='none')).delete(owner, session)
        return await original(*args, **kwargs)
    provider.select = deleting
    asyncio.run(svc.tick())
    assert len(provider.calls) == 1
    assert client.get('/api/v1/chat/sessions/' + session + '/attachments/' + asset['id'] + '/content').status_code == 404
    svc.cleanup()
    assert not list(svc.files.root.iterdir())
    with svc.repo.engine.connect() as db:
        assert db.execute(text('SELECT count(*) FROM chat_message')).scalar_one() == 0
        row = db.execute(text('SELECT status,cost_state,charged_micro_usd,response FROM paid_ai_call')).one()
        assert row == ('CANCELLED', 'SETTLED', 550, None)


def test_demo_gate_precedes_money_admission_and_password_is_not_persisted(setup):
    svc, provider, client, _, _, session = setup
    asset = upload(setup)
    svc.settings = replace(svc.settings, demo_mode=True, demo_password_hash=hash_password('fixture-demo-password'))
    payload = turn_payload(asset)
    base = '/api/v1/chat/sessions/' + session + '/media-messages'
    assert client.post(base, json=payload).status_code == 403
    with svc.repo.engine.connect() as db:
        assert db.execute(text('SELECT count(*) FROM paid_ai_call')).scalar_one() == 0
    admitted = client.post(base, json=payload, headers={'X-Try-On-Demo-Password': 'fixture-demo-password'})
    assert admitted.status_code == 202 and not provider.calls
    with svc.repo.engine.connect() as db:
        row = dict(db.execute(text('SELECT * FROM paid_ai_call')).mappings().one())
        assert 'fixture-demo-password' not in str(row)

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.adapters import MockRecommendation
import asyncio
import app.main as module

@pytest.fixture(autouse=True)
def rate_limit(monkeypatch):
    class FakeRedis:
        async def eval(self,*args): return 1
    monkeypatch.setattr(module,'limiter',FakeRedis())

def test_health_and_unimplemented_auth():
    client=TestClient(app)
    assert client.get('/health/live').json()['service']=='M4'
    response=client.get('/api/v1/me/chat/sessions')
    assert response.status_code==401
    assert response.json()['correlation_id']

def test_mock_is_deterministic():
    items=[{'id':'b'},{'id':'a'}]
    result=asyncio.run(MockRecommendation().recommend(None,items))
    assert [x['id'] for x in result]==['a','b']

def test_rate_limit_returns_consistent_error(monkeypatch):
    class Limited:
        async def eval(self,*args): return 601
    monkeypatch.setattr(module,'limiter',Limited())
    response=TestClient(app).get('/api/v1/recommendations/for-you')
    assert response.status_code==429
    assert response.json()['code']=='RATE_LIMITED'
    assert response.headers['Retry-After']=='60'
    assert response.headers['X-Correlation-Id']==response.json()['correlation_id']

def test_mock_chat_validates_input_and_discloses_mock():
    client=TestClient(app)
    response=client.post('/api/v1/chat/sessions/11111111-1111-4111-8111-111111111111/messages',json={})
    assert response.status_code==422
    response=client.post('/api/v1/chat/sessions/11111111-1111-4111-8111-111111111111/messages',json={'content':'hello'})
    assert response.status_code==200
    assert response.json()['mode']=='mock'
    assert response.json()['fallback'] is True

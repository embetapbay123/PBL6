import pytest
from fastapi.testclient import TestClient

import app.main as main
from app.internal_client import InternalError


class Limiter:
    async def eval(self, *_args):
        return 1


class MetricsInternalClient:
    admin_permission = True
    store_owner = False

    def __init__(self, *_args, **_kwargs):
        pass

    async def call(self, operation, body, _correlation):
        if operation == 'ResolveContext':
            roles = ['STORE_OWNER'] if self.store_owner else ['ADMIN']
            return {'user_id': 'user-1', 'roles': roles, 'role_permissions': [], 'token_version': 1}
        if operation == 'ResolveAiMetricsScope':
            if self.store_owner and body.get('store_id') == '11111111-1111-4111-8111-111111111111':
                return {'user_id': 'user-1', 'scope': 'STORE', 'store_id': body['store_id'], 'token_version': 1}
            if self.admin_permission:
                return {'user_id': 'user-1', 'scope': 'PLATFORM', 'token_version': 1}
            raise InternalError(403, 'STORE_METRICS_FORBIDDEN', 'Metrics scope forbidden')
        raise AssertionError(operation)


@pytest.fixture
def metrics_client(monkeypatch):
    monkeypatch.setenv('AI_MODE', 'real')
    monkeypatch.setenv('M4_INTERNAL_KEY', 'test-key')
    monkeypatch.setenv('IDENTITY_URL', 'http://m3.test')
    monkeypatch.setattr(main, 'limiter', Limiter())
    monkeypatch.setattr(main, 'http_client', object())
    monkeypatch.setattr(main, 'InternalClient', MetricsInternalClient)
    from app.evaluation import metrics
    monkeypatch.setattr(metrics, 'read_metrics', lambda _engine, scope: {'scope': scope['scope'], 'mode': 'real'})
    return TestClient(main.app)


def test_metrics_endpoint_uses_platform_scope_from_m3(metrics_client):
    response = metrics_client.get('/api/v1/ai/metrics', headers={'Authorization': 'Bearer existing-access-token'})
    assert response.status_code == 200
    assert response.json()['scope'] == 'PLATFORM'


def test_metrics_endpoint_rechecks_revoked_permission_with_existing_token(metrics_client):
    response = metrics_client.get('/api/v1/ai/metrics', headers={'Authorization': 'Bearer existing-access-token'})
    assert response.status_code == 200
    MetricsInternalClient.admin_permission = False
    try:
        denied = metrics_client.get('/api/v1/ai/metrics', headers={'Authorization': 'Bearer existing-access-token'})
        assert denied.status_code == 403
        assert denied.json()['code'] == 'STORE_METRICS_FORBIDDEN'
    finally:
        MetricsInternalClient.admin_permission = True


def test_metrics_endpoint_preserves_store_owner_scope(metrics_client):
    MetricsInternalClient.store_owner = True
    try:
        response = metrics_client.get('/api/v1/ai/metrics?store_id=11111111-1111-4111-8111-111111111111', headers={'Authorization': 'Bearer owner-access-token'})
        assert response.status_code == 200
        assert response.json() == {'scope': 'STORE', 'mode': 'real'}
    finally:
        MetricsInternalClient.store_owner = False

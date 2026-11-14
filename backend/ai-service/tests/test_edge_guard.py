import asyncio
import os
import uuid

import httpx
import pytest
from redis.asyncio import Redis
from redis.exceptions import ConnectionError

from app.edge_guard import app, admit, identity, limits, policy, Window


def test_path_classification_cannot_reset_by_query_extension_method_or_account():
    settings = limits()
    for uri in ('/api/v1/products?q=one', '/api/v1/products?q=two&page=3'):
        assert [w.scope for w in policy('GET', uri, settings)] == ['api', 'api', 'search', 'search']
    assert policy('GET', '/assets/index.js', settings) == []
    assert policy('GET', '/catalog/product.webp', settings) == []
    assert [w.scope for w in policy('GET', '/api/v1/anything.css', settings)] == ['api', 'api']
    assert [w.scope for w in policy('GET', '/products/a?reload=1', settings)] == ['document', 'document']
    assert [w.limit for w in policy('POST', '/api/v1/auth/login', settings)] == [40, 240, 5, 20]
    for uri in ('/API/v1/AUTH/LOGIN/', '/api/v1/auth/%6cogin', '/assets/../api/v1/auth/login', '/api//v1/auth/login'):
        assert [w.limit for w in policy('POST', uri, settings)] == [40, 240, 5, 20]
    assert policy('POST', '/api/v1/auth/register', settings)[-1] == Window('email', 3600, 10)


def test_ipv6_rotation_and_mapped_ipv4_share_identity():
    assert identity('2001:db8::1') == identity('2001:db8::abc')
    assert identity('2001:db8::1') != identity('2001:db8:0:1::1')
    assert identity('::ffff:203.0.113.5') == identity('203.0.113.5')
    with pytest.raises(ValueError): identity('203.0.113.5, 203.0.113.6')


@pytest.mark.parametrize('value', ['0', '-1', 'NaN', '10001', '1.5'])
def test_configuration_rejects_invalid_limits(monkeypatch, value):
    monkeypatch.setenv('EDGE_API_BURST', value)
    with pytest.raises(ValueError): limits()


def test_http_rejections_are_private_actionable_and_do_not_trust_forwarded_headers():
    class Limiter:
        calls = []
        async def eval(self, script, n, *args):
            self.calls.append(args)
            return 7
    limiter = Limiter()
    async def run():
        app.state.redis, app.state.limits = limiter, limits()
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://guard') as client:
            headers = {'X-Edge-Client-IP': '203.0.113.6', 'X-Edge-Method': 'GET',
                       'X-Edge-Uri': '/api/v1/products', 'X-Forwarded-For': '203.0.113.99', 'CF-Connecting-IP': '203.0.113.99'}
            response = await client.get('/check', headers=headers)
            assert response.status_code == 429 and response.json()['code'] == 'RATE_LIMITED'
            assert response.headers['retry-after'] == '7' and 'no-store' in response.headers['cache-control']
            assert identity('203.0.113.6') in limiter.calls[0][0]
            assert identity('203.0.113.99') not in str(limiter.calls)
            response = await client.get('/check', headers={**headers, 'X-Edge-Uri': '/products/a', 'Accept': 'text/html'})
            assert response.status_code == 429 and 'text/html' in response.headers['content-type']
            assert 'Thử lại' in response.text and '7 giây' in response.text
            assert '<script' not in response.text
            response = await client.get('/check', headers={**headers, 'X-Edge-Client-IP': 'invalid'})
            assert response.status_code == 503
            response = await client.get('/check', headers={**headers, 'X-Edge-Uri': '/assets/index.js'})
            assert response.status_code == 204
            response = await client.get('/check')
            assert response.status_code == 503
    asyncio.run(run())


def test_redis_outage_does_not_allow_requests():
    class Unavailable:
        async def eval(self, *args): raise ConnectionError('offline')
    async def run():
        app.state.redis, app.state.limits = Unavailable(), limits()
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://guard') as client:
            response = await client.get('/check', headers={'X-Edge-Client-IP': '203.0.113.6', 'X-Edge-Method': 'GET', 'X-Edge-Uri': '/api/v1/products'})
            assert response.status_code == 503 and response.json()['code'] == 'DEPENDENCY_UNAVAILABLE'
            assert response.headers['retry-after'] == '5'
    asyncio.run(run())


@pytest.mark.skipif(not os.getenv('REDIS_URL'), reason='Requires an explicitly configured Redis test service')
def test_real_redis_atomic_concurrency_expiry_isolation_and_longer_window():
    async def run():
        redis = Redis.from_url(os.environ['REDIS_URL'])
        address = '2001:db8:' + uuid.uuid4().hex[:4] + '::1'
        scope = 'test-' + uuid.uuid4().hex
        windows = [Window(scope, 1, 3), Window(scope, 60, 4)]
        keys = [f'edge:v1:{identity(address)}:{scope}:{seconds}' for seconds in (1, 60)]
        other = '203.0.113.108'
        other_keys = [f'edge:v1:{identity(other)}:{scope}:{seconds}' for seconds in (1, 60)]
        try:
            results = await asyncio.gather(*(admit(redis, address, windows) for _ in range(12)))
            assert results.count(0) == 3 and all(0 <= value <= 1 for value in results)
            assert await admit(redis, other, windows) == 0
            assert await redis.zcard(keys[1]) == 3
            await asyncio.sleep(1.05)
            assert await admit(redis, address, windows) == 0
            assert await admit(redis, address, windows) >= 58
            assert await redis.zcard(keys[1]) == 4
            assert 0 < await redis.ttl(keys[1]) <= 61
        finally:
            await redis.delete(*keys, *other_keys)
            await redis.aclose()
    asyncio.run(run())

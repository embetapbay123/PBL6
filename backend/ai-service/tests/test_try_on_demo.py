import asyncio
import os
import time
import uuid
from dataclasses import replace
from types import SimpleNamespace

import pytest
from redis.asyncio import Redis

from app.try_on.config import Settings, TryOnError
from app.try_on.demo import hash_password, require_demo_password


@pytest.mark.skipif(not os.getenv('REDIS_URL'), reason='Requires Redis; isolated random keys only')
def test_demo_attempts_are_limited_and_successful_checks_release_reservations():
    async def scenario():
        limiter = Redis.from_url(os.environ['REDIS_URL'])
        user, ip_hash = uuid.uuid4().hex, uuid.uuid4().hex
        bucket = int(time.time()) // 600
        keys = [f'try-on:demo:user:{user}:{bucket}', f'try-on:demo:ip:{ip_hash}:{bucket}']
        password = 'fixture-demo-access'
        settings = replace(Settings(), demo_mode=True, demo_password_hash=hash_password(password))
        correct = SimpleNamespace(headers={'x-try-on-demo-password': password})
        wrong = SimpleNamespace(headers={'x-try-on-demo-password': 'incorrect'})
        try:
            for _ in range(8):
                await require_demo_password(correct, settings, user, limiter, ip_hash)
            assert await limiter.mget(keys) == [b'0', b'0']
            for _ in range(5):
                with pytest.raises(TryOnError) as error:
                    await require_demo_password(wrong, settings, user, limiter, ip_hash)
                assert error.value.status == 403
            # A new handler instance still observes the shared limit.
            with pytest.raises(TryOnError) as error:
                await require_demo_password(correct, settings, user, limiter, ip_hash)
            assert error.value.code == 'DEMO_PASSWORD_RATE_LIMITED'
            assert await limiter.mget(keys) == [b'5', b'5']
        finally:
            await limiter.delete(*keys)
            await limiter.aclose()
    asyncio.run(scenario())

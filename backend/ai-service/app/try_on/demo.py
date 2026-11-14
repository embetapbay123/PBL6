"""Server-only demo gate. Passwords are never persisted in jobs, logs or tokens."""
import hashlib
import hmac
import re
import secrets
import time

from redis.exceptions import RedisError
from starlette.concurrency import run_in_threadpool

from .config import TryOnError

ITERATIONS = 600000
HASH_PATTERN = re.compile(r'^pbkdf2_sha256\$(600000|[7-9][0-9]{5}|1000000)\$([a-f0-9]{32})\$([a-f0-9]{64})$')


def hash_password(password):
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac('sha256', password.encode(), bytes.fromhex(salt), ITERATIONS).hex()
    return f'pbkdf2_sha256${ITERATIONS}${salt}${digest}'


def valid_hash(encoded):
    return isinstance(encoded, str) and HASH_PATTERN.fullmatch(encoded) is not None


def password_matches(password, encoded):
    match = HASH_PATTERN.fullmatch(encoded)
    if not match or not password or len(password.encode('utf-8')) > 128:
        return False
    iterations, salt, expected = match.groups()
    actual = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), bytes.fromhex(salt), int(iterations)).hex()
    return hmac.compare_digest(actual, expected)


RESERVE = """
for i=1,2 do
  local n=tonumber(redis.call('GET',KEYS[i]) or '0')
  if n>=tonumber(ARGV[i]) then return 0 end
end
for i=1,2 do
  local n=redis.call('INCR',KEYS[i])
  if n==1 then redis.call('EXPIRE',KEYS[i],660) end
end
return 1
"""
RELEASE = """
for i=1,2 do
  if tonumber(redis.call('GET',KEYS[i]) or '0')>0 then redis.call('DECR',KEYS[i]) end
end
return 1
"""


async def require_demo_password(request, settings, user, limiter, ip_hash):
    if not settings.demo_mode:
        return
    if not valid_hash(settings.demo_password_hash):
        raise TryOnError(503, 'DEMO_UNAVAILABLE', 'Chế độ demo chưa sẵn sàng.')
    supplied = request.headers.get('x-try-on-demo-password', '')
    bucket = int(time.time()) // 600
    keys = [f'try-on:demo:user:{user}:{bucket}', f'try-on:demo:ip:{ip_hash}:{bucket}']
    try:
        # Reserve attempts atomically before the expensive hash; successful checks release them.
        if await limiter.eval(RESERVE, 2, *keys, 5, 30) != 1:
            raise TryOnError(429, 'DEMO_PASSWORD_RATE_LIMITED', 'Nhập sai mật khẩu quá nhiều lần. Vui lòng thử lại sau 10 phút.')
        if not await run_in_threadpool(password_matches, supplied, settings.demo_password_hash):
            raise TryOnError(403, 'DEMO_PASSWORD_REQUIRED' if not supplied else 'DEMO_PASSWORD_INVALID',
                             'Nhập mật khẩu demo để tạo ảnh.' if not supplied else 'Mật khẩu demo chưa đúng.')
        await limiter.eval(RELEASE, 2, *keys)
    except (RedisError, AttributeError):
        raise TryOnError(503, 'DEMO_GUARD_UNAVAILABLE', 'Chưa kiểm tra được mật khẩu demo. Vui lòng thử lại sau.')

"""Gateway admission only: no business authentication, database access or provider credentials."""
import hashlib
import ipaddress
import math
import os
import posixpath
import uuid
from contextlib import asynccontextmanager
from dataclasses import dataclass
from urllib.parse import unquote, urlsplit

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse, Response
from redis.asyncio import Redis
from redis.exceptions import RedisError


# Redis TIME and one atomic script enforce every rolling window before admitting a request.
# Rejected requests never extend the ban or consume additional allowance.
ADMIT = """
local t=redis.call('TIME')
local now=tonumber(t[1])*1000+math.floor(tonumber(t[2])/1000)
local retry=0
for i,key in ipairs(KEYS) do
  local window=tonumber(ARGV[2*i])
  local limit=tonumber(ARGV[2*i+1])
  redis.call('ZREMRANGEBYSCORE',key,'-inf',now-window)
  if redis.call('ZCARD',key)>=limit then
    local first=redis.call('ZRANGE',key,0,0,'WITHSCORES')
    retry=math.max(retry,math.ceil((tonumber(first[2])+window-now)/1000))
  end
end
if retry>0 then return retry end
for i,key in ipairs(KEYS) do
  redis.call('ZADD',key,now,ARGV[1])
  redis.call('PEXPIRE',key,tonumber(ARGV[2*i])+1000)
end
return 0
"""


@dataclass(frozen=True)
class Window:
    scope: str
    seconds: int
    limit: int


def positive(name, fallback):
    raw = os.getenv(name, str(fallback))
    if not raw.isdecimal() or not 1 <= int(raw) <= 10000:
        raise ValueError('Invalid edge rate limit: ' + name)
    return int(raw)


def limits():
    return {
        'api': (positive('EDGE_API_BURST', 40), positive('EDGE_API_PER_MINUTE', 240)),
        'document': (positive('EDGE_DOCUMENT_BURST', 10), positive('EDGE_DOCUMENT_PER_MINUTE', 60)),
        'login': (positive('EDGE_LOGIN_BURST', 5), positive('EDGE_LOGIN_PER_MINUTE', 20)),
        'search': (positive('EDGE_SEARCH_BURST', 20), positive('EDGE_SEARCH_PER_MINUTE', 90)),
    }


def canonical_path(uri):
    # Match the gateway's decoded, cleaned, case-insensitive route selection.
    return posixpath.normpath(unquote(urlsplit(uri).path, errors='strict')).lower().rstrip('/') or '/'


def policy(method, uri, settings):
    path = canonical_path(uri)
    # Only dedicated static namespaces are exempt. An API ending in .css is still an API.
    if path.startswith(('/assets/', '/catalog/')) or path in ('/favicon.ico', '/robots.txt', '/site.webmanifest'):
        return []
    scopes = ['api'] if path == '/api/v1' or path.startswith('/api/v1/') else ['document']
    if scopes == ['api']:
        if path in ('/api/v1/auth/login', '/api/v1/auth/demo-login'):
            scopes.append('login')
        elif method in ('GET', 'HEAD') and (path == '/api/v1/products' or
                (path.startswith('/api/v1/stores/') and path.endswith('/products'))):
            scopes.append('search')
    windows = [Window(scope, seconds, limit) for scope in scopes
               for seconds, limit in zip((10, 60), settings[scope])]
    if path in ('/api/v1/auth/register', '/api/v1/auth/reset-password'):
        windows.extend((Window('email', 10, 2), Window('email', 3600, 10)))
    return windows


def identity(value):
    address = ipaddress.ip_address(value)
    if isinstance(address, ipaddress.IPv6Address) and address.ipv4_mapped:
        address = address.ipv4_mapped
    # A /64 shares one IPv6 allowance; changing the interface address cannot reset it.
    canonical = str(ipaddress.ip_network(str(address) + '/64', strict=False)) if address.version == 6 else str(address)
    return hashlib.sha256(canonical.encode()).hexdigest()


async def admit(redis, address, windows):
    digest = identity(address)
    keys = [f'edge:v1:{digest}:{window.scope}:{window.seconds}' for window in windows]
    args = [item for window in windows for item in (window.seconds * 1000, window.limit)]
    return int(await redis.eval(ADMIT, len(keys), *keys, uuid.uuid4().hex, *args))


def rejection(status, seconds, document, correlation):
    seconds = max(1, math.ceil(seconds))
    message = (f'Bạn gửi yêu cầu quá nhanh. Hãy thử lại sau {seconds} giây.' if status == 429
               else 'Chưa kiểm tra được giới hạn truy cập. Hãy thử lại sau ít giây.')
    headers = {'Retry-After': str(seconds), 'Cache-Control': 'private, no-store', 'Vary': 'Accept',
               'X-Correlation-Id': correlation, 'X-Content-Type-Options': 'nosniff'}
    if document:
        headers.update({'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'",
                        'Referrer-Policy': 'no-referrer'})
        return HTMLResponse('<!doctype html><html lang="vi"><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1">'
            '<title>Vui lòng chờ</title><style>body{font:16px/1.6 system-ui;background:#faf9f6;color:#292b26;'
            'margin:0;padding:64px 24px}main{max-width:480px;margin:auto}h1{font-size:26px}'
            'a{display:inline-block;color:#913d23;margin-top:12px}</style><main><h1>Vui lòng chờ</h1><p>'
            + message + '</p><a href="">Thử lại</a></main></html>', status_code=status, headers=headers)
    return JSONResponse({'code': 'RATE_LIMITED' if status == 429 else 'DEPENDENCY_UNAVAILABLE',
                         'message': message, 'correlation_id': correlation, 'details': []}, status_code=status, headers=headers)


@asynccontextmanager
async def lifespan(app):
    app.state.limits = limits()
    app.state.redis = Redis.from_url(os.environ['REDIS_URL'], socket_connect_timeout=1, socket_timeout=1,
                                     max_connections=50, health_check_interval=30)
    try:
        await app.state.redis.ping()
        yield
    finally:
        await app.state.redis.aclose()


app = FastAPI(lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)


@app.get('/health/ready')
async def ready(request: Request):
    try:
        await request.app.state.redis.ping()
        return {'status': 'ready'}
    except RedisError:
        return JSONResponse({'status': 'unavailable'}, status_code=503)


@app.get('/check')
async def check(request: Request):
    # These headers are overwritten by Caddy. This service has no published host port.
    uri = request.headers.get('x-edge-uri', '')
    method = request.headers.get('x-edge-method', '')
    correlation = request.headers.get('x-correlation-id', '')
    if not correlation or len(correlation) > 64 or not correlation.replace('-', '').isalnum():
        correlation = str(uuid.uuid4())
    try:
        path = canonical_path(uri)
    except (ValueError, UnicodeError):
        return rejection(503, 5, False, correlation)
    document = not (path.startswith('/api/v1/') or path == '/api/v1')
    if not uri.startswith('/') or uri.startswith('//') or len(uri) > 16384 or method not in ('GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'):
        return rejection(503, 5, document, correlation)
    try:
        windows = policy(method, uri, request.app.state.limits)
        if windows:
            retry = await admit(request.app.state.redis, request.headers.get('x-edge-client-ip', ''), windows)
            if retry:
                return rejection(429, retry, document, correlation)
        return Response(status_code=204)
    except (RedisError, ValueError):
        return rejection(503, 5, document, correlation)

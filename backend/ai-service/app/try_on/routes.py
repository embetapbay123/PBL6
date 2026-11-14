import json
import os
import asyncio

import httpx
from fastapi import Request
from fastapi.responses import FileResponse, JSONResponse, Response
from starlette.concurrency import run_in_threadpool
from starlette.datastructures import UploadFile
from starlette.formparsers import MultiPartException, MultiPartParser
from python_multipart.exceptions import MultipartParseError

from ..internal_client import InternalError
from ..runtime_contracts import MISSING, validate_operation
from .config import Settings, TryOnError, UPLOAD_LIMIT
from .repository import Repository
from .service import TryOnService
from .storage import PrivateStorage, normalize_image
from .demo import require_demo_password

ROOT = '/api/v1/ai/try-on'
PRIVATE_HEADERS = {'Cache-Control': 'no-store, private', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer'}
DECODE_SLOTS = asyncio.Semaphore(2)


class UploadTooLarge(MultiPartException):
    pass


async def verified_customer(request, authorize, client):
    identity = await authorize(request, ['CUSTOMER'])
    # Reuse M3's own authenticated profile, never a user ID supplied by the browser.
    try:
        response = await client.get(os.environ['IDENTITY_URL'] + '/api/v1/me', headers={'Authorization': request.headers['authorization'], 'X-Correlation-Id': request.state.correlation_id}, timeout=2)
        if response.status_code != 200:
            raise ValueError()
        profile = response.json()
        if profile.get('user_id') != identity['user_id']:
            raise ValueError()
        if not profile.get('email_verified_at'):
            raise TryOnError(403, 'EMAIL_NOT_VERIFIED', 'Vui lòng xác minh email trước khi thử đồ.')
        return identity['user_id']
    except (httpx.HTTPError, ValueError, KeyError):
        raise TryOnError(503, 'IDENTITY_UNAVAILABLE', 'Chưa xác minh được tài khoản. Vui lòng thử lại sau.')


async def validated(request, operation, *, body=False):
    payload = MISSING
    if body:
        raw = bytearray()
        async for chunk in request.stream():
            if len(raw) + len(chunk) > 16384:
                raise TryOnError(413, 'PAYLOAD_TOO_LARGE', 'Yêu cầu vượt quá giới hạn cho phép.')
            raw.extend(chunk)
        try: payload = json.loads(raw)
        except ValueError: raise TryOnError(422, 'VALIDATION_FAILED', 'Dữ liệu không hợp lệ.')
    try:
        query = {key: request.query_params.getlist(key) if len(request.query_params.getlist(key)) > 1 else value for key, value in request.query_params.items()}
        return validate_operation(operation, body=payload, query=query, path=request.path_params, headers=dict(request.headers))
    except ValueError:
        raise TryOnError(422, 'VALIDATION_FAILED', 'Dữ liệu không hợp lệ.')


def install(app, engine_getter, client_getter, authorize, catalog_getter, limiter_getter):
    def service():
        engine = engine_getter()
        if engine is None:
            raise TryOnError(503, 'TRY_ON_UNAVAILABLE', 'Phòng thử đồ chưa sẵn sàng.')
        settings = Settings.load()
        return TryOnService(Repository(engine, settings), PrivateStorage(settings.storage_dir), settings, catalog_getter())

    @app.exception_handler(TryOnError)
    async def error_response(request, error):
        return JSONResponse(status_code=error.status, headers={**PRIVATE_HEADERS, **({'Retry-After': '600' if error.code == 'DEMO_PASSWORD_RATE_LIMITED' else '60'} if error.status == 429 else {})}, content={
            'code': error.code, 'message': error.message, 'correlation_id': request.state.correlation_id, 'details': []})

    async def owner(request):
        return await verified_customer(request, authorize, client_getter())

    async def selection(svc, product_id, variant_id, correlation):
        try:
            return await svc.selection(product_id, variant_id, correlation)
        except InternalError as error:
            raise TryOnError(error.status, error.code, error.message)

    @app.get(ROOT + '/capabilities', name='getTryOnCapabilities')
    async def capabilities(request: Request):
        user = await owner(request)
        args = await validated(request, 'getTryOnCapabilities')
        svc = service()
        value = await run_in_threadpool(svc.repo.capability, user)
        try:
            _, image, _ = await selection(svc, args['query']['product_id'], args['query']['variant_id'], request.state.correlation_id)
            svc.media_url(image['image_url'])
        except TryOnError as error:
            if error.status not in (404, 422): raise
            value.update(enabled=False, message=error.message)
        return JSONResponse(value, headers=PRIVATE_HEADERS)

    @app.post(ROOT + '/photos', name='uploadTryOnPhoto', status_code=201)
    async def upload(request: Request):
        user = await owner(request)
        svc = service()
        if not svc.settings.ready:
            raise TryOnError(503, 'TRY_ON_DISABLED', 'Tạo ảnh thử đồ đang tạm dừng.')
        ip_hash = svc.ip_hash(request.headers.get('x-pbl6-client-ip', ''))
        await require_demo_password(request, svc.settings, user, limiter_getter(), ip_hash)
        async def bounded():
            size = 0
            async for chunk in request.stream():
                size += len(chunk)
                if size > UPLOAD_LIMIT + 65536:
                    raise UploadTooLarge('Upload exceeds limit')
                yield chunk
        if not request.headers.get('content-type', '').lower().startswith('multipart/form-data;'):
            raise TryOnError(422, 'INVALID_PHOTO', 'Vui lòng gửi một ảnh JPG, PNG hoặc WebP.')
        parser = MultiPartParser(request.headers, bounded(), max_files=1, max_fields=0)
        try:
            form = await parser.parse()
        except UploadTooLarge:
            raise TryOnError(413, 'PHOTO_TOO_LARGE', 'Ảnh phải có dung lượng tối đa 8 MB.')
        except (MultiPartException, MultipartParseError, ValueError):
            # Starlette closes files on MultiPartException; also close them for low-level parser failures.
            for stream in parser._files_to_close_on_error:
                stream.close()
            raise TryOnError(422, 'INVALID_PHOTO', 'Mỗi lần chỉ gửi một ảnh JPG, PNG hoặc WebP.')
        try:
            photo = form.get('photo')
            if len(form.multi_items()) != 1 or not isinstance(photo, UploadFile) or photo.content_type not in ('image/jpeg', 'image/png', 'image/webp'):
                raise TryOnError(422, 'INVALID_PHOTO', 'Vui lòng gửi một ảnh JPG, PNG hoặc WebP.')
            data = await photo.read(UPLOAD_LIMIT + 1)
            async with DECODE_SLOTS:
                normalized = await run_in_threadpool(normalize_image, data, person=True)
        finally:
            await form.close()
        key = await run_in_threadpool(svc.storage.new, normalized, 'photo')
        try:
            saved = await run_in_threadpool(svc.repo.add_photo, user, key)
        except Exception:
            await run_in_threadpool(svc.storage.delete, key)
            raise
        return JSONResponse({'id': str(saved['id']), 'expires_at': saved['expires_at'].isoformat()}, status_code=201, headers=PRIVATE_HEADERS)

    @app.post(ROOT + '/jobs', name='createTryOnJob', status_code=202)
    async def create(request: Request):
        user = await owner(request)
        args = await validated(request, 'createTryOnJob', body=True)
        svc, payload, key = service(), args['body'], args['headers']['idempotency-key']
        ip_hash = svc.ip_hash(request.headers.get('x-pbl6-client-ip', ''))
        await require_demo_password(request, svc.settings, user, limiter_getter(), ip_hash)
        old = await run_in_threadpool(svc.repo.existing, user, key, svc.repo.digest(payload))
        if old:
            return JSONResponse(svc.present(old), status_code=202, headers=PRIVATE_HEADERS)
        if not svc.settings.ready:
            raise TryOnError(503, 'TRY_ON_DISABLED', 'Tạo ảnh thử đồ đang tạm dừng.')
        await run_in_threadpool(svc.repo.preflight, user, payload['photo_id'])
        product, image, kind = await selection(svc, payload['product_id'], payload['variant_id'], request.state.correlation_id)
        normalized = await svc.garment(image['image_url'])
        garment = await run_in_threadpool(svc.storage.new, normalized, 'garment')
        try:
            job, created = await run_in_threadpool(svc.repo.create, user, payload, key, ip_hash, garment, image['id'], product['version'], kind)
        except Exception:
            await run_in_threadpool(svc.storage.delete, garment)
            raise
        if not created:
            await run_in_threadpool(svc.storage.delete, garment)
        return JSONResponse(svc.present(job), status_code=202, headers=PRIVATE_HEADERS)

    @app.get(ROOT + '/jobs', name='listTryOnJobs')
    async def jobs(request: Request):
        user = await owner(request)
        args = await validated(request, 'listTryOnJobs')
        svc = service()
        values = await run_in_threadpool(svc.repo.list, user, args['query']['product_id'], args['query']['variant_id'])
        return JSONResponse({'items': [svc.present(value) for value in values]}, headers=PRIVATE_HEADERS)

    @app.get(ROOT + '/jobs/{id}', name='getTryOnJob')
    async def job(request: Request):
        user = await owner(request)
        args = await validated(request, 'getTryOnJob')
        svc = service()
        value = await run_in_threadpool(svc.repo.get, user, args['path']['id'])
        return JSONResponse(svc.present(value), headers=PRIVATE_HEADERS)

    @app.delete(ROOT + '/jobs/{id}', name='deleteTryOnJob', status_code=204)
    async def delete(request: Request):
        user = await owner(request)
        args = await validated(request, 'deleteTryOnJob')
        svc = service()
        await run_in_threadpool(svc.repo.delete, user, args['path']['id'])
        from .worker import Worker
        await run_in_threadpool(Worker(svc.repo, svc.storage, svc.settings).cleanup)
        return Response(status_code=204, headers=PRIVATE_HEADERS)

    @app.delete(ROOT + '/photos/{id}', name='deleteTryOnPhoto', status_code=204)
    async def delete_photo(request: Request):
        user = await owner(request)
        args = await validated(request, 'deleteTryOnPhoto')
        svc = service()
        photo = await run_in_threadpool(svc.repo.delete_photo, user, args['path']['id'])
        await run_in_threadpool(svc.storage.delete, photo['file_key'])
        return Response(status_code=204, headers=PRIVATE_HEADERS)

    @app.get(ROOT + '/results/{id}', name='getTryOnResult')
    async def result(request: Request):
        # This route is a short-lived capability issued only after authenticated ownership checks.
        args = await validated(request, 'getTryOnResult')
        svc = service()
        path = await run_in_threadpool(svc.result_path, args['path']['id'], args['query']['expires'], args['query']['signature'])
        return FileResponse(path, media_type='image/jpeg', headers=PRIVATE_HEADERS)

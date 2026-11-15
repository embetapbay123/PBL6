import json
import re

from fastapi import Request
from fastapi.responses import JSONResponse, Response, StreamingResponse
from starlette.background import BackgroundTask
from starlette.concurrency import run_in_threadpool
from ..internal_client import InternalError
from ..runtime_contracts import MISSING, validate_operation
from ..try_on.demo import require_demo_password
from .media_service import turn_dto

PRIVATE = {'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': "default-src 'none'; sandbox"}
ROOT = '/api/v1/chat/sessions/{id}'


def byte_range(value, size):
    if value is None:
        return None
    match = re.fullmatch(r'bytes=(\d*)-(\d*)', value)
    if not match or not any(match.groups()) or size <= 0:
        raise InternalError(416, 'RANGE_NOT_SATISFIABLE', 'Khoảng tải không hợp lệ.')
    a, b = match.groups()
    start = int(a) if a else max(0, size - int(b))
    end = min(int(b), size - 1) if a and b else size - 1
    if start >= size or start < 0 or end < start or not a and int(b) <= 0:
        raise InternalError(416, 'RANGE_NOT_SATISFIABLE', 'Khoảng tải không hợp lệ.')
    return start, end


async def validated(request, operation, body=False):
    payload = MISSING
    if body:
        raw = bytearray()
        async for chunk in request.stream():
            if len(raw) + len(chunk) > 16384:
                raise InternalError(413, 'PAYLOAD_TOO_LARGE', 'Yêu cầu vượt giới hạn cho phép.')
            raw.extend(chunk)
        try:
            payload = json.loads(raw)
        except ValueError:
            raise InternalError(422, 'VALIDATION_FAILED', 'Dữ liệu không hợp lệ.')
    try:
        query = {k: request.query_params.getlist(k) if len(request.query_params.getlist(k)) > 1 else v for k, v in request.query_params.items()}
        return validate_operation(operation, body=payload, path=request.path_params, query=query, headers=dict(request.headers))
    except ValueError:
        raise InternalError(422, 'VALIDATION_FAILED', 'Dữ liệu không hợp lệ.')


def install(app, service_getter, authorize, limiter_getter, api_error):
    def service():
        value = service_getter()
        if value is None:
            raise InternalError(503, 'CHAT_MEDIA_DISABLED', 'Gửi tệp cho AI đang tạm dừng.')
        return value

    async def owner(request):
        return (await authorize(request, ['CUSTOMER']))['user_id']

    async def execute(request, operation, work, *, body=False, status=200):
        try:
            user = await owner(request)
            args = await validated(request, operation, body)
            value = await work(service(), user, args)
            return value if isinstance(value, Response) else JSONResponse(status_code=status, content=value, headers=PRIVATE)
        except InternalError as error:
            result = await api_error(request, error)
            result.headers.update(PRIVATE)
            if error.status == 429:
                result.headers['Retry-After'] = '600' if error.code == 'DEMO_PASSWORD_RATE_LIMITED' else '60'
            return result

    @app.get('/api/v1/chat/media-capabilities', name='getAiChatMediaCapabilities')
    async def capabilities(request: Request):
        async def work(svc, user, args):
            return await run_in_threadpool(svc.capability, user)
        return await execute(request, 'getAiChatMediaCapabilities', work)

    @app.post(ROOT + '/attachments', name='createAiChatAttachment')
    async def create(request: Request):
        async def work(svc, user, args):
            return await run_in_threadpool(svc.create, args['path']['id'], user, args['body'], request.headers.get('x-pbl6-client-ip', ''))
        return await execute(request, 'createAiChatAttachment', work, body=True, status=201)

    @app.put(ROOT + '/attachments/{attachment_id}/content', name='uploadAiChatAttachment')
    async def upload(request: Request):
        async def work(svc, user, args):
            return await svc.upload(args['path']['id'], args['path']['attachment_id'], user, request.stream(), request.headers.get('content-type', ''), request.headers.get('content-length'))
        return await execute(request, 'uploadAiChatAttachment', work)

    @app.get(ROOT + '/attachments/{attachment_id}', name='getAiChatAttachment')
    async def metadata(request: Request):
        async def work(svc, user, args):
            return await run_in_threadpool(svc.repo.metadata, args['path']['id'], args['path']['attachment_id'], user)
        return await execute(request, 'getAiChatAttachment', work)

    @app.delete(ROOT + '/attachments/{attachment_id}', name='deleteAiChatAttachment')
    async def cancel(request: Request):
        async def work(svc, user, args):
            return await run_in_threadpool(svc.cancel, args['path']['id'], args['path']['attachment_id'], user)
        return await execute(request, 'deleteAiChatAttachment', work)

    @app.api_route(ROOT + '/attachments/{attachment_id}/content', methods=['GET', 'HEAD'], name='readAiChatAttachment')
    async def content(request: Request):
        async def work(svc, user, args):
            file, size, mime = await run_in_threadpool(svc.content, args['path']['id'], args['path']['attachment_id'], user, args['query'].get('preview', False))
            try:
                selected = byte_range(request.headers.get('range'), size)
            except InternalError as error:
                file.close()
                result = await api_error(request, error)
                result.headers['Content-Range'] = 'bytes */' + str(size)
                result.headers.update(PRIVATE)
                return result
            start, end = selected or (0, size - 1)
            headers = {**PRIVATE, 'Content-Length': str(end - start + 1), 'Accept-Ranges': 'bytes',
                       'Content-Disposition': 'inline; filename="chat-' + args['path']['attachment_id'] + ('.mp4' if mime == 'video/mp4' else '.webp') + '"'}
            if selected:
                headers['Content-Range'] = f'bytes {start}-{end}/{size}'
            if request.method == 'HEAD':
                file.close()
                return Response(status_code=206 if selected else 200, headers=headers, media_type=mime)
            def chunks():
                try:
                    file.seek(start)
                    remaining = end - start + 1
                    while remaining:
                        chunk = file.read(min(65536, remaining))
                        if not chunk:
                            break
                        remaining -= len(chunk)
                        yield chunk
                finally:
                    file.close()
            return StreamingResponse(chunks(), status_code=206 if selected else 200, headers=headers, media_type=mime, background=BackgroundTask(file.close))
        return await execute(request, 'readAiChatAttachment', work)

    @app.post(ROOT + '/media-messages', name='createAiChatMediaTurn')
    async def create_turn(request: Request):
        async def work(svc, user, args):
            svc.require_enabled()
            ip_hash = svc.repo.ip_hash(request.headers.get('x-pbl6-client-ip', ''))
            try:
                await require_demo_password(request, svc.settings, user, limiter_getter(), ip_hash)
            except InternalError as error:
                raise InternalError(error.status, error.code, error.message.replace('tạo ảnh', 'phân tích ảnh'))
            row = await run_in_threadpool(svc.repo.create_turn, args['path']['id'], user, args['body'], ip_hash)
            return turn_dto(row)
        return await execute(request, 'createAiChatMediaTurn', work, body=True, status=202)

    @app.get(ROOT + '/media-messages/{client_message_id}', name='getAiChatMediaTurn')
    async def get_turn(request: Request):
        async def work(svc, user, args):
            return turn_dto(await run_in_threadpool(svc.repo.get_turn, args['path']['id'], args['path']['client_message_id'], user))
        return await execute(request, 'getAiChatMediaTurn', work)

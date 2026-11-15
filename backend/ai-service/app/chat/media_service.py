import asyncio
import hashlib
import json
import logging
import os
import time
import uuid
from dataclasses import asdict, replace
from datetime import timedelta

from sqlalchemy import text
from starlette.concurrency import run_in_threadpool
from ..internal_client import InternalError
from ..try_on.config import Settings, now, periods
from ..paid_budget import shared_spend
from .media_files import MediaFiles, IMAGE_LIMIT, VIDEO_LIMIT
from .media_repository import MediaRepository, attachment, mapping
from .provider import Selection, compose
from .retrieval import contextual_question, retrieve
from .vision import OpenAIVision, VisionOutcome, MODEL, RESERVATION, CONSENT_VERSION

log = logging.getLogger('pbl6.chat.media')


def turn_dto(row):
    result = {'id': str(row['id']), 'client_message_id': str(row['client_message_id']), 'status': row['status']}
    if row.get('response') and row['status'] == 'SUCCEEDED':
        result['assistant'] = row['response']
    if row.get('error_code'):
        result['error_code'] = row['error_code']
        result['message'] = ('Chưa xác định kết quả. Đọc lại câu hỏi này; không gửi thành câu hỏi mới.' if row['status'] == 'UNKNOWN' else
                             'Chưa có câu trả lời dùng được. Bạn có thể kiểm tra tệp và gửi câu hỏi mới trong hạn mức.')
    return result


class AiChatMedia:
    def __init__(self, engine, catalog, settings=None, *, directory=None, enabled=None, provider=None):
        self.settings = settings or Settings.load()
        self.repo = MediaRepository(engine, self.settings)
        self.files = MediaFiles(directory or os.getenv('AI_CHAT_MEDIA_STORAGE_DIR', '/var/lib/pbl6/ai-chat-media'))
        self.catalog = catalog
        self.enabled = enabled if enabled is not None else os.getenv('AI_CHAT_MEDIA_ENABLED', '0') == '1'
        self.provider = provider or OpenAIVision(self.settings.api_key)
        self.native_ready = False
        self.ticks = 0

    def initialize(self):
        if self.enabled:
            if not self.settings.api_key or len(self.settings.signing_key) < 32 or self.settings.daily_budget < RESERVATION or self.settings.monthly_budget < RESERVATION:
                raise ValueError('Configure the existing shared AI key, signing key and budgets before enabling chat media')
            with self.repo.engine.connect() as db:
                if not db.execute(text("SELECT to_regclass('ai_chat_attachment') IS NOT NULL AND to_regclass('paid_ai_cost') IS NOT NULL")).scalar_one():
                    raise ValueError('Apply AI chat media migrations before enabling uploads')
            self.files.ready()
            self.native_ready = True

    def require_enabled(self):
        if not self.enabled or not self.native_ready:
            raise InternalError(503, 'CHAT_MEDIA_DISABLED', 'Gửi tệp cho AI đang tạm dừng. Bạn vẫn có thể gửi văn bản.')

    def capability(self, owner):
        remaining, paused, money = 0, False, False
        pending = None
        if self.enabled and self.native_ready:
            day, month, _ = periods()
            with self.repo.engine.connect() as db:
                count = db.execute(text('SELECT count(*) FROM paid_ai_call WHERE owner_id=:u AND budget_day=:day AND quota_charged'), {'u': owner, 'day': day}).scalar_one()
                pending = db.execute(text("SELECT session_id,client_message_id FROM paid_ai_call WHERE owner_id=:u AND status IN ('QUEUED','PROCESSING','UNKNOWN') AND content_deleted_at IS NULL LIMIT 1"), {'u': owner}).first()
                remaining = max(0, 3 - count)
                paused = db.execute(text('SELECT paused FROM try_on_guard WHERE id=1')).scalar_one()
                spend = shared_spend(db, day, month)
                money = spend['day_spend'] + RESERVATION <= self.settings.daily_budget and spend['month_spend'] + RESERVATION <= self.settings.monthly_budget
            available = remaining > 0 and not pending and not paused and money
        else:
            available = False
        return {'enabled': bool(available), 'images_per_message': 3, 'image_max_bytes': IMAGE_LIMIT, 'video_max_bytes': VIDEO_LIMIT,
                'video_max_duration_seconds': 30, 'video_max_frames': 8, 'audio_supported': False,
                'demo_password_required': self.settings.demo_mode, 'remaining': remaining, 'limit': 3,
                'provider_label': 'OpenAI', 'retention_days': 30, 'consent_version': CONSENT_VERSION,
                **({'pending_turn': {'session_id': str(pending[0]), 'client_message_id': str(pending[1])}} if pending else {}),
                **({} if available else {'message': 'Phân tích ảnh đang tạm dừng hoặc đã hết lượt. Bạn vẫn có thể gửi văn bản.'})}

    def create(self, session, owner, payload, ip):
        self.require_enabled()
        self.files.available()
        return self.repo.create(session, owner, payload, self.repo.ip_hash(ip))

    async def upload(self, session, asset, owner, stream, content_type, length):
        self.require_enabled()
        if content_type.lower().split(';')[0].strip() != 'application/octet-stream':
            raise InternalError(415, 'CHAT_UPLOAD_CONTENT_TYPE', 'Tải nội dung tệp dưới dạng nhị phân.')
        row, token = await run_in_threadpool(self.repo.start_upload, session, asset, owner, length)
        if not token:
            return attachment(row)
        temporary, canonical = uuid.uuid4().hex + '.upload', uuid.UUID(asset).hex + '.upload'
        count, digest = 0, hashlib.sha256()
        try:
            await run_in_threadpool(self.files.available)
            async with asyncio.timeout(120):
                with self.files.path(temporary).open('xb') as handle:
                    os.chmod(handle.name, 0o600)
                    async for chunk in stream:
                        count += len(chunk)
                        if count > row['expected_bytes']:
                            raise InternalError(413, 'CHAT_FILE_TOO_LARGE', 'Dung lượng tệp vượt giới hạn của lần tải này.')
                        digest.update(chunk)
                        await run_in_threadpool(handle.write, chunk)
                    await run_in_threadpool(handle.flush)
                    await run_in_threadpool(os.fsync, handle.fileno())
                if count != row['expected_bytes'] or digest.hexdigest() != row['input_sha256']:
                    raise InternalError(422, 'CHAT_UPLOAD_CHECKSUM', 'Tệp tải lên chưa đầy đủ. Hãy thử tải lại.')
                try:
                    await run_in_threadpool(self.files.publish, temporary, canonical)
                except FileExistsError:
                    await run_in_threadpool(self.files.remove, temporary)
                return await run_in_threadpool(self.repo.finish_upload, asset, token)
        except BaseException:
            await run_in_threadpool(self.repo.reject_upload, asset, token)
            current = await run_in_threadpool(self.repo.asset, asset)
            if not current or current['status'] in ('DELETED', 'EXPIRED', 'REJECTED'):
                await run_in_threadpool(self.files.remove, canonical)
            raise
        finally:
            await run_in_threadpool(self.files.remove, temporary)

    def cancel(self, session, asset, owner):
        row = self.repo.cancel(session, asset, owner)
        for key in (uuid.UUID(asset).hex + '.upload', row.get('file_key'), row.get('preview_key')):
            self.files.remove(key)
        return attachment(row)

    def content(self, session, asset, owner, preview=False):
        with self.repo.engine.connect() as db:
            row = self.repo.owned(db, session, asset, owner)
        if row['status'] != 'READY' or row['expires_at'] <= now():
            raise InternalError(404, 'CHAT_FILE_UNAVAILABLE', 'Tệp không còn sẵn sàng.')
        key = row.get('preview_key') if preview else row.get('file_key')
        if not key:
            raise InternalError(404, 'CHAT_FILE_UNAVAILABLE', 'Tệp không còn sẵn sàng.')
        try:
            file = self.files.open(key)
        except FileNotFoundError:
            raise InternalError(404, 'CHAT_FILE_UNAVAILABLE', 'Tệp không còn sẵn sàng.')
        return file, os.fstat(file.fileno()).st_size, 'image/webp' if preview else row['content_type']

    async def process_asset(self, asset):
        result = None
        raw = asset['id'].hex + '.upload'
        try:
            result = await run_in_threadpool(self.files.process, raw, asset['kind'])
            changed = await run_in_threadpool(self.repo.finish_asset, asset, result)
            if changed:
                await run_in_threadpool(self.files.remove, raw)
            else:
                for key in (result['file_key'], result.get('preview_key')):
                    await run_in_threadpool(self.files.remove, key)
        except Exception as error:
            await run_in_threadpool(self.repo.finish_asset, asset, None, getattr(error, 'code', 'CHAT_FILE_INVALID'))
            # A READY acknowledgement can be lost after commit. Keep its files.
            current = await run_in_threadpool(self.repo.asset, str(asset['id']))
            if result and current and current.get('file_key') != result['file_key']:
                for key in (result['file_key'], result.get('preview_key')):
                    await run_in_threadpool(self.files.remove, key)
            if current and current['status'] in ('READY', 'REJECTED', 'DELETED', 'EXPIRED'):
                await run_in_threadpool(self.files.remove, raw)

    def receipt(self, turn, outcome, response, before_dispatch):
        key = turn['id'].hex + '.receipt.json'
        data = json.dumps({'outcome': asdict(outcome), 'response': response, 'before_dispatch': before_dispatch}, ensure_ascii=False).encode()
        if len(data) > 65536:
            raise ValueError('AI chat receipt exceeds bound')
        temporary = uuid.uuid4().hex + '.upload'
        try:
            self.files.write(temporary, data)
            # Receipts, unlike uploaded bytes, have one server-owned writer.
            os.replace(self.files.path(temporary), self.files.path(key))
        finally:
            self.files.remove(temporary)
        return key

    async def process_turn(self, turn):
        outcome, response, dispatched = None, None, False
        try:
            assets, history = await run_in_threadpool(self.repo.turn_inputs, turn)
            images = []
            for asset in assets:
                images.extend(await run_in_threadpool(self.files.vision_images, asset))
            search = contextual_question(turn['question'] or 'Mô tả hình ảnh', history)
            candidates = await self.catalog.snapshot('media-' + str(turn['id']))
            products = await run_in_threadpool(retrieve, self.repo.engine, search, candidates)
            dispatched = await run_in_threadpool(self.repo.dispatch, turn)
            if not dispatched:
                raise InternalError(409, 'CHAT_MEDIA_NOT_DISPATCHED', 'Câu hỏi chưa được gửi. Hãy đọc lại trạng thái.')
            outcome = await self.provider.select(turn['question'], products, history, images, video=assets[0]['kind'] == 'VIDEO', owner=str(turn['owner_id']), correlation='media-' + str(turn['id']))
            if outcome.selection:
                current = await asyncio.gather(*(self.catalog.product(id, 'media-' + str(turn['id'])) for id in outcome.selection.ids))
                before = {p['id']: p for p in products}
                if len(current) != len(outcome.selection.ids) or any(any(p.get(k) != before[p['id']].get(k) for k in ('title', 'description', 'version', 'store_id')) for p in current):
                    outcome = replace(outcome, selection=None, code='CHAT_MEDIA_CATALOG_CHANGED')
                else:
                    content, cards = compose(outcome.selection, current)
                    response = {'id': str(uuid.uuid4()), 'session_id': str(turn['session_id']), 'role': 'ASSISTANT', 'content': content, 'product_cards': cards,
                                'fallback': False, 'fallback_reason': 'MODEL_GENERATED', 'mode': 'real', 'media_analysis': 'VIDEO_FRAMES' if assets[0]['kind'] == 'VIDEO' else 'IMAGES'}
        except asyncio.CancelledError:
            outcome = outcome or VisionOutcome(code='CHAT_MEDIA_INTERRUPTED', uncertain=dispatched)
            raise
        except Exception as error:
            outcome = replace(outcome, selection=None, code='CHAT_MEDIA_RESULT_UNAVAILABLE') if outcome else VisionOutcome(code=getattr(error, 'code', 'CHAT_MEDIA_PREPARATION_FAILED'), uncertain=dispatched)
        finally:
            if outcome:
                key = None
                try:
                    key = await run_in_threadpool(self.receipt, turn, outcome, response, not dispatched)
                    await run_in_threadpool(self.repo.finish_turn, turn, outcome, response, before_dispatch=not dispatched)
                    await run_in_threadpool(self.files.remove, key)
                except Exception:
                    # A receipt is replayed locally; no provider request is repeated.
                    log.warning('CHAT_MEDIA_SETTLEMENT_PENDING')

    async def recover(self):
        for turn in await run_in_threadpool(self.repo.stale_turns):
            key = turn['id'].hex + '.receipt.json'
            try:
                with self.files.open(key) as stream:
                    data = stream.read(65537)
                if len(data) > 65536:
                    raise ValueError('Receipt exceeds bound')
                receipt = json.loads(data)
                values = receipt['outcome']
                if values.get('selection'):
                    values['selection'] = Selection(**values['selection'])
                outcome = VisionOutcome(**values)
                await run_in_threadpool(self.repo.finish_turn, turn, outcome, receipt.get('response'), before_dispatch=receipt['before_dispatch'])
                await run_in_threadpool(self.files.remove, key)
            except FileNotFoundError:
                if turn['status'] == 'PROCESSING':
                    await run_in_threadpool(self.repo.finish_turn, turn, VisionOutcome(code='CHAT_MEDIA_PROVIDER_UNKNOWN' if turn['dispatched_at'] else 'CHAT_MEDIA_INTERRUPTED', uncertain=turn['dispatched_at'] is not None), before_dispatch=turn['dispatched_at'] is None)
            except Exception:
                log.warning('CHAT_MEDIA_RECOVERY_PENDING')

    def cleanup(self):
        for row in self.repo.cleanup():
            for key in (row['id'].hex + '.upload', row.get('file_key'), row.get('preview_key')):
                self.files.remove(key)
            with self.repo.engine.begin() as db:
                db.execute(text("UPDATE ai_chat_attachment SET file_key=NULL,preview_key=NULL,stored_bytes=0,files_deleted_at=now() WHERE id=:id AND status IN ('DELETED','EXPIRED')"), {'id': row['id']})
        from .retention import retain
        retain(self.repo.engine)
        self.files.prepare()
        with self.repo.engine.connect() as db:
            assets = db.execute(text("SELECT id,status,file_key,preview_key FROM ai_chat_attachment WHERE status IN ('UPLOADING','PROCESSING','READY')")).mappings().all()
            calls = db.execute(text("SELECT id FROM paid_ai_call WHERE status IN ('PROCESSING','UNKNOWN')")).all()
        live = {r['id'].hex + '.upload' for r in assets if r['status'] != 'READY'}
        live.update(key for r in assets for key in (r['file_key'], r['preview_key']) if key)
        live.update(r[0].hex + '.receipt.json' for r in calls)
        from .media_files import KEY
        for path in self.files.root.iterdir():
            if KEY.fullmatch(path.name) and path.name not in live and not path.is_symlink() and path.is_file() and path.stat().st_mtime < time.time() - 7200:
                self.files.remove(path.name)

    async def tick(self):
        self.ticks += 1
        if self.ticks % 60 == 0:
            with self.repo.engine.connect() as db:
                exists = db.execute(text("SELECT to_regclass('ai_chat_attachment') IS NOT NULL")).scalar_one()
            if exists:
                await run_in_threadpool(self.cleanup)
        if not self.enabled or not self.native_ready:
            return
        await self.recover()
        asset = await run_in_threadpool(self.repo.claim_asset)
        if asset:
            await self.process_asset(asset)
        turn = await run_in_threadpool(self.repo.claim_turn)
        if turn:
            await self.process_turn(turn)

    async def run(self):
        while True:
            try:
                await self.tick()
            except Exception:
                log.warning('CHAT_MEDIA_WORKER_RETRY')
            await asyncio.sleep(1)

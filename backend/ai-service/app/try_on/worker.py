"""Durable M4 image worker. A potentially dispatched call is never submitted again."""
import asyncio
import hashlib
import hmac
import logging
import os
import time
import uuid

from sqlalchemy import create_engine

from .config import Settings
from .provider import OpenAIImages
from .repository import Repository
from .storage import PrivateStorage

log = logging.getLogger('pbl6.try_on')


class Worker:
    def __init__(self, repository, storage, settings, provider=None):
        self.repo, self.storage, self.settings = repository, storage, settings
        self.provider = provider or OpenAIImages(settings)

    def recover(self):
        for job in self.repo.stale():
            try:
                receipt = self.storage.read_receipt(job['id'])
            except (ValueError, OSError):
                receipt = None
                log.warning('TRY_ON_RECEIPT_UNAVAILABLE')
            if receipt:
                self.repo.finish(job, 'SUCCEEDED', usage=receipt.get('usage'), cost=receipt.get('cost'), request_id=receipt.get('request_id'))
            elif job['status'] == 'PROCESSING':
                self.repo.finish(job, 'UNKNOWN' if job['dispatched_at'] else 'FAILED',
                                 message='Chưa xác định kết quả. Vui lòng kiểm tra lại, không gửi thêm yêu cầu.' if job['dispatched_at'] else 'Ảnh chưa được gửi. Hãy tạo lại khi sẵn sàng.',
                                 before_dispatch=job['dispatched_at'] is None)

    def cleanup(self):
        jobs, photos = self.repo.cleanup()
        for job in jobs:
            stem = uuid.UUID(str(job['id'])).hex
            for key in (job['garment_key'], stem + '.result.jpg', stem + '.receipt.json'):
                self.storage.delete(key)
        for photo in photos:
            self.storage.delete(photo['file_key'])
        # Files written before an admission transaction or a crashed receipt write may be orphaned.
        # Only remove unreferenced files older than an hour, so active writers cannot be raced.
        from sqlalchemy import text
        with self.repo.engine.connect() as db:
            referenced = set(db.execute(text('SELECT file_key FROM try_on_photo WHERE deleted_at IS NULL')).scalars())
            for job in db.execute(text("SELECT id,garment_key FROM try_on_job WHERE deleted_at IS NULL OR status='PROCESSING'")).mappings():
                stem = uuid.UUID(str(job['id'])).hex
                referenced.update((job['garment_key'], stem + '.result.jpg', stem + '.receipt.json'))
        if self.storage.root.exists():
            for path in self.storage.root.iterdir():
                if path.is_file() and not path.is_symlink() and path.name not in referenced and time.time() - path.stat().st_mtime > 3600:
                    if path.suffix == '.tmp' and len(path.stem) == 32:
                        path.unlink(missing_ok=True)
                    else:
                        try: self.storage.delete(path.name)
                        except ValueError: pass

    async def once(self):
        job = self.repo.claim()
        if not job:
            return False
        sent = False
        try:
            person, garment = self.storage.read(job['photo_key']), self.storage.read(job['garment_key'])
            if not self.repo.dispatch(job):
                return True
            sent = True
            safety = hmac.new(self.settings.signing_key.encode(), ('user:' + str(job['owner_id'])).encode(), hashlib.sha256).hexdigest()
            outcome = await self.provider.edit(person, garment, job['garment_kind'], safety)
            if outcome.image:
                self.storage.receipt(job['id'], outcome.image, {'usage': outcome.usage, 'cost': outcome.cost, 'request_id': outcome.request_id})
            self.repo.finish(job, outcome.status, usage=outcome.usage, cost=outcome.cost, request_id=outcome.request_id, message=outcome.message, pause=outcome.pause)
        except Exception:
            # No provider body, customer image, prompt, IP or secret in logs.
            log.warning('TRY_ON_WORK_REQUIRES_RECOVERY')
            if not sent:
                self.repo.finish(job, 'FAILED', before_dispatch=True, message='Ảnh chưa được gửi. Hãy chọn lại ảnh và kiểm tra lượt thử.')
            # Once sent, leave the lease/receipt for recovery. Never claim this job again.
        return True


async def run():
    logging.basicConfig(level=logging.INFO, format='%(message)s')
    settings = Settings.load()
    engine = create_engine(os.environ['M4_DATABASE_URL'].replace('postgresql://', 'postgresql+psycopg://', 1), pool_size=3, max_overflow=0, hide_parameters=True)
    worker = Worker(Repository(engine, settings), PrivateStorage(settings.storage_dir), settings)
    maintenance = 0
    try:
        while True:
            try:
                if time.monotonic() >= maintenance:
                    worker.recover()
                    worker.cleanup()
                    maintenance = time.monotonic() + 30
                worked = await worker.once()
                if not worked:
                    await asyncio.sleep(2)
            except Exception:
                log.warning('TRY_ON_WORKER_RETRY')
                await asyncio.sleep(2)
    finally:
        engine.dispose()


if __name__ == '__main__':
    asyncio.run(run())

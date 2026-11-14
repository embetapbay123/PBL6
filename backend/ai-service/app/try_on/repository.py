import hashlib
import json
import uuid
from datetime import timedelta

from sqlalchemy import text

from .config import CONSENT_VERSION, MODEL, PROMPT_VERSION, TryOnError, now, periods


def row(result):
    value = result.mappings().first()
    return dict(value) if value else None


class Repository:
    def __init__(self, engine, settings):
        self.engine, self.settings = engine, settings

    def guard(self, db):
        return db.execute(text('SELECT paused FROM try_on_guard WHERE id=1 FOR UPDATE')).scalar_one()

    def stats(self, db, owner=None, ip_hash=None):
        day, month, reset = periods()
        value = row(db.execute(text("""
          SELECT count(*) FILTER(WHERE owner_id=CAST(:owner AS uuid) AND budget_day=:day AND quota_charged) AS user_calls,
            count(*) FILTER(WHERE budget_day=:day AND quota_charged) AS day_calls,
            count(*) FILTER(WHERE budget_month=:month AND quota_charged) AS month_calls,
            count(*) FILTER(WHERE ip_hash=:ip AND budget_day=:day AND quota_charged) AS ip_calls,
            count(*) FILTER(WHERE ip_hash=:ip AND created_at>now()-interval '1 minute' AND quota_charged) AS ip_minute,
            max(created_at) FILTER(WHERE owner_id=CAST(:owner AS uuid) AND quota_charged) AS last_created,
            count(*) FILTER(WHERE owner_id=CAST(:owner AS uuid) AND status IN ('QUEUED','PROCESSING','UNKNOWN')) AS pending,
            coalesce(sum(CASE WHEN cost_state='RELEASED' THEN 0 WHEN cost_state='SETTLED' THEN charged_micro_usd ELSE reserved_micro_usd END)
              FILTER(WHERE budget_day=:day OR cost_state IN ('RESERVED','UNKNOWN')),0) AS day_spend,
            coalesce(sum(CASE WHEN cost_state='RELEASED' THEN 0 WHEN cost_state='SETTLED' THEN charged_micro_usd ELSE reserved_micro_usd END)
              FILTER(WHERE budget_month=:month OR cost_state IN ('RESERVED','UNKNOWN')),0) AS month_spend,
            count(*) FILTER(WHERE status='UNKNOWN') AS unknown_jobs
          FROM try_on_job
        """), {'owner': owner, 'ip': ip_hash, 'day': day, 'month': month}))
        value['reset_at'] = reset.isoformat()
        return value

    def capability(self, owner):
        with self.engine.connect() as db:
            paused = db.execute(text('SELECT paused FROM try_on_guard WHERE id=1')).scalar_one()
            stats = self.stats(db, owner)
        cfg = self.settings
        enabled = cfg.ready and not paused and not stats['pending'] and stats['day_calls'] < cfg.daily_limit and stats['month_calls'] < cfg.monthly_limit
        enabled = enabled and stats['day_spend'] + cfg.reservation <= cfg.daily_budget and stats['month_spend'] + cfg.reservation <= cfg.monthly_budget
        return {'enabled': bool(enabled), 'demo_password_required': cfg.demo_mode,
                'quota': {'remaining': max(0, cfg.user_limit - stats['user_calls']), 'limit': cfg.user_limit, 'reset_at': stats['reset_at']},
                'consent_version': CONSENT_VERSION, 'privacy': {'provider_label': 'OpenAI', 'retention_hours': cfg.retention_hours},
                **({} if enabled else {'message': 'Bạn có lần thử đang được xử lý hoặc cần kiểm tra kết quả.' if stats['pending'] else 'Tạo ảnh thử đồ đang tạm dừng. Vui lòng quay lại sau.'})}

    def add_photo(self, owner, file_key):
        with self.engine.begin() as db:
            if self.guard(db) or not self.settings.ready:
                raise TryOnError(503, 'TRY_ON_DISABLED', 'Tạo ảnh thử đồ đang tạm dừng.')
            count = db.execute(text('SELECT count(*) FROM try_on_photo WHERE owner_id=:u AND deleted_at IS NULL AND expires_at>now()'), {'u': owner}).scalar_one()
            total = db.execute(text('SELECT count(*) FROM try_on_photo WHERE deleted_at IS NULL AND expires_at>now()')).scalar_one()
            if count >= 5 or total >= 500:
                raise TryOnError(429, 'PHOTO_LIMIT', 'Đã đạt giới hạn ảnh lưu tạm. Hãy xóa ảnh cũ hoặc quay lại sau.')
            return row(db.execute(text('INSERT INTO try_on_photo(id,owner_id,file_key,expires_at) VALUES(:id,:u,:key,:expiry) RETURNING *'),
                                  {'id': str(uuid.uuid4()), 'u': owner, 'key': file_key, 'expiry': now() + timedelta(hours=self.settings.retention_hours)}))

    @staticmethod
    def digest(payload):
        return hashlib.sha256(json.dumps(payload, sort_keys=True, separators=(',', ':')).encode()).hexdigest()

    def existing(self, owner, key, digest):
        with self.engine.connect() as db:
            value = row(db.execute(text('SELECT * FROM try_on_job WHERE owner_id=:u AND idempotency_key=:key'), {'u': owner, 'key': key}))
        if value and value['payload_hash'] != digest:
            raise TryOnError(409, 'IDEMPOTENCY_CONFLICT', 'Yêu cầu đã dùng cho nội dung khác. Hãy kiểm tra lần thử trước.')
        return value

    def preflight(self, owner, photo_id):
        # Read-only early rejection avoids downloading catalog media for an invalid photo or exhausted account.
        # The admission transaction still repeats all authoritative checks under the guard lock.
        with self.engine.connect() as db:
            photo = db.execute(text('SELECT 1 FROM try_on_photo WHERE id=:id AND owner_id=:u AND deleted_at IS NULL AND expires_at>now()'), {'id': photo_id, 'u': owner}).first()
        if not photo:
            raise TryOnError(404, 'PHOTO_NOT_FOUND', 'Ảnh không còn sẵn sàng. Hãy chọn lại ảnh.')
        capability = self.capability(owner)
        if not capability['enabled'] or capability['quota']['remaining'] < 1:
            raise TryOnError(429, 'TRY_ON_QUOTA', capability.get('message', 'Bạn đã dùng hết lượt thử hôm nay.'))

    def create(self, owner, payload, key, ip_hash, garment_key, image_id, catalog_version, garment_kind):
        cfg, timestamp = self.settings, now()
        digest = self.digest(payload)
        with self.engine.begin() as db:
            paused = self.guard(db)
            existing = row(db.execute(text('SELECT * FROM try_on_job WHERE owner_id=:u AND idempotency_key=:key'), {'u': owner, 'key': key}))
            if existing:
                if existing['payload_hash'] != digest:
                    raise TryOnError(409, 'IDEMPOTENCY_CONFLICT', 'Yêu cầu đã dùng cho nội dung khác.')
                return existing, False
            if not cfg.ready or paused:
                raise TryOnError(503, 'TRY_ON_DISABLED', 'Tạo ảnh thử đồ đang tạm dừng.')
            photo = row(db.execute(text('SELECT * FROM try_on_photo WHERE id=:id AND owner_id=:u AND deleted_at IS NULL AND expires_at>now() FOR UPDATE'), {'id': payload['photo_id'], 'u': owner}))
            if not photo:
                raise TryOnError(404, 'PHOTO_NOT_FOUND', 'Ảnh không còn sẵn sàng. Hãy chọn lại ảnh.')
            if payload['consent_version'] != CONSENT_VERSION:
                raise TryOnError(409, 'CONSENT_CHANGED', 'Thông tin gửi ảnh đã thay đổi. Hãy mở lại phòng thử đồ.')
            stats = self.stats(db, owner, ip_hash)
            if stats['pending']:
                raise TryOnError(409, 'TRY_ON_PENDING', 'Có lần thử chưa kết thúc. Hãy kiểm tra kết quả trước khi tạo lại.')
            if (stats['user_calls'] >= cfg.user_limit or stats['ip_calls'] >= cfg.ip_daily_limit or stats['ip_minute'] >= 10
                    or (stats['last_created'] and (timestamp - stats['last_created']).total_seconds() < cfg.cooldown_seconds)):
                raise TryOnError(429, 'TRY_ON_QUOTA', 'Đã đạt giới hạn lượt thử hoặc đang trong thời gian chờ. Vui lòng kiểm tra lại sau.')
            if (stats['day_calls'] >= cfg.daily_limit or stats['month_calls'] >= cfg.monthly_limit
                    or stats['day_spend'] + cfg.reservation > cfg.daily_budget or stats['month_spend'] + cfg.reservation > cfg.monthly_budget):
                raise TryOnError(429, 'TRY_ON_BUDGET', 'Đã đạt hạn mức tạo ảnh của hệ thống. Vui lòng quay lại sau.')
            day, month, _ = periods(timestamp)
            value = row(db.execute(text("""INSERT INTO try_on_job
              (id,owner_id,photo_id,product_id,variant_id,idempotency_key,payload_hash,ip_hash,garment_key,catalog_image_id,catalog_version,garment_kind,
               consent_version,prompt_version,model,quality,complexity,status,budget_day,budget_month,reserved_micro_usd,expires_at)
              VALUES(:id,:u,:photo,:product,:variant,:key,:digest,:ip,:garment,:image,:version,:kind,:consent,:prompt,:model,'low','low','QUEUED',:day,:month,:reserve,:expiry) RETURNING *"""),
              {'id': str(uuid.uuid4()), 'u': owner, 'photo': payload['photo_id'], 'product': payload['product_id'], 'variant': payload['variant_id'], 'key': key,
               'digest': digest, 'ip': ip_hash, 'garment': garment_key, 'image': image_id, 'version': catalog_version, 'kind': garment_kind,
               'consent': CONSENT_VERSION, 'prompt': PROMPT_VERSION, 'model': MODEL, 'day': day, 'month': month, 'reserve': cfg.reservation,
               'expiry': min(photo['expires_at'], timestamp + timedelta(hours=cfg.retention_hours))}))
            return value, True

    def get(self, owner, job_id):
        with self.engine.connect() as db:
            value = row(db.execute(text('SELECT * FROM try_on_job WHERE id=:id AND owner_id=:u AND deleted_at IS NULL'), {'id': job_id, 'u': owner}))
        if not value:
            raise TryOnError(404, 'TRY_ON_NOT_FOUND', 'Không tìm thấy lần thử này.')
        return value

    def list(self, owner, product_id, variant_id):
        with self.engine.connect() as db:
            return [dict(item) for item in db.execute(text('SELECT * FROM try_on_job WHERE owner_id=:u AND product_id=:p AND variant_id=:v AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 20'), {'u': owner, 'p': product_id, 'v': variant_id}).mappings()]

    def delete(self, owner, job_id):
        with self.engine.begin() as db:
            self.guard(db)
            value = row(db.execute(text('SELECT * FROM try_on_job WHERE id=:id AND owner_id=:u FOR UPDATE'), {'id': job_id, 'u': owner}))
            if not value:
                raise TryOnError(404, 'TRY_ON_NOT_FOUND', 'Không tìm thấy lần thử này.')
            db.execute(text("""UPDATE try_on_job SET delete_requested_at=coalesce(delete_requested_at,now()),deleted_at=now(),updated_at=now(),
              status=CASE WHEN status='QUEUED' THEN 'CANCELLED' ELSE status END,
              cost_state=CASE WHEN dispatched_at IS NULL THEN 'RELEASED' ELSE cost_state END,
              quota_charged=CASE WHEN dispatched_at IS NULL THEN false ELSE quota_charged END WHERE id=:id"""), {'id': job_id})
            return value

    def claim(self):
        cfg = self.settings
        with self.engine.begin() as db:
            if self.guard(db) or not cfg.ready:
                return None
            active = db.execute(text("SELECT count(*) FROM try_on_job WHERE status='PROCESSING' AND lease_until>now()")).scalar_one()
            if active >= cfg.concurrency:
                return None
            value = row(db.execute(text("SELECT j.*,p.file_key AS photo_key FROM try_on_job j JOIN try_on_photo p ON p.id=j.photo_id WHERE j.status='QUEUED' AND j.deleted_at IS NULL ORDER BY j.created_at FOR UPDATE OF j SKIP LOCKED LIMIT 1")))
            if not value:
                return None
            token = str(uuid.uuid4())
            db.execute(text("UPDATE try_on_job SET status='PROCESSING',worker_token=:token,lease_until=:lease,updated_at=now() WHERE id=:id"), {'id': value['id'], 'token': token, 'lease': now() + timedelta(seconds=cfg.timeout_seconds + 90)})
            return {**value, 'worker_token': token, 'status': 'PROCESSING'}

    def dispatch(self, value):
        with self.engine.begin() as db:
            paused = self.guard(db)
            current = row(db.execute(text('SELECT * FROM try_on_job WHERE id=:id AND worker_token=:token FOR UPDATE'), {'id': value['id'], 'token': value['worker_token']}))
            if not current or current['status'] != 'PROCESSING' or current['dispatched_at']:
                return False
            if (paused or not self.settings.ready or current['delete_requested_at'] or current['expires_at'] <= now() or current['budget_day'] != periods()[0]):
                db.execute(text("UPDATE try_on_job SET status='CANCELLED',cost_state='RELEASED',quota_charged=false,message='Lần thử chưa được gửi và đã dừng. Hãy kiểm tra lại lượt thử.',updated_at=now() WHERE id=:id"), {'id': value['id']})
                return False
            db.execute(text('UPDATE try_on_job SET dispatched_at=now(),updated_at=now() WHERE id=:id'), {'id': value['id']})
            return True

    def finish(self, value, status, *, usage=None, cost=None, request_id=None, message=None, before_dispatch=False, pause=False):
        with self.engine.begin() as db:
            self.guard(db)
            current = row(db.execute(text("SELECT * FROM try_on_job WHERE id=:id AND worker_token=:token AND status IN ('PROCESSING','UNKNOWN') FOR UPDATE"), {'id': value['id'], 'token': value['worker_token']}))
            if not current:
                return False
            released = before_dispatch and current['dispatched_at'] is None
            state = 'RELEASED' if released else 'SETTLED' if cost is not None else 'UNKNOWN'
            db.execute(text("""UPDATE try_on_job SET status=:status,cost_state=:state,charged_micro_usd=:cost,usage=CAST(:usage AS jsonb),
              provider_request_id=:request_id,message=:message,quota_charged=CASE WHEN :released THEN false ELSE quota_charged END,
              lease_until=NULL,updated_at=now() WHERE id=:id"""),
              {'id': value['id'], 'status': status, 'state': state, 'cost': cost, 'usage': json.dumps(usage or {}), 'request_id': request_id, 'message': message, 'released': released})
            if pause or (cost is not None and cost > current['reserved_micro_usd']):
                db.execute(text('UPDATE try_on_guard SET paused=true,updated_at=now() WHERE id=1'))
            return True

    def stale(self):
        with self.engine.connect() as db:
            return [dict(item) for item in db.execute(text("SELECT * FROM try_on_job WHERE status='PROCESSING' AND lease_until<now() OR status='UNKNOWN' ORDER BY created_at LIMIT 100")).mappings()]

    def cleanup(self):
        with self.engine.begin() as db:
            self.guard(db)
            db.execute(text("""UPDATE try_on_job SET status='CANCELLED',cost_state='RELEASED',quota_charged=false,updated_at=now()
              WHERE status='QUEUED' AND (expires_at<=now() OR delete_requested_at IS NOT NULL)"""))
            jobs = [dict(item) for item in db.execute(text("""UPDATE try_on_job SET deleted_at=coalesce(deleted_at,now())
              WHERE (expires_at<=now() OR delete_requested_at IS NOT NULL) AND status NOT IN ('QUEUED','PROCESSING') RETURNING id,garment_key""")).mappings()]
            photos = [dict(item) for item in db.execute(text("""UPDATE try_on_photo p SET deleted_at=coalesce(p.deleted_at,now()) WHERE (p.expires_at<=now() OR p.deleted_at IS NOT NULL)
              AND NOT EXISTS(SELECT 1 FROM try_on_job j WHERE j.photo_id=p.id AND j.status IN ('QUEUED','PROCESSING')) RETURNING p.file_key""")).mappings()]
            db.execute(text("UPDATE try_on_job SET ip_hash=NULL WHERE created_at<now()-interval '2 days' AND ip_hash IS NOT NULL"))
            return jobs, photos

    def signed_job(self, job_id):
        with self.engine.connect() as db:
            value = row(db.execute(text("SELECT * FROM try_on_job WHERE id=:id AND status='SUCCEEDED' AND deleted_at IS NULL AND delete_requested_at IS NULL AND expires_at>now()"), {'id': job_id}))
        if not value:
            raise TryOnError(404, 'RESULT_NOT_FOUND', 'Ảnh không còn sẵn sàng.')
        return value

    def delete_photo(self, owner, photo_id):
        with self.engine.begin() as db:
            self.guard(db)
            photo = row(db.execute(text('SELECT * FROM try_on_photo WHERE id=:id AND owner_id=:u FOR UPDATE'), {'id': photo_id, 'u': owner}))
            if not photo:
                raise TryOnError(404, 'PHOTO_NOT_FOUND', 'Không tìm thấy ảnh này.')
            db.execute(text('UPDATE try_on_photo SET deleted_at=now() WHERE id=:id'), {'id': photo_id})
            db.execute(text("""UPDATE try_on_job SET delete_requested_at=coalesce(delete_requested_at,now()),deleted_at=now(),updated_at=now(),
              status=CASE WHEN status='QUEUED' THEN 'CANCELLED' ELSE status END,
              cost_state=CASE WHEN dispatched_at IS NULL THEN 'RELEASED' ELSE cost_state END,
              quota_charged=CASE WHEN dispatched_at IS NULL THEN false ELSE quota_charged END WHERE photo_id=:id"""), {'id': photo_id})
            return photo

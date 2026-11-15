import hashlib
import hmac
import ipaddress
import json
import uuid
from datetime import timedelta

from sqlalchemy import text
from ..internal_client import InternalError
from ..paid_budget import shared_spend
from ..safety import redact
from ..try_on.config import now, periods
from .media_files import check_size, IMAGE_LIMIT, VIDEO_LIMIT
from .vision import MODEL, RESERVATION, CONSENT_VERSION


def mapping(result):
    row = result.mappings().first()
    return dict(row) if row else None


def attachment(row):
    result = {k: row[k] for k in ('kind', 'status', 'expected_bytes')}
    result['id'] = str(row['id'])
    if row['status'] == 'READY':
        result.update({k: row[k] for k in ('stored_bytes', 'content_type', 'width', 'height')})
        if row.get('duration_ms'):
            result['duration_ms'] = row['duration_ms']
    if row.get('expires_at'):
        result['expires_at'] = row['expires_at'].isoformat()
    if row.get('error_code'):
        result.update(error_code=row['error_code'], message='Không xử lý được tệp. Chọn ảnh tĩnh hoặc video MP4 không quá 30 giây.')
    return result


class MediaRepository:
    def __init__(self, engine, settings):
        self.engine, self.settings = engine, settings

    def ip_hash(self, supplied):
        try:
            address = ipaddress.ip_address(supplied)
            if isinstance(address, ipaddress.IPv6Address) and address.ipv4_mapped:
                address = address.ipv4_mapped
            scope = str(ipaddress.ip_network(str(address) + '/64', strict=False)) if address.version == 6 else address.compressed
        except ValueError:
            raise InternalError(503, 'CLIENT_ADDRESS_UNAVAILABLE', 'Chưa xác minh được kết nối. Hãy thử lại sau.')
        if len(self.settings.signing_key) < 32:
            raise InternalError(503, 'CHAT_MEDIA_DISABLED', 'Gửi tệp đang tạm dừng.')
        return hmac.new(self.settings.signing_key.encode(), ('chat-media-ip:' + scope).encode(), hashlib.sha256).hexdigest()

    def session(self, db, session, owner, lock=False):
        row = mapping(db.execute(text("SELECT * FROM chat_session WHERE id=:s AND user_id=:u AND status='ACTIVE' AND created_at>now()-interval '30 days'" + (' FOR UPDATE' if lock else '')), {'s': session, 'u': owner}))
        if not row:
            raise InternalError(404, 'NOT_FOUND', 'Không tìm thấy phiên chat của bạn.')
        return row

    def owned(self, db, session, asset, owner, lock=False):
        self.session(db, session, owner, lock)
        row = mapping(db.execute(text('SELECT * FROM ai_chat_attachment WHERE id=:id AND session_id=:s AND owner_id=:u' + (' FOR UPDATE' if lock else '')), {'id': asset, 's': session, 'u': owner}))
        if not row:
            raise InternalError(404, 'NOT_FOUND', 'Không tìm thấy tệp của phiên chat.')
        return row

    def metadata(self, session, asset, owner):
        with self.engine.connect() as db:
            return attachment(self.owned(db, session, asset, owner))

    def create(self, session, owner, payload, ip):
        check_size(payload['kind'], payload['size_bytes'])
        with self.engine.begin() as db:
            parent = self.session(db, session, owner, True)
            db.execute(text('SELECT pg_advisory_xact_lock(71520032)'))
            existing = mapping(db.execute(text('SELECT * FROM ai_chat_attachment WHERE owner_id=:u AND client_upload_id=:key'), {'u': owner, 'key': payload['client_upload_id']}))
            if existing:
                if (str(existing['session_id']), existing['kind'], existing['expected_bytes'], existing['input_sha256']) != (session, payload['kind'], payload['size_bytes'], payload['sha256']):
                    raise InternalError(409, 'UPLOAD_KEY_CONFLICT', 'Lần tải này đã dùng cho tệp khác. Hãy chọn lại tệp.')
                return attachment(existing)
            usage = mapping(db.execute(text("""SELECT
              count(*) FILTER(WHERE owner_id=:u AND status IN ('UPLOADING','PROCESSING')) AS pending,
              coalesce(sum(CASE WHEN kind='IMAGE' THEN 5242880 ELSE 20971520 END) FILTER(WHERE owner_id=:u AND created_at>now()-interval '24 hours'),0) AS user_day,
              coalesce(sum(CASE WHEN kind='IMAGE' THEN 5242880 ELSE 20971520 END) FILTER(WHERE ip_hash=:ip AND created_at>now()-interval '24 hours'),0) AS ip_day,
              coalesce(sum(CASE WHEN kind='IMAGE' THEN 5242880 ELSE 20971520 END) FILTER(WHERE created_at>now()-interval '24 hours'),0) AS global_day,
              coalesce(sum(CASE WHEN kind='IMAGE' THEN 5242880 ELSE 20971520 END) FILTER(WHERE owner_id=:u AND status IN ('UPLOADING','PROCESSING','READY')),0) AS stored_user,
              coalesce(sum(CASE WHEN kind='IMAGE' THEN 5242880 ELSE 20971520 END) FILTER(WHERE status IN ('UPLOADING','PROCESSING','READY')),0) AS stored_global
              FROM ai_chat_attachment"""), {'u': owner, 'ip': ip}))
            reserve = IMAGE_LIMIT if payload['kind'] == 'IMAGE' else VIDEO_LIMIT
            if usage['pending'] >= 3 or usage['user_day'] + reserve > 50 * 1048576 or usage['ip_day'] + reserve > 100 * 1048576 or usage['global_day'] + reserve > 500 * 1048576:
                raise InternalError(429, 'CHAT_UPLOAD_QUOTA', 'Đã đạt giới hạn tải tệp trong 24 giờ. Bạn vẫn có thể gửi văn bản.')
            if usage['stored_user'] + reserve > 100 * 1048576 or usage['stored_global'] + reserve > 1073741824:
                raise InternalError(429, 'CHAT_STORAGE_QUOTA', 'Chưa thể lưu thêm tệp. Bạn vẫn có thể gửi văn bản.')
            row = mapping(db.execute(text("""INSERT INTO ai_chat_attachment(id,session_id,owner_id,client_upload_id,kind,expected_bytes,input_sha256,ip_hash,expires_at)
              VALUES(:id,:s,:u,:key,:kind,:bytes,:sha,:ip,:expiry) RETURNING *"""), {'id': str(uuid.uuid4()), 's': session, 'u': owner, 'key': payload['client_upload_id'], 'kind': payload['kind'], 'bytes': payload['size_bytes'], 'sha': payload['sha256'], 'ip': ip,
              'expiry': min(now() + timedelta(hours=24), parent['created_at'] + timedelta(days=30))}))
            return attachment(row)

    def start_upload(self, session, asset, owner, length):
        with self.engine.begin() as db:
            row = self.owned(db, session, asset, owner, True)
            if row['turn_id'] or row['message_id']:
                raise InternalError(409, 'CHAT_FILE_ALREADY_SENT', 'Tệp đã gắn với câu hỏi không thể thay thế.')
            if row['status'] in ('PROCESSING', 'READY'):
                return row, None
            if row['status'] != 'UPLOADING' or row['expires_at'] <= now():
                raise InternalError(409, 'CHAT_UPLOAD_CLOSED', 'Lần tải này đã kết thúc. Hãy chọn lại tệp.')
            if row['lease_until'] and row['lease_until'] > now():
                raise InternalError(409, 'CHAT_UPLOAD_PENDING', 'Tệp đang được tải. Hãy thử đọc lại trạng thái.')
            if length is not None and (not str(length).isdigit() or int(length) != row['expected_bytes']):
                raise InternalError(422, 'CHAT_UPLOAD_SIZE_MISMATCH', 'Dung lượng tệp đã thay đổi. Hãy chọn lại tệp.')
            token = str(uuid.uuid4())
            db.execute(text("UPDATE ai_chat_attachment SET lease_token=:token,lease_until=now()+interval '2 minutes',version=version+1 WHERE id=:id"), {'id': asset, 'token': token})
            return row, token

    def finish_upload(self, asset, token):
        with self.engine.begin() as db:
            row = mapping(db.execute(text("UPDATE ai_chat_attachment SET status='PROCESSING',lease_token=NULL,lease_until=NULL,updated_at=now(),version=version+1 WHERE id=:id AND status='UPLOADING' AND lease_token=:token AND lease_until>now() AND expires_at>now() RETURNING *"), {'id': asset, 'token': token}))
            if not row:
                raise InternalError(409, 'CHAT_UPLOAD_CLOSED', 'Lần tải này đã thay đổi. Hãy đọc lại trạng thái tệp.')
            return attachment(row)

    def reject_upload(self, asset, token):
        with self.engine.begin() as db:
            db.execute(text("UPDATE ai_chat_attachment SET status='REJECTED',error_code='CHAT_UPLOAD_FAILED',lease_token=NULL,lease_until=NULL,updated_at=now(),version=version+1 WHERE id=:id AND status='UPLOADING' AND lease_token=:token"), {'id': asset, 'token': token})

    def cancel(self, session, asset, owner):
        with self.engine.begin() as db:
            row = self.owned(db, session, asset, owner, True)
            if row['turn_id'] or row['message_id']:
                raise InternalError(409, 'CHAT_FILE_ALREADY_SENT', 'Tệp đã gắn với câu hỏi không thể bỏ từ bản nháp.')
            db.execute(text("UPDATE ai_chat_attachment SET status='DELETED',lease_token=NULL,lease_until=NULL,version=version+1,updated_at=now() WHERE id=:id"), {'id': asset})
            return {**row, 'status': 'DELETED'}

    def claim_asset(self):
        with self.engine.begin() as db:
            row = mapping(db.execute(text("SELECT * FROM ai_chat_attachment WHERE status='PROCESSING' AND expires_at>now() AND (lease_until IS NULL OR lease_until<now()) ORDER BY created_at,id LIMIT 1 FOR UPDATE SKIP LOCKED")))
            if not row:
                return None
            token = str(uuid.uuid4())
            db.execute(text("UPDATE ai_chat_attachment SET lease_token=:token,lease_until=now()+interval '90 seconds',version=version+1 WHERE id=:id"), {'id': row['id'], 'token': token})
            return {**row, 'lease_token': token}

    def finish_asset(self, asset, result=None, error='CHAT_FILE_INVALID'):
        with self.engine.begin() as db:
            if result:
                changed = mapping(db.execute(text("""UPDATE ai_chat_attachment SET status='READY',file_key=:file_key,preview_key=:preview_key,stored_bytes=:stored_bytes,content_type=:content_type,width=:width,height=:height,duration_ms=:duration_ms,
                  lease_token=NULL,lease_until=NULL,updated_at=now(),version=version+1 WHERE id=:id AND status='PROCESSING' AND lease_token=:token AND lease_until>now() AND expires_at>now() RETURNING *"""), dict(result, id=asset['id'], token=asset['lease_token'])))
            else:
                changed = mapping(db.execute(text("UPDATE ai_chat_attachment SET status='REJECTED',error_code=:error,lease_token=NULL,lease_until=NULL,updated_at=now(),version=version+1 WHERE id=:id AND status='PROCESSING' AND lease_token=:token RETURNING *"), {'id': asset['id'], 'token': asset['lease_token'], 'error': error}))
            return changed

    def asset(self, id):
        with self.engine.connect() as db:
            return mapping(db.execute(text('SELECT * FROM ai_chat_attachment WHERE id=:id'), {'id': id}))

    def create_turn(self, session, owner, payload, ip):
        ids = payload['attachment_ids']
        if not 1 <= len(ids) <= 3 or len(set(ids)) != len(ids) or payload['consent_version'] != CONSENT_VERSION:
            raise InternalError(422, 'CHAT_MEDIA_INPUT_INVALID', 'Kiểm tra tệp và xác nhận gửi ảnh để tiếp tục.')
        question = redact(payload.get('content', '').strip())
        digest = hashlib.sha256(json.dumps({'session': session, 'content': question, 'attachments': ids, 'consent': CONSENT_VERSION}, sort_keys=True).encode()).hexdigest()
        cfg = self.settings
        day, month, _ = periods()
        with self.engine.begin() as db:
            paused = db.execute(text('SELECT paused FROM try_on_guard WHERE id=1 FOR UPDATE')).scalar_one()
            parent = self.session(db, session, owner, True)
            existing = mapping(db.execute(text('SELECT * FROM paid_ai_call WHERE owner_id=:u AND client_message_id=:key'), {'u': owner, 'key': payload['client_message_id']}))
            if existing:
                if existing['payload_hash'] != digest:
                    raise InternalError(409, 'MESSAGE_KEY_CONFLICT', 'Mã câu hỏi đã được dùng cho nội dung khác. Hãy đọc lại kết quả cũ.')
                return existing
            if paused or not cfg.api_key or cfg.daily_budget < RESERVATION or cfg.monthly_budget < RESERVATION:
                raise InternalError(503, 'CHAT_MEDIA_DISABLED', 'Phân tích ảnh đang tạm dừng. Bạn vẫn có thể gửi văn bản.')
            usage = mapping(db.execute(text("""SELECT count(*) FILTER(WHERE owner_id=:u AND budget_day=:day AND quota_charged) AS user_day,
              count(*) FILTER(WHERE ip_hash=:ip AND budget_day=:day AND quota_charged) AS ip_day,
              count(*) FILTER(WHERE budget_day=:day AND quota_charged) AS global_day,
              count(*) FILTER(WHERE owner_id=:u AND status IN ('QUEUED','PROCESSING','UNKNOWN') AND content_deleted_at IS NULL) AS pending
              FROM paid_ai_call"""), {'u': owner, 'ip': ip, 'day': day}))
            if usage['pending']:
                raise InternalError(409, 'CHAT_MEDIA_PENDING', 'Có câu hỏi đang chờ kết quả. Hãy kiểm tra trước khi gửi tiếp.')
            if usage['user_day'] >= 3 or usage['ip_day'] >= 10 or usage['global_day'] >= 50:
                raise InternalError(429, 'CHAT_MEDIA_QUOTA', 'Đã đạt giới hạn phân tích ảnh trong ngày. Bạn vẫn có thể gửi văn bản.')
            spend = shared_spend(db, day, month)
            if spend['day_spend'] + RESERVATION > cfg.daily_budget or spend['month_spend'] + RESERVATION > cfg.monthly_budget:
                raise InternalError(429, 'CHAT_MEDIA_BUDGET', 'Đã đạt hạn mức AI của hệ thống. Hãy quay lại sau.')
            assets = [dict(r) for r in db.execute(text('SELECT * FROM ai_chat_attachment WHERE id=ANY(CAST(:ids AS uuid[])) ORDER BY id FOR UPDATE'), {'ids': ids}).mappings()]
            if len(assets) != len(ids) or any(str(a['session_id']) != session or str(a['owner_id']) != owner or a['status'] != 'READY' or a['turn_id'] or a['message_id'] or a['expires_at'] <= now() for a in assets):
                raise InternalError(409, 'CHAT_ATTACHMENT_NOT_READY', 'Tệp chưa sẵn sàng hoặc không còn thuộc bản nháp này. Hãy chọn lại tệp.')
            if any(a['kind'] == 'VIDEO' for a in assets) and len(assets) != 1:
                raise InternalError(422, 'CHAT_ATTACHMENT_COMBINATION', 'Mỗi câu hỏi gửi tối đa 3 ảnh hoặc 1 video.')
            # Claim a new session version now. A text answer started before this
            # reservation cannot later overwrite the pending media conversation.
            db.execute(text('UPDATE chat_session SET version=version+1 WHERE id=:s'), {'s': session})
            row = mapping(db.execute(text("""INSERT INTO paid_ai_call(id,owner_id,session_id,client_message_id,payload_hash,purpose,model,ip_hash,status,budget_day,budget_month,reserved_micro_usd,question,attachment_ids,session_version,consent_version)
              VALUES(:id,:u,:s,:key,:digest,'CHAT_MEDIA',:model,:ip,'QUEUED',:day,:month,:reserve,:question,CAST(:ids AS uuid[]),:version,:consent) RETURNING *"""), {'id': str(uuid.uuid4()), 'u': owner, 's': session, 'key': payload['client_message_id'], 'digest': digest, 'model': MODEL, 'ip': ip, 'day': day, 'month': month, 'reserve': RESERVATION, 'question': question, 'ids': ids, 'version': parent['version'] + 1, 'consent': CONSENT_VERSION}))
            db.execute(text('UPDATE ai_chat_attachment SET turn_id=:turn,expires_at=:expiry,updated_at=now(),version=version+1 WHERE id=ANY(CAST(:ids AS uuid[]))'), {'turn': row['id'], 'expiry': parent['created_at'] + timedelta(days=30), 'ids': ids})
            return row

    def get_turn(self, session, key, owner):
        with self.engine.connect() as db:
            self.session(db, session, owner)
            row = mapping(db.execute(text('SELECT * FROM paid_ai_call WHERE session_id=:s AND client_message_id=:key AND owner_id=:u AND content_deleted_at IS NULL'), {'s': session, 'key': key, 'u': owner}))
            if not row:
                raise InternalError(404, 'NOT_FOUND', 'Không tìm thấy câu hỏi của bạn.')
            return row

    def claim_turn(self):
        with self.engine.begin() as db:
            paused = db.execute(text('SELECT paused FROM try_on_guard WHERE id=1 FOR UPDATE')).scalar_one()
            if paused:
                return None
            count = db.execute(text("SELECT (SELECT count(*) FROM try_on_job WHERE status='PROCESSING' AND lease_until>now())+(SELECT count(*) FROM paid_ai_call WHERE status='PROCESSING' AND lease_until>now())")).scalar_one()
            if count >= self.settings.concurrency:
                return None
            row = mapping(db.execute(text("SELECT * FROM paid_ai_call WHERE status='QUEUED' AND content_deleted_at IS NULL ORDER BY created_at,id LIMIT 1 FOR UPDATE SKIP LOCKED")))
            if not row:
                return None
            token = str(uuid.uuid4())
            db.execute(text("UPDATE paid_ai_call SET status='PROCESSING',worker_token=:token,lease_until=now()+interval '3 minutes',updated_at=now() WHERE id=:id"), {'id': row['id'], 'token': token})
            return {**row, 'status': 'PROCESSING', 'worker_token': token}

    def turn_inputs(self, turn):
        with self.engine.connect() as db:
            parent = self.session(db, str(turn['session_id']), str(turn['owner_id']))
            if parent['version'] != turn['session_version']:
                raise InternalError(409, 'VERSION_CONFLICT', 'Phiên chat đã thay đổi. Hãy đọc lại trước khi gửi tiếp.')
            assets = [dict(r) for r in db.execute(text('SELECT * FROM ai_chat_attachment WHERE turn_id=:id ORDER BY created_at,id'), {'id': turn['id']}).mappings()]
            if len(assets) != len(turn['attachment_ids']) or any(a['status'] != 'READY' or a['expires_at'] <= now() for a in assets):
                raise InternalError(409, 'CHAT_ATTACHMENT_NOT_READY', 'Tệp của câu hỏi không còn sẵn sàng.')
            history = [dict(r) for r in db.execute(text('SELECT role,content FROM chat_message WHERE session_id=:s ORDER BY message_sequence DESC LIMIT 12'), {'s': turn['session_id']}).mappings()]
            return assets, list(reversed(history))

    def dispatch(self, turn):
        with self.engine.begin() as db:
            paused = db.execute(text('SELECT paused FROM try_on_guard WHERE id=1 FOR UPDATE')).scalar_one()
            parent = self.session(db, str(turn['session_id']), str(turn['owner_id']), True)
            current = mapping(db.execute(text('SELECT * FROM paid_ai_call WHERE id=:id AND worker_token=:token FOR UPDATE'), {'id': turn['id'], 'token': turn['worker_token']}))
            if paused or not current or current['status'] != 'PROCESSING' or current['dispatched_at'] or current['content_deleted_at'] or current['lease_until'] <= now() or parent['version'] != current['session_version'] or current['budget_day'] != periods()[0]:
                return False
            db.execute(text("UPDATE paid_ai_call SET dispatched_at=now(),lease_until=now()+interval '60 seconds',updated_at=now() WHERE id=:id"), {'id': turn['id']})
            return True

    def finish_turn(self, turn, outcome, response=None, *, before_dispatch=False):
        with self.engine.begin() as db:
            db.execute(text('SELECT paused FROM try_on_guard WHERE id=1 FOR UPDATE'))
            parent = mapping(db.execute(text('SELECT * FROM chat_session WHERE id=:s FOR UPDATE'), {'s': turn['session_id']}))
            current = mapping(db.execute(text("SELECT * FROM paid_ai_call WHERE id=:id AND worker_token=:token AND status IN ('PROCESSING','UNKNOWN') FOR UPDATE"), {'id': turn['id'], 'token': turn['worker_token']}))
            if not current:
                return None
            released = before_dispatch and current['dispatched_at'] is None
            cost = outcome.cost_bound
            if cost is not None and (type(cost) is not int or cost < 0):
                raise ValueError('Invalid monetary settlement')
            state = 'RELEASED' if released else 'SETTLED' if cost is not None else 'UNKNOWN'
            deleted = current['content_deleted_at'] is not None or not parent or parent['status'] != 'ACTIVE' or parent['created_at'] <= now() - timedelta(days=30)
            valid = not deleted and parent['version'] == current['session_version']
            code = outcome.code
            if response and valid:
                user_id = str(uuid.uuid4())
                db.execute(text('UPDATE chat_session SET version=version+1 WHERE id=:s'), {'s': current['session_id']})
                db.execute(text("INSERT INTO chat_message(id,session_id,role,content,attachment_ids) VALUES(:id,:s,'USER',:q,CAST(:ids AS uuid[]))"), {'id': user_id, 's': current['session_id'], 'q': current['question'] or '', 'ids': [str(i) for i in current['attachment_ids']]})
                db.execute(text("INSERT INTO chat_message(id,session_id,role,content,product_refs,response_meta) VALUES(:id,:s,'ASSISTANT',:content,CAST(:refs AS jsonb),CAST(:meta AS jsonb))"), {'id': response['id'], 's': current['session_id'], 'content': response['content'], 'refs': json.dumps(response['product_cards']), 'meta': json.dumps({'provider': 'openai_vision', 'turn_id': str(current['id']), 'video_frames_only': response.get('media_analysis') == 'VIDEO_FRAMES'})})
                db.execute(text('UPDATE ai_chat_attachment SET message_id=:message,version=version+1,updated_at=now() WHERE turn_id=:turn'), {'message': user_id, 'turn': current['id']})
                status = 'SUCCEEDED'
            else:
                response = None
                status = 'CANCELLED' if deleted else 'UNKNOWN' if outcome.uncertain else 'FAILED'
                if not code:
                    code = 'CHAT_MEDIA_SESSION_CHANGED' if not valid else 'CHAT_MEDIA_FAILED'
                if status != 'UNKNOWN':
                    db.execute(text("UPDATE ai_chat_attachment SET turn_id=NULL,expires_at=least(expires_at,created_at+interval '24 hours'),version=version+1,updated_at=now() WHERE turn_id=:turn AND message_id IS NULL"), {'turn': current['id']})
            updated = mapping(db.execute(text("""UPDATE paid_ai_call SET status=:status,cost_state=:state,charged_micro_usd=:cost,
              charge_basis=:basis,quota_charged=CASE WHEN :released THEN false ELSE quota_charged END,
              response=CAST(:response AS jsonb),usage=CAST(:usage AS jsonb),provider_request_id=:request,error_code=:error,
              question=CASE WHEN :deleted THEN NULL ELSE question END,attachment_ids=CASE WHEN :deleted THEN '{}'::uuid[] ELSE attachment_ids END,
              content_deleted_at=CASE WHEN :deleted THEN coalesce(content_deleted_at,now()) ELSE content_deleted_at END,
              lease_until=NULL,updated_at=now() WHERE id=:id RETURNING *"""), {'status': status, 'state': state, 'cost': cost,
              'basis': 'CONSERVATIVE_USAGE_BOUND' if cost is not None else None, 'released': released, 'response': json.dumps(response), 'usage': json.dumps(outcome.usage or {}),
              'request': outcome.request_id, 'error': code, 'deleted': deleted, 'id': current['id']}))
            if outcome.pause or cost is not None and cost > current['reserved_micro_usd']:
                db.execute(text('UPDATE try_on_guard SET paused=true,updated_at=now() WHERE id=1'))
            return updated

    def stale_turns(self):
        with self.engine.connect() as db:
            return [dict(r) for r in db.execute(text("SELECT * FROM paid_ai_call WHERE status='PROCESSING' AND lease_until<now() OR status='UNKNOWN' ORDER BY created_at LIMIT 50")).mappings()]

    @staticmethod
    def retire_sessions(db, sessions):
        """Caller locks the financial guard and parent sessions before this method."""
        if not sessions:
            return
        params = {'ids': sessions}
        db.execute(text("""UPDATE paid_ai_call SET content_deleted_at=coalesce(content_deleted_at,now()),question=NULL,response=NULL,attachment_ids='{}',
          status=CASE WHEN status IN ('QUEUED','PROCESSING') THEN CASE WHEN dispatched_at IS NULL THEN 'CANCELLED' ELSE 'UNKNOWN' END ELSE status END,
          cost_state=CASE WHEN dispatched_at IS NULL THEN 'RELEASED' ELSE cost_state END,
          quota_charged=CASE WHEN dispatched_at IS NULL THEN false ELSE quota_charged END,updated_at=now()
          WHERE session_id=ANY(CAST(:ids AS uuid[]))"""), params)
        db.execute(text("UPDATE ai_chat_attachment SET status='DELETED',message_id=NULL,lease_token=NULL,lease_until=NULL,version=version+1,updated_at=now() WHERE session_id=ANY(CAST(:ids AS uuid[]))"), params)

    def cleanup(self):
        with self.engine.begin() as db:
            db.execute(text('SELECT paused FROM try_on_guard WHERE id=1 FOR UPDATE'))
            stopped = [str(r[0]) for r in db.execute(text("UPDATE paid_ai_call SET status='CANCELLED',cost_state='RELEASED',quota_charged=false,error_code='CHAT_MEDIA_QUEUE_EXPIRED',updated_at=now() WHERE status='QUEUED' AND created_at<now()-interval '10 minutes' RETURNING id"))]
            if stopped:
                db.execute(text("UPDATE ai_chat_attachment SET turn_id=NULL,expires_at=least(expires_at,created_at+interval '24 hours'),version=version+1,updated_at=now() WHERE turn_id=ANY(CAST(:ids AS uuid[])) AND message_id IS NULL"), {'ids': stopped})
            db.execute(text("UPDATE ai_chat_attachment SET status='EXPIRED',lease_token=NULL,lease_until=NULL,version=version+1,updated_at=now() WHERE expires_at<=now() AND status IN ('UPLOADING','PROCESSING','READY')"))
            db.execute(text("UPDATE ai_chat_attachment SET ip_hash=NULL WHERE created_at<now()-interval '2 days'"))
            db.execute(text("UPDATE paid_ai_call SET ip_hash=NULL WHERE created_at<now()-interval '2 days'"))
            retired = [dict(r) for r in db.execute(text("SELECT * FROM ai_chat_attachment WHERE status IN ('DELETED','EXPIRED') AND files_deleted_at IS NULL ORDER BY updated_at LIMIT 100")).mappings()]
        return retired

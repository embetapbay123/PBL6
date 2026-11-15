import uuid
from concurrent.futures import ThreadPoolExecutor
from dataclasses import replace

import pytest
from sqlalchemy import text
from test_consent_tracking import engine
from app.chat.media_repository import MediaRepository
from app.chat.runtime import ChatRuntime
from app.chat.provider import CatalogSelector, Selection
from app.chat.vision import VisionOutcome, RESERVATION, CONSENT_VERSION
from app.try_on.config import Settings, CONSENT_VERSION as TRY_ON_CONSENT, periods
from app.try_on.repository import Repository
from app.internal_client import InternalError


@pytest.fixture
def setup(engine):
    settings = Settings(enabled=True, api_key='fixture-only-key', signing_key='s' * 32, daily_budget=1000000, monthly_budget=10000000, cooldown_seconds=0)
    return MediaRepository(engine, settings), Repository(engine, settings), settings


def ready(repo, *, user=None, session=None, kind='IMAGE'):
    user, session, asset = user or str(uuid.uuid4()), session or str(uuid.uuid4()), str(uuid.uuid4())
    with repo.engine.begin() as db:
        db.execute(text("INSERT INTO chat_session(id,user_id,status) VALUES(:s,:u,'ACTIVE') ON CONFLICT DO NOTHING"), {'s': session, 'u': user})
        db.execute(text("""INSERT INTO ai_chat_attachment(id,session_id,owner_id,client_upload_id,kind,expected_bytes,input_sha256,status,stored_bytes,content_type,file_key,width,height,duration_ms,expires_at)
          VALUES(:id,:s,:u,:key,:kind,100,:sha,'READY',100,:type,:file,96,64,:duration,now()+interval '24 hours')"""), {'id': asset, 's': session, 'u': user, 'key': str(uuid.uuid4()), 'kind': kind, 'sha': 'a' * 64,
          'type': 'image/webp' if kind == 'IMAGE' else 'video/mp4', 'file': uuid.uuid4().hex + ('.image.webp' if kind == 'IMAGE' else '.video.mp4'), 'duration': None if kind == 'IMAGE' else 2000})
    return user, session, asset


def reserve(repo, fixture, *, key=None, content='Mô tả ảnh', assets=None):
    user, session, asset = fixture
    return repo.create_turn(session, user, {'client_message_id': key or str(uuid.uuid4()), 'content': content, 'attachment_ids': assets or [asset], 'consent_version': CONSENT_VERSION}, 'f' * 64)


def response(turn):
    return {'id': str(uuid.uuid4()), 'session_id': str(turn['session_id']), 'role': 'ASSISTANT', 'content': 'Trong ảnh có áo đỏ.', 'product_cards': [], 'fallback': False, 'mode': 'real', 'media_analysis': 'IMAGES'}


def test_same_client_id_replays_the_original_reservation_and_different_input_is_rejected(setup):
    repo, try_on, _ = setup
    fixture, key = ready(repo), str(uuid.uuid4())
    first = reserve(repo, fixture, key=key)
    assert reserve(repo, fixture, key=key)['id'] == first['id']
    with pytest.raises(InternalError) as conflict:
        reserve(repo, fixture, key=key, content='Nội dung khác')
    assert conflict.value.code == 'MESSAGE_KEY_CONFLICT'
    with repo.engine.connect() as db:
        assert db.execute(text('SELECT count(*) FROM paid_ai_call')).scalar_one() == 1
        assert try_on.stats(db)['day_spend'] == RESERVATION


def test_generation_and_media_compete_atomically_for_the_last_shared_budget(setup):
    original, _, settings = setup
    settings = replace(settings, daily_budget=250000, monthly_budget=250000)
    repo, try_on = MediaRepository(original.engine, settings), Repository(original.engine, settings)
    fixture, gen_user = ready(repo), str(uuid.uuid4())
    photo = try_on.add_photo(gen_user, uuid.uuid4().hex + '.photo.jpg')
    payload = {'photo_id': str(photo['id']), 'product_id': str(uuid.uuid4()), 'variant_id': str(uuid.uuid4()), 'consent_version': TRY_ON_CONSENT}
    def submit(kind):
        try:
            if kind == 'media':
                return reserve(repo, fixture)['status']
            return try_on.create(gen_user, payload, str(uuid.uuid4()), 'b' * 64, uuid.uuid4().hex + '.garment.jpg', str(uuid.uuid4()), 1, 'tops')[0]['status']
        except InternalError as error:
            return error.code
    with ThreadPoolExecutor(2) as pool:
        results = list(pool.map(submit, ['media', 'generation']))
    assert results.count('QUEUED') == 1
    assert any(code in ('CHAT_MEDIA_BUDGET', 'TRY_ON_BUDGET') for code in results)
    with repo.engine.connect() as db:
        assert try_on.stats(db)['day_spend'] in (RESERVATION, 250000)


def test_dispatched_unknown_holds_money_across_day_and_month_and_blocks_another_paid_attempt(setup):
    repo, try_on, _ = setup
    fixture = ready(repo)
    reserve(repo, fixture)
    turn = repo.claim_turn()
    assert repo.dispatch(turn)
    repo.finish_turn(turn, VisionOutcome(code='CHAT_MEDIA_PROVIDER_UNKNOWN', uncertain=True))
    with repo.engine.begin() as db:
        db.execute(text("UPDATE paid_ai_call SET budget_day=current_date-40,budget_month='2026-01'"))
        assert try_on.stats(db)['day_spend'] == try_on.stats(db)['month_spend'] == RESERVATION
    with pytest.raises(InternalError) as pending:
        reserve(repo, ready(repo, user=fixture[0]))
    assert pending.value.code == 'CHAT_MEDIA_PENDING'


def test_failure_before_dispatch_releases_money_and_reopens_the_same_ready_files(setup):
    repo, try_on, _ = setup
    fixture = ready(repo)
    reserve(repo, fixture)
    turn = repo.claim_turn()
    failed = repo.finish_turn(turn, VisionOutcome(code='CATALOG_UNAVAILABLE'), before_dispatch=True)
    assert failed['status'] == 'FAILED' and failed['cost_state'] == 'RELEASED' and not failed['quota_charged']
    assert repo.asset(fixture[2])['turn_id'] is None
    with repo.engine.connect() as db:
        assert try_on.stats(db)['day_spend'] == 0
    assert reserve(repo, fixture)['status'] == 'QUEUED'


def test_deleted_history_cannot_be_resurrected_by_a_late_paid_response_and_cost_is_retained(setup):
    repo, try_on, _ = setup
    fixture = ready(repo)
    reserve(repo, fixture)
    turn = repo.claim_turn()
    assert repo.dispatch(turn)
    assert ChatRuntime(repo.engine, None, CatalogSelector(provider='none')).delete(fixture[0], fixture[1])['deleted_count'] == 1
    finished = repo.finish_turn(turn, VisionOutcome(cost_bound=550, usage={'total_tokens': 1100}), response(turn))
    assert finished['status'] == 'CANCELLED' and finished['cost_state'] == 'SETTLED'
    assert finished['response'] is None and finished['question'] is None and not finished['attachment_ids']
    assert repo.asset(fixture[2])['status'] == 'DELETED'
    with repo.engine.connect() as db:
        assert db.execute(text('SELECT count(*) FROM chat_message')).scalar_one() == 0
        assert db.execute(text('SELECT count(*) FROM chat_session')).scalar_one() == 0
        assert try_on.stats(db)['day_spend'] == 550
    with pytest.raises(InternalError):
        repo.get_turn(fixture[1], str(turn['client_message_id']), fixture[0])


def test_success_commits_two_messages_once_and_keeps_files_for_the_session_lifetime(setup):
    repo, try_on, _ = setup
    fixture = ready(repo)
    reserve(repo, fixture)
    turn = repo.claim_turn()
    assert repo.dispatch(turn)
    answer = response(turn)
    result = repo.finish_turn(turn, VisionOutcome(cost_bound=550, usage={'total_tokens': 1100}), answer)
    assert result['status'] == 'SUCCEEDED' and result['response'] == answer
    assert repo.finish_turn(turn, VisionOutcome(cost_bound=550), answer) is None
    assert repo.asset(fixture[2])['message_id'] and repo.asset(fixture[2])['turn_id'] == turn['id']
    assert repo.get_turn(fixture[1], str(turn['client_message_id']), fixture[0])['response'] == answer
    with repo.engine.connect() as db:
        assert db.execute(text('SELECT count(*) FROM chat_message')).scalar_one() == 2
        assert try_on.stats(db)['day_spend'] == 550


def test_wrong_owner_pending_expired_and_mixed_assets_fail_without_a_cost_reservation(setup):
    repo, _, _ = setup
    first, foreign = ready(repo), ready(repo)
    with pytest.raises(InternalError):
        reserve(repo, first, assets=[foreign[2]])
    with repo.engine.begin() as db:
        db.execute(text("UPDATE ai_chat_attachment SET expires_at=now()-interval '1 second' WHERE id=:id"), {'id': first[2]})
    with pytest.raises(InternalError):
        reserve(repo, first)
    photo = ready(repo)
    video = ready(repo, user=photo[0], session=photo[1], kind='VIDEO')
    with pytest.raises(InternalError) as mixed:
        reserve(repo, photo, assets=[photo[2], video[2]])
    assert mixed.value.code == 'CHAT_ATTACHMENT_COMBINATION'
    with repo.engine.connect() as db:
        assert db.execute(text('SELECT count(*) FROM paid_ai_call')).scalar_one() == 0


def test_paid_session_claim_blocks_older_text_save_and_new_model_calls(setup):
    repo, _, _ = setup
    fixture = ready(repo)
    runtime = ChatRuntime(repo.engine, None, CatalogSelector(provider='none'))
    version, _ = runtime.load(fixture[1], fixture[0], None)
    reserve(repo, fixture)
    with pytest.raises(InternalError) as pending:
        runtime.load(fixture[1], fixture[0], None)
    assert pending.value.code == 'CHAT_MEDIA_PENDING'
    with pytest.raises(InternalError):
        runtime.save(fixture[1], version, 'Tin cũ', response({'session_id': fixture[1]}), Selection((), True, 'NO_MATCH', 'none'), 0, [])
    with repo.engine.connect() as db:
        assert db.execute(text('SELECT count(*) FROM chat_message')).scalar_one() == 0


def test_provider_usage_exceeding_reserve_pauses_both_generations_and_vision(setup):
    repo, _, _ = setup
    fixture = ready(repo)
    reserve(repo, fixture)
    turn = repo.claim_turn()
    assert repo.dispatch(turn)
    repo.finish_turn(turn, VisionOutcome(cost_bound=RESERVATION + 1, code='UNEXPECTED_USAGE'))
    with repo.engine.connect() as db:
        assert db.execute(text('SELECT paused FROM try_on_guard WHERE id=1')).scalar_one()
    with pytest.raises(InternalError) as paused:
        reserve(repo, ready(repo))
    assert paused.value.code == 'CHAT_MEDIA_DISABLED'


def test_local_reconciliation_requires_verified_usage_and_never_restores_deleted_content(setup):
    from app.chat.media_operator import reconcile
    repo, try_on, _ = setup
    fixture = ready(repo)
    reserve(repo, fixture)
    turn = repo.claim_turn()
    assert repo.dispatch(turn)
    repo.finish_turn(turn, VisionOutcome(code='CHAT_MEDIA_PROVIDER_UNKNOWN', uncertain=True))
    ChatRuntime(repo.engine, None, CatalogSelector(provider='none')).delete(fixture[0], fixture[1])
    with pytest.raises(ValueError):
        reconcile(repo.engine, str(turn['id']), None, 'qa', 'no-provider-record')
    reconcile(repo.engine, str(turn['id']), 600, 'qa', 'verified-synthetic-provider-usage')
    with repo.engine.connect() as db:
        row = db.execute(text('SELECT status,cost_state,question,response FROM paid_ai_call')).one()
        assert row == ('CANCELLED', 'SETTLED', None, None)
        assert try_on.stats(db)['day_spend'] == 600
        assert db.execute(text('SELECT count(*) FROM paid_ai_budget_audit')).scalar_one() == 1

import os
import uuid
import pytest
from sqlalchemy import text
from test_consent_tracking import engine
from app.chat.runtime import ChatRuntime, history_search_pattern
from app.chat.provider import CatalogSelector
from app.internal_client import InternalError
from app.runtime_contracts import validate_operation


@pytest.mark.parametrize(('value', 'expected'), [
    ('  Giày ĐỎ  ', '%giay do%'), ('A\u0301o', '%ao%'), ('20%_mẫu\\', '%20\\%\\_mau\\\\%'),
    ('   ', None), (None, None),
])
def test_history_search_normalizes_accents_and_escapes_like_literals(value, expected):
    assert history_search_pattern(value) == expected


def test_history_search_contract_bounds():
    assert validate_operation('listOwnChatSessions', query={'q': 'giày'})['query']['q'] == 'giày'
    with pytest.raises(ValueError):
        validate_operation('listOwnChatSessions', query={'q': 'x' * 201})


@pytest.mark.skipif(not os.getenv('M4_DATABASE_URL'), reason='Requires isolated PostgreSQL schema')
def test_search_before_pagination_is_owned_literal_and_never_calls_model_or_resets_budget(engine):
    service = ChatRuntime(engine, None, CatalogSelector(provider='none'))
    user, other = str(uuid.uuid4()), str(uuid.uuid4())
    sessions = [service.create(user, 'history-search') for _ in range(25)]
    foreign = service.create(other, 'history-search')
    target = sessions[0]['id']
    with engine.begin() as db:
        for n, session in enumerate(sessions):
            db.execute(text("INSERT INTO chat_message(session_id,role,content) VALUES(:id,'USER',:content)"),
                       {'id': session['id'], 'content': 'Đổi cỡ áo' if n == 0 else 'Nội dung phiên ' + str(n)})
        db.execute(text("UPDATE chat_session SET created_at=now()-interval '2 days' WHERE id=:id"), {'id': target})
        db.execute(text("INSERT INTO chat_message(session_id,role,content) VALUES(:id,'ASSISTANT','Giày thể thao giảm 20%_mẫu')"), {'id': target})
        db.execute(text("INSERT INTO chat_message(session_id,role,content) VALUES(:id,'USER','Thông tin chỉ khách khác')"), {'id': foreign['id']})
        before = db.execute(text('SELECT coalesce(sum(requests),0) FROM ai_usage_budget')).scalar_one()
    assert target not in [s['id'] for s in service.list(user, {'page': 1, 'size': 20})['items']]
    result = service.list(user, {'q': 'giay the thao'})
    assert result['total'] == 1 and result['items'][0]['id'] == target
    assert result['items'][0]['title'] == 'Đổi cỡ áo'
    assert service.list(user, {'q': 'GIÀY THỂ THAO'})['total'] == 1
    assert service.list(user, {'q': '%'})['total'] == 1
    assert service.list(user, {'q': '_'})['total'] == 1
    assert service.list(user, {'q': 'chỉ khách khác'})['total'] == 0
    assert service.list(other, {'q': 'giay the thao'})['total'] == 0
    # History selection stays independent of the list's active search filter.
    assert service.list(user, {'session_id': target, 'q': 'no match'})['total'] == 1
    with pytest.raises(InternalError) as rejected:
        service.list(other, {'session_id': target})
    assert rejected.value.status == 404
    assert service.delete(user, target) == {'deleted_count': 1}
    assert service.list(user, {'q': 'giay the thao'})['total'] == 0
    with engine.connect() as db:
        assert db.execute(text('SELECT coalesce(sum(requests),0) FROM ai_usage_budget')).scalar_one() == before
        assert db.execute(text('SELECT count(*) FROM ai_request_trace')).scalar_one() == 0

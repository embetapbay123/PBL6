import asyncio
import base64
import json

import httpx
import pytest
from app.chat.vision import OpenAIVision, MODEL, usage_bound

PRODUCTS = [{'id': 'p', 'title': 'Áo đỏ', 'description': 'Áo cotton', 'version': 1, 'status': 'ACTIVE', 'variants': [{'status': 'ACTIVE', 'price_vnd': 100000}]}]


def envelope(answer='Trong ảnh có áo màu đỏ.', ids=None, usage=None, **choice):
    return {'model': MODEL, 'service_tier': 'default', 'choices': [{'finish_reason': 'stop', 'message': {'content': json.dumps({'answer': answer, 'product_ids': [] if ids is None else ids})}, **choice}],
            'usage': usage if usage is not None else {'prompt_tokens': 1000, 'completion_tokens': 100, 'total_tokens': 1100, 'prompt_tokens_details': {'cache_write_tokens': 1000}}}


def test_pixels_are_in_multimodal_payload_with_fixed_endpoint_and_bounded_paid_parameters():
    calls = []
    pixels = b'synthetic-jpeg-bytes'

    def handler(request):
        calls.append(request)
        assert str(request.url) == 'https://api.openai.com/v1/chat/completions'
        assert request.headers['authorization'] == 'Bearer fixture-only-key'
        data = json.loads(request.content)
        assert data['model'] == MODEL and data['store'] is False
        assert data['reasoning_effort'] == 'none' and data['max_completion_tokens'] == 1024 and data['service_tier'] == 'default'
        assert data['messages'][-1]['content'][-1] == {'type': 'image_url', 'image_url': {'url': 'data:image/jpeg;base64,' + base64.b64encode(pixels).decode(), 'detail': 'low'}}
        assert 'fixture-only-key' not in request.content.decode() and 'customer-private-id' not in request.content.decode()
        return httpx.Response(200, json=envelope(ids=['p']), headers={'x-request-id': 'fixture-request'})

    outcome = asyncio.run(OpenAIVision('fixture-only-key', transport=httpx.MockTransport(handler)).select('Chọn áo trong ảnh', PRODUCTS, [], [(None, pixels)], owner='customer-private-id'))
    assert len(calls) == 1 and outcome.selection.ids == ('p',) and outcome.request_id == 'fixture-request'
    assert outcome.cost_bound == 550 and outcome.usage['total_tokens'] == 1100


def test_video_is_eight_timestamped_frames_not_a_video_or_audio_url():
    def handler(request):
        parts = json.loads(request.content)['messages'][-1]['content']
        assert sum(p['type'] == 'image_url' for p in parts) == 8
        assert sum(p['type'] == 'text' and 'không có âm thanh' in p['text'] for p in parts) == 8
        assert all(p['type'] in ('text', 'image_url') for p in parts)
        return httpx.Response(200, json=envelope('Trong các khung hình có một chiếc áo đỏ; mình không có âm thanh.'))
    result = asyncio.run(OpenAIVision('fixture-only-key', transport=httpx.MockTransport(handler)).select('Mô tả video', [], [], [(i / 2, b'jpeg') for i in range(8)], video=True))
    assert result.selection and not result.selection.fallback


@pytest.mark.parametrize('usage,tier', [(None, 'default'), ({}, 'default'), ({'prompt_tokens': True, 'completion_tokens': 1, 'total_tokens': 2}, 'default'),
    ({'prompt_tokens': 0, 'completion_tokens': 0, 'total_tokens': 0}, 'default'),
    ({'prompt_tokens': 10, 'completion_tokens': 10, 'total_tokens': 100}, 'default'),
    ({'prompt_tokens': 10, 'completion_tokens': 1025, 'total_tokens': 1035}, 'default'),
    ({'prompt_tokens': 10, 'completion_tokens': 10, 'total_tokens': 20}, 'priority')])
def test_missing_invalid_or_unexpected_tier_usage_keeps_full_reservation(usage, tier):
    assert usage_bound(usage, tier)[1] is None


@pytest.mark.parametrize('answer,ids', [('Giá chỉ 1 VND', []), ('<b>Áo</b>', []), ('https://untrusted.invalid', []), ('Ảnh áo đỏ', ['foreign']), ('', [])])
def test_invalid_answers_never_look_like_success_and_keep_known_usage(answer, ids):
    result = asyncio.run(OpenAIVision('fixture-only-key', transport=httpx.MockTransport(lambda _: httpx.Response(200, json=envelope(answer, ids)))).select('Áo nào?', PRODUCTS, [], [(None, b'jpeg')]))
    assert result.selection is None and result.code == 'CHAT_MEDIA_RESPONSE_INVALID' and result.cost_bound == 550


def test_provider_timeout_is_unknown_and_is_never_retried():
    calls = []
    def handler(request):
        calls.append(request)
        raise httpx.ReadTimeout('synthetic timeout')
    result = asyncio.run(OpenAIVision('fixture-only-key', transport=httpx.MockTransport(handler)).select('Áo?', [], [], [(None, b'jpeg')]))
    assert result.uncertain and result.cost_bound is None and len(calls) == 1


def test_prior_budget_remains_grounded_with_history_sent_to_provider_in_lowercase_roles():
    result = asyncio.run(OpenAIVision('fixture-only-key', transport=httpx.MockTransport(lambda _: httpx.Response(200, json=envelope('Ngân sách bạn đã nói là 200000 VND.')))).select('Màu này được không?', [], [{'role': 'USER', 'content': 'Tối đa 200000 VND'}], [(None, b'jpeg')]))
    assert result.selection


def test_an_unexpected_model_cannot_be_settled_at_the_configured_lower_price():
    wrong = envelope()
    wrong['model'] = 'another-model'
    result = asyncio.run(OpenAIVision('fixture-only-key', transport=httpx.MockTransport(lambda _: httpx.Response(200, json=wrong))).select('Ảnh?', [], [], [(None, b'jpeg')]))
    assert result.pause and result.cost_bound is None and result.selection is None

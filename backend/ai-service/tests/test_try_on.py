import asyncio
import io
from dataclasses import replace

import httpx
import pytest
from PIL import Image

from app.try_on.config import Settings, TryOnError
from app.try_on.provider import OpenAIImages, billable_usage
from app.try_on.service import TryOnService, category_kind, select_image
from app.try_on.storage import PrivateStorage, normalize_image


def image_bytes(size=(720, 960), format='PNG'):
    data = io.BytesIO()
    Image.new('RGB', size, '#b6b8a1').save(data, format)
    return data.getvalue()


def test_configuration_requires_explicit_flag_secret_key_and_both_budgets():
    cfg = Settings(enabled=True, api_key='fixture', signing_key='s' * 32, daily_budget=1000000, monthly_budget=10000000)
    assert cfg.ready
    for changed in [dict(enabled=False), dict(api_key=''), dict(signing_key='short'), dict(daily_budget=0), dict(monthly_budget=0)]:
        assert not replace(cfg, **changed).ready
    assert not replace(cfg, demo_mode=True).ready
    from app.try_on.demo import hash_password
    assert replace(cfg, demo_mode=True, demo_password_hash=hash_password('fixture-demo-access')).ready


def test_demo_password_hash_is_salted_and_matches_exactly():
    from app.try_on.demo import hash_password, password_matches, valid_hash
    password = 'fixture-demo-access'
    first, second = hash_password(password), hash_password(password)
    assert first != second and password not in first and valid_hash(first)
    assert password_matches(password, first)
    for bad in ('', 'wrong', password.upper(), password + ' ', 'x' * 129):
        assert not password_matches(bad, first)
    assert not valid_hash('pbkdf2_sha256$1$salt$digest')


def test_image_decode_strips_metadata_and_bounds_pixels_and_format():
    source = Image.new('RGB', (1800, 2400), '#ccc')
    exif = Image.Exif(); exif[0x010e] = 'private note'
    data = io.BytesIO(); source.save(data, 'JPEG', exif=exif)
    result = normalize_image(data.getvalue(), person=True)
    with Image.open(io.BytesIO(result)) as clean:
        assert clean.format == 'JPEG' and clean.size == (1024, 1365)
        assert not clean.getexif()
    for bad in [b'<svg/>', b'not an image', image_bytes((100, 100)), image_bytes((5001, 5001))]:
        with pytest.raises(TryOnError): normalize_image(bad, person=True)
    animated = io.BytesIO()
    source = Image.new('RGB', (300, 400), 'red')
    source.save(animated, 'WEBP', save_all=True, append_images=[Image.new('RGB', source.size, 'blue')], duration=100)
    with pytest.raises(TryOnError): normalize_image(animated.getvalue(), person=True)


def test_private_storage_rejects_traversal_and_symlinks(tmp_path):
    storage = PrivateStorage(tmp_path)
    for name in ['../secret', '/tmp/file.jpg', 'x.jpg', '0' * 32 + '.photo.jpg/../x']:
        with pytest.raises(ValueError): storage.path(name)
    key = storage.new(image_bytes(), 'photo')
    assert storage.read(key) == image_bytes()
    storage.delete(key); assert not storage.path(key).exists()


def test_catalog_color_matching_and_group_scope():
    assert category_kind('Áo sơ mi') == 'tops'
    assert category_kind('Quần jean') == 'bottoms'
    assert category_kind('Giày thể thao') is None
    product = {'variants': [dict(id='red', status='ACTIVE', is_default=True, variant_values={'color': 'Đỏ'}), dict(id='blue', status='ACTIVE', variant_values={'color': 'Xanh'})],
               'images': [dict(id='global', variant_id=None, image_url='reference')]}
    assert select_image(product, 'red')['id'] == 'global'
    with pytest.raises(TryOnError): select_image(product, 'blue')
    product['images'].append(dict(id='blue-photo', variant_id='blue', image_url='reference'))
    assert select_image(product, 'blue')['id'] == 'blue-photo'


@pytest.mark.parametrize('source', ['http://demo.congnguyen.me/catalog/a.jpg', 'https://localhost/catalog/a.jpg', 'https://127.0.0.1/catalog/a.jpg',
    'https://demo.congnguyen.me.evil.invalid/catalog/a.jpg', 'https://demo.congnguyen.me/catalog/../a.jpg', 'https://demo.congnguyen.me/catalog/%2e%2e/a.jpg',
    'https://demo.congnguyen.me/catalog/a.jpg?redirect=evil', 'https://user:pass@demo.congnguyen.me/catalog/a.jpg', 'https://demo.congnguyen.me/internal/a.jpg'])
def test_media_download_uses_only_operator_owned_catalog_origin(source, tmp_path):
    service = TryOnService(None, PrivateStorage(tmp_path), Settings(), None)
    with pytest.raises(TryOnError): service.media_url(source)
    assert service.media_url('https://demo.congnguyen.me/catalog/a.jpg') == 'http://web:3000/catalog/a.jpg'


def test_provider_uses_direct_edits_with_two_images_and_fixed_cost_controls():
    import base64
    calls = []
    usage = {'input_tokens': 300, 'input_tokens_details': {'text_tokens': 100, 'image_tokens': 200}, 'output_tokens': 300}
    def handler(request):
        calls.append(request)
        assert str(request.url) == 'https://api.openai.com/v1/images/edits'
        assert request.headers['authorization'] == 'Bearer fixture-key'
        body = request.content
        for value in [b'gpt-image-2.6-sunburst', b'name="quality"\r\n\r\nlow', b'name="complexity"\r\n\r\nlow', b'1024x1536', b'name="n"\r\n\r\n1', b'name="safety_identifier"']:
            assert value in body
        assert body.count(b'name="image[]"') == 2
        assert b'fixture-key' not in body
        return httpx.Response(200, headers={'x-request-id': 'req_fixture'}, json={'data': [{'b64_json': base64.b64encode(image_bytes()).decode()}], 'usage': usage})
    result = asyncio.run(OpenAIImages(Settings(api_key='fixture-key'), transport=httpx.MockTransport(handler)).edit(image_bytes(), image_bytes(), 'tops', 'hashed-person'))
    assert result.status == 'SUCCEEDED' and result.image and result.cost == 11100
    assert result.usage == usage and result.request_id == 'req_fixture' and len(calls) == 1


@pytest.mark.parametrize('status', [301, 400, 401, 403, 404, 429, 500, 503])
def test_provider_error_never_retries_redirects_or_invents_zero_cost(status):
    calls = []
    def handler(request):
        calls.append(request)
        return httpx.Response(status, headers={'location': 'https://evil.invalid'}, json={'error': {'message': 'provider-private-detail'}})
    value = asyncio.run(OpenAIImages(Settings(api_key='fixture'), transport=httpx.MockTransport(handler)).edit(image_bytes(), image_bytes(), 'tops', 'hashed'))
    assert len(calls) == 1 and value.cost is None
    assert value.status == ('FAILED' if status in (400, 401, 403, 404, 429) else 'UNKNOWN')
    assert 'provider-private-detail' not in str(value)


def test_provider_timeout_and_missing_usage_hold_unknown_budget():
    def handler(request): raise httpx.ReadTimeout('test')
    value = asyncio.run(OpenAIImages(Settings(), transport=httpx.MockTransport(handler)).edit(image_bytes(), image_bytes(), 'tops', 'hash'))
    assert value.status == 'UNKNOWN' and value.cost is None
    for usage in [None, {}, {'input_tokens_details': {'text_tokens': True, 'image_tokens': 1}, 'input_tokens': 2, 'output_tokens': 1},
                  {'input_tokens_details': {'text_tokens': 1, 'image_tokens': 1}, 'input_tokens': 3, 'output_tokens': 1}]:
        assert billable_usage(usage) == ({}, None)

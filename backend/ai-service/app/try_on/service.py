import hashlib
import hmac
import ipaddress
import re
import uuid
from datetime import timedelta
from urllib.parse import urlsplit

import httpx
from starlette.concurrency import run_in_threadpool

from .config import TryOnError, UPLOAD_LIMIT, now
from .storage import normalize_image


def category_kind(name):
    import unicodedata
    plain = ''.join(c for c in unicodedata.normalize('NFD', name.lower()) if unicodedata.category(c) != 'Mn')
    if re.search(r'\b(quan|pants|trousers|jeans)\b', plain):
        return 'bottoms'
    if re.search(r'\b(ao|shirt|hoodie|jacket)\b', plain):
        return 'tops'
    return None


def select_image(product, variant_id):
    variants = [item for item in product.get('variants', []) if item.get('status') == 'ACTIVE']
    selected = next((item for item in variants if item['id'] == variant_id), None)
    if not selected:
        raise TryOnError(404, 'VARIANT_NOT_FOUND', 'Phân loại này không còn sẵn sàng.')
    images = product.get('images', [])
    exact = next((image for image in images if image.get('variant_id') == variant_id and image.get('id') and image.get('image_url')), None)
    if exact:
        return exact
    def color(variant):
        values = variant.get('variant_values', {})
        return str(values.get('color', values.get('mau', values.get('Màu sắc', '')))).strip().casefold()
    colors = {color(item) for item in variants}
    default = next((item for item in variants if item.get('is_default')), None)
    if len(colors) > 1 and (not default or color(default) != color(selected)):
        raise TryOnError(422, 'PRODUCT_PHOTO_MISSING', 'Chưa có ảnh đúng màu cho phân loại này.')
    image = next((item for item in images if not item.get('variant_id') and item.get('id') and item.get('image_url')), None)
    if not image:
        raise TryOnError(422, 'PRODUCT_PHOTO_MISSING', 'Chưa có ảnh phù hợp với phân loại này.')
    return image


class TryOnService:
    def __init__(self, repository, storage, settings, catalog, *, media_transport=None):
        self.repo, self.storage, self.settings, self.catalog = repository, storage, settings, catalog
        self.media_transport = media_transport

    def ip_hash(self, supplied):
        try:
            address = ipaddress.ip_address(supplied)
        except ValueError:
            raise TryOnError(503, 'CLIENT_ADDRESS_UNAVAILABLE', 'Chưa xác minh được kết nối. Vui lòng thử lại sau.')
        return hmac.new(self.settings.signing_key.encode(), ('ip:' + address.compressed).encode(), hashlib.sha256).hexdigest()

    async def selection(self, product_id, variant_id, correlation):
        product = await self.catalog.product(product_id, correlation)
        types = await self.catalog._get('/product-types', 'listProductTypes', correlation, {'page': 1, 'size': 100})
        product_type = next((item for item in types.get('items', []) if item['id'] == product.get('product_type_id')), None)
        kind = category_kind(product_type.get('name', '')) if product_type else None
        if not kind:
            raise TryOnError(422, 'TRY_ON_UNSUPPORTED', 'Thử đồ hiện hỗ trợ áo và quần.')
        return product, select_image(product, variant_id), kind

    def media_url(self, source):
        url, base = urlsplit(source), urlsplit(self.settings.media_origin)
        # Public catalog media are mapped onto one operator-owned origin. No user-controlled DNS, redirects or arbitrary URLs.
        if (url.scheme != 'https' or url.hostname not in self.settings.image_hosts or url.port not in (None, 443)
                or url.username or url.password or url.query or url.fragment
                or not re.fullmatch(r'/catalog/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)', url.path, re.IGNORECASE)
                or base.scheme not in ('http', 'https') or not base.hostname or base.username or base.password or base.query or base.fragment or base.path not in ('', '/')):
            raise TryOnError(422, 'PRODUCT_PHOTO_UNSUPPORTED', 'Ảnh sản phẩm này chưa hỗ trợ thử đồ.')
        return self.settings.media_origin.rstrip('/') + url.path

    async def garment(self, source):
        url = self.media_url(source)
        try:
            async with httpx.AsyncClient(transport=self.media_transport, trust_env=False, follow_redirects=False, timeout=10) as client:
                async with client.stream('GET', url) as response:
                    if response.status_code != 200:
                        raise ValueError()
                    data = bytearray()
                    async for chunk in response.aiter_bytes():
                        if len(data) + len(chunk) > UPLOAD_LIMIT:
                            raise ValueError()
                        data.extend(chunk)
            return await run_in_threadpool(normalize_image, bytes(data))
        except (httpx.HTTPError, ValueError):
            raise TryOnError(503, 'PRODUCT_PHOTO_UNAVAILABLE', 'Chưa tải được ảnh sản phẩm. Vui lòng thử lại sau.')

    def signature(self, job, expiry):
        message = f"result:{job['id']}:{job['owner_id']}:{expiry}"
        return hmac.new(self.settings.signing_key.encode(), message.encode(), hashlib.sha256).hexdigest()

    def present(self, job):
        value = {field: str(job[field]) for field in ('id', 'product_id', 'variant_id', 'idempotency_key', 'status')}
        value['expires_at'] = job['expires_at'].isoformat()
        if job.get('message'):
            value['message'] = job['message']
        if job['status'] == 'SUCCEEDED' and not job['deleted_at'] and not job['delete_requested_at'] and job['expires_at'] > now():
            expiry = int(min(job['expires_at'], now() + timedelta(minutes=5)).timestamp())
            value['result_url'] = f"/api/v1/ai/try-on/results/{job['id']}?expires={expiry}&signature={self.signature(job, expiry)}"
        return value

    def result_path(self, job_id, expiry, signature):
        if not self.settings.signing_key or not re.fullmatch(r'[a-f0-9]{64}', signature):
            raise TryOnError(404, 'RESULT_NOT_FOUND', 'Ảnh không còn sẵn sàng.')
        job = self.repo.signed_job(job_id)
        if expiry < int(now().timestamp()) or expiry > min(int(job['expires_at'].timestamp()), int(now().timestamp()) + 301) or not hmac.compare_digest(signature, self.signature(job, expiry)):
            raise TryOnError(404, 'RESULT_NOT_FOUND', 'Ảnh không còn sẵn sàng.')
        path = self.storage.path(uuid.UUID(str(job_id)).hex + '.result.jpg')
        if not path.is_file():
            raise TryOnError(404, 'RESULT_NOT_FOUND', 'Ảnh không còn sẵn sàng.')
        return path

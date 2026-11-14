import base64
import json
import re
from dataclasses import dataclass

import httpx

from .config import MODEL, TryOnError
from .storage import normalize_image

OPENAI_ENDPOINT = 'https://api.openai.com/v1/images/edits'


@dataclass(frozen=True)
class Outcome:
    status: str
    image: bytes | None = None
    usage: dict | None = None
    cost: int | None = None
    request_id: str | None = None
    message: str | None = None
    pause: bool = False


def billable_usage(value):
    """USD micro-units at published Standard rates: text 5, image input 8, output 30 per token.
    Missing/invalid usage keeps the full reservation; never guess a zero cost.
    """
    if not isinstance(value, dict):
        return {}, None
    details = value.get('input_tokens_details')
    if not isinstance(details, dict):
        return {}, None
    values = [details.get('text_tokens'), details.get('image_tokens'), value.get('input_tokens'), value.get('output_tokens')]
    if any(type(item) is not int or not 0 <= item <= 1000000 for item in values):
        return {}, None
    text_in, image_in, total_in, out = values
    if total_in != text_in + image_in or out == 0:
        return {}, None
    return {'input_tokens': total_in, 'input_tokens_details': {'text_tokens': text_in, 'image_tokens': image_in}, 'output_tokens': out}, text_in * 5 + image_in * 8 + out * 30


class OpenAIImages:
    def __init__(self, settings, *, transport=None):
        self.settings, self.transport = settings, transport

    async def edit(self, person: bytes, garment: bytes, kind: str, safety_id: str):
        prompt = ('Image 1 is the customer photograph. Image 2 is the exact product reference. '
                  'Replace only the ' + ('upper-body clothing' if kind == 'tops' else 'trousers or lower-body clothing') +
                  ' in image 1 with the product in image 2. Preserve the customer identity, face, skin tone, body proportions, pose and background. '
                  'Match the product color, design, logo and pattern as closely as possible. Use natural fabric and lighting. '
                  'Keep all unrelated clothing unchanged. Do not add text, accessories, people, or change body shape.')
        data = {'model': MODEL, 'quality': 'low', 'complexity': 'low', 'size': '1024x1536', 'n': '1',
                'output_format': 'jpeg', 'output_compression': '90', 'moderation': 'auto', 'prompt': prompt, 'safety_identifier': safety_id}
        request_id, usage, cost = None, {}, None
        try:
            async with httpx.AsyncClient(transport=self.transport, trust_env=False, follow_redirects=False,
                                         timeout=httpx.Timeout(self.settings.timeout_seconds, connect=10)) as client:
                async with client.stream('POST', OPENAI_ENDPOINT, data=data,
                        files=[('image[]', ('person.jpg', person, 'image/jpeg')), ('image[]', ('product.jpg', garment, 'image/jpeg'))],
                        headers={'Authorization': 'Bearer ' + self.settings.api_key, 'User-Agent': 'pbl6-virtual-try-on/1.0'}) as response:
                    supplied_id = response.headers.get('x-request-id', '')
                    request_id = supplied_id if re.fullmatch(r'[A-Za-z0-9_-]{1,200}', supplied_id) else None
                    # Any transport loss/5xx may occur after acceptance. No automatic retry.
                    if response.status_code != 200:
                        if response.status_code in (400, 401, 403, 404, 413, 422, 429):
                            return Outcome('FAILED', request_id=request_id, message='Chưa tạo được ảnh. Hãy kiểm tra lượt thử và chọn ảnh phù hợp trước khi thử lại.', pause=response.status_code in (401, 403, 404, 429))
                        return Outcome('UNKNOWN', request_id=request_id, message='Chưa xác định kết quả. Vui lòng kiểm tra lại, không gửi thêm yêu cầu.')
                    raw = bytearray()
                    async for chunk in response.aiter_bytes():
                        if len(raw) + len(chunk) > 16 * 1024 * 1024:
                            raise ValueError('Oversized provider response')
                        raw.extend(chunk)
            result = json.loads(raw)
            if not isinstance(result, dict):
                raise ValueError('Invalid response')
            usage, cost = billable_usage(result.get('usage'))
            images = result.get('data')
            if not isinstance(images, list) or len(images) != 1 or not isinstance(images[0], dict) or not isinstance(images[0].get('b64_json'), str):
                raise ValueError('Missing image')
            image = normalize_image(base64.b64decode(images[0]['b64_json'], validate=True))
            return Outcome('SUCCEEDED', image, usage, cost, request_id)
        except (httpx.HTTPError, ValueError, TypeError, KeyError, TryOnError):
            return Outcome('UNKNOWN', usage=usage, cost=cost, request_id=request_id, message='Chưa xác định kết quả. Vui lòng kiểm tra lại, không gửi thêm yêu cầu.')

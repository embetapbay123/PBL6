import io
import json
import os
import re
import uuid
import warnings
from pathlib import Path

from PIL import Image, ImageOps, UnidentifiedImageError

from .config import TryOnError, UPLOAD_LIMIT


def normalize_image(data: bytes, *, person=False):
    if not data or len(data) > UPLOAD_LIMIT:
        raise TryOnError(413, 'PHOTO_TOO_LARGE', 'Ảnh phải có dung lượng tối đa 8 MB.')
    try:
        with warnings.catch_warnings():
            warnings.simplefilter('error', Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(data)) as image:
                width, height = image.size
                if image.format not in ('JPEG', 'PNG', 'WEBP') or getattr(image, 'n_frames', 1) != 1:
                    raise ValueError()
                minimum = 256 if person else 64
                if min(width, height) < minimum or width * height > 24000000 or max(width, height) > min(width, height) * 3:
                    raise ValueError()
                image.load()
                image = ImageOps.exif_transpose(image)
                image.thumbnail((1024, 1536))
                # Composite transparent catalog photos on white; strip EXIF and other metadata.
                if 'A' in image.getbands() or image.mode == 'P':
                    rgba = image.convert('RGBA')
                    clean = Image.new('RGB', image.size, 'white')
                    clean.paste(rgba, mask=rgba.getchannel('A'))
                else:
                    clean = image.convert('RGB')
                output = io.BytesIO()
                clean.save(output, 'JPEG', quality=90, optimize=True)
                return output.getvalue()
    except (ValueError, OSError, UnidentifiedImageError, Image.DecompressionBombError, Image.DecompressionBombWarning):
        raise TryOnError(422, 'INVALID_PHOTO', 'Chọn ảnh JPG, PNG hoặc WebP tĩnh, rõ nét và không quá 24 megapixel.')


class PrivateStorage:
    def __init__(self, root):
        self.root = Path(root).resolve()

    def prepare(self):
        self.root.mkdir(parents=True, exist_ok=True, mode=0o700)
        os.chmod(self.root, 0o700)

    def path(self, key):
        if not re.fullmatch(r'[a-f0-9]{32}\.(photo|garment|result)\.jpg|[a-f0-9]{32}\.receipt\.json', key):
            raise ValueError('Invalid storage key')
        path = self.root / key
        if path.is_symlink() or path.resolve().parent != self.root:
            raise ValueError('Invalid storage path')
        return path

    def write(self, key, data):
        self.prepare()
        path = self.path(key)
        temp = self.root / (uuid.uuid4().hex + '.tmp')
        try:
            with open(temp, 'xb') as stream:
                os.chmod(temp, 0o600)
                stream.write(data)
                stream.flush()
                os.fsync(stream.fileno())
            os.replace(temp, path)
        finally:
            temp.unlink(missing_ok=True)
        return key

    def new(self, data, kind):
        return self.write(f'{uuid.uuid4().hex}.{kind}.jpg', data)

    def read(self, key):
        path = self.path(key)
        if path.stat().st_size > UPLOAD_LIMIT:
            raise ValueError('Stored image exceeds limit')
        return path.read_bytes()

    def delete(self, key):
        self.path(key).unlink(missing_ok=True)

    def receipt(self, job_id, image, metadata):
        stem = uuid.UUID(str(job_id)).hex
        self.write(stem + '.result.jpg', image)
        # Receipt is written last. A crash before this point never permits resubmission.
        self.write(stem + '.receipt.json', json.dumps(metadata).encode())

    def read_receipt(self, job_id):
        stem = uuid.UUID(str(job_id)).hex
        path = self.path(stem + '.receipt.json')
        if not path.exists() or path.stat().st_size > 8192:
            return None
        value = json.loads(path.read_text())
        if not self.path(stem + '.result.jpg').is_file():
            return None
        return value

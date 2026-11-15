"""Private AI-chat files. No URL, original filename, or try-on storage key is accepted."""
import hashlib
import io
import json
import os
import re
import shutil
import subprocess
import uuid
import warnings
from pathlib import Path

from PIL import Image
from ..internal_client import InternalError

IMAGE_LIMIT, VIDEO_LIMIT = 5242880, 20971520
KEY = re.compile(r'[a-f0-9]{32}\.(upload|image\.webp|video\.mp4|preview\.webp|frame-[0-7]\.jpg|receipt\.json)')


def check_size(kind, size):
    if kind not in ('IMAGE', 'VIDEO') or type(size) is not int or not 1 <= size <= (IMAGE_LIMIT if kind == 'IMAGE' else VIDEO_LIMIT):
        raise InternalError(413, 'CHAT_FILE_TOO_LARGE', 'Ảnh tối đa 5 MB; video MP4 tối đa 20 MB, 30 giây.')


class MediaFiles:
    def __init__(self, directory):
        if not Path(directory).is_absolute():
            raise ValueError('AI chat storage must be absolute')
        self.root = Path(directory)

    def prepare(self):
        self.root.mkdir(parents=True, exist_ok=True, mode=0o700)
        if self.root.is_symlink():
            raise ValueError('AI chat directory cannot be a symlink')
        os.chmod(self.root, 0o700)

    def available(self):
        self.prepare()
        if shutil.disk_usage(self.root).free < 256 * 1024 * 1024:
            raise InternalError(503, 'CHAT_STORAGE_FULL', 'Chưa thể lưu tệp. Hãy thử lại sau.')

    def path(self, key):
        if not KEY.fullmatch(key):
            raise ValueError('Invalid private AI chat key')
        path = self.root / key
        if path.is_symlink() or path.resolve().parent != self.root.resolve():
            raise ValueError('Invalid private AI chat path')
        return path

    def open(self, key):
        fd = os.open(self.path(key), os.O_RDONLY | getattr(os, 'O_NOFOLLOW', 0))
        import stat
        if not stat.S_ISREG(os.fstat(fd).st_mode):
            os.close(fd)
            raise ValueError('Invalid AI chat file')
        return os.fdopen(fd, 'rb')

    def write(self, key, data):
        self.available()
        with self.path(key).open('xb') as stream:
            os.chmod(stream.name, 0o600)
            stream.write(data)
            stream.flush()
            os.fsync(stream.fileno())

    def publish(self, temporary, key):
        # Atomic exclusive publish; a concurrent completion cannot replace bytes.
        os.link(self.path(temporary), self.path(key), follow_symlinks=False)
        self.remove(temporary)

    def remove(self, key):
        if key:
            self.path(key).unlink(missing_ok=True)

    def native(self, binary, args, timeout):
        command = ['/usr/bin/prlimit', '--as=1073741824', '--cpu=45', '--nofile=64', '--fsize=33554432', '--', '/usr/bin/' + binary]
        # Native output is written to private files. ffprobe JSON is bounded by
        # stream selection and stdout file size before it is loaded into memory.
        output = self.path(uuid.uuid4().hex + '.upload')
        try:
            with output.open('xb') as result:
                subprocess.run([*command, *args], stdout=result, stderr=subprocess.DEVNULL,
                               timeout=timeout, check=True)
            if output.stat().st_size > 1048576:
                raise ValueError('Native metadata exceeds bound')
            return output.read_bytes()
        except (subprocess.SubprocessError, OSError, ValueError):
            raise InternalError(422, 'CHAT_FILE_INVALID', 'Không đọc được tệp. Chọn ảnh tĩnh hoặc video MP4 không quá 30 giây.')
        finally:
            output.unlink(missing_ok=True)

    def ready(self):
        self.available()
        self.native('ffmpeg', ['-version'], 3)
        self.native('ffprobe', ['-version'], 3)

    def process(self, key, kind):
        with self.open(key) as stream:
            size = os.fstat(stream.fileno()).st_size
            check_size(kind, size)
            header = stream.read(16)
            if kind == 'IMAGE':
                stream.seek(0)
                try:
                    with warnings.catch_warnings():
                        warnings.simplefilter('error', Image.DecompressionBombWarning)
                        with Image.open(io.BytesIO(stream.read())) as image:
                            if image.format not in ('JPEG', 'PNG', 'WEBP') or getattr(image, 'n_frames', 1) != 1:
                                raise ValueError('Unsupported image')
                            width, height = image.size
                            if min(width, height) < 32 or max(width, height) > 8192 or width * height > 24000000:
                                raise ValueError('Image dimensions exceed bounds')
                            format = {'JPEG': 'jpeg_pipe', 'PNG': 'png_pipe', 'WEBP': 'webp_pipe'}[image.format]
                except (OSError, ValueError, Image.DecompressionBombWarning, Image.DecompressionBombError):
                    raise InternalError(422, 'CHAT_IMAGE_INVALID', 'Chọn ảnh JPG, PNG hoặc WebP tĩnh, không quá 24 megapixel.')
            else:
                if header[4:8] != b'ftyp':
                    raise InternalError(422, 'CHAT_VIDEO_INVALID', 'Chọn video MP4 không quá 30 giây.')
                format = 'mov'
        image = kind == 'IMAGE'
        source = ['-protocol_whitelist', 'file,pipe', '-f', format]
        if not image:
            source += ['-enable_drefs', '0', '-use_absolute_path', '0']
        source += ['-i', str(self.path(key))]
        probe = json.loads(self.native('ffprobe', ['-v', 'error', '-threads', '1', *source, '-show_entries',
            'stream=codec_type,width,height:format=duration', '-of', 'json'], 10))
        streams = probe.get('streams', [])
        videos = [v for v in streams if v.get('codec_type') == 'video']
        if len(videos) != 1:
            raise InternalError(422, 'CHAT_FILE_INVALID', 'Tệp cần có một luồng hình ảnh.')
        width, height = videos[0].get('width', 0), videos[0].get('height', 0)
        if min(width, height) < 32 or max(width, height) > 8192 or width * height > 24000000:
            raise InternalError(422, 'CHAT_FILE_DIMENSIONS', 'Tệp vượt giới hạn kích thước hình ảnh.')
        duration = 0 if image else float(probe.get('format', {}).get('duration', 0))
        if not image and (not 0 < duration <= 30.05 or any(v.get('codec_type') not in ('video', 'audio') for v in streams)):
            raise InternalError(422, 'CHAT_VIDEO_DURATION', 'Chọn video MP4 không quá 30 giây.')
        stem = uuid.uuid4().hex
        output = stem + ('.image.webp' if image else '.video.mp4')
        preview = None if image else stem + '.preview.webp'
        common = ['-nostdin', '-v', 'error', '-threads', '1', '-filter_threads', '1', *source,
                  '-map', '0:v:0', '-map_metadata', '-1', '-map_chapters', '-1']
        try:
            if image:
                self.native('ffmpeg', [*common, '-frames:v', '1', '-vf', "scale='min(1600,iw)':'min(1600,ih)':force_original_aspect_ratio=decrease", '-c:v', 'libwebp', '-threads', '1', '-quality', '85', '-an', '-f', 'webp', '-n', str(self.path(output))], 15)
            else:
                self.native('ffmpeg', [*common, '-map', '0:a:0?', '-t', '30', '-vf', "scale='min(1280,iw)':'min(1280,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,fps=24", '-c:v', 'libx264', '-threads', '1', '-preset', 'veryfast', '-crf', '26', '-maxrate', '2M', '-bufsize', '4M', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', '-f', 'mp4', '-n', str(self.path(output))], 45)
                self.native('ffmpeg', ['-v', 'error', '-threads', '1', '-filter_threads', '1', '-protocol_whitelist', 'file,pipe', '-f', 'mov', '-enable_drefs', '0', '-use_absolute_path', '0', '-i', str(self.path(output)), '-frames:v', '1', '-vf', "scale='min(480,iw)':'min(480,ih)':force_original_aspect_ratio=decrease", '-map_metadata', '-1', '-an', '-c:v', 'libwebp', '-threads', '1', '-f', 'webp', '-n', str(self.path(preview))], 10)
            count = self.path(output).stat().st_size
            check_size(kind, count)
            with Image.open(self.path(output if image else preview)) as normalized:
                out_width, out_height = normalized.size
            # Video dimensions come from the normalized MP4, not its small preview.
            if not image:
                data = json.loads(self.native('ffprobe', ['-v', 'error', '-threads', '1', '-protocol_whitelist', 'file,pipe', '-i', str(self.path(output)), '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'json'], 5))['streams'][0]
                out_width, out_height = data['width'], data['height']
            return {'file_key': output, 'preview_key': preview, 'content_type': 'image/webp' if image else 'video/mp4',
                    'stored_bytes': count, 'width': out_width, 'height': out_height,
                    'duration_ms': None if image else min(30000, round(duration * 1000))}
        except BaseException:
            self.remove(output)
            self.remove(preview)
            raise

    def vision_images(self, asset):
        """Return actual normalized pixels, never a client URL or the video bytes."""
        if asset['kind'] == 'IMAGE':
            with self.open(asset['file_key']) as stream:
                with Image.open(stream) as image:
                    image.thumbnail((768, 768))
                    clean = image.convert('RGB');data = io.BytesIO();clean.save(data, 'JPEG', quality=85)
            return [(None, data.getvalue())]
        frames = []
        try:
            for index in range(8):
                at = asset['duration_ms'] / 1000 * (index + 0.5) / 8
                key = uuid.uuid4().hex + f'.frame-{index}.jpg'
                frames.append((at, key))
                self.native('ffmpeg', ['-v', 'error', '-threads', '1', '-filter_threads', '1', '-ss', str(at), '-protocol_whitelist', 'file,pipe', '-f', 'mov', '-enable_drefs', '0', '-use_absolute_path', '0', '-i', str(self.path(asset['file_key'])), '-frames:v', '1', '-vf', "scale='min(512,iw)':'min(512,ih)':force_original_aspect_ratio=decrease", '-an', '-map_metadata', '-1', '-c:v', 'mjpeg', '-threads', '1', '-f', 'image2', '-n', str(self.path(key))], 5)
            return [(at, self.path(key).read_bytes()) for at, key in frames]
        finally:
            for _, key in frames:
                self.remove(key)

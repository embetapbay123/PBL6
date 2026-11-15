import hashlib
import io
import os
import subprocess
import uuid

import pytest
from PIL import Image
from app.chat.media_files import MediaFiles
from app.internal_client import InternalError

pytestmark = pytest.mark.skipif(os.getenv('AI_CHAT_MEDIA_NATIVE_TEST') != '1', reason='Requires isolated FFmpeg container')


@pytest.fixture
def files(tmp_path):
    value = MediaFiles(tmp_path)
    value.ready()
    return value


def video(files, duration=2):
    key = uuid.uuid4().hex + '.upload'
    subprocess.run(['/usr/bin/ffmpeg', '-v', 'error', '-f', 'lavfi', '-i', f'testsrc2=s=160x120:r=12:d={duration}', '-c:v', 'libx264', '-threads', '1', '-pix_fmt', 'yuv420p', '-metadata', 'title=private-location-fixture', '-f', 'mp4', str(files.path(key))], check=True, timeout=30)
    return key


@pytest.mark.parametrize('format', ['PNG', 'JPEG', 'WEBP'])
def test_static_pixels_are_normalized_to_webp_without_metadata(files, format):
    data = io.BytesIO()
    image = Image.new('RGB', (96, 64), 'red')
    exif = Image.Exif();exif[274] = 6
    image.save(data, format, **({'exif': exif} if format == 'JPEG' else {}))
    key = uuid.uuid4().hex + '.upload';files.write(key, data.getvalue())
    result = files.process(key, 'IMAGE')
    assert result['content_type'] == 'image/webp'
    with Image.open(files.path(result['file_key'])) as normalized:
        assert normalized.size == ((64, 96) if format == 'JPEG' else (96, 64))
        assert not normalized.getexif()
    images = files.vision_images({'kind': 'IMAGE', **result})
    assert len(images) == 1 and images[0][0] is None and images[0][1].startswith(b'\xff\xd8')


def test_video_generates_eight_distinct_actual_timestamped_frames_and_removes_audio_and_metadata_from_frames(files):
    result = files.process(video(files), 'VIDEO')
    assert result['content_type'] == 'video/mp4' and result['duration_ms'] == 2000 and result['preview_key']
    assert b'private-location-fixture' not in files.path(result['file_key']).read_bytes()
    frames = files.vision_images({'kind': 'VIDEO', **result})
    assert len(frames) == 8 and all(0 < at < 2 and pixels.startswith(b'\xff\xd8') for at, pixels in frames)
    assert len({hashlib.sha256(pixels).hexdigest() for _, pixels in frames}) >= 2
    assert not list(files.root.glob('*.frame-*.jpg'))


def test_oversized_video_animated_image_and_svg_are_rejected(files):
    with pytest.raises(InternalError):
        files.process(video(files, 31), 'VIDEO')
    for body in [b'<svg><image href="http://127.0.0.1/private"/></svg>', b'\x89PNG\r\n\x1a\ncorrupt']:
        key = uuid.uuid4().hex + '.upload';files.write(key, body)
        with pytest.raises(InternalError):
            files.process(key, 'IMAGE')
    animated = io.BytesIO()
    Image.new('RGB', (64, 64), 'red').save(animated, 'PNG', save_all=True, append_images=[Image.new('RGB', (64, 64), 'blue')], duration=100, loop=0)
    key = uuid.uuid4().hex + '.upload';files.write(key, animated.getvalue())
    with pytest.raises(InternalError):
        files.process(key, 'IMAGE')


def test_private_keys_cannot_escape_root_follow_symlinks_or_replace_published_bytes(files, tmp_path):
    for key in ['../outside', 'https://untrusted.invalid/x', '/etc/passwd', 'abc.upload']:
        with pytest.raises(ValueError):
            files.path(key)
    first, target, second = [uuid.uuid4().hex + '.upload' for _ in range(3)]
    files.write(first, b'original');files.publish(first, target);files.write(second, b'replacement')
    with pytest.raises(FileExistsError):
        files.publish(second, target)
    assert files.path(target).read_bytes() == b'original'
    link = uuid.uuid4().hex + '.upload';files.path(link).symlink_to(files.path(target))
    with pytest.raises((ValueError, OSError)):
        files.open(link)

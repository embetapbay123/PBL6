"""Download the curated Burst photo set, optimize it, and preserve source/credit hashes.

No random-image service or image search results are used at runtime. Each slug is
reviewed against the product in data/marketplace-catalog.json before release.
"""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import argparse, hashlib, html, io, json, re, time, urllib.request, urllib.error
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
LICENSE = 'https://www.shopify.com/stock-photos/legal/terms'


def download(slug, assets_only=False):
    page = 'https://www.shopify.com/stock-photos/photos/' + slug
    def read(url):
        request = urllib.request.Request(url, headers={'User-Agent': 'PBL6-Catalog-Asset-Preparation/1.0'})
        for attempt in range(3):
            try:
                with urllib.request.urlopen(request, timeout=30) as response:
                    return response.read()
            except urllib.error.HTTPError as error:
                delay = int(error.headers.get('Retry-After', '30'))
                if error.code != 429 or delay > 60 or attempt == 2:
                    raise RuntimeError(slug + ': HTTP ' + str(error.code)) from None
                time.sleep(max(1, delay))
    cache = ROOT / 'artifacts/ui-refresh/photo-cache' / (slug + '.html')
    cache.parent.mkdir(parents=True, exist_ok=True)
    if cache.exists():
        source = cache.read_text(encoding='utf-8')
    elif assets_only:
        source = ''
    else:
        time.sleep(2)
        source = read(page).decode('utf-8')
        cache.write_text(source, encoding='utf-8')
    match = re.search(r'<meta[^>]+(?:property|name)="og:image"[^>]+content="([^"]+)"', source)
    if not match and not assets_only:
        raise RuntimeError('Missing original photo: ' + slug)
    url = (html.unescape(match[1]).split('?')[0] if match else 'https://burst.shopifycdn.com/photos/' + slug + '.jpg') + '?width=1600&format=pjpg'
    output = ROOT / 'frontend/public/catalog' / (slug + '.webp')
    output.parent.mkdir(parents=True, exist_ok=True)
    if not output.exists():
        image = ImageOps.exif_transpose(Image.open(io.BytesIO(read(url)))).convert('RGB')
        image.thumbnail((1200, 1200), Image.Resampling.LANCZOS)
        image.save(output, 'WEBP', quality=84, method=6)
    image = Image.open(output)
    metadata = {}
    for block in re.findall(r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>', source, re.S):
        record = json.loads(block)
        if isinstance(record, dict) and record.get('@type') == 'ImageObject':
            metadata = record
    return {'slug': slug, 'source_page': page, 'source_image': url, 'provider': 'Burst / Shopify',
            'credit': metadata.get('author', {}).get('name', 'See original photo page'),
            'license': metadata.get('license', 'https://www.shopify.com/stock-photos/about-us'),
            'license_verification': 'individual photo metadata' if metadata else 'provider-wide free photo policy; see original page for photographer and individual license',
            'file': '/catalog/' + output.name, 'width': image.width, 'height': image.height,
            'bytes': output.stat().st_size, 'sha256': hashlib.sha256(output.read_bytes()).hexdigest()}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--assets-only', action='store_true', help='Use named public CDN assets and cached metadata; make no requests to the photo-page server')
    args = parser.parse_args()
    catalog = json.loads((ROOT / 'data/marketplace-catalog.json').read_text(encoding='utf-8'))
    slugs = sorted({photo for item in catalog['products'] for photo in item['photos']} | set(catalog['collection_photos'].values()))
    if not args.apply:
        print(json.dumps({'status': 'PLAN_ONLY', 'photos': len(slugs), 'provider': 'Burst / Shopify'}))
        return
    # Bound concurrency; no third-party scripts or packages from the reference repos are run.
    with ThreadPoolExecutor(max_workers=1) as pool:
        photos = list(pool.map(lambda slug: download(slug, args.assets_only), slugs))
    manifest = {'provider': 'Burst / Shopify', 'usage': 'Synthetic marketplace catalog and collection imagery',
                'license_information': 'https://www.shopify.com/stock-photos/about-us', 'photos': photos}
    (ROOT / 'frontend/public/catalog/sources.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'status': 'PASS', 'photos': len(photos), 'total_bytes': sum(p['bytes'] for p in photos)}))


if __name__ == '__main__':
    main()

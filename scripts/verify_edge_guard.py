"""Bounded gateway checks: no logins, business writes, provider calls or limiter bypass."""
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import json
from pathlib import Path
import re
import subprocess
import time
import uuid


def verify(base, curl='curl'):
    run = uuid.uuid4().hex
    def request(path, headers=(), method='GET'):
        args = [curl, '-sS', '--max-time', '15', '-X', method, '-D', '-', '-o', '-', base.rstrip('/') + path]
        for header in headers:
            args.extend(('-H', header))
        result = subprocess.run(args, capture_output=True, encoding='utf-8', check=True)
        head, body = result.stdout.replace('\r\n', '\n').split('\n\n', 1)
        while body.startswith('HTTP/'):
            head, body = body.split('\n\n', 1)
        lines = head.splitlines()
        status = int(lines[0].split()[1])
        fields = dict(line.split(':', 1) for line in lines[1:] if ':' in line)
        return status, {key.lower(): value.strip() for key, value in fields.items()}, body

    def burst(path, count, headers=(), method='GET'):
        with ThreadPoolExecutor(max_workers=4) as pool:
            return list(pool.map(lambda _: request(path, headers, method), range(count)))

    # Let an earlier smoke/navigation burst expire; never delete or bypass real counters.
    time.sleep(11)
    api = burst('/api/v1/products?size=1&q=' + run, 24)
    limited = [result for result in api if result[0] == 429]
    assert limited and any(result[0] == 200 for result in api), 'API burst must admit then rate-limit: ' + str([result[0] for result in api])
    assert all(json.loads(result[2])['code'] == 'RATE_LIMITED' and int(result[1]['retry-after']) > 0 for result in limited)
    forged = request('/api/v1/products?size=1&q=' + uuid.uuid4().hex,
                     ['X-Forwarded-For: 203.0.113.232', 'X-PBL6-Client-IP: 203.0.113.233'])
    assert forged[0] == 429, 'Spoofed proxy headers must not create an independent allowance'
    forged_cf = request('/api/v1/products?size=1&q=' + uuid.uuid4().hex, ['CF-Connecting-IP: 203.0.113.231'])
    assert forged_cf[0] in (403, 429), 'A forged Cloudflare identity must be blocked at the edge or counted as the same visitor'
    documents = burst('/?edge_test=' + run, 14, ['Accept: text/html'])
    blocked_pages = [result for result in documents if result[0] == 429]
    assert blocked_pages and any(result[0] == 200 for result in documents)
    assert all('text/html' in result[1].get('content-type', '') and 'Thử lại' in result[2] for result in blocked_pages)
    html = next(result[2] for result in documents if result[0] == 200)
    asset = re.search(r'(?:src|href)="(/assets/[^" ]+)"', html).group(1)
    assets = burst(asset, 4)
    assert all(result[0] == 200 for result in assets)
    private = [request(path)[0] for path in ('/health/ready', '/internal/edge-probe', '/metrics')]
    assert private == [404, 404, 404], 'Private routes must not fall through to the frontend'
    login = burst('/api/v1/auth/login', 7, ['Content-Type: application/json'], 'POST')
    assert any(result[0] == 429 for result in login)
    assert all(result[0] in (400, 401, 422, 429) for result in login)
    wait = max(int(result[1]['retry-after']) for result in limited + blocked_pages) + 1
    time.sleep(min(wait, 61))
    recovered_api = request('/api/v1/products?size=1&q=' + run)
    recovered_page = request('/?edge_test=' + run)
    assert recovered_api[0] == 200 and recovered_page[0] == 200, 'Access should recover after burst window'
    return {'checked_at': datetime.now(timezone.utc).isoformat(), 'base_url': base,
            'api_status_counts': {str(status): sum(result[0] == status for result in api) for status in sorted(set(result[0] for result in api))},
            'document_status_counts': {str(status): sum(result[0] == status for result in documents) for status in sorted(set(result[0] for result in documents))},
            'spoofed_headers_status': forged[0], 'static_requests_blocked': 0,
            'spoofed_cloudflare_header_status': forged_cf[0],
            'private_route_statuses': private,
            'login_rate_limited': True, 'recovered_api': recovered_api[0], 'recovered_document': recovered_page[0],
            'billable_provider_calls': 0}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--base-url', required=True)
    parser.add_argument('--curl', default='curl')
    parser.add_argument('--output')
    args = parser.parse_args()
    report = verify(args.base_url, args.curl)
    if args.output:
        Path(args.output).parent.mkdir(parents=True, exist_ok=True)
        Path(args.output).write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))

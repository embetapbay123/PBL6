import urllib.request, re

req = urllib.request.Request('https://demo.congnguyen.me/', headers={'User-Agent': 'Mozilla/5.0', 'Cache-Control': 'no-cache'})
with urllib.request.urlopen(req, timeout=15) as res:
    html = res.read().decode('utf-8')
    print('HTTP Status:', res.status)
    assets = re.findall(r'(?:src|href)="(/assets/[^"]+)"', html)
    print('Assets found on https://demo.congnguyen.me/:', assets)
    assert '/assets/index-DlrYMfZC.js' in assets
    assert '/assets/index-DfQp3Idv.css' in assets
    print('VERIFICATION: SUCCESS! Public domain is serving new LiveApp build.')

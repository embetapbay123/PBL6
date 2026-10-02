"""Bounded readiness wait for test/startup, no secret output."""
import time,urllib.request,sys
for _ in range(60):
    try:
        with urllib.request.urlopen('http://localhost:8080/api/v1/products',timeout=2) as response:
            if response.status==200: print('Gateway sample is ready');sys.exit(0)
    except (OSError,urllib.error.URLError): pass
    time.sleep(1)
raise SystemExit('Gateway sample not ready after 60 attempts; inspect service logs')

"""Bounded readiness wait for test/startup, no secret output."""
import os
import sys
import time
import urllib.error
import urllib.request

url = os.environ.get("PBL6_GATEWAY_SAMPLE_URL", "http://localhost:8080/api/v1/products")
timeout = int(os.environ.get("PBL6_GATEWAY_WAIT_SECONDS", "180"))
deadline = time.monotonic() + timeout
last_failure = "no response"

while time.monotonic() < deadline:
    try:
        with urllib.request.urlopen(url, timeout=2) as response:
            if response.status == 200:
                print("Gateway sample is ready")
                sys.exit(0)
            last_failure = f"HTTP {response.status}"
    except urllib.error.HTTPError as error:
        last_failure = f"HTTP {error.code}"
    except (OSError, urllib.error.URLError) as error:
        last_failure = error.reason if isinstance(error, urllib.error.URLError) else str(error)
    time.sleep(1)

raise SystemExit(
    f"Gateway sample not ready after {timeout} seconds ({last_failure}); inspect service logs"
)

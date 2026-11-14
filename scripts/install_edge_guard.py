"""Idempotently add gateway admission while preserving the installed business routes."""
from pathlib import Path
import re
import sys

GLOBAL = '''{
  servers {
    trusted_proxies static {$EDGE_TRUSTED_PROXY_CIDRS:127.0.0.1/32 ::1/128}
    trusted_proxies_strict
    client_ip_headers CF-Connecting-IP
  }
}
'''
GUARD = '''
  # BEGIN PBL6 EDGE GUARD
  @edgeGuarded {
    not path /assets/* /catalog/* /favicon.ico /robots.txt /site.webmanifest /internal/* /health/* /metrics
  }
  forward_auth @edgeGuarded edge-guard:3111 {
    uri /check
    header_up X-Edge-Client-IP {client_ip}
    header_up X-Edge-Method {method}
    header_up X-Edge-Uri {uri}
    header_up -Authorization
    header_up -Cookie
    header_up -X-Try-On-Demo-Password
    header_up -X-Service-*
    transport http {
      dial_timeout 2s
      response_header_timeout 2s
    }
  }
  # END PBL6 EDGE GUARD
'''


def install(body):
    if '# BEGIN PBL6 EDGE GUARD' in body:
        return body
    if re.match(r'^\s*\{\s*\n', body) or 'trusted_proxies' in body:
        raise ValueError('Review the existing global proxy configuration before installing.')
    site = '{$SITE_ADDRESS:80} {'
    if body.count(site) != 1:
        raise ValueError('Cannot identify the application site safely.')
    # Forward a single verified address to both Node and Python; remove arbitrary caller XFF.
    pattern = r'reverse_proxy (m[1-4]:310[1-4])(?:\s*\{\s*(?:#[^\n]*\n\s*)?header_up X-PBL6-Client-IP \{remote_host\}\s*\})?'
    def proxy(match):
        return ('reverse_proxy ' + match[1] + ' {\n'
                '      header_up X-Forwarded-For {client_ip}\n'
                '      header_up X-PBL6-Client-IP {client_ip}\n    }')
    body, count = re.subn(pattern, proxy, body)
    if count < 4:
        raise ValueError('Expected the existing M1/M2/M3/M4 routes.')
    body = body.replace('respond @private "Not found" 404', 'handle @private {\n    respond "Not found" 404\n  }')
    return GLOBAL + body.replace(site, site + GUARD, 1)


if __name__ == '__main__':
    path = Path(sys.argv[1])
    path.write_text(install(path.read_text()))

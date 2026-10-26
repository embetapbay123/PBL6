#!/bin/sh
set -eu
# Aliases are real source addresses on this disposable container's private namespace.
# No forwarded client header, shared rate-limit budget or application limiter is bypassed.
for alias in $(printf '%s' "$LOAD_IPS" | tr ',' ' '); do
  case "$alias" in ''|*[!0-9.]*) exit 2;; esac
  ip addr add "$alias/32" dev eth0
done
exec k6 run --local-ips "$LOAD_IPS" --summary-export /evidence/k6-summary.json /capacity/mixed.k6.js

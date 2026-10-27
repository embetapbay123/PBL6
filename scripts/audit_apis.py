import os
import re

backend_status = {}
with open('docs/implementation/endpoint-status.md', 'r', encoding='utf-8') as f:
    for line in f:
        if line.startswith('| `'):
            parts = [p.strip() for p in line.split('|')[1:-1]]
            if len(parts) >= 5:
                # normalize path e.g. /me/addresses/{id} -> /me/addresses
                clean_path = parts[0].strip('`').split('?')[0]
                backend_status[parts[1]] = {
                    'raw_path': parts[0].strip('`'),
                    'path': clean_path,
                    'status': parts[4],
                    'owner': parts[3]
                }

pattern = re.compile(r"callOperation\(\s*['\"]([a-zA-Z0-9_]+)['\"]")
api_pattern = re.compile(r"\bapi\.([a-zA-Z0-9_]+)\b")

all_src = ""
for root, _, files in os.walk('frontend/src'):
    for f in files:
        if f.endswith(('.ts', '.tsx')):
            with open(os.path.join(root, f), 'r', encoding='utf-8', errors='ignore') as sf:
                all_src += "\n" + sf.read()

fe_mapped = set(pattern.findall(all_src))
fe_mapped.update(api_pattern.findall(all_src))

# Also match paths used in request(...)
for op, info in backend_status.items():
    p = info['path']
    # e.g. '/me/addresses' in source code
    base_p = re.sub(r'\{[^}]+\}', '', p).rstrip('/')
    if base_p and base_p in all_src:
        fe_mapped.add(op)

if 'login' in backend_status: fe_mapped.add('login')
if 'logout' in backend_status: fe_mapped.add('logout')
if 'refresh' in backend_status: fe_mapped.add('refresh')
if 'getProfile' in backend_status: fe_mapped.add('getProfile')

be_has = [k for k, v in backend_status.items() if v['status'] in ('IMPLEMENTED', 'IMPLEMENTED_SAMPLE')]
be_not_impl = [k for k, v in backend_status.items() if v['status'] == 'NOT_IMPLEMENTED']

mapped = [k for k in be_has if k in fe_mapped]
unmapped = [k for k in be_has if k not in fe_mapped]

print(f"Tổng số API: {len(backend_status)}")
print(f"Backend ĐÃ CÓ: {len(be_has)}, FE ĐÃ MAP: {len(mapped)}, FE CHƯA MAP: {len(unmapped)}")
print(f"Backend CHƯA TRIỂN KHAI (501): {len(be_not_impl)}")

mapped_501 = [k for k in be_not_impl if k in fe_mapped]
unmapped_501 = [k for k in be_not_impl if k not in fe_mapped]
print(f"  -> Trong đó FE ĐÃ HOOK (với 501 fallback): {len(mapped_501)}")
print(f"  -> FE CHƯA HOOK: {len(unmapped_501)}")

print("\nDanh sách API Backend đã có nhưng FE chưa gọi:")
for u in unmapped:
    print(f"  • {u} ({backend_status[u]['raw_path']}) - {backend_status[u]['status']}")

if unmapped_501:
    print("\nDanh sách API 501 FE chưa hook:")
    for u in unmapped_501:
        print(f"  • {u} ({backend_status[u]['raw_path']})")

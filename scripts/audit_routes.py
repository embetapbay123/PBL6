import os, re, glob

# 1. Collect all defined routes in the application
defined_routes = {}

route_files = glob.glob('frontend/src/**/routes*.tsx', recursive=True)
route_files.append('frontend/src/live/LiveApp.tsx')
route_files.append('frontend/src/features/customer/StoreApplicationPage.tsx')
route_files.append('frontend/src/features/admin/StoreApplicationAdminPage.tsx')

for f in route_files:
    if not os.path.exists(f): continue
    with open(f, 'r', encoding='utf-8') as rf:
        text = rf.read()
        for match in re.finditer(r"path:\s*['\"]([^'\"]+)['\"]", text):
            p = match.group(1)
            defined_routes[p] = f

# 2. Search all files in frontend/src for Link to, NavLink to, navigate, href
links_found = {}
all_src = {}
for root, _, files in os.walk('frontend/src'):
    for f in files:
        if f.endswith(('.ts', '.tsx')):
            filepath = os.path.join(root, f)
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as sf:
                c = sf.read()
                all_src[filepath] = c
                
                # Match to="..." or href="..."
                for m in re.findall(r'(?:to|href)=["\']([^"\']+)["\']', c):
                    if m and not m.startswith(('http', '#', 'mailto:')):
                        clean = m.split('?')[0].rstrip('/') or '/'
                        links_found.setdefault(clean, []).append(filepath)

                # Match to={`...`} or to={'...'}
                for m in re.findall(r'(?:to|href)=\{[`"\']([^`"\']+)`?\}', c):
                    if m and not m.startswith(('http', '#', 'mailto:')):
                        # e.g. /orders/${order.id}/pay -> /orders/:id/pay
                        clean = re.sub(r'\$\{[^}]+\}', ':id', m).split('?')[0].rstrip('/') or '/'
                        links_found.setdefault(clean, []).append(filepath)

                # Match navigate('...') or navigate(`...`)
                for m in re.findall(r'navigate\([`"\']([^`"\']+)`?[\'"`]?[\),]', c):
                    if m and not m.startswith(('http', '#', 'mailto:')):
                        clean = re.sub(r'\$\{[^}]+\}', ':id', m).split('?')[0].rstrip('/') or '/'
                        links_found.setdefault(clean, []).append(filepath)

print("=== BÁO CÁO TOÀN DIỆN CÁC ROUTE TRONG HỆ THỐNG ===")
for path, defined_in in sorted(defined_routes.items()):
    is_wildcard = '*' in path
    
    # check matching links
    is_linked = False
    linked_from = []
    
    # direct match
    if path in links_found:
        is_linked = True
        linked_from.extend(links_found[path])
    
    # param match e.g. /products/:id or /orders/:id/pay
    base_prefix = re.sub(r'/:[^/]+.*', '', path)
    for link, sources in links_found.items():
        if link == path or (base_prefix and link.startswith(base_prefix)):
            is_linked = True
            linked_from.extend(sources)

    linked_from = list(set([os.path.basename(s) for s in linked_from]))
    if is_wildcard:
        status = "CATCH-ALL (FALLBACK)"
    elif is_linked:
        status = "OK (ĐÃ LIÊN KẾT)"
    else:
        status = "CHƯA CÓ LIÊN KẾT (ORPHAN)"
        
    print(f"[{status:<20}] {path:<32} | File: {os.path.basename(defined_in):<25} | Nguồn: {', '.join(linked_from[:3]) if linked_from else 'None'}")

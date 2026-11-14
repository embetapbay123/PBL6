"""Cache public Burst collection pages for deliberate catalog curation."""
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
import json, re, time, urllib.request, urllib.error

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'outputs/catalog-refresh-2026-11-14/sources'
COLLECTIONS=[('product',p) for p in range(1,13)]+[(c,1) for c in ['shoes','boots','mens-fashion','dress','hat','kitchen','home','furniture','computer','camera','jewelry','watch','wallet','bag','socks']]

def collect(entry):
    category,page=entry; file=OUT/(category+'-'+str(page)+'.html')
    url='https://www.shopify.com/stock-photos/'+category+('?page='+str(page) if page>1 else '')
    if file.exists():source=file.read_text(encoding='utf8')
    else:
        time.sleep(.7)
        for attempt in range(3):
            try:
                req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 (compatible; PBL6 catalog curation)'})
                with urllib.request.urlopen(req,timeout=30) as response:source=response.read().decode('utf8')
                file.write_text(source,encoding='utf8');break
            except urllib.error.HTTPError as e:
                if e.code==429 and attempt<2:
                    seconds=int(e.headers.get('Retry-After','30'))
                    if seconds<=60:time.sleep(seconds);continue
                return {'collection':category,'page':page,'url':url,'error':str(e.code),'slugs':[]}
    slugs=list(dict.fromkeys(s for s in re.findall(r'/stock-photos/photos/([a-z0-9-]+)',source) if s!='search'))
    return {'collection':category,'page':page,'url':url,'slugs':slugs}

if __name__=='__main__':
    OUT.mkdir(parents=True,exist_ok=True)
    results=[]
    with ThreadPoolExecutor(max_workers=3) as pool:
        for future in as_completed([pool.submit(collect,e) for e in COLLECTIONS]):
            r=future.result();results.append(r);print(r['collection'],r['page'],len(r['slugs']),r.get('error',''),flush=True)
    results.sort(key=lambda r:(r['collection'],r['page']))
    (OUT/'collections.json').write_text(json.dumps(results,indent=2),encoding='utf8')
    print('Unique photo candidates:',len(set(s for r in results for s in r['slugs'])))

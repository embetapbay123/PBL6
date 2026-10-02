"""Check design requirements and scaffold contract/ownership references."""
from pathlib import Path
from urllib.parse import unquote
import json
import re
import xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parents[1]
DOCS=ROOT/'docs'
errors=[]
files=list(DOCS.rglob('*.md'))
for file in files:
    text=file.read_text(encoding='utf-8')
    if '\ufffd' in text: errors.append((file,'replacement character'))
    for match in re.finditer(r'!\[[^\]]*\]\(([^)]+)\)',text):
        image=unquote(match.group(1).split('#',1)[0])
        if '://' not in image and not (file.parent/image).exists():
            errors.append((file,f'missing image {image}'))
    for match in re.finditer(r'(?<!!)\[[^\]]+\]\(([^)\s]+)\)',text):
        link=unquote(match.group(1))
        if '://' in link or link.startswith('mailto:'): continue
        rel,_,anchor=link.partition('#')
        dest=(file.parent/rel).resolve() if rel else file
        if not dest.exists():
            errors.append((file,f'missing link {link}'))
        elif anchor and dest.suffix=='.md':
            body=dest.read_text(encoding='utf-8')
            explicit=f'id="{anchor}"' in body
            slugged=any(re.sub(r'[^a-z0-9 -]','',head.lower()).strip().replace(' ','-')==anchor for head in re.findall(r'^#{1,6} (.*)$',body,re.M))
            if not (explicit or slugged): errors.append((file,f'missing anchor {link}'))
req=(DOCS/'functional-requirements.md').read_text(encoding='utf-8')
fr=set(re.findall(r'^\| (FR-[A-Z0-9-]+) \|',req,re.M))
nfr=set(re.findall(r'^\| (NFR-[A-Z0-9-]+) \|',req,re.M))
story=(DOCS/'user-stories.md').read_text(encoding='utf-8')
us=set(re.findall(r'^\| (US-[A-Z0-9-]+) \|',story,re.M))
uc=(DOCS/'use-cases.md').read_text(encoding='utf-8')
ucids=set(re.findall(r'^### (UC-[A-Z0-9-]+) —',uc,re.M))
br=(DOCS/'business-rules.md').read_text(encoding='utf-8')
brids=set(re.findall(r'^\| (BR-\d+) \|',br,re.M))
tests=(DOCS/'test-plan.md').read_text(encoding='utf-8')
tcids=set(re.findall(r'^\| (TC-[A-Z0-9-]+) \|',tests,re.M))
trace=(DOCS/'traceability.md').read_text(encoding='utf-8')
traced=set(re.findall(r'^\| (FR-[A-Z0-9-]+) \|',trace,re.M))
if len(fr)!=98 or len(nfr)!=28 or len(us)!=92 or len(ucids)!=64 or len(brids)!=41:
    errors.append(('counts',(len(fr),len(nfr),len(us),len(ucids),len(brids))))
if traced!=fr: errors.append(('traceability FR',sorted(fr-traced),sorted(traced-fr)))
nfrtraced=set(re.findall(r'^\| (NFR-[A-Z0-9-]+) \|',trace,re.M))
if nfrtraced!=nfr: errors.append(('traceability NFR',sorted(nfr-nfrtraced),sorted(nfrtraced-nfr)))
for line in trace.splitlines():
    if not re.match(r'^\| NFR-[A-Z0-9-]+ \|',line): continue
    cells=[s.strip() for s in line.strip().strip('|').split('|')]
    if len(cells)!=5: errors.append(('NFR trace columns',line[:100])); continue
    for name in cells[2].split(', '):
        if name!='—' and name not in ucids: errors.append(('NFR trace unknown UC',cells[0],name))
    if cells[4]!='TC-'+cells[0]: errors.append(('NFR trace wrong TC',cells[0],cells[4]))
for id_ in re.findall(r'\bFR-[A-Z]+(?:-[A-Z]+)*-\d+\b',story):
    if id_ not in fr: errors.append(('story unknown FR',id_))
for id_ in re.findall(r'\bUS-[A-Z0-9-]+\b',trace):
    if id_ not in us: errors.append(('trace unknown US',id_))
for id_ in re.findall(r'^\| (BR-\d+) \|.*?\| (TC-[A-Z0-9-]+) \|$',br,re.M):
    if id_[1] not in tcids: errors.append(('BR unknown TC',id_))
api=json.loads((DOCS/'contracts'/'openapi.json').read_text(encoding='utf-8'))
ops=[o for p in api['paths'].values() for o in p.values()]
opids={o['operationId'] for o in ops}
for line in trace.splitlines():
    if not re.match(r'^\| FR-[A-Z0-9-]+ \|',line): continue
    cells=[s.strip() for s in line.strip().strip('|').split('|')]
    if len(cells)!=5: errors.append(('trace columns',line[:100])); continue
    for name in cells[2].split(', '):
        if name!='—' and name not in ucids: errors.append(('trace unknown UC',cells[0],name))
    for name in cells[3].split(', '):
        if name!='—' and name not in opids: errors.append(('trace unknown API',cells[0],name))
    if cells[4]!='TC-'+cells[0]: errors.append(('trace wrong TC',cells[0],cells[4]))
accept=(DOCS/'requirements-acceptance.md').read_text(encoding='utf-8')
acceptids=set(re.findall(r'^\| (TC-(?:FR|NFR)-[A-Z0-9-]+) \|',accept,re.M))
if len(acceptids)!=len(fr)+len(nfr): errors.append(('acceptance count',len(acceptids)))
if 'Có môi trường/dữ liệu test cố định và log theo correlation ID' in accept:
    errors.append(('NFR acceptance still generic',))
if len(ops)!=99: errors.append(('API count',len(ops)))
status_index=json.loads((DOCS/'contracts'/'endpoint-status.json').read_text(encoding='utf-8'))
if len(status_index)!=len(ops) or {row['operation_id'] for row in status_index}!=opids:
    errors.append(('endpoint status coverage',))
for o in ops:
    if o.get('x-service-owner') not in {'M1','M2','M3','M4'} or o.get('x-implementation-status') not in {'IMPLEMENTED_SAMPLE','MOCK_ONLY','NOT_IMPLEMENTED','IMPLEMENTED'}:
        errors.append(('invalid scaffold ownership/status',o['operationId']))
    record=next((r for r in status_index if r['operation_id']==o['operationId']),{})
    if record.get('status')!=o.get('x-implementation-status') or record.get('owner')!=o.get('x-member-owner'):
        errors.append(('stale endpoint index',o['operationId']))
for o in ops:
    if '#/components/schemas/Resource' in json.dumps(o):
        errors.append(('generic API Resource',o['operationId']))
    if 'x-required-roles' not in o or 'x-data-scope' not in o:
        errors.append(('API missing access scope',o['operationId']))
    for part in o.get('requestBody',{}).get('content',{}).values():
        name=part['schema']['$ref'].split('/')[-1]
        if name not in api['components']['schemas']: errors.append(('API missing schema',name))
versioned_writes={
    'reviewStoreApplication','updateOwnStore','updateProduct','transitionStoreOrder',
    'updateStoreVoucher','updatePlatformVoucher','updateReview','updateUserState',
    'updateStoreState','updateRole','updateStaff','updateCategory','updateProductType',
    'updateAttributeDefinition',
}
for op in ops:
    if op['operationId'] not in versioned_writes: continue
    ref=op['requestBody']['content']['application/json']['schema']['$ref']
    schema=api['components']['schemas'][ref.rsplit('/',1)[-1]]
    if 'expected_version' not in schema.get('required',[]):
        errors.append(('versioned write missing required expected_version',op['operationId']))
for svg in (DOCS/'diagrams').rglob('*.svg'):
    try:
        ET.parse(svg)
    except ET.ParseError as exc:
        errors.append((svg,'invalid SVG',str(exc)))
if len(list((DOCS/'diagrams'/'use-case').glob('*.puml')))!=13: errors.append(('UC diagrams count',))
if len(list((DOCS/'diagrams'/'use-case').glob('*.svg')))!=13: errors.append(('UC rendered diagrams count',))
diagram_uc=[]
for diagram in (DOCS/'diagrams'/'use-case').glob('*.puml'):
    source=diagram.read_text(encoding='utf-8')
    if diagram.name=='00-overview.puml':
        continue
    diagram_uc.extend(re.findall(r'^\s*usecase .*\[(UC-[A-Z0-9-]+)\]',source,re.M))
    actors=re.findall(r'^actor .* as ([A-Za-z]+)$',source,re.M)
    for actor in actors:
        if len(re.findall(r'\b'+re.escape(actor)+r'\b',source))<2:
            errors.append((diagram,'unused actor',actor))
if len(diagram_uc)!=len(ucids) or set(diagram_uc)!=ucids:
    errors.append(('UC diagram declaration mismatch',len(diagram_uc),sorted(ucids-set(diagram_uc))))
if len(diagram_uc)!=len(set(diagram_uc)):
    errors.append(('duplicate UC in detail diagrams',))
if re.search(r'UC_PAY_(?:SANDBOX|COD)\s+\.\.>\s+UC_CHECKOUT_CONFIRM',
             (DOCS/'diagrams'/'use-case'/'03-cart-checkout.puml').read_text(encoding='utf-8')):
    errors.append(('old payment extend',))
if len(list((DOCS/'diagrams'/'erd').glob('*.mmd')))!=9: errors.append(('ERD diagrams count',))
if len(list((DOCS/'diagrams'/'erd').glob('*.svg')))!=9: errors.append(('ERD rendered diagrams count',))
if len(list((DOCS/'diagrams'/'sequence').glob('*.puml')))!=8: errors.append(('Sequence count',))
if len(list((DOCS/'diagrams'/'activity').glob('*.puml')))!=2: errors.append(('Activity count',))
if len(list((DOCS/'diagrams'/'state').glob('*.puml')))!=6: errors.append(('State count',))
if len(list((DOCS/'diagrams'/'state').glob('*.svg')))!=6: errors.append(('State rendered diagrams count',))
if (DOCS/'use-cases.md').read_text(encoding='utf-8').count('![Use Case')!=13:
    errors.append(('UC embedded diagrams count',))
for file in (DOCS/'scope.md',DOCS/'srs.md',DOCS/'business-rules.md',DOCS/'api-spec.md',DOCS/'use-cases.md'):
    for phrase in ('checkout 1 Store/lần','chỉ được chọn sản phẩm thuộc một Store','Checkout sản phẩm của một Store'):
        if phrase in file.read_text(encoding='utf-8'): errors.append((file,'old one-store rule',phrase))
print('Files',len(files),'FR',len(fr),'NFR',len(nfr),'US',len(us),'UC',len(ucids),'BR',len(brids),'TC',len(tcids),'API',len(ops))
for err in errors: print('ERROR',err)
if errors: raise SystemExit(1)

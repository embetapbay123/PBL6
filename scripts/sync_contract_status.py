"""Update endpoint index/READMEs from OpenAPI metadata without touching implementation."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
api=json.loads((ROOT/'docs/contracts/openapi.json').read_text(encoding='utf-8'))
records=[]
for path,methods in api['paths'].items():
    for method,op in methods.items():
        records.append(dict(method=method.upper(),path=path,operation_id=op['operationId'],service=op['x-service-owner'],module=op['x-module'],owner=op['x-member-owner'],status=op['x-implementation-status'],roles=op['x-required-roles']))
api['servers']=[{'url':'http://localhost:8080/api/v1','description':'Local scaffold'}]
(ROOT/'docs/contracts/openapi.json').write_text(json.dumps(api,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(ROOT/'docs/contracts/endpoint-status.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
lines=['# Trạng thái endpoint của khung 2.2','', 'OpenAPI mô tả hợp đồng đích. `IMPLEMENTED_SAMPLE` có phạm vi nhỏ để làm mẫu; `MOCK_ONLY` không có AI thật; `NOT_IMPLEMENTED` trả 501 sau kiểm tra quyền. DTO/runtime validation có đủ cho 99 public API; đó không phải nghiệp vụ đã hoàn thành. Chi tiết mẫu updateProduct: chỉ title/description/expected_version; trường hợp lệ ngoài phạm vi mẫu trả 501, input sai trả 422.','', '| API | Operation | Service / module | Owner | Trạng thái |','| --- | --- | --- | --- | --- |']
for r in records: lines.append(f"| `{r['method']} {r['path']}` | {r['operation_id']} | {r['service']} / {r['module']} | {r['owner']} | {r['status']} |")
(ROOT/'docs/implementation/endpoint-status.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
services={'M1':'catalog-service','M2':'commerce-service','M3':'identity-store-service','M4':'ai-service'}
for sid,service in services.items():
    for module in sorted({r['module'] for r in records if r['service']==sid}):
        folder=ROOT/'backend'/service/('app' if sid=='M4' else 'src')/module
        folder.mkdir(exist_ok=True,parents=True)
        rows=[r for r in records if r['service']==sid and r['module']==module]
        text=f"# {sid} / {module}\n\nOwner: {', '.join(sorted({r['owner'] for r in rows}))}\n\n"
        text+='\n'.join(f"- `{r['method']} {r['path']}` — {r['operation_id']}: **{r['status']}**" for r in rows)
        text+='\n\nXem [backlog](../../../../docs/implementation/member-backlog.md). DTO runtime/fixture đã có trong [foundation handoff](../../../../docs/implementation/foundation-handoff.md). Hoàn thiện service/repository, ownership, migration, audit, timeout/recovery và test trước khi đổi trạng thái endpoint.\n'
        (folder/'README.md').write_text(text,encoding='utf-8')
print(f'Synced {len(records)} operations without modifying code')

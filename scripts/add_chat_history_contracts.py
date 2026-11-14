"""Add authenticated, owner-scoped deletion of stored AI chat history."""
import copy
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
source = root / 'docs/contracts/openapi.json'
api = json.loads(source.read_text(encoding='utf-8'))
api['components']['schemas']['ChatHistoryDeleted'] = {
    'type': 'object', 'additionalProperties': False, 'required': ['deleted_count'],
    'properties': {'deleted_count': {'type': 'integer', 'minimum': 0}},
}
template = api['paths']['/me/chat/sessions']['get']
operations = [('deleteOwnChatSession', '/me/chat/sessions/{id}'), ('deleteOwnChatHistory', '/me/chat/sessions')]
index_path = root / 'docs/contracts/endpoint-status.json'
index = json.loads(index_path.read_text(encoding='utf-8'))
for name, path in operations:
    operation = copy.deepcopy(template)
    operation.update(operationId=name, summary='Delete owned AI chat history',
        description='Permanently deletes stored sessions and messages belonging to the authenticated Customer. Does not call a model or reset provider usage budgets.',
        parameters=([{'in': 'path', 'name': 'id', 'required': True, 'schema': {'type': 'string', 'format': 'uuid'}}] if '{id}' in path else []),
        **{'x-implementation-status': 'IMPLEMENTED'})
    operation['responses']['200'] = {'description': 'Owned history removed', 'content': {'application/json': {'schema': {'$ref': '#/components/schemas/ChatHistoryDeleted'}}}}
    api['paths'].setdefault(path, {})['delete'] = operation
    index = [record for record in index if record['operation_id'] != name]
    index.append({'method': 'DELETE', 'path': path, 'operation_id': name, 'service': 'M4', 'module': 'chat', 'owner': 'Công', 'status': 'IMPLEMENTED', 'roles': ['CUSTOMER']})
source.write_text(json.dumps(api, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
index_path.write_text(json.dumps(index, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print('Added 2 owned chat history deletion operations')

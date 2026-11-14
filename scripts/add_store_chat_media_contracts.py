"""Private Store-chat attachment lifecycle. Raw byte transport is separate from JSON metadata."""
import copy
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
path = root / 'docs/contracts/openapi.json'
api = json.loads(path.read_text(encoding='utf-8'))
s = api['components']['schemas']
uuid = {'type': 'string', 'format': 'uuid'}
s['ChatAttachmentCreate'] = {'type': 'object', 'additionalProperties': False,
    'required': ['client_upload_id', 'kind', 'size_bytes', 'sha256'], 'properties': {
        'client_upload_id': uuid, 'kind': {'type': 'string', 'enum': ['IMAGE', 'VIDEO']},
        'size_bytes': {'type': 'integer', 'minimum': 1, 'maximum': 20971520},
        'sha256': {'type': 'string', 'pattern': '^[a-f0-9]{64}$', 'minLength': 64, 'maxLength': 64, 'example': '0'*64}}}
s['ChatAttachment'] = {'type': 'object', 'additionalProperties': False,
    'required': ['id', 'kind', 'status', 'expected_bytes'], 'properties': {
        'id': uuid, 'kind': {'type': 'string', 'enum': ['IMAGE', 'VIDEO']},
        'status': {'type': 'string', 'enum': ['UPLOADING', 'PROCESSING', 'READY', 'REJECTED', 'DELETED', 'EXPIRED']},
        'expected_bytes': {'type': 'integer', 'minimum': 1, 'maximum': 20971520},
        'stored_bytes': {'type': 'integer', 'minimum': 0, 'maximum': 20971520},
        'width': {'type': 'integer', 'minimum': 1, 'maximum': 8192},
        'height': {'type': 'integer', 'minimum': 1, 'maximum': 8192},
        'duration_ms': {'type': 'integer', 'minimum': 1, 'maximum': 30000},
        'content_type': {'type': 'string', 'enum': ['image/webp', 'video/mp4']},
        'expires_at': {'type': 'string', 'format': 'date-time'},
        'error_code': {'type': 'string', 'maxLength': 100}, 'message': {'type': 'string', 'maxLength': 300}}}
s['ChatMediaCapabilities'] = {'type': 'object', 'additionalProperties': False,
    'required': ['enabled', 'images_per_message', 'image_max_bytes', 'video_max_bytes', 'video_max_duration_seconds'],
    'properties': {'enabled': {'type': 'boolean'}, 'images_per_message': {'type': 'integer', 'enum': [3]},
        'image_max_bytes': {'type': 'integer', 'enum': [5242880]}, 'video_max_bytes': {'type': 'integer', 'enum': [20971520]},
        'video_max_duration_seconds': {'type': 'integer', 'enum': [30]}}}

s['StoreMessage']['properties']['attachments'] = {'type': 'array', 'maxItems': 3, 'items': {'$ref': '#/components/schemas/ChatAttachment'}}
send = s['SendStoreMessage']
send['properties']['content']['minLength'] = 0
send['properties']['attachment_ids'] = {'type': 'array', 'maxItems': 3, 'uniqueItems': True, 'items': uuid}
send['description'] = 'Content may be empty only when attachment_ids contains READY uploads owned by this sender in this conversation. At most three images or one video; no mixed kinds. Replays must preserve all content, order and attachment IDs.'

index_path = root / 'docs/contracts/endpoint-status.json'
index = json.loads(index_path.read_text(encoding='utf-8'))
for prefix, word, roles in [('me', 'Own', ['CUSTOMER']), ('store', 'Store', ['STORE_OWNER', 'SELLER'])]:
    template = api['paths']['/me/conversations']['post'] if prefix == 'me' else api['paths']['/store/conversations']['get']
    base = '/' + prefix + '/conversations/{id}/attachments'
    entries = [
        ('get'+word+'ConversationMediaCapabilities', 'get', base+'/capabilities', 'ChatMediaCapabilities'),
        ('create'+word+'ConversationAttachment', 'post', base, 'ChatAttachment'),
        ('upload'+word+'ConversationAttachment', 'put', base+'/{attachment_id}/content', 'ChatAttachment'),
        ('get'+word+'ConversationAttachment', 'get', base+'/{attachment_id}', 'ChatAttachment'),
        ('read'+word+'ConversationAttachment', 'get', base+'/{attachment_id}/content', None),
        ('delete'+word+'ConversationAttachment', 'delete', base+'/{attachment_id}', 'ChatAttachment'),
    ]
    for name, method, route, schema in entries:
        operation = copy.deepcopy(template)
        operation.update(operationId=name, summary=name, description='Authenticated, participant-scoped private chat attachment. Unsent files are owner-only and expire after 24 hours; sent files follow the message lifetime. No arbitrary URL or filename is accepted.',
            **{'x-implementation-status': 'IMPLEMENTED', 'x-required-roles': roles})
        operation['parameters'] = [copy.deepcopy(p) for p in template.get('parameters', []) if p['in'] == 'header'] + [{'name': 'id', 'in': 'path', 'required': True, 'schema': uuid}]
        if '{attachment_id}' in route:
            operation['parameters'].append({'name': 'attachment_id', 'in': 'path', 'required': True, 'schema': uuid})
        operation.pop('requestBody', None)
        if method == 'post':
            operation['requestBody'] = {'required': True, 'content': {'application/json': {'schema': {'$ref': '#/components/schemas/ChatAttachmentCreate'}}}}
        if method == 'put':
            operation['requestBody'] = {'required': True, 'content': {'application/octet-stream': {'schema': {'type': 'string', 'format': 'binary'}}}}
            operation['description'] += ' Upload body is raw bytes, bounded and SHA-256 checked against metadata; never a JSON/base64 payload. A repeated upload cannot replace a finalized file.'
        if name.startswith('read'):
            operation['parameters'] += [{'name': 'Range', 'in': 'header', 'required': False, 'schema': {'type': 'string', 'maxLength': 100}},
                {'name': 'preview', 'in': 'query', 'required': False, 'schema': {'type': 'boolean', 'default': False}}]
        status = '201' if method == 'post' else '200'
        operation['responses'] = {code: value for code, value in operation['responses'].items() if not code.startswith('2')}
        operation['responses'][status] = {'description': 'Private attachment response', 'content': {
            'application/json': {'schema': {'$ref': '#/components/schemas/'+schema}}} if schema else {
                'application/octet-stream': {'schema': {'type': 'string', 'format': 'binary'}}}}
        if schema is None:
            operation['responses']['206'] = copy.deepcopy(operation['responses']['200'])
        api['paths'].setdefault(route, {})[method] = operation
        index = [row for row in index if row['operation_id'] != name]
        index.append({'method': method.upper(), 'path': route, 'operation_id': name, 'service': 'M3', 'module': 'messaging', 'owner': operation['x-member-owner'], 'status': 'IMPLEMENTED', 'roles': roles})

path.write_text(json.dumps(api, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
index_path.write_text(json.dumps(index, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print('Added 12 private chat attachment operations')

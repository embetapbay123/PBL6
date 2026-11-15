"""AI-chat media is customer-owned, independently stored, and asynchronously billed."""
import copy
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
path = root / 'docs/contracts/openapi.json'
api = json.loads(path.read_text(encoding='utf-8'))
s = api['components']['schemas']
uuid = {'type': 'string', 'format': 'uuid'}
s['ChatMessage']['properties']['attachments'] = {'type': 'array', 'maxItems': 3, 'items': {'$ref': '#/components/schemas/ChatAttachment'}}
s['ChatMessage']['properties']['media_analysis'] = {'type': 'string', 'enum': ['IMAGES', 'VIDEO_FRAMES']}
s['AiChatMediaCapabilities'] = copy.deepcopy(s['ChatMediaCapabilities'])
s['AiChatMediaCapabilities']['properties'].update({
    'demo_password_required': {'type': 'boolean'}, 'remaining': {'type': 'integer', 'minimum': 0, 'maximum': 3},
    'limit': {'type': 'integer', 'enum': [3]}, 'provider_label': {'type': 'string', 'enum': ['OpenAI']},
    'retention_days': {'type': 'integer', 'enum': [30]}, 'video_max_frames': {'type': 'integer', 'enum': [8]},
    'audio_supported': {'type': 'boolean', 'enum': [False]},
    'consent_version': {'type': 'string', 'enum': ['chat-media-openai-v1']}, 'message': {'type': 'string', 'maxLength': 300}})
s['AiChatMediaCapabilities']['required'] += ['demo_password_required', 'remaining', 'limit', 'provider_label', 'retention_days', 'video_max_frames', 'audio_supported', 'consent_version']
s['AiChatMediaCapabilities']['properties']['pending_turn'] = {'type': 'object', 'additionalProperties': False,
    'required': ['session_id', 'client_message_id'], 'properties': {'session_id': uuid, 'client_message_id': uuid}}
s['ChatMediaTurnCreate'] = {'type': 'object', 'additionalProperties': False,
    'required': ['client_message_id', 'content', 'attachment_ids', 'consent_version'], 'properties': {
        'client_message_id': uuid, 'content': {'type': 'string', 'minLength': 0, 'maxLength': 2000},
        'attachment_ids': {'type': 'array', 'minItems': 1, 'maxItems': 3, 'uniqueItems': True, 'items': uuid},
        'consent_version': {'type': 'string', 'enum': ['chat-media-openai-v1']}}}
s['ChatMediaTurn'] = {'type': 'object', 'additionalProperties': False,
    'required': ['id', 'client_message_id', 'status'], 'properties': {
        'id': uuid, 'client_message_id': uuid,
        'status': {'type': 'string', 'enum': ['QUEUED', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'UNKNOWN', 'CANCELLED']},
        'assistant': {'$ref': '#/components/schemas/ChatMessage'}, 'error_code': {'type': 'string', 'maxLength': 100},
        'message': {'type': 'string', 'maxLength': 400}}}
index_path = root / 'docs/contracts/endpoint-status.json'
index = json.loads(index_path.read_text(encoding='utf-8'))
template = api['paths']['/chat/sessions/{id}/messages']['post']
base = '/chat/sessions/{id}/attachments'
entries = [
    ('getAiChatMediaCapabilities', 'get', '/chat/media-capabilities', 'AiChatMediaCapabilities', '200'),
    ('createAiChatAttachment', 'post', base, 'ChatAttachment', '201'),
    ('uploadAiChatAttachment', 'put', base+'/{attachment_id}/content', 'ChatAttachment', '200'),
    ('getAiChatAttachment', 'get', base+'/{attachment_id}', 'ChatAttachment', '200'),
    ('readAiChatAttachment', 'get', base+'/{attachment_id}/content', None, '200'),
    ('deleteAiChatAttachment', 'delete', base+'/{attachment_id}', 'ChatAttachment', '200'),
    ('createAiChatMediaTurn', 'post', '/chat/sessions/{id}/media-messages', 'ChatMediaTurn', '202'),
    ('getAiChatMediaTurn', 'get', '/chat/sessions/{id}/media-messages/{client_message_id}', 'ChatMediaTurn', '200'),
]
for name, method, route, response_schema, status in entries:
    op = copy.deepcopy(template)
    op.update(operationId=name, summary=name, description='Customer-only AI-chat media. Private assets belong to one session; no arbitrary URLs. A paid media turn is idempotent and queued under the shared try-on monetary guard. Reading an attempt never calls a provider.',
        **{'x-implementation-status': 'IMPLEMENTED', 'x-required-roles': ['CUSTOMER'], 'x-module': 'chat_media'})
    op['parameters'] = [{'name': key, 'in': 'path', 'required': True, 'schema': uuid} for key in ['id', 'attachment_id', 'client_message_id'] if '{'+key+'}' in route]
    op.pop('requestBody', None)
    if name == 'createAiChatAttachment':
        op['requestBody'] = {'required': True, 'content': {'application/json': {'schema': {'$ref': '#/components/schemas/ChatAttachmentCreate'}}}}
    if name == 'uploadAiChatAttachment':
        op['requestBody'] = {'required': True, 'content': {'application/octet-stream': {'schema': {'type': 'string', 'format': 'binary'}}}}
    if name == 'createAiChatMediaTurn':
        op['parameters'].append({'name': 'X-Try-On-Demo-Password', 'in': 'header', 'required': False, 'schema': {'type': 'string', 'maxLength': 128}})
        op['requestBody'] = {'required': True, 'content': {'application/json': {'schema': {'$ref': '#/components/schemas/ChatMediaTurnCreate'}}}}
    if name == 'readAiChatAttachment':
        op['parameters'] += [{'name': 'Range', 'in': 'header', 'required': False, 'schema': {'type': 'string', 'maxLength': 100}},
            {'name': 'preview', 'in': 'query', 'required': False, 'schema': {'type': 'boolean', 'default': False}}]
    op['responses'] = {code: response for code, response in op['responses'].items() if not code.startswith('2')}
    op['responses'][status] = {'description': 'Private AI-chat media', 'content': {'application/json': {'schema': {'$ref': '#/components/schemas/'+response_schema}}} if response_schema else {'application/octet-stream': {'schema': {'type': 'string', 'format': 'binary'}}}}
    if response_schema is None:
        op['responses']['206'] = copy.deepcopy(op['responses']['200'])
    api['paths'].setdefault(route, {})[method] = op
    index = [r for r in index if r['operation_id'] != name]
    index.append({'method': method.upper(), 'path': route, 'operation_id': name, 'service': 'M4', 'module': 'chat_media', 'owner': op['x-member-owner'], 'status': 'IMPLEMENTED', 'roles': ['CUSTOMER']})
path.write_text(json.dumps(api, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
index_path.write_text(json.dumps(index, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print('Added 8 private AI-chat media operations')

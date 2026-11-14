"""Idempotently add the bounded M4 try-on contract, then use the standard generators."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
file = ROOT / 'docs/contracts/openapi.json'
api = json.loads(file.read_text(encoding='utf-8'))
schemas = api['components']['schemas']
uuid = {'type': 'string', 'format': 'uuid'}
date = {'type': 'string', 'format': 'date-time'}
def obj(props, required=None):
    return {'type': 'object', 'properties': props, 'required': required or list(props), 'additionalProperties': False}
def ref(name): return {'$ref': '#/components/schemas/' + name}
schemas['TryOnCapabilities'] = obj({
    'enabled': {'type': 'boolean'}, 'message': {'type': 'string', 'maxLength': 500},
    'demo_password_required': {'type': 'boolean'},
    'quota': obj({'remaining': {'type': 'integer', 'minimum': 0, 'maximum': 20}, 'limit': {'type': 'integer', 'minimum': 1, 'maximum': 20}, 'reset_at': date}),
    'consent_version': {'type': 'string', 'minLength': 1, 'maxLength': 100},
    'privacy': obj({'provider_label': {'type': 'string', 'enum': ['OpenAI']}, 'retention_hours': {'type': 'integer', 'minimum': 1, 'maximum': 24}}),
}, ['enabled', 'demo_password_required', 'quota', 'consent_version', 'privacy'])
schemas['TryOnJob'] = obj({
    'id': uuid, 'product_id': uuid, 'variant_id': uuid, 'idempotency_key': uuid,
    'status': {'type': 'string', 'enum': ['QUEUED', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'UNKNOWN', 'CANCELLED']},
    'expires_at': date, 'result_url': {'type': 'string', 'maxLength': 2048}, 'message': {'type': 'string', 'maxLength': 500},
}, ['id', 'product_id', 'variant_id', 'idempotency_key', 'status', 'expires_at'])
schemas['TryOnJobList'] = obj({'items': {'type': 'array', 'items': ref('TryOnJob'), 'maxItems': 20}})
schemas['TryOnCreate'] = obj({'photo_id': uuid, 'product_id': uuid, 'variant_id': uuid, 'consent_version': {'type': 'string', 'minLength': 1, 'maxLength': 100}})
schemas['TryOnPhotoUpload'] = obj({'photo': {'type': 'string', 'format': 'binary', 'description': 'One static JPEG/PNG/WebP, max 8 MiB; server decodes and strips metadata.'}})
schemas['TryOnPhoto'] = obj({'id': uuid, 'expires_at': date})
schemas['TryOnImage'] = {'type': 'string', 'format': 'binary'}
selection = [{'in': 'query', 'name': name, 'required': True, 'schema': uuid} for name in ('product_id', 'variant_id')]
identity = [{'in': 'path', 'name': 'id', 'required': True, 'schema': uuid}]
operations = [
    ('get', '/capabilities', 'getTryOnCapabilities', 'TryOnCapabilities', '200', selection, None),
    ('post', '/photos', 'uploadTryOnPhoto', 'TryOnPhoto', '201', [], 'TryOnPhotoUpload'),
    ('post', '/jobs', 'createTryOnJob', 'TryOnJob', '202', [{'in': 'header', 'name': 'Idempotency-Key', 'required': True, 'schema': uuid}], 'TryOnCreate'),
    ('get', '/jobs', 'listTryOnJobs', 'TryOnJobList', '200', selection, None),
    ('get', '/jobs/{id}', 'getTryOnJob', 'TryOnJob', '200', identity, None),
    ('delete', '/jobs/{id}', 'deleteTryOnJob', None, '204', identity, None),
    ('delete', '/photos/{id}', 'deleteTryOnPhoto', None, '204', identity, None),
    ('get', '/results/{id}', 'getTryOnResult', 'TryOnImage', '200', identity + [
        {'in': 'query', 'name': 'expires', 'required': True, 'schema': {'type': 'integer', 'minimum': 1}},
        {'in': 'query', 'name': 'signature', 'required': True, 'schema': {'type': 'string', 'pattern': '^[a-f0-9]{64}$', 'example': 'a' * 64}},
    ], None),
]
index_file = ROOT / 'docs/contracts/endpoint-status.json'
index = [item for item in json.loads(index_file.read_text(encoding='utf-8')) if item.get('module') != 'try_on']
for method, path, operation_id, output, status, params, body in operations:
    path = '/ai/try-on' + path
    signed = operation_id == 'getTryOnResult'
    success = {'description': 'Accepted/status only; no fabricated image or quota.'}
    if output:
        success['content'] = {'image/jpeg' if signed else 'application/json': {'schema': ref(output)}}
    responses = {status: success}
    for code in ['400', '401', '403', '404', '409', '413', '422', '429', '503']:
        responses[code] = {'description': 'Rejected or unavailable; no automatic paid retry.', 'content': {'application/json': {'schema': ref('Error')}}}
    operation = {'operationId': operation_id, 'tags': ['AI'], 'summary': operation_id, 'parameters': params,
                 'responses': responses, 'security': [] if signed else [{'BearerAuth': []}],
                 'x-required-roles': ['GUEST', 'CUSTOMER'] if signed else ['CUSTOMER'],
                 'x-data-scope': 'SHORT_LIVED_SIGNED_RESULT' if signed else 'OWN_USER', 'x-service-owner': 'M4',
                 'x-module': 'try_on', 'x-member-owner': 'Công', 'x-implementation-status': 'IMPLEMENTED',
                 'description': 'Signed result expires within five minutes and is revoked by deletion.' if signed else 'Verified Customer only. Quota, budget and idempotency are enforced by M4 PostgreSQL.'}
    if operation_id in ('uploadTryOnPhoto', 'createTryOnJob'):
        operation['parameters'] = [*params, {'in': 'header', 'name': 'X-Try-On-Demo-Password', 'required': False,
            'schema': {'type': 'string', 'maxLength': 128, 'writeOnly': True},
            'description': 'Required when capabilities.demo_password_required is true. Never persisted or included in job payloads.'}]
    if body:
        operation['requestBody'] = {'required': True, 'content': {'multipart/form-data' if operation_id == 'uploadTryOnPhoto' else 'application/json': {'schema': ref(body)}}}
    api['paths'].setdefault(path, {})[method] = operation
    index.append({'method': method.upper(), 'path': path, 'operation_id': operation_id, 'service': 'M4', 'module': 'try_on', 'owner': 'Công', 'status': 'IMPLEMENTED', 'roles': operation['x-required-roles']})
file.write_text(json.dumps(api, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
index_file.write_text(json.dumps(index, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print('Added 8 M4 try-on operations')

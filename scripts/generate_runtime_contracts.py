"""Generate DTOs, operation types and fixtures without touching member implementations.

Run normally to update generated files, or --check to fail on drift. No dependencies.
"""
from pathlib import Path
import argparse
import copy
import json
import re

ROOT = Path(__file__).resolve().parents[1]
CONTRACTS = ROOT / 'docs/contracts'
PARTS = ('body', 'path', 'query', 'headers')
UUID = '11111111-1111-4111-8111-111111111111'
DATE = '2026-10-02T00:00:00Z'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    documents = {n: json.loads((CONTRACTS / f'{n}.json').read_text(encoding='utf-8'))
                 for n in ['openapi', 'internal-api']}

    def deref(schema, doc):
        if '$ref' in schema:
            file, pointer = schema['$ref'].split('#')
            source = documents['openapi' if file == './openapi.json' else doc]
            value = source
            for part in pointer.strip('/').split('/'):
                value = value[part]
            return deref(value, 'openapi' if file == './openapi.json' else doc)
        return {key: deref(value, doc) if isinstance(value, dict) else
                [deref(x, doc) if isinstance(x, dict) else x for x in value] if isinstance(value, list) else value
                for key, value in schema.items()}

    records = {}
    for doc, api in documents.items():
        for path, methods in api['paths'].items():
            for method, operation in methods.items():
                if 'operationId' not in operation:
                    continue
                name = operation['operationId']
                body = operation.get('requestBody', {}).get('content', {}).get('application/json', {}).get('schema')
                record = dict(method=method.upper(), route=path, internal=doc == 'internal-api',
                              service=operation['x-service-owner'], status=operation['x-implementation-status'],
                              body_required=operation.get('requestBody', {}).get('required', False),
                              body=deref(body, doc) if body else None,
                              callers=operation.get('x-allowed-callers', []))
                for location, part in [('path', 'path'), ('query', 'query'), ('header', 'headers')]:
                    params = [p for p in operation.get('parameters', []) if p['in'] == location]
                    record[part] = {'type': 'object', 'properties': {
                        p['name'].lower() if location == 'header' else p['name']: deref(p['schema'], doc) for p in params},
                        'required': [p['name'].lower() if location == 'header' else p['name'] for p in params if p.get('required')],
                        'additionalProperties': location == 'header'}
                successes = {code: deref(response.get('content', {}).get('application/json', {}).get('schema', {}), doc)
                             for code, response in operation['responses'].items() if code.startswith('2')}
                record['responses'] = successes
                records[name] = record
    events = json.loads((CONTRACTS / 'events.json').read_text(encoding='utf-8'))

    supported = {'type','properties','required','additionalProperties','items','enum','nullable',
                 'minimum','maximum','minLength','maxLength','minItems','maxItems','uniqueItems',
                 'minProperties','maxProperties','pattern','format','default','description','title',
                 'example','examples','deprecated','readOnly','writeOnly','x-key-format'}
    def check_schema(schema):
        unknown = set(schema) - supported
        if unknown:
            raise SystemExit('Runtime validator needs support for schema keyword: ' + ', '.join(sorted(unknown)))
        for child in schema.get('properties', {}).values(): check_schema(child)
        if isinstance(schema.get('items'), dict): check_schema(schema['items'])
        if isinstance(schema.get('additionalProperties'), dict): check_schema(schema['additionalProperties'])
    for record in records.values():
        for schema in [record[p] for p in PARTS] + list(record['responses'].values()):
            if schema: check_schema(schema)
    for event in events['events'].values(): check_schema(event['schema'])

    def fixture(schema, key=''):
        if 'default' in schema:
            return schema['default']
        if 'enum' in schema:
            return schema['enum'][0]
        kind = schema.get('type')
        if kind == 'object':
            props = schema.get('properties', {})
            result = {name: fixture(value, name) for name, value in props.items()}
            # Provider signatures/token are deliberately inert fixture placeholders.
            return result
        if kind == 'array':
            return [fixture(schema['items']) for _ in range(schema.get('minItems', 0))]
        if kind in ['integer', 'number']:
            return max(schema.get('minimum', 0), 1 if key in ['page', 'size', 'quantity'] else 0)
        if kind == 'boolean':
            return False
        if kind == 'string':
            fmt = schema.get('format')
            value = UUID if fmt == 'uuid' else DATE if fmt == 'date-time' else 'fixture@example.invalid' if fmt == 'email' else 'https://example.invalid/fixture' if fmt == 'uri' else 'fixture-value'
            if 'token' in key:
                value = 'fixture-token-not-valid-for-authentication-' + 'x' * 32
            if 'signature' in key.lower():
                value = 'fixture-signature-not-valid'
            value += 'x' * max(0, schema.get('minLength', 0) - len(value))
            return value[:schema.get('maxLength', len(value))]
        return {}

    fixtures = {}
    for name, record in records.items():
        status = next(iter(record['responses']))
        request = {part: fixture(record[part]) if record[part] else None for part in PARTS}
        # Optional transport headers are omitted so their values can be supplied by clients.
        request['headers'] = {k: v for k, v in request['headers'].items() if k in record['headers']['required']}
        response = fixture(record['responses'][status])
        # Never represent a completed monetary transaction or provider ACK in a fixture.
        if isinstance(response, dict):
            if name in ['getPayment', 'createPaymentAttempt', 'collectCod', 'getOrderRefund']:
                if 'status' in response:
                    response['status'] = 'REQUESTED' if name == 'getOrderRefund' else 'PENDING'
            if name in ['sepayCallback', 'sandboxCallback'] and 'success' in response:
                response['success'] = False
        fixtures[name] = dict(mode='fixture', request=request, response=response, status=int(status))
    event_fixtures = {name: fixture(record['schema']) for name, record in events['events'].items()}
    bundle = dict(version='2.2.1', operations=records, events=events['events'])

    def typename(schema):
        if not schema:
            return 'undefined'
        if '$ref' in schema:
            raise AssertionError('unresolved schema')
        kind = schema.get('type')
        if 'enum' in schema:
            result = ' | '.join(json.dumps(v) for v in schema['enum'])
        elif kind == 'object':
            fields = [f'{json.dumps(k)}{"" if k in schema.get("required", []) else "?"}: {typename(v)}'
                      for k, v in schema.get('properties', {}).items()]
            result = '{' + '; '.join(fields) + '}'
            if schema.get('additionalProperties'):
                extra = schema['additionalProperties']
                result += ' & Record<string, ' + (typename(extra) if isinstance(extra, dict) else 'unknown') + '>'
        elif kind == 'array':
            result = f'Array<{typename(schema["items"])}>'
        elif kind in ['integer', 'number']:
            result = 'number'
        elif kind in ['string', 'boolean']:
            result = kind
        else:
            result = 'unknown'
        return result + (' | null' if schema.get('nullable') else '')

    types = ['// GENERATED by generate_runtime_contracts.py; edit OpenAPI instead.',
             'export interface OperationInputs {']
    outputs = ['export interface OperationOutputs {']
    dtos = ["// GENERATED; change source contracts, not this file.",
            "import { ValidateBy } from 'class-validator';",
            "import { Transform } from 'class-transformer';",
            "import { valueMatches, normalizeParameters } from './contract-validation';"]
    registry = []
    for name, record in records.items():
        types.append(f'  {name}: {{' + '; '.join(f'{part}{"?" if part == "body" and not record["body_required"] else ""}: {typename(record[part])}' for part in PARTS) + '};')
        outputs.append(f'  {name}: ' + ' | '.join(typename(s) for s in record['responses'].values()) + ';')
        classes = []
        for part in PARTS:
            schema = record[part]
            if schema is None:
                classes.append('undefined')
                continue
            cls = name[0].upper() + name[1:] + part.capitalize() + 'Dto'
            classes.append(cls)
            dtos.append(f'export class {cls} {{')
            for field, spec in schema.get('properties', {}).items():
                required = field in schema.get('required', [])
                if part != 'body':
                    dtos.append(f"  @Transform(({{value}})=>normalizeParameters({{value}},{{properties:{{value:{json.dumps(spec, ensure_ascii=False)}}}}}).value)")
                dtos.append(f"  @ValidateBy({{name:'contract', validator:{{validate:v=>valueMatches(v,{json.dumps(spec, ensure_ascii=False)},{str(required).lower()}),defaultMessage:()=> 'Invalid contract field'}}}})")
                if part != 'body' and 'default' in spec:
                    dtos.append(f'  {json.dumps(field)}: {typename(spec)} = {json.dumps(spec["default"])};')
                else:
                    dtos.append(f'  {json.dumps(field)}{ "!" if required else "?"}: {typename(spec)};')
            dtos.append('}')
        registry.append(f'  {name}: {{' + ', '.join(f'{p}: {c}' for p, c in zip(PARTS, classes)) + '},')
    types += ['}', *outputs, '}', 'export type OperationId = keyof OperationInputs;']
    types += ['export interface EventContracts {', *[f'  {name}: {typename(record["schema"])};' for name, record in events['events'].items()], '}', 'export type EventEnvelope = EventContracts[keyof EventContracts];']
    dtos += ['export const runtimeDtos = {', *registry, '};']

    outputs_map = {
        'backend/shared/src/contracts.runtime.generated.json': json.dumps(bundle, ensure_ascii=False, indent=2) + '\n',
        'backend/shared/src/dtos.generated.ts': '\n'.join(dtos) + '\n',
        'backend/shared/src/operations.generated.ts': '\n'.join(types) + '\n',
        'frontend/src/api/operations.generated.ts': '\n'.join(types) + '\n',
        'frontend/src/api/operations.registry.generated.json': json.dumps({k: {'method': v['method'], 'path': v['route'], 'internal': v['internal']} for k, v in records.items()}, indent=2) + '\n',
        'frontend/src/api/fixtures.generated.json': json.dumps({k: v for k, v in fixtures.items() if not records[k]['internal']}, ensure_ascii=False, indent=2) + '\n',
        'backend/ai-service/app/contracts.generated.json': json.dumps(bundle, ensure_ascii=False, indent=2) + '\n',
        'backend/shared/src/fixtures.generated.json': json.dumps(fixtures, ensure_ascii=False, indent=2) + '\n',
        'backend/shared/src/event-fixtures.generated.json': json.dumps(event_fixtures, ensure_ascii=False, indent=2) + '\n',
        'backend/ai-service/app/fixtures.generated.json': json.dumps(fixtures, ensure_ascii=False, indent=2) + '\n',
        'docs/contracts/fixtures.generated.json': json.dumps(fixtures, ensure_ascii=False, indent=2) + '\n',
        'docs/contracts/event-fixtures.generated.json': json.dumps(event_fixtures, ensure_ascii=False, indent=2) + '\n',
        'mobile/assets/contracts/fixtures.generated.json': json.dumps({k: v for k, v in fixtures.items() if not records[k]['internal']}, ensure_ascii=False, indent=2) + '\n',
    }
    drift = []
    for path, text in outputs_map.items():
        file = ROOT / path
        if args.check:
            if not file.exists() or file.read_text(encoding='utf-8') != text:
                drift.append(path)
        else:
            file.parent.mkdir(parents=True, exist_ok=True)
            file.write_text(text, encoding='utf-8')
    if drift:
        raise SystemExit('Generated contract drift: ' + ', '.join(drift))
    print(f'{"Checked" if args.check else "Generated"} 99 public + 11 internal DTOs/types/fixtures, 7 events')


if __name__ == '__main__':
    main()

"""Strict Pydantic DTOs from the same generated registry as NestJS.

Only query/path/header scalars are converted. Body values are never coerced.
"""
import json
import math
import re
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.parse import urlparse
from pydantic import BaseModel, ConfigDict, create_model, model_validator

BUNDLE = json.loads(Path(__file__).with_name('contracts.generated.json').read_text(encoding='utf-8'))
OPERATIONS = BUNDLE['operations']
UUID = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', re.I)
MISSING = object()


def schema_errors(value, schema, field='$', required=True):
    errors = []
    def fail(reason): errors.append({'field': field, 'reason': reason})
    if value is MISSING:
        if required: fail('required')
        return errors
    if value is None:
        if not schema.get('nullable'): fail('null is not allowed')
        return errors
    if 'enum' in schema and value not in schema['enum']: fail('invalid enum value')
    kind = schema.get('type')
    if kind == 'object':
        if not isinstance(value, dict):
            fail('expected object')
            return errors
        props = schema.get('properties', {})
        for key, spec in props.items():
            errors.extend(schema_errors(value.get(key, MISSING), spec, field+'.'+key, key in schema.get('required', [])))
        for key in value.keys() - props.keys():
            if schema.get('x-key-format') == 'uuid' and not UUID.fullmatch(key): fail('map key must be UUID')
            extra = schema.get('additionalProperties', False)
            if extra is False: fail('unknown field: '+key)
            elif isinstance(extra, dict): errors.extend(schema_errors(value[key], extra, field+'.'+key))
        if len(value) < schema.get('minProperties', 0): fail('too few properties')
        if len(value) > schema.get('maxProperties', math.inf): fail('too many properties')
    elif kind == 'array':
        if not isinstance(value, list):
            fail('expected array')
            return errors
        if len(value) < schema.get('minItems', 0): fail('too few items')
        if len(value) > schema.get('maxItems', math.inf): fail('too many items')
        if schema.get('uniqueItems') and len({json.dumps(x, sort_keys=True) for x in value}) != len(value): fail('duplicate items')
        for index, child in enumerate(value): errors.extend(schema_errors(child, schema.get('items', {}), f'{field}[{index}]'))
    elif kind in ['integer', 'number']:
        if type(value) not in [int, float] or not math.isfinite(value) or (kind == 'integer' and (int(value) != value or abs(value) > 9007199254740991)):
            fail('expected safe numeric value')
        elif value < schema.get('minimum', -math.inf) or value > schema.get('maximum', math.inf): fail('numeric limit')
    elif kind == 'boolean' and type(value) is not bool: fail('expected boolean')
    elif kind == 'string':
        if not isinstance(value, str):
            fail('expected string')
            return errors
        if len(value) < schema.get('minLength', 0) or len(value) > schema.get('maxLength', math.inf): fail('string length')
        if schema.get('pattern') and not re.search(schema['pattern'], value): fail('invalid pattern')
        fmt = schema.get('format')
        if fmt == 'uuid' and not UUID.fullmatch(value): fail('invalid UUID')
        if fmt == 'email' and not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', value): fail('invalid email')
        if fmt == 'uri' and not urlparse(value).scheme: fail('invalid URI')
        if fmt == 'date-time':
            try:
                if not re.fullmatch(r'\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)', value): raise ValueError()
                datetime.fromisoformat(value.replace('Z', '+00:00'))
            except ValueError: fail('invalid datetime')
    return errors


def dto_type(name, schema):
    # Pydantic validates the complete shape before parsing; omitted fields stay omitted.
    @model_validator(mode='before')
    @classmethod
    def validate_shape(cls, value):
        errors = schema_errors(value, schema)
        if errors: raise ValueError(json.dumps(errors))
        return value
    fields = {k: (Any, ... if k in schema.get('required', []) else None) for k in schema.get('properties', {})}
    return create_model(name, __config__=ConfigDict(extra='allow', strict=True),
                        __validators__={'validate_shape': validate_shape}, **fields)


DTO_REGISTRY = {name: {part: dto_type(name+part.title()+'Dto', record[part]) if record[part] else None
                      for part in ['body', 'path', 'query', 'headers']}
                for name, record in OPERATIONS.items()}
RESPONSE_REGISTRY = {name: {code:dto_type(name+'Response'+code+'Dto',schema) for code,schema in record['responses'].items()}
                     for name,record in OPERATIONS.items()}


def validate_operation(name, body=MISSING, path=None, query=None, headers=None):
    record = OPERATIONS[name]
    inputs = {'body': body, 'path': path or {}, 'query': query or {}, 'headers': headers or {}}
    result = {}
    for part, value in inputs.items():
        schema = record[part]
        if not schema:
            if value not in [MISSING, None, {}]: raise ValueError('API does not accept body')
            continue
        if part != 'body':
            value = dict(value)
            for key, spec in schema.get('properties', {}).items():
                if key not in value and 'default' in spec: value[key] = spec['default']
                raw = value.get(key)
                if isinstance(raw, str) and spec.get('type') == 'integer' and re.fullmatch(r'-?\d+', raw): value[key] = int(raw)
                if isinstance(raw, str) and spec.get('type') == 'boolean' and raw in ['true', 'false']: value[key] = raw == 'true'
        required = part != 'body' or record['body_required']
        if value is MISSING and not required:
            continue
        errors = schema_errors(value, schema, part, required)
        if errors: raise ValueError(json.dumps(errors))
        DTO_REGISTRY[name][part].model_validate(value)
        result[part] = value
    return result

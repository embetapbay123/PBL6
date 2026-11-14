"""Owner-scoped voucher optimization and manual code resolution."""
import copy
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
path = root / 'docs/contracts/openapi.json'
api = json.loads(path.read_text(encoding='utf-8'))
schemas = api['components']['schemas']
variants = []
for original in ('CartCheckoutRequest', 'BuyNowCheckoutRequest'):
    schema = copy.deepcopy(schemas[original])
    schema['required'] = [key for key in schema['required'] if key not in ('address_id', 'payment_methods')] + ['mode']
    schema['properties']['mode'] = {'type': 'string', 'enum': ['AUTO', 'MANUAL']}
    schema['properties']['code'] = {'type': 'string', 'minLength': 1, 'maxLength': 200,
        'description': 'MANUAL only: resolve a code in its actual scope and replace that scope in the supplied selection.'}
    name = original.replace('CheckoutRequest', 'VoucherSuggestionRequest')
    schemas[name] = schema
    variants.append({'$ref': '#/components/schemas/' + name})
schemas['VoucherSuggestionRequest'] = {'oneOf': variants}
schemas['VoucherSelection'] = {'type': 'object', 'additionalProperties': False,
    'properties': {key: copy.deepcopy(schemas['CartCheckoutRequest']['properties'][key])
        for key in ('store_vouchers', 'platform_voucher_code')}}
schemas['VoucherSuggestion'] = {'type': 'object', 'additionalProperties': False,
    'required': ['selected', 'goods_total_vnd', 'discount_total_vnd', 'net_goods_total_vnd', 'optimality'],
    'properties': {'selected': {'$ref': '#/components/schemas/VoucherSelection'},
        **{key: {'type': 'integer', 'format': 'int64', 'minimum': 0, 'maximum': 9007199254740991}
           for key in ('goods_total_vnd', 'discount_total_vnd', 'net_goods_total_vnd')},
        'optimality': {'type': 'string', 'enum': ['OPTIMAL', 'LIMITED', 'MANUAL']},
        'quote': {'$ref': '#/components/schemas/CheckoutQuote'}}}
operation = copy.deepcopy(api['paths']['/checkout/quotes']['post'])
operation.update(operationId='suggestCheckoutVouchers', summary='Suggest or validate vouchers for selected checkout items',
    description='Uses current owned CART or BUY_NOW items and server-side quota-eligible candidates. AUTO minimizes goods payable (shipping is independent of vouchers). LIMITED never asserts optimality. MANUAL resolves codes regardless of list pagination and validates the whole selection. No voucher reservation is created. Address and payment methods must be supplied together to include a canonical checkout quote; otherwise totals exclude shipping.',
    **{'x-implementation-status': 'IMPLEMENTED'})
operation['requestBody'] = {'required': True, 'content': {'application/json': {'schema': {'$ref': '#/components/schemas/VoucherSuggestionRequest'}}}}
operation['responses']['200'] = {'description': 'Current suggestion or validated manual selection',
    'content': {'application/json': {'schema': {'$ref': '#/components/schemas/VoucherSuggestion'}}}}
api['paths']['/checkout/voucher-suggestions'] = {'post': operation}
path.write_text(json.dumps(api, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
index_path = root / 'docs/contracts/endpoint-status.json'
index = json.loads(index_path.read_text(encoding='utf-8'))
index = [row for row in index if row['operation_id'] != 'suggestCheckoutVouchers']
index.append({'method': 'POST', 'path': '/checkout/voucher-suggestions', 'operation_id': 'suggestCheckoutVouchers',
    'service': 'M2', 'module': 'order', 'owner': 'Hoa', 'status': 'IMPLEMENTED', 'roles': ['CUSTOMER']})
index_path.write_text(json.dumps(index, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print('Added voucher suggestion operation')

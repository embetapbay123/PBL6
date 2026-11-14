"""Add owner-scoped, normalized search to Customer conversation and AI history lists."""
import json
from pathlib import Path

path = Path(__file__).resolve().parents[1] / 'docs/contracts/openapi.json'
api = json.loads(path.read_text(encoding='utf-8'))
descriptions = {
    '/me/conversations': 'Search Store name or stored message content, within owned conversations, before pagination. Vietnamese accents are folded; LIKE metacharacters are literal.',
    '/me/chat/sessions': 'Search stored message content within owned, retained AI sessions before pagination. Does not call a model. Ignored when session_id selects a specific owned history.',
}
for route, description in descriptions.items():
    operation = api['paths'][route]['get']
    operation['parameters'] = [p for p in operation['parameters'] if p['name'] != 'q']
    operation['parameters'].append({'name': 'q', 'in': 'query', 'required': False,
        'schema': {'type': 'string', 'maxLength': 200}, 'description': description})
for parameter in api['paths']['/store/conversations']['get']['parameters']:
    if parameter['name'] == 'q':
        parameter['description'] = 'Search customer name/email or stored message content within the current Store, before pagination. Vietnamese accents are folded; LIKE metacharacters are literal.'
api['components']['schemas']['ChatSession']['properties']['title'] = {
    'type': 'string', 'maxLength': 140,
    'description': 'Stored first Customer message excerpt, redacted, for history list display. No model generation.'}
path.write_text(json.dumps(api, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print('Updated chat search contracts')

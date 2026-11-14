"""Apply a private, whitelisted runtime bundle. Never print credentials or accept them on the command line."""
import argparse
import json
import re
from pathlib import Path

NAMES = {'OPENAI_API_KEY', 'TRY_ON_ENABLED', 'TRY_ON_DEMO_MODE', 'TRY_ON_DEMO_PASSWORD_HASH',
         'TRY_ON_DAILY_BUDGET_MICRO_USD', 'TRY_ON_MONTHLY_BUDGET_MICRO_USD'}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', default='.')
    parser.add_argument('--secrets-file')
    parser.add_argument('--disable', action='store_true')
    args = parser.parse_args()
    if args.disable:
        updates = {'TRY_ON_ENABLED': '0'}
    else:
        bundle = Path(args.secrets_file)
        bundle.chmod(0o600)
        updates = json.loads(bundle.read_text())
        if set(updates) != NAMES or updates['TRY_ON_ENABLED'] != '1' or updates['TRY_ON_DEMO_MODE'] != '1':
            raise ValueError('Expected the complete password-protected demo configuration.')
        if not updates['OPENAI_API_KEY'].startswith('sk-') or not re.fullmatch(r'pbkdf2_sha256\$600000\$[a-f0-9]{32}\$[a-f0-9]{64}', updates['TRY_ON_DEMO_PASSWORD_HASH']):
            raise ValueError('Invalid private runtime credential format.')
        if int(updates['TRY_ON_DAILY_BUDGET_MICRO_USD']) != 1000000 or int(updates['TRY_ON_MONTHLY_BUDGET_MICRO_USD']) != 10000000:
            raise ValueError('Keep the approved $1/day and $10/month budgets.')
    target = Path(args.root) / 'infrastructure/.env'
    lines, seen, output = target.read_text().splitlines(), set(), []
    for value in updates.values():
        if any(character in value for character in "\r\n'"):
            raise ValueError('Unsupported private runtime value encoding.')
    for line in lines:
        name = line.split('=', 1)[0]
        if name in updates:
            output.append(name + "='" + updates[name] + "'"); seen.add(name)
        else:
            output.append(line)
    output.extend(name + "='" + value + "'" for name, value in updates.items() if name not in seen)
    target.write_text('\n'.join(output) + '\n')
    target.chmod(0o600)
    print('Private demo runtime updated; no credential values printed.')


if __name__ == '__main__':
    main()

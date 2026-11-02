"""Check candidate text for local secret values without printing those values."""
import argparse
import json
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--staged', action='store_true')
    parser.add_argument('--report', type=Path, required=True)
    args = parser.parse_args()
    env_file = ROOT / 'infrastructure/.env'
    values = []
    if env_file.exists():
        for line in env_file.read_text(encoding='utf-8').splitlines():
            if '=' not in line or line.lstrip().startswith('#'):
                continue
            key, value = line.split('=', 1)
            value = value.strip().strip('"\'')
            if re.search(r'PASSWORD|(?:^|_)(?:SECRET|TOKEN|API_KEY|INTERNAL_KEY)$', key) and len(value) >= 8:
                values.append(value)
    command = ['git', 'diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z'] if args.staged else ['git', 'ls-files', '-c', '-o', '--exclude-standard', '-z']
    files = sorted(set(subprocess.check_output(command, cwd=ROOT).decode().split('\0')) - {''})
    hits = []
    count = 0
    for name in files:
        if args.staged:
            raw = subprocess.check_output(['git', 'show', ':' + name], cwd=ROOT)
        else:
            file = ROOT / name
            if not file.is_file():
                continue
            raw = file.read_bytes()
        try:
            text = raw.decode('utf-8')
        except UnicodeDecodeError:
            continue
        count += 1
        if any(value in text for value in values):
            hits.append({'file': name, 'kind': 'local_environment_secret'})
        if re.search(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----\s+[A-Za-z0-9+/=\s]{80,}', text):
            hits.append({'file': name, 'kind': 'private_key_material'})
    report = {'status': 'FAIL' if hits else 'PASS', 'staged': args.staged, 'text_files_checked': count, 'secrets_checked_only_in_memory': len(set(values)), 'matches': hits, 'secret_values_not_recorded': True, 'limits': 'Exact local secret values and private-key material; not a general vulnerability or all historical Git audit.'}
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'status': report['status'], 'text_files_checked': count, 'matches': hits}))
    raise SystemExit(bool(hits))


if __name__ == '__main__':
    main()

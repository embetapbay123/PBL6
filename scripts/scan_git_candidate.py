"""Check candidate text for local secret values without printing those values."""
import argparse
import io
import json
from pathlib import Path
import re
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[1]

TOKEN_PATTERNS = {
    'openai_api_key': r'\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{24,}',
    'github_token': r'\b(?:gh[pousr]_[A-Za-z0-9]{25,}|github_pat_[A-Za-z0-9_]{35,})',
    'aws_access_key': r'\b(?:AKIA|ASIA)[A-Z0-9]{16}\b',
    'slack_token': r'\bxox[baprs]-[A-Za-z0-9-]{20,}',
    'jwt': r'\beyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}',
    'private_key_material': r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----\s+[A-Za-z0-9+/=\s]{80,}',
}


def inspect_text(text, values=()):
    kinds = [kind for kind, pattern in TOKEN_PATTERNS.items() if re.search(pattern, text)]
    if any(value in text for value in values):
        kinds.append('local_environment_secret')
    return kinds


def text_parts(name, raw):
    if Path(name).suffix.lower() in ('.docx', '.xlsx', '.pptx'):
        with zipfile.ZipFile(io.BytesIO(raw)) as archive:
            total = 0
            for item in archive.infolist():
                if not item.filename.endswith(('.xml', '.rels', '.json', '.txt')):
                    continue
                total += item.file_size
                if total > 30_000_000 or item.file_size > 10_000_000:
                    raise ValueError('Archive text exceeds safe inspection size')
                yield name + '!' + item.filename, archive.read(item).decode('utf-8', errors='replace')
    else:
        try:
            yield name, raw.decode('utf-8')
        except UnicodeDecodeError:
            return


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
        if Path(name).name == '.env' or (Path(name).name.startswith('.env.') and not name.endswith('.env.example')):
            hits.append({'file': name, 'kind': 'private_environment_file'})
        try:
            for part_name, text in text_parts(name, raw):
                count += 1
                hits.extend({'file': part_name, 'kind': kind} for kind in inspect_text(text, values))
        except (ValueError, zipfile.BadZipFile):
            hits.append({'file': name, 'kind': 'uninspectable_document_archive'})
    report = {'status': 'FAIL' if hits else 'PASS', 'staged': args.staged, 'text_files_checked': count, 'secrets_checked_only_in_memory': len(set(values)), 'matches': hits, 'secret_values_not_recorded': True, 'limits': 'Known token patterns, exact local secrets and Office XML; not proof of absence of every secret, screenshot OCR, a vulnerability audit or a full historical Git audit.'}
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'status': report['status'], 'text_files_checked': count, 'matches': hits}))
    raise SystemExit(bool(hits))


if __name__ == '__main__':
    main()

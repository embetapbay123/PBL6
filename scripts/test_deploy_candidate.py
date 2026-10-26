"""Resolve the actual Compose merge without a daemon or real credentials.

Protects the worktree/runtime split: no build from the old checkout, no alternate
project/volumes, all publishers present, and secrets bind only from the runtime.
"""
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch
import deploy_candidate
from deploy_candidate import ROOT, NODE, AI, APPS, compose, override


class CandidateConfiguration(unittest.TestCase):
    def test_real_compose_merge_preserves_runtime_data_and_candidate_code(self):
        with tempfile.TemporaryDirectory() as directory:
            runtime = Path(directory)
            infra = runtime / 'infrastructure'
            infra.mkdir()
            (infra / '.env').write_text((ROOT / 'infrastructure/.env.example').read_text(encoding='utf-8'), encoding='utf-8')
            overlay = runtime / 'candidate.json'
            revision = '1' * 40
            overlay.write_text(json.dumps(override(ROOT, revision)), encoding='utf-8')
            result = subprocess.run(compose(runtime, overlay) + ['--profile', 'tools', 'config', '--format', 'json'],
                                    capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, 'Compose configuration must resolve')
            config = json.loads(result.stdout)
            self.assertEqual(config['name'], 'pbl6')
            self.assertEqual(config['volumes']['pgdata']['name'], 'pbl6_pgdata')
            for name in APPS + ('tools',):
                service = config['services'][name]
                self.assertEqual(Path(service['build']['context']), ROOT)
                self.assertEqual(service['build']['labels']['org.opencontainers.image.revision'], revision)
                family = 'node' if name in NODE else 'ai' if name in AI else 'web'
                self.assertEqual(service['image'], f'pbl6-{family}:{revision}')
            for name in ('worker-m1', 'worker-m2', 'worker-m3'):
                service = config['services'][name]
                identity = name[-2:].upper()
                self.assertEqual(service['environment']['SERVICE_ID'], identity)
                self.assertIn(identity + '_DATABASE_URL', service['environment'])
                self.assertEqual(service['command'], ['node', 'dist/shared/src/worker.js'])
            key_mounts = config['services']['m3']['volumes']
            self.assertEqual(len(key_mounts), 2)
            for mount in key_mounts:
                self.assertTrue(Path(mount['source']).is_relative_to(infra / 'secrets'))
                self.assertTrue(mount['read_only'])
            gateway = config['services']['gateway']
            mounts = [v for v in gateway['volumes'] if v['target'] == '/etc/caddy/Caddyfile']
            self.assertEqual(len(mounts), 1)
            self.assertEqual(Path(mounts[0]['source']), ROOT / 'infrastructure/Caddyfile')
            self.assertEqual(config['services']['postgres']['volumes'][0]['source'], 'pgdata')

    def failure_run(self, fail_build):
        with tempfile.TemporaryDirectory() as directory:
            runtime = Path(directory)
            for name in ('infrastructure/.env', 'infrastructure/secrets/jwt-public.pem',
                         'infrastructure/secrets/jwt-private.pem'):
                file = runtime / name
                file.parent.mkdir(parents=True, exist_ok=True)
                file.write_text('test-only', encoding='utf-8')
            calls = []
            revision = '2' * 40

            def capture(argv, **kwargs):
                if argv[:3] == ['git', 'rev-parse', 'HEAD']:
                    return revision
                if argv[:2] == ['git', 'status']:
                    return ''
                if 'ps' in argv:
                    return 'test-dependency'
                if argv[:3] == ['docker', 'image', 'inspect']:
                    return json.dumps([{'Config': {'Labels': {'org.opencontainers.image.revision': revision}}}])
                if argv[:2] == ['docker', 'inspect']:
                    return json.dumps([{'State': {'Running': True, 'Health': {'Status': 'healthy'}}}])
                self.fail('Unexpected read command')

            def execute(argv, **kwargs):
                calls.append(argv)
                failed = ('build' in argv) if fail_build else any(str(a).endswith('database_backup.py') for a in argv)
                return subprocess.CompletedProcess(argv, 1 if failed else 0)

            with patch.object(deploy_candidate, 'ROOT', runtime), patch('sys.argv',
                    ['deploy_candidate.py', '--runtime-root', str(runtime), '--apply']), \
                    patch.object(subprocess, 'check_output', side_effect=capture), \
                    patch.object(subprocess, 'run', side_effect=execute):
                with self.assertRaises(SystemExit):
                    deploy_candidate.main()
            report = json.loads(next((runtime / 'artifacts/deployments').glob('*/report.json')).read_text())
            self.assertEqual(report['status'], 'FAIL')
            self.assertFalse(any('dist/shared/src/migrate.js' in c or 'up' in c for c in calls))
            return calls

    def test_build_failure_does_not_interrupt_the_running_demo(self):
        calls = self.failure_run(fail_build=True)
        self.assertFalse(any('stop' in c for c in calls))

    def test_backup_failure_keeps_ingress_closed_without_migration_or_restart(self):
        calls = self.failure_run(fail_build=False)
        self.assertIn('stop', calls[-1])
        self.assertEqual(calls[-1][-1], 'gateway')
        self.assertTrue(any('stop' in c and 'worker-m3' in c for c in calls))


if __name__ == '__main__':
    unittest.main()

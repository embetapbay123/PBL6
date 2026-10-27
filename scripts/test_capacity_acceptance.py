"""Check capacity disposal/provider boundaries without contacting Docker or credentials."""
import copy
from pathlib import Path
import unittest
from run_cross_service_acceptance import make_config
from run_capacity_acceptance import validate_capacity


class CapacityIsolation(unittest.TestCase):
    def setUp(self):
        self.project = 'pbl6-acceptance-012345abcdef'
        self.config = make_config(self.project, Path.cwd() / 'unused-test-path')
        self.config['services']['load'] = {'image': 'grafana/k6:0.57.0', 'cap_add': ['NET_ADMIN']}

    def test_only_disposable_load_namespace_has_network_admin(self):
        validate_capacity(self.config, self.project)
        for service, caps in [('m2', ['NET_ADMIN']), ('load', ['SYS_ADMIN']), ('load', ['NET_ADMIN', 'SYS_ADMIN'])]:
            config = copy.deepcopy(self.config)
            config['services'][service]['cap_add'] = caps
            with self.subTest(service=service, caps=caps), self.assertRaises(ValueError):
                validate_capacity(config, self.project)

    def test_host_namespace_device_port_and_external_volume_are_rejected(self):
        for key, value in [('pid', 'host'), ('ipc', 'host'), ('devices', ['/dev/net/tun']), ('ports', ['80:80']), ('network_mode', 'host')]:
            config = copy.deepcopy(self.config)
            config['services']['load'][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):
                validate_capacity(config, self.project)
        self.config['volumes']['pgdata'] = {'external': True}
        with self.assertRaises(ValueError): validate_capacity(self.config, self.project)

    def test_model_calls_and_live_project_are_rejected(self):
        self.config['services']['m4']['environment']['CHAT_PROVIDER'] = 'openai_compatible'
        with self.assertRaises(ValueError): validate_capacity(self.config, self.project)
        with self.assertRaises(ValueError): validate_capacity(self.config, 'pbl6')


if __name__ == '__main__': unittest.main()

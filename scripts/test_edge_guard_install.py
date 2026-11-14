"""Gateway patch regression checks; no network or credentials required."""
import unittest
from install_edge_guard import install


class GatewayInstallTest(unittest.TestCase):
    def test_preserves_routes_overwrites_client_identity_and_is_idempotent(self):
        body = '''{$SITE_ADDRESS:80} {
  reverse_proxy m1:3101
  reverse_proxy m2:3102
  reverse_proxy m3:3103
  reverse_proxy m4:3104 {
    # Existing try-on deployment.
    header_up X-PBL6-Client-IP {remote_host}
  }
  handle_path /delivery/* { reverse_proxy delivery:3110 }
  handle { reverse_proxy web:3000 }
}
'''
        result = install(body)
        self.assertEqual(install(result), result)
        self.assertEqual(result.count('header_up X-Forwarded-For {client_ip}'), 4)
        self.assertEqual(result.count('header_up X-PBL6-Client-IP {client_ip}'), 4)
        self.assertIn('client_ip_headers CF-Connecting-IP', result)
        self.assertIn('header_up -X-Try-On-Demo-Password', result)
        self.assertIn('reverse_proxy delivery:3110', result)
        self.assertNotIn('copy_headers', result)
        self.assertNotIn('{remote_host}', result)

    def test_requires_review_for_unknown_existing_global_or_incomplete_routing(self):
        for body in ('{\n servers {}\n}\n:80 {}', ':80 {}', '{$SITE_ADDRESS:80} {reverse_proxy m1:3101}'):
            with self.assertRaises(ValueError): install(body)


if __name__ == '__main__':
    unittest.main()

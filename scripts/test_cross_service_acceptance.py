"""Check disposal boundaries without Docker or access to local application credentials."""
import copy
from pathlib import Path
import unittest
from run_cross_service_acceptance import make_config, validate_config


class AcceptanceIsolation(unittest.TestCase):
    def setUp(self):
        self.project = "pbl6-acceptance-012345abcdef"
        self.config = make_config(self.project, Path(__file__).resolve().parent / "unused-test-path")

    def test_demo_project_is_rejected(self):
        with self.assertRaises(ValueError):
            make_config("pbl6", Path.cwd())
        with self.assertRaises(ValueError):
            validate_config(self.config, "pbl6")

    def test_private_project_is_valid_and_uses_unique_image(self):
        validate_config(self.config, self.project)
        self.assertEqual(self.config["services"]["m2"]["image"], self.project + "-node:local")
        self.assertEqual(self.config["services"]["tools"]["image"], self.config["services"]["m2"]["image"])

    def test_public_ports_host_network_or_privilege_are_rejected(self):
        for name, value in [("ports", ["8080:3102"]), ("network_mode", "host"),
                            ("privileged", True), ("container_name", "pbl6-m2-1")]:
            config = copy.deepcopy(self.config)
            config["services"]["m2"][name] = value
            with self.subTest(name=name), self.assertRaises(ValueError):
                validate_config(config, self.project)

    def test_shared_named_volumes_and_external_networks_are_rejected(self):
        for value in [{"external": True}, {"name": "pbl6_pgdata"}]:
            config = copy.deepcopy(self.config)
            config["volumes"]["pgdata"] = value
            with self.assertRaises(ValueError):
                validate_config(config, self.project)
        self.config["networks"] = {"default": {"external": True}}
        with self.assertRaises(ValueError):
            validate_config(self.config, self.project)

    def test_secrets_are_fresh_and_providers_are_explicitly_test_only(self):
        other = make_config(self.project, Path.cwd())
        env = self.config["services"]["m2"]["environment"]
        self.assertNotEqual(env["SEPAY_WEBHOOK_SECRET"], other["services"]["m2"]["environment"]["SEPAY_WEBHOOK_SECRET"])
        self.assertEqual(env["REFUND_PROVIDER"], "disabled")
        self.assertEqual(env["PAYMENT_PROVIDER_MODE"], "sepay_test")
        self.assertEqual(env["SEPAY_TEST_ACCOUNT"], "0000000000")

    def test_services_keep_separate_database_credentials(self):
        for service in ("m1", "m2", "m3", "m4", "worker-m1", "worker-m2", "worker-m3", "worker-m4"):
            env = self.config["services"][service]["environment"]
            keys = [key for key in env if key.endswith("_DATABASE_URL")]
            self.assertEqual(keys, [env["SERVICE_ID"] + "_DATABASE_URL"])
        self.assertFalse(any(key.endswith("_DATABASE_URL") for key in
                             self.config["services"]["inventory-fault"]["environment"]))

    def test_ai_does_not_inherit_operator_provider_or_credentials(self):
        env = self.config["services"]["m4"]["environment"]
        self.assertEqual(env["AI_MODE"], "real")
        self.assertEqual(env["CHAT_PROVIDER"], "none")
        self.assertNotIn("CHAT_API_KEY", env)
        self.assertNotIn("CHAT_MODEL_URL", env)
        self.assertEqual(self.config["services"]["m4"]["image"], self.config["services"]["worker-m4"]["image"])


if __name__ == "__main__":
    unittest.main()

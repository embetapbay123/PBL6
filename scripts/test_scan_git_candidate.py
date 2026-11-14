import io
import unittest
import zipfile

from scan_git_candidate import inspect_text, text_parts


class CandidateSecretScanTests(unittest.TestCase):
    def test_api_keys_and_exact_private_secrets_are_detected_without_returning_values(self):
        value = 'sk-' + 'proj-' + 'X' * 60
        result = inspect_text('OPENAI_API_KEY=' + value)
        self.assertEqual(result, ['openai_api_key'])
        self.assertNotIn(value, repr(result))
        self.assertEqual(inspect_text('password=private-fixture-value', ['private-fixture-value']), ['local_environment_secret'])

    def test_templates_and_generated_dummy_tokens_are_not_credentials(self):
        self.assertEqual(inspect_text('OPENAI_API_KEY=${OPENAI_API_KEY:-}\naccess_token=fixture-access-token'), [])

    def test_office_documents_are_inspected_inside_the_zip(self):
        stream = io.BytesIO()
        with zipfile.ZipFile(stream, 'w') as archive:
            archive.writestr('word/document.xml', '<text>' + 'ghp_' + 'A' * 40 + '</text>')
        parts = list(text_parts('report.docx', stream.getvalue()))
        self.assertEqual(parts[0][0], 'report.docx!word/document.xml')
        self.assertEqual(inspect_text(parts[0][1]), ['github_token'])


if __name__ == '__main__':
    unittest.main()

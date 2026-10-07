"""Checks for narrow PostgreSQL constraint canonicalization; no database mutations."""
import unittest
from restore_drill import normalize_constraint

class ConstraintNormalization(unittest.TestCase):
    def test_dump_cast_equivalence(self):
        source="CHECK (((status)::text = ANY ((ARRAY['A'::character varying, 'B'::character varying])::text[])))"
        restored="CHECK (((status)::text = ANY (ARRAY[('A'::character varying)::text, ('B'::character varying)::text])))"
        self.assertEqual(normalize_constraint(source),normalize_constraint(restored))
        for changed in [restored.replace("'B'","'C'"),restored.replace('status','provider'),restored.replace('ANY','ALL')]:
            self.assertNotEqual(normalize_constraint(source),normalize_constraint(changed))

    def test_literal_commas_and_quotes_are_preserved(self):
        source="(ARRAY['a, b'::character varying, 'c''d'::character varying])::text[]"
        restored="ARRAY[('a, b'::character varying)::text, ('c''d'::character varying)::text]"
        self.assertEqual(normalize_constraint(source),normalize_constraint(restored))
        self.assertEqual(normalize_constraint('CHECK (quantity >= 0)'), 'CHECK (quantity >= 0)')

if __name__=='__main__':unittest.main()

-- Preserve all historical application data. Abort migration with an explicit
-- report if existing pending duplicates need an owner-reviewed resolution.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM store_application
    WHERE status = 'PENDING'
    GROUP BY applicant_user_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot create store_application_one_pending_per_applicant: duplicate PENDING applications exist; resolve them without deleting history and rerun migration';
  END IF;
END $$;

CREATE UNIQUE INDEX store_application_one_pending_per_applicant
  ON store_application(applicant_user_id)
  WHERE status = 'PENDING';

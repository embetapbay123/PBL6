-- NULL policy explicitly means legacy/case-by-case, never a retrospective deadline.
ALTER TABLE "order" ADD COLUMN return_policy_snapshot jsonb;
ALTER TABLE "order" ADD CONSTRAINT order_return_policy_object CHECK(return_policy_snapshot IS NULL OR jsonb_typeof(return_policy_snapshot)='object');

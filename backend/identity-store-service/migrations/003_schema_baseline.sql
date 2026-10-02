-- Schema baseline 2.2 frozen 2026-10-02. Additive; do not rewrite applied migrations.
CREATE UNIQUE INDEX store_slug_unique ON store(slug);
CREATE UNIQUE INDEX store_application_unique ON store(application_id);
CREATE UNIQUE INDEX address_default_unique ON address(customer_user_id) WHERE is_default AND status='ACTIVE';
CREATE UNIQUE INDEX invitation_token_unique ON staff_invitation(token_hash);
CREATE UNIQUE INDEX one_time_token_hash_unique ON one_time_token(token_hash);
CREATE INDEX address_customer_status ON address(customer_user_id,status);
CREATE INDEX application_applicant_status ON store_application(applicant_user_id,status);
CREATE INDEX membership_store_status ON store_membership(store_id,status);
CREATE INDEX invitation_store_status ON staff_invitation(store_id,status);
CREATE INDEX refresh_family ON refresh_session(family_id);
ALTER TABLE "user" ADD CONSTRAINT user_baseline_check CHECK (version>=0);
ALTER TABLE "store" ADD CONSTRAINT store_baseline_check CHECK (shipping_fee_vnd>=0 AND version>=0);
ALTER TABLE "store_application" ADD CONSTRAINT store_application_baseline_check CHECK (version>=0);
ALTER TABLE "store_membership" ADD CONSTRAINT store_membership_baseline_check CHECK (version>=0);
ALTER TABLE "membership_permission" ADD CONSTRAINT membership_permission_baseline_check CHECK (version>=0);
ALTER TABLE "staff_invitation" ADD CONSTRAINT staff_invitation_baseline_check CHECK (version>=0);
ALTER TABLE "address" ADD CONSTRAINT address_baseline_check CHECK (NOT is_default OR status='ACTIVE');

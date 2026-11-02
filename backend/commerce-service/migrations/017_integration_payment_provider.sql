-- Reader compatibility for an explicitly gated development-only provider; no production enablement.
ALTER TABLE payment_attempt DROP CONSTRAINT payment_attempt_provider_check;
ALTER TABLE payment_attempt ADD CONSTRAINT payment_attempt_provider_check CHECK(provider IN ('SEPAY_TEST','LEGACY_SANDBOX','INTEGRATION'));

-- Follow-up must target the same Attempt/Payment/Order even for future worker writers.
ALTER TABLE payment_attempt ADD CONSTRAINT payment_attempt_id_payment_unique UNIQUE(id,payment_id);
ALTER TABLE payment_followup ADD CONSTRAINT payment_followup_attempt_matches FOREIGN KEY(attempt_id,payment_id) REFERENCES payment_attempt(id,payment_id);
ALTER TABLE payment_followup ADD CONSTRAINT payment_followup_order_matches FOREIGN KEY(payment_id,order_id) REFERENCES payment(id,order_id);
CREATE INDEX callback_extra_transfer_review ON payment_callback_receipt(received_at) WHERE disposition='EXTRA_TRANSFER_RECONCILE_REQUIRED';

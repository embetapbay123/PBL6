-- Store association is derived only from immutable owned entity relationships.
ALTER TABLE m2_audit ADD COLUMN store_id uuid;
UPDATE m2_audit a SET store_id=t.store_id FROM "order" t WHERE a.target_type='Order' AND a.target_id=t.id;
UPDATE m2_audit a SET store_id=t.store_id FROM voucher t WHERE a.target_type='Voucher' AND a.target_id=t.id;
UPDATE m2_audit a SET store_id=o.store_id FROM payment t JOIN "order" o ON o.id=t.order_id WHERE a.target_type='Payment' AND a.target_id=t.id;
UPDATE m2_audit a SET store_id=o.store_id FROM refund t JOIN "order" o ON o.id=t.order_id WHERE a.target_type='Refund' AND a.target_id=t.id;
UPDATE m2_audit a SET store_id=o.store_id FROM order_return_request t JOIN "order" o ON o.id=t.order_id WHERE a.target_type='ReturnRequest' AND a.target_id=t.id;
UPDATE m2_audit a SET store_id=o.store_id FROM delivery_return_case t JOIN "order" o ON o.id=t.order_id WHERE a.target_type='DeliveryReturn' AND a.target_id=t.id;
UPDATE m2_audit a SET store_id=o.store_id FROM payment_attempt t JOIN payment p ON p.id=t.payment_id JOIN "order" o ON o.id=p.order_id WHERE a.target_type='PaymentAttempt' AND a.target_id=t.id;
CREATE INDEX m2_audit_store_time ON m2_audit(store_id,created_at DESC,id);

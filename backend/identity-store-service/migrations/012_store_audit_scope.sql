-- Store association is derived only from immutable owned entity relationships.
ALTER TABLE m3_audit ADD COLUMN store_id uuid;
UPDATE m3_audit a SET store_id=t.id FROM store t WHERE a.target_type='Store' AND a.target_id=t.id;
UPDATE m3_audit a SET store_id=t.store_id FROM store_membership t WHERE a.target_type='StoreMembership' AND a.target_id=t.id;
UPDATE m3_audit a SET store_id=t.store_id FROM staff_invitation t WHERE a.target_type='StaffInvitation' AND a.target_id=t.id;
UPDATE m3_audit a SET store_id=t.id FROM store t WHERE a.target_type='StoreApplication' AND a.target_id=t.application_id;
CREATE INDEX m3_audit_store_time ON m3_audit(store_id,created_at DESC,id);

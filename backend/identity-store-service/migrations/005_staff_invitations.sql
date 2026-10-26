-- STAFF-01: append-only invitation state and auditable transition timestamps.
ALTER TABLE staff_invitation
  ADD COLUMN permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN accepted_at timestamptz,
  ADD COLUMN revoked_at timestamptz;

ALTER TABLE staff_invitation
  ADD CONSTRAINT staff_invitation_status_check CHECK (status IN ('PENDING','ACCEPTED','REVOKED','EXPIRED')),
  ADD CONSTRAINT staff_invitation_permissions_check CHECK (jsonb_typeof(permissions) = 'array');

CREATE INDEX staff_invitation_email_status ON staff_invitation(lower(invited_email), status, expires_at);
CREATE INDEX staff_invitation_recipient ON staff_invitation(invited_user_id, status);

INSERT INTO permission(id,code,resource,action)
VALUES
  (gen_random_uuid(),'product.store.read_write','product.store','read_write'),
  (gen_random_uuid(),'inventory.store.read_adjust','inventory.store','read_adjust'),
  (gen_random_uuid(),'order.store.read_status_cancel','order.store','read_status_cancel'),
  (gen_random_uuid(),'cod.store.collect','cod.store','collect')
ON CONFLICT (code) DO NOTHING;

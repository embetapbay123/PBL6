-- Add optimistic concurrency support for administrator role permission updates.
ALTER TABLE role ADD COLUMN version integer NOT NULL DEFAULT 0;
ALTER TABLE role ADD CONSTRAINT role_version_nonnegative CHECK (version >= 0);

CREATE TABLE store_storefront (
 store_id uuid PRIMARY KEY REFERENCES store(id),
 version integer NOT NULL DEFAULT 0 CHECK(version>=0),
 draft_json jsonb NOT NULL DEFAULT '{"enabled":false,"groups":[]}'::jsonb,
 published_json jsonb,
 published_version integer,
 published_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now()
);
-- Banner bytes are bounded, normalized WebP stored transactionally; no public filesystem.
CREATE TABLE storefront_banner (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 store_id uuid NOT NULL REFERENCES store(id),
 owner_id uuid NOT NULL,
 client_upload_id uuid NOT NULL,
 expected_bytes integer NOT NULL CHECK(expected_bytes BETWEEN 1 AND 2097152),
 expected_sha256 char(64) NOT NULL,
 status text NOT NULL DEFAULT 'UPLOADING' CHECK(status IN ('UPLOADING','PROCESSING','READY','FAILED')),
 content bytea CHECK(octet_length(content)<=524288),
 width integer,
 height integer,
 lease_token uuid,
 lease_until timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(store_id,client_upload_id)
);
CREATE INDEX storefront_banner_store ON storefront_banner(store_id,created_at DESC);

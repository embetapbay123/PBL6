-- RBAC-01: the ADMIN role must carry a live permission checked by every service.
INSERT INTO permission(id, code, resource, action)
VALUES (gen_random_uuid(), 'platform.admin', 'platform', 'admin')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permission(role_id, permission_id)
SELECT r.id, p.id
FROM role r
CROSS JOIN permission p
WHERE r.code = 'ADMIN'
  AND p.code = 'platform.admin'
ON CONFLICT DO NOTHING;

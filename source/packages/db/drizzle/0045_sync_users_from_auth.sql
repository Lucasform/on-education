-- Backfill on_education.users from auth.users for every existing membership.
-- Forward-looking sync is handled in provisionOrganizationTenant + session.ts.
INSERT INTO "on_education"."users" ("id", "email", "full_name", "created_at", "updated_at")
SELECT DISTINCT
  au.id,
  au.email,
  (au.raw_user_meta_data->>'full_name')::text,
  au.created_at,
  now()
FROM auth.users au
INNER JOIN "on_education"."memberships" m ON m.user_id = au.id
WHERE au.deleted_at IS NULL
ON CONFLICT ("id") DO UPDATE SET
  email    = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  updated_at = now();

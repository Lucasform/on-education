ALTER TABLE "on_education"."tenant_settings"
  ADD COLUMN IF NOT EXISTS "profile_name" text,
  ADD COLUMN IF NOT EXISTS "profile_phone" text,
  ADD COLUMN IF NOT EXISTS "profile_email" text,
  ADD COLUMN IF NOT EXISTS "profile_address" text,
  ADD COLUMN IF NOT EXISTS "profile_cnpj" text;

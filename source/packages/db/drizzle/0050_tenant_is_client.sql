-- Marcação de CRM do super-admin: cliente pagante vs conta de teste/trial.
ALTER TABLE "on_education"."tenants"
  ADD COLUMN IF NOT EXISTS "is_client" boolean NOT NULL DEFAULT false;

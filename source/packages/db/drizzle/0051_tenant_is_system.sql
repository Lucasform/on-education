-- Tenant de sistema (ex.: "Banco Geral" que recebe atividades de contas excluidas).
ALTER TABLE "on_education"."tenants"
  ADD COLUMN IF NOT EXISTS "is_system" boolean NOT NULL DEFAULT false;

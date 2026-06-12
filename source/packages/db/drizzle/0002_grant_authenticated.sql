-- Custom SQL migration file, put your code below! --
-- Concede ao papel nativo `authenticated` (sem BYPASSRLS) acesso ao schema on_education.
-- O withTenant roda como `authenticated`, então é o RLS que isola por tenant. ALTER DEFAULT
-- PRIVILEGES garante o mesmo para tabelas criadas em migrations futuras.
GRANT USAGE ON SCHEMA "on_education" TO authenticated;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "on_education" TO authenticated;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA "on_education" GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
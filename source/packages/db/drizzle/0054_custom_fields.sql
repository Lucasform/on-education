-- Campos personalizados por tenant (setup do admin) + valores por registro.
-- Idempotente: seguro reaplicar (IF NOT EXISTS / DROP POLICY IF EXISTS).
CREATE TABLE IF NOT EXISTS "on_education"."custom_field_defs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "entity" text NOT NULL,
  "field_key" text NOT NULL,
  "label" text NOT NULL,
  "field_type" text DEFAULT 'text' NOT NULL,
  "options" jsonb,
  "required" boolean DEFAULT false NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid,
  "deleted_at" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "on_education"."custom_field_values" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "field_id" uuid NOT NULL,
  "record_id" uuid NOT NULL,
  "value" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid,
  "deleted_at" timestamp with time zone
);

ALTER TABLE "on_education"."custom_field_defs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "on_education"."custom_field_values" ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS "custom_field_defs_tenant_entity_idx" ON "on_education"."custom_field_defs" USING btree ("tenant_id","entity");
CREATE INDEX IF NOT EXISTS "custom_field_values_record_idx" ON "on_education"."custom_field_values" USING btree ("tenant_id","record_id");
CREATE UNIQUE INDEX IF NOT EXISTS "custom_field_values_field_record_uq" ON "on_education"."custom_field_values" USING btree ("field_id","record_id");

-- Garante acesso do papel da app (mesmo que default privileges ja cubram). Idempotente.
GRANT ALL ON "on_education"."custom_field_defs" TO authenticated, service_role;
GRANT ALL ON "on_education"."custom_field_values" TO authenticated, service_role;

DROP POLICY IF EXISTS "custom_field_defs_tenant_isolation" ON "on_education"."custom_field_defs";
CREATE POLICY "custom_field_defs_tenant_isolation" ON "on_education"."custom_field_defs" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS "custom_field_values_tenant_isolation" ON "on_education"."custom_field_values";
CREATE POLICY "custom_field_values_tenant_isolation" ON "on_education"."custom_field_values" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

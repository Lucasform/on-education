-- Notas (1-5) do usuário no conteúdo gerado pela IA (treino por contexto). Idempotente.
CREATE TABLE IF NOT EXISTS "on_education"."content_ratings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "kind" text NOT NULL,
  "content_id" uuid,
  "rating" integer NOT NULL,
  "comment" text,
  "subject" text,
  "grade_level" text,
  "age_band" text,
  "snapshot" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid,
  "deleted_at" timestamp with time zone
);

ALTER TABLE "on_education"."content_ratings" ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS "content_ratings_user_content_uq" ON "on_education"."content_ratings" USING btree ("user_id","kind","content_id");
CREATE INDEX IF NOT EXISTS "content_ratings_user_kind_idx" ON "on_education"."content_ratings" USING btree ("tenant_id","user_id","kind");
CREATE INDEX IF NOT EXISTS "content_ratings_kind_rating_idx" ON "on_education"."content_ratings" USING btree ("kind","rating");

GRANT ALL ON "on_education"."content_ratings" TO authenticated, service_role;

DROP POLICY IF EXISTS "content_ratings_tenant_isolation" ON "on_education"."content_ratings";
CREATE POLICY "content_ratings_tenant_isolation" ON "on_education"."content_ratings" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

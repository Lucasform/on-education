-- Inscrições de notificação push (web push) por usuário/aparelho. Idempotente.
CREATE TABLE IF NOT EXISTS "on_education"."push_subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "endpoint" text NOT NULL,
  "p256dh" text NOT NULL,
  "auth" text NOT NULL,
  "user_agent" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid,
  "deleted_at" timestamp with time zone
);

ALTER TABLE "on_education"."push_subscriptions" ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS "push_subscriptions_endpoint_uq" ON "on_education"."push_subscriptions" USING btree ("endpoint");
CREATE INDEX IF NOT EXISTS "push_subscriptions_user_idx" ON "on_education"."push_subscriptions" USING btree ("tenant_id","user_id");

GRANT ALL ON "on_education"."push_subscriptions" TO authenticated, service_role;

DROP POLICY IF EXISTS "push_subscriptions_tenant_isolation" ON "on_education"."push_subscriptions";
CREATE POLICY "push_subscriptions_tenant_isolation" ON "on_education"."push_subscriptions" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

CREATE TABLE "on_education"."guardian_access_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"guardian_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "on_education"."guardian_access_tokens" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE UNIQUE INDEX "guardian_access_tokens_hash_uq" ON "on_education"."guardian_access_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "guardian_access_tokens_guardian_idx" ON "on_education"."guardian_access_tokens" USING btree ("tenant_id","guardian_id");--> statement-breakpoint
CREATE POLICY "guardian_access_tokens_tenant_isolation" ON "on_education"."guardian_access_tokens" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
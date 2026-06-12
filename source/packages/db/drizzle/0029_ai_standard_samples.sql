CREATE TABLE "on_education"."ai_standard_samples" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"title" text NOT NULL,
	"file_name" text NOT NULL,
	"storage_path" text NOT NULL,
	"extracted_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "on_education"."ai_standard_samples" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "ai_standard_samples_tenant_idx" ON "on_education"."ai_standard_samples" USING btree ("tenant_id");--> statement-breakpoint
CREATE POLICY "ai_standard_samples_tenant_isolation" ON "on_education"."ai_standard_samples" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
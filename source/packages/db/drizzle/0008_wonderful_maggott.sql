CREATE TABLE "on_education"."messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"guardian_id" uuid NOT NULL,
	"student_id" uuid,
	"subject" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "on_education"."messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "messages_guardian_idx" ON "on_education"."messages" USING btree ("guardian_id");--> statement-breakpoint
CREATE POLICY "messages_tenant_isolation" ON "on_education"."messages" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
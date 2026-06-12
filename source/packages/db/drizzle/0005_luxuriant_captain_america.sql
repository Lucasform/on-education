CREATE TABLE "on_education"."portfolio_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "on_education"."portfolio_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "portfolio_entries_tenant_idx" ON "on_education"."portfolio_entries" USING btree ("tenant_id");--> statement-breakpoint
CREATE POLICY "portfolio_entries_tenant_isolation" ON "on_education"."portfolio_entries" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
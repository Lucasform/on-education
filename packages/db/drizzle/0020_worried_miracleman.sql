CREATE TABLE "on_education"."invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"student_id" uuid,
	"guardian_id" uuid,
	"competencia" text NOT NULL,
	"description" text NOT NULL,
	"amount_cents" integer DEFAULT 0 NOT NULL,
	"due_date" date NOT NULL,
	"status" text DEFAULT 'aberto' NOT NULL,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "on_education"."invoices" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "invoices_tenant_idx" ON "on_education"."invoices" USING btree ("tenant_id");--> statement-breakpoint
CREATE POLICY "invoices_tenant_isolation" ON "on_education"."invoices" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
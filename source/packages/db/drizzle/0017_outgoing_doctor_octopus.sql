ALTER TYPE "on_education"."role" ADD VALUE IF NOT EXISTS 'monitor' BEFORE 'staff_secretary';--> statement-breakpoint
CREATE TABLE "on_education"."schedule_exceptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"date" date NOT NULL,
	"note" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "on_education"."schedule_exceptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "schedule_exceptions_class_idx" ON "on_education"."schedule_exceptions" USING btree ("class_id");--> statement-breakpoint
CREATE POLICY "schedule_exceptions_tenant_isolation" ON "on_education"."schedule_exceptions" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
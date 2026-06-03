CREATE TABLE "on_education"."teaching_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"subject_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "on_education"."teaching_assignments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP INDEX "on_education"."attendance_uq";--> statement-breakpoint
ALTER TABLE "on_education"."attendance" ADD COLUMN "subject_id" uuid;--> statement-breakpoint
CREATE INDEX "teaching_assignments_tenant_idx" ON "on_education"."teaching_assignments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "teaching_assignments_membership_idx" ON "on_education"."teaching_assignments" USING btree ("membership_id");--> statement-breakpoint
CREATE UNIQUE INDEX "teaching_assignments_uq" ON "on_education"."teaching_assignments" USING btree ("tenant_id","membership_id","class_id","subject_id") NULLS NOT DISTINCT;--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_uq" ON "on_education"."attendance" USING btree ("tenant_id","student_id","class_id","date","subject_id") NULLS NOT DISTINCT;--> statement-breakpoint
CREATE POLICY "teaching_assignments_tenant_isolation" ON "on_education"."teaching_assignments" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
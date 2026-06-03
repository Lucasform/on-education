CREATE TABLE "on_education"."class_subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "on_education"."class_subjects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "on_education"."classes" ADD COLUMN "grade_level" text;--> statement-breakpoint
ALTER TABLE "on_education"."classes" ADD COLUMN "age_range" text;--> statement-breakpoint
CREATE INDEX "class_subjects_class_idx" ON "on_education"."class_subjects" USING btree ("class_id");--> statement-breakpoint
CREATE UNIQUE INDEX "class_subjects_uq" ON "on_education"."class_subjects" USING btree ("tenant_id","class_id","subject_id");--> statement-breakpoint
CREATE POLICY "class_subjects_tenant_isolation" ON "on_education"."class_subjects" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
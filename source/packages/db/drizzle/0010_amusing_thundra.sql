CREATE TABLE "on_education"."occurrence_students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"occurrence_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "on_education"."occurrence_students" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "on_education"."occurrences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"date" date NOT NULL,
	"severity" text DEFAULT 'leve' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "on_education"."occurrences" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "occurrence_students_occ_idx" ON "on_education"."occurrence_students" USING btree ("occurrence_id");--> statement-breakpoint
CREATE INDEX "occurrence_students_student_idx" ON "on_education"."occurrence_students" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "occurrences_tenant_idx" ON "on_education"."occurrences" USING btree ("tenant_id");--> statement-breakpoint
CREATE POLICY "occurrence_students_tenant_isolation" ON "on_education"."occurrence_students" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "occurrences_tenant_isolation" ON "on_education"."occurrences" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
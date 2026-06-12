CREATE TABLE "on_education"."attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"date" date NOT NULL,
	"present" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "on_education"."attendance" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "on_education"."grades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"class_id" uuid,
	"subject_id" uuid,
	"term_id" uuid,
	"label" text NOT NULL,
	"value" real NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "on_education"."grades" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "on_education"."lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"subject_id" uuid,
	"date" date NOT NULL,
	"topic" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "on_education"."lessons" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "attendance_tenant_idx" ON "on_education"."attendance" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_uq" ON "on_education"."attendance" USING btree ("tenant_id","student_id","class_id","date");--> statement-breakpoint
CREATE INDEX "grades_tenant_idx" ON "on_education"."grades" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "lessons_tenant_idx" ON "on_education"."lessons" USING btree ("tenant_id");--> statement-breakpoint
CREATE POLICY "attendance_tenant_isolation" ON "on_education"."attendance" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "grades_tenant_isolation" ON "on_education"."grades" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "lessons_tenant_isolation" ON "on_education"."lessons" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
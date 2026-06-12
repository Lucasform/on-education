CREATE TABLE "on_education"."lesson_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"subject_id" uuid,
	"kind" text DEFAULT 'aula' NOT NULL,
	"title" text NOT NULL,
	"content" text,
	"date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "on_education"."lesson_plans" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "on_education"."lessons" ADD COLUMN "lesson_plan_id" uuid;--> statement-breakpoint
CREATE INDEX "lesson_plans_tenant_idx" ON "on_education"."lesson_plans" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "lesson_plans_class_idx" ON "on_education"."lesson_plans" USING btree ("class_id");--> statement-breakpoint
CREATE POLICY "lesson_plans_tenant_isolation" ON "on_education"."lesson_plans" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
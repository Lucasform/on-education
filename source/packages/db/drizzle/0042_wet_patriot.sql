CREATE TABLE "on_education"."curriculum_units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"subject_id" uuid,
	"position" integer DEFAULT 0 NOT NULL,
	"title" text NOT NULL,
	"content" text,
	"lessons_planned" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "on_education"."curriculum_units" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "on_education"."lessons" ADD COLUMN "unit_id" uuid;--> statement-breakpoint
CREATE INDEX "curriculum_units_class_idx" ON "on_education"."curriculum_units" USING btree ("tenant_id","class_id","subject_id","position");--> statement-breakpoint
CREATE POLICY "curriculum_units_tenant_isolation" ON "on_education"."curriculum_units" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
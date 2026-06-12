CREATE TABLE "on_education"."grade_components" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"weight" real DEFAULT 1 NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "on_education"."grade_components" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "on_education"."grades" ADD COLUMN "component_id" uuid;--> statement-breakpoint
ALTER TABLE "on_education"."tenant_settings" ADD COLUMN "grade_scale" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
CREATE INDEX "grade_components_tenant_idx" ON "on_education"."grade_components" USING btree ("tenant_id");--> statement-breakpoint
CREATE POLICY "grade_components_tenant_isolation" ON "on_education"."grade_components" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
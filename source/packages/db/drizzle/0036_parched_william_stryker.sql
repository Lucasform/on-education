CREATE TABLE "on_education"."student_points" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "on_education"."student_points" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "student_points_tenant_idx" ON "on_education"."student_points" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "student_points_student_idx" ON "on_education"."student_points" USING btree ("student_id");--> statement-breakpoint
CREATE POLICY "student_points_tenant_isolation" ON "on_education"."student_points" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
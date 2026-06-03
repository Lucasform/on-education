CREATE TABLE "on_education"."schedule_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"subject_id" uuid,
	"weekday" integer NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "on_education"."schedule_slots" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "schedule_slots_class_idx" ON "on_education"."schedule_slots" USING btree ("class_id");--> statement-breakpoint
CREATE POLICY "schedule_slots_tenant_isolation" ON "on_education"."schedule_slots" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
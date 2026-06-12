CREATE TABLE "on_education"."materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"subject" text,
	"title" text NOT NULL,
	"storage_path" text NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text,
	"size_bytes" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "on_education"."materials" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "materials_tenant_idx" ON "on_education"."materials" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "materials_class_idx" ON "on_education"."materials" USING btree ("class_id");--> statement-breakpoint
CREATE POLICY "materials_tenant_isolation" ON "on_education"."materials" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
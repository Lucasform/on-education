CREATE TABLE "on_education"."generated_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"prompt" text NOT NULL,
	"url" text NOT NULL,
	"quality" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "on_education"."generated_images" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "generated_images_tenant_idx" ON "on_education"."generated_images" USING btree ("tenant_id");--> statement-breakpoint
CREATE POLICY "generated_images_tenant_isolation" ON "on_education"."generated_images" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
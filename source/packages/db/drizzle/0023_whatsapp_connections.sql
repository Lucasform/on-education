CREATE TABLE "on_education"."whatsapp_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"provider" text DEFAULT 'evolution' NOT NULL,
	"instance_id" text NOT NULL,
	"webhook_secret" text,
	"phone" text,
	"active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "on_education"."whatsapp_connections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE UNIQUE INDEX "whatsapp_connections_tenant_uq" ON "on_education"."whatsapp_connections" USING btree ("tenant_id");--> statement-breakpoint
CREATE POLICY "whatsapp_connections_tenant_isolation" ON "on_education"."whatsapp_connections" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
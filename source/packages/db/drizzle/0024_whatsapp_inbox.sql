CREATE TABLE "on_education"."whatsapp_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"phone" text NOT NULL,
	"contact_name" text,
	"last_message" text,
	"last_message_at" timestamp with time zone,
	"unread" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "on_education"."whatsapp_conversations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "on_education"."whatsapp_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"direction" text NOT NULL,
	"body" text NOT NULL,
	"wa_message_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "on_education"."whatsapp_messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE UNIQUE INDEX "whatsapp_conversations_tenant_phone_uq" ON "on_education"."whatsapp_conversations" USING btree ("tenant_id","phone");--> statement-breakpoint
CREATE INDEX "whatsapp_messages_conv_idx" ON "on_education"."whatsapp_messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE POLICY "whatsapp_conversations_tenant_isolation" ON "on_education"."whatsapp_conversations" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "whatsapp_messages_tenant_isolation" ON "on_education"."whatsapp_messages" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
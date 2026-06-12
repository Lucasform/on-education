CREATE TABLE "on_education"."flashcard_decks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"title" text NOT NULL,
	"subject" text,
	"grade_level" text,
	"age_band" text,
	"cards" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ai_generated" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "on_education"."flashcard_decks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "flashcard_decks_tenant_idx" ON "on_education"."flashcard_decks" USING btree ("tenant_id");--> statement-breakpoint
CREATE POLICY "flashcard_decks_tenant_isolation" ON "on_education"."flashcard_decks" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
CREATE TABLE "on_education"."shared_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"subject" text,
	"content" text DEFAULT '' NOT NULL,
	"age_range" text,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "on_education"."shared_activities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "shared_activities_age_idx" ON "on_education"."shared_activities" USING btree ("age_range");--> statement-breakpoint
CREATE POLICY "shared_activities_public" ON "on_education"."shared_activities" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
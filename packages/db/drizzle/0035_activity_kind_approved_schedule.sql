ALTER TABLE "on_education"."activities" ADD COLUMN "kind" text DEFAULT 'atividade' NOT NULL;--> statement-breakpoint
ALTER TABLE "on_education"."activities" ADD COLUMN "apply_date" date;--> statement-breakpoint
ALTER TABLE "on_education"."activities" ADD COLUMN "event_id" uuid;--> statement-breakpoint
ALTER TABLE "on_education"."activities" ADD COLUMN "approved" boolean DEFAULT true NOT NULL;
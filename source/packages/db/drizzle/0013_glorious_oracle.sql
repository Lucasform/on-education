ALTER TABLE "on_education"."grades" ALTER COLUMN "value" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "on_education"."grades" ADD COLUMN "kind" text DEFAULT 'formal' NOT NULL;--> statement-breakpoint
ALTER TABLE "on_education"."grades" ADD COLUMN "note" text;
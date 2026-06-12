ALTER TABLE "on_education"."tenant_settings" ADD COLUMN "gamification_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "on_education"."tenant_settings" ADD COLUMN "medal_bronze" integer DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE "on_education"."tenant_settings" ADD COLUMN "medal_prata" integer DEFAULT 150 NOT NULL;--> statement-breakpoint
ALTER TABLE "on_education"."tenant_settings" ADD COLUMN "medal_ouro" integer DEFAULT 300 NOT NULL;
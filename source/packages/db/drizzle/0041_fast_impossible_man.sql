ALTER TABLE "on_education"."lessons" ADD COLUMN "status" text DEFAULT 'dada' NOT NULL;--> statement-breakpoint
ALTER TABLE "on_education"."lessons" ADD COLUMN "slot_id" uuid;--> statement-breakpoint
ALTER TABLE "on_education"."lessons" ADD COLUMN "cancel_reason" text;--> statement-breakpoint
CREATE INDEX "lessons_class_date_idx" ON "on_education"."lessons" USING btree ("tenant_id","class_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "lessons_slot_date_uq" ON "on_education"."lessons" USING btree ("tenant_id","slot_id","date") WHERE "on_education"."lessons"."slot_id" is not null;
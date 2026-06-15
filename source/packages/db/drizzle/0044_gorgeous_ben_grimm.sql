ALTER TYPE "on_education"."role" ADD VALUE 'vice_director' BEFORE 'coordinator';--> statement-breakpoint
CREATE TABLE "on_education"."absence_justifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"date" date NOT NULL,
	"reason" text NOT NULL,
	"document_url" text,
	"submitted_by_name" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"review_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "on_education"."absence_justifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "on_education"."class_councils" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"title" text NOT NULL,
	"date" date NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "on_education"."class_councils" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "on_education"."council_remarks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"council_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"remark" text,
	"recommendation" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "on_education"."council_remarks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "on_education"."equipment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"serial_number" text,
	"status" text DEFAULT 'available' NOT NULL,
	"description" text,
	"purchase_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "on_education"."equipment" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "on_education"."equipment_loans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"equipment_id" uuid NOT NULL,
	"loaned_to" text NOT NULL,
	"loaned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expected_return" date,
	"returned_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "on_education"."equipment_loans" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "on_education"."exit_authorizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"date" date NOT NULL,
	"time" text,
	"reason" text NOT NULL,
	"authorized_by_name" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "on_education"."exit_authorizations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "on_education"."infant_diary_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"date" date NOT NULL,
	"category" text DEFAULT 'observation' NOT NULL,
	"content" text,
	"photo_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "on_education"."infant_diary_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "on_education"."meeting_bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"slot_id" uuid NOT NULL,
	"student_id" uuid,
	"guardian_name" text NOT NULL,
	"guardian_phone" text,
	"notes" text,
	"confirmed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "on_education"."meeting_bookings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "on_education"."meeting_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"host_id" uuid NOT NULL,
	"date" date NOT NULL,
	"start_time" text NOT NULL,
	"duration_minutes" integer DEFAULT 30 NOT NULL,
	"title" text DEFAULT 'Reunião com responsável' NOT NULL,
	"available" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "on_education"."meeting_slots" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "on_education"."networks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "on_education"."webhook_endpoints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"url" text NOT NULL,
	"secret" text,
	"events" text[] DEFAULT '{}' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"last_triggered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "on_education"."webhook_endpoints" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "on_education"."communications" ADD COLUMN "class_id" uuid;--> statement-breakpoint
ALTER TABLE "on_education"."guardians" ADD COLUMN "cpf" text;--> statement-breakpoint
ALTER TABLE "on_education"."guardians" ADD COLUMN "rg" text;--> statement-breakpoint
ALTER TABLE "on_education"."guardians" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "on_education"."guardians" ADD COLUMN "profession" text;--> statement-breakpoint
ALTER TABLE "on_education"."students" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "on_education"."students" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "on_education"."students" ADD COLUMN "state" text;--> statement-breakpoint
ALTER TABLE "on_education"."students" ADD COLUMN "zip_code" text;--> statement-breakpoint
ALTER TABLE "on_education"."students" ADD COLUMN "blood_type" text;--> statement-breakpoint
ALTER TABLE "on_education"."students" ADD COLUMN "allergies" text;--> statement-breakpoint
ALTER TABLE "on_education"."students" ADD COLUMN "medical_notes" text;--> statement-breakpoint
ALTER TABLE "on_education"."students" ADD COLUMN "emergency_name" text;--> statement-breakpoint
ALTER TABLE "on_education"."students" ADD COLUMN "emergency_phone" text;--> statement-breakpoint
ALTER TABLE "on_education"."students" ADD COLUMN "emergency_relation" text;--> statement-breakpoint
ALTER TABLE "on_education"."students" ADD COLUMN "photo_url" text;--> statement-breakpoint
ALTER TABLE "on_education"."students" ADD COLUMN "cpf" text;--> statement-breakpoint
ALTER TABLE "on_education"."students" ADD COLUMN "rg" text;--> statement-breakpoint
ALTER TABLE "on_education"."students" ADD COLUMN "gender" text;--> statement-breakpoint
ALTER TABLE "on_education"."students" ADD COLUMN "nationality" text;--> statement-breakpoint
ALTER TABLE "on_education"."students" ADD COLUMN "shift" text;--> statement-breakpoint
ALTER TABLE "on_education"."tenant_settings" ADD COLUMN "profile_name" text;--> statement-breakpoint
ALTER TABLE "on_education"."tenant_settings" ADD COLUMN "profile_phone" text;--> statement-breakpoint
ALTER TABLE "on_education"."tenant_settings" ADD COLUMN "profile_email" text;--> statement-breakpoint
ALTER TABLE "on_education"."tenant_settings" ADD COLUMN "profile_address" text;--> statement-breakpoint
ALTER TABLE "on_education"."tenant_settings" ADD COLUMN "profile_cnpj" text;--> statement-breakpoint
ALTER TABLE "on_education"."tenants" ADD COLUMN "is_client" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "on_education"."tenants" ADD COLUMN "is_system" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "on_education"."tenants" ADD COLUMN "network_id" uuid;--> statement-breakpoint
CREATE INDEX "absence_justifications_tenant_idx" ON "on_education"."absence_justifications" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "absence_justifications_student_idx" ON "on_education"."absence_justifications" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "class_councils_tenant_idx" ON "on_education"."class_councils" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "class_councils_class_idx" ON "on_education"."class_councils" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "council_remarks_tenant_idx" ON "on_education"."council_remarks" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "council_remarks_council_idx" ON "on_education"."council_remarks" USING btree ("council_id");--> statement-breakpoint
CREATE INDEX "equipment_tenant_idx" ON "on_education"."equipment" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "equipment_loans_tenant_idx" ON "on_education"."equipment_loans" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "equipment_loans_equipment_idx" ON "on_education"."equipment_loans" USING btree ("equipment_id");--> statement-breakpoint
CREATE INDEX "exit_authorizations_tenant_idx" ON "on_education"."exit_authorizations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "exit_authorizations_student_idx" ON "on_education"."exit_authorizations" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "infant_diary_entries_tenant_idx" ON "on_education"."infant_diary_entries" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "infant_diary_entries_student_idx" ON "on_education"."infant_diary_entries" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "meeting_bookings_tenant_idx" ON "on_education"."meeting_bookings" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "meeting_bookings_slot_idx" ON "on_education"."meeting_bookings" USING btree ("slot_id");--> statement-breakpoint
CREATE INDEX "meeting_slots_tenant_idx" ON "on_education"."meeting_slots" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "meeting_slots_date_idx" ON "on_education"."meeting_slots" USING btree ("tenant_id","date");--> statement-breakpoint
CREATE INDEX "webhook_endpoints_tenant_idx" ON "on_education"."webhook_endpoints" USING btree ("tenant_id");--> statement-breakpoint
CREATE POLICY "absence_justifications_tenant_isolation" ON "on_education"."absence_justifications" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "class_councils_tenant_isolation" ON "on_education"."class_councils" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "council_remarks_tenant_isolation" ON "on_education"."council_remarks" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "equipment_tenant_isolation" ON "on_education"."equipment" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "equipment_loans_tenant_isolation" ON "on_education"."equipment_loans" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "exit_authorizations_tenant_isolation" ON "on_education"."exit_authorizations" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "infant_diary_entries_tenant_isolation" ON "on_education"."infant_diary_entries" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "meeting_bookings_tenant_isolation" ON "on_education"."meeting_bookings" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "meeting_slots_tenant_isolation" ON "on_education"."meeting_slots" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "webhook_endpoints_tenant_isolation" ON "on_education"."webhook_endpoints" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
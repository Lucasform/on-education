CREATE SCHEMA "on_education";
--> statement-breakpoint
CREATE TYPE "on_education"."role" AS ENUM('owner', 'director', 'coordinator', 'teacher', 'staff_secretary', 'staff_finance', 'guardian', 'student');--> statement-breakpoint
CREATE TYPE "on_education"."tenant_type" AS ENUM('organization', 'individual');--> statement-breakpoint
CREATE TABLE "on_education"."academic_years" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"starts_on" date,
	"ends_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "on_education"."academic_years" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "on_education"."activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"title" text NOT NULL,
	"subject" text,
	"content" text DEFAULT '' NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"ai_generated" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "on_education"."activities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "on_education"."ai_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"prompt" text NOT NULL,
	"output" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"model" text,
	"tokens_in" integer DEFAULT 0 NOT NULL,
	"tokens_out" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "on_education"."ai_drafts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "on_education"."audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"resource" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "on_education"."audit_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "on_education"."classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "on_education"."classes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "on_education"."entitlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"feature" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"limits" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "on_education"."entitlements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "on_education"."guardians" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"full_name" text NOT NULL,
	"email" text,
	"phone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "on_education"."guardians" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "on_education"."invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" "on_education"."role" NOT NULL,
	"token" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "on_education"."invitations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "on_education"."memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "on_education"."role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "on_education"."memberships" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "on_education"."plans" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"tenant_type" "on_education"."tenant_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "on_education"."student_guardians" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"guardian_id" uuid NOT NULL,
	"relation" text,
	"is_financial" boolean DEFAULT false NOT NULL,
	"can_pickup" boolean DEFAULT false NOT NULL,
	"is_emergency" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "on_education"."student_guardians" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "on_education"."students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"class_id" uuid,
	"full_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "on_education"."students" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "on_education"."subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "on_education"."subjects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "on_education"."subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"plan_id" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "on_education"."subscriptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "on_education"."tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_type" "on_education"."tenant_type" NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "on_education"."tenants" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "on_education"."terms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"academic_year_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "on_education"."terms" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "on_education"."units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "on_education"."units" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "on_education"."usage_meters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"metric" text NOT NULL,
	"period" text NOT NULL,
	"used" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "on_education"."usage_meters" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "on_education"."users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"full_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "academic_years_tenant_idx" ON "on_education"."academic_years" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "activities_tenant_idx" ON "on_education"."activities" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "ai_drafts_tenant_idx" ON "on_education"."ai_drafts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "audit_log_tenant_idx" ON "on_education"."audit_log" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "classes_tenant_idx" ON "on_education"."classes" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "entitlements_tenant_feature_uq" ON "on_education"."entitlements" USING btree ("tenant_id","feature");--> statement-breakpoint
CREATE INDEX "guardians_tenant_idx" ON "on_education"."guardians" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "invitations_tenant_idx" ON "on_education"."invitations" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invitations_token_uq" ON "on_education"."invitations" USING btree ("token");--> statement-breakpoint
CREATE INDEX "memberships_tenant_idx" ON "on_education"."memberships" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_tenant_user_role_uq" ON "on_education"."memberships" USING btree ("tenant_id","user_id","role");--> statement-breakpoint
CREATE UNIQUE INDEX "student_guardians_uq" ON "on_education"."student_guardians" USING btree ("tenant_id","student_id","guardian_id");--> statement-breakpoint
CREATE INDEX "students_tenant_idx" ON "on_education"."students" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "students_class_idx" ON "on_education"."students" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "subjects_tenant_idx" ON "on_education"."subjects" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "subscriptions_tenant_idx" ON "on_education"."subscriptions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "terms_tenant_idx" ON "on_education"."terms" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "units_tenant_idx" ON "on_education"."units" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "usage_meters_tenant_metric_period_uq" ON "on_education"."usage_meters" USING btree ("tenant_id","metric","period");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "on_education"."users" USING btree ("email");--> statement-breakpoint
CREATE POLICY "academic_years_tenant_isolation" ON "on_education"."academic_years" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "activities_tenant_isolation" ON "on_education"."activities" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "ai_drafts_tenant_isolation" ON "on_education"."ai_drafts" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "audit_log_tenant_isolation" ON "on_education"."audit_log" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "classes_tenant_isolation" ON "on_education"."classes" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "entitlements_tenant_isolation" ON "on_education"."entitlements" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "guardians_tenant_isolation" ON "on_education"."guardians" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "invitations_tenant_isolation" ON "on_education"."invitations" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "memberships_tenant_isolation" ON "on_education"."memberships" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "student_guardians_tenant_isolation" ON "on_education"."student_guardians" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "students_tenant_isolation" ON "on_education"."students" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "subjects_tenant_isolation" ON "on_education"."subjects" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "subscriptions_tenant_isolation" ON "on_education"."subscriptions" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "tenants_self_isolation" ON "on_education"."tenants" AS PERMISSIVE FOR ALL TO public USING (id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (id = current_setting('app.tenant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "terms_tenant_isolation" ON "on_education"."terms" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "units_tenant_isolation" ON "on_education"."units" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "usage_meters_tenant_isolation" ON "on_education"."usage_meters" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL not set'); process.exit(1); }
const sql = postgres(DATABASE_URL, { ssl: 'require' });

const stmts = [
  `CREATE TABLE IF NOT EXISTS on_education.school_calendar_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    date date NOT NULL,
    name text NOT NULL,
    type text NOT NULL DEFAULT 'holiday',
    recurring boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid,
    deleted_at timestamptz
  )`,
  `DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'on_education' AND indexname = 'calendar_events_tenant_idx') THEN
       CREATE INDEX calendar_events_tenant_idx ON on_education.school_calendar_events (tenant_id);
     END IF;
   END $$`,
  `DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'on_education' AND tablename = 'school_calendar_events' AND policyname = 'calendar_events_tenant_isolation') THEN
       CREATE POLICY calendar_events_tenant_isolation ON on_education.school_calendar_events
         USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
     END IF;
   END $$`,
  `ALTER TABLE on_education.school_calendar_events ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE on_education.tenants
     ADD COLUMN IF NOT EXISTS school_year_start date,
     ADD COLUMN IF NOT EXISTS school_year_end date`,
];

for (const stmt of stmts) {
  try { await sql.unsafe(stmt); console.log('OK:', stmt.slice(0, 60).replace(/\n/g, ' ')); }
  catch (e) { console.error('FAIL:', e.message); }
}
await sql.end();
console.log('Done.');

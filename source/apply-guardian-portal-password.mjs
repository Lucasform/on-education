/**
 * Applies guardian portal password columns to the database.
 * Run once: node apply-guardian-portal-password.mjs
 */
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { ssl: 'require' });

const statements = [
  `ALTER TABLE on_education.guardians
     ADD COLUMN IF NOT EXISTS portal_password_hash text,
     ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false`,
];

for (const stmt of statements) {
  try {
    await sql.unsafe(stmt);
    console.log('OK:', stmt.slice(0, 60));
  } catch (e) {
    console.error('FAIL:', e.message);
  }
}

await sql.end();
console.log('Done.');

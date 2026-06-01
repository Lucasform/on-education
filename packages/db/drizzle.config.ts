import { defineConfig } from 'drizzle-kit';

/**
 * `db:generate` (gera SQL a partir do schema) NÃO precisa de banco.
 * `db:migrate` precisa de DATABASE_URL (rode contra Postgres/Supabase).
 */
export default defineConfig({
  schema: './src/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
  strict: true,
  verbose: true,
});

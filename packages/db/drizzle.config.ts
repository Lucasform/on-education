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
  // Isolamento: só enxergamos/gerenciamos o schema on_education (nunca o public de outros
  // produtos no mesmo banco) e o journal de migrations vive no próprio on_education.
  schemaFilter: ['on_education'],
  migrations: { schema: 'drizzle_oe', table: '__drizzle_migrations' },
  strict: true,
  verbose: true,
});

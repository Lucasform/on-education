import { fileURLToPath } from 'node:url';

import { migrate } from 'drizzle-orm/postgres-js/migrator';

import type { Database } from './client';

/** Pasta de migrations gerada por `drizzle-kit generate`. */
export const MIGRATIONS_FOLDER = fileURLToPath(new URL('../drizzle', import.meta.url));

/**
 * Aplica as migrations programaticamente (usado em testes/setup). Usa o MESMO journal
 * isolado do drizzle.config (`drizzle_oe`), para não divergir do `drizzle-kit migrate` nem
 * tocar no journal de outros produtos no mesmo banco.
 */
export async function runMigrations(db: Database): Promise<void> {
  await migrate(db, {
    migrationsFolder: MIGRATIONS_FOLDER,
    migrationsSchema: 'drizzle_oe',
    migrationsTable: '__drizzle_migrations',
  });
}

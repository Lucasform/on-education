export * from './schema';
export * from './client';
// `migrate` NÃO é reexportado aqui de propósito: ele referencia a pasta ../drizzle via
// `new URL(..., import.meta.url)`, que o bundler do Next tenta resolver como módulo.
// Importe de '@on-education/db/migrate' (usado só em testes/scripts server-side).

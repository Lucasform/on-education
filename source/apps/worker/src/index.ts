import { initSentry, loadEnv, logger } from '@on-education/config';

/**
 * Esqueleto do worker (Master Spec §4.5): jobs assíncronos, IA pesada, lotes.
 * Fase 0 só prova o boot + carga de env. Filas (pg-boss/Inngest) entram quando houver job real.
 */
async function main(): Promise<void> {
  const env = loadEnv();
  initSentry(env.SENTRY_DSN);
  logger.info('worker iniciado', { env: env.NODE_ENV });

  // TODO(fases seguintes): registrar consumidores de fila aqui (régua de cobrança,
  // comunicados em massa, IA em lote). Nenhum job ativo na Fase 0.
}

main().catch((err: unknown) => {
  logger.error('worker falhou ao iniciar', {
    error: err instanceof Error ? err.message : 'unknown',
  });
  process.exitCode = 1;
});

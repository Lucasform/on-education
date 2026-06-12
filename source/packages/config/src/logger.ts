/**
 * Logger estruturado mínimo (Master Spec §8.3). Regras: JSON, com request id + tenant id,
 * SEM PII (Master Spec §7.4). Não logar nome, e-mail, documento, conteúdo de aluno etc.
 * Substituir por pino/OpenTelemetry quando crescer; a interface permanece.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  requestId?: string;
  tenantId?: string;
  [key: string]: unknown;
}

function emit(level: LogLevel, message: string, context: LogContext = {}): void {
  const line = JSON.stringify({ level, message, ...context, ts: new Date().toISOString() });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.warn(line); // info/debug via stderr p/ não poluir stdout de jobs
}

export const logger = {
  debug: (m: string, c?: LogContext) => emit('debug', m, c),
  info: (m: string, c?: LogContext) => emit('info', m, c),
  warn: (m: string, c?: LogContext) => emit('warn', m, c),
  error: (m: string, c?: LogContext) => emit('error', m, c),
};

/**
 * Inicialização do Sentry — placeholder (Master Spec §8.3). Só ativa se SENTRY_DSN existir.
 * A integração real (@sentry/node / @sentry/nextjs) entra quando formos para staging.
 */
export function initSentry(dsn: string | undefined): void {
  if (!dsn) return;
  logger.info('sentry: DSN presente, integração será inicializada (placeholder)');
}

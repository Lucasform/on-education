/**
 * Logger estruturado (JSON) — ponto único de observabilidade do produto.
 *
 * Por que estruturado: no Vercel/qualquer coletor, log em JSON vira campo pesquisável
 * (filtrar por level, tenantId, etc.). É a base para plugar Sentry/Datadog depois sem
 * mudar os call-sites: basta trocar o `emit`.
 *
 * Regra de PII (Master Spec §7.4): NUNCA logar nome, e-mail, conteúdo de aluno. Só ids
 * (UUID), métricas e mensagens de erro técnicas.
 */
type Level = 'debug' | 'info' | 'warn' | 'error';

export interface LogFields {
  [key: string]: unknown;
}

function serializeError(e: unknown): LogFields {
  if (e instanceof Error) {
    return { error: e.message, errorName: e.name, stack: e.stack };
  }
  return { error: String(e) };
}

function emit(level: Level, msg: string, fields?: LogFields): void {
  let entry: string;
  try {
    entry = JSON.stringify({ level, msg, ts: new Date().toISOString(), ...fields });
  } catch {
    // Campo não serializável: degrada para a mensagem pura em vez de quebrar o log.
    entry = JSON.stringify({ level, msg, ts: new Date().toISOString() });
  }
  // eslint-disable-next-line no-console
  if (level === 'error') console.error(entry);
  // eslint-disable-next-line no-console
  else if (level === 'warn') console.warn(entry);
  // eslint-disable-next-line no-console
  else console.log(entry);
}

export const logger = {
  debug: (msg: string, fields?: LogFields) => emit('debug', msg, fields),
  info: (msg: string, fields?: LogFields) => emit('info', msg, fields),
  warn: (msg: string, fields?: LogFields) => emit('warn', msg, fields),
  /**
   * Loga um erro. Aceita o erro como 2º argumento (serializado em `error`/`stack`) e
   * campos extras como 3º. Ex.: `logger.error('db falhou', e, { tenantId })`.
   */
  error: (msg: string, err?: unknown, fields?: LogFields) =>
    emit('error', msg, { ...(err !== undefined ? serializeError(err) : {}), ...fields }),
};

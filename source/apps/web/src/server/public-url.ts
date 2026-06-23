import 'server-only';

import { loadEnv } from '@on-education/config';

const FALLBACK = 'https://eduonway.com';

/**
 * Base pública OFICIAL para montar links de auth (confirmação de e-mail, reset, 2FA).
 * Prioridade: APP_PUBLIC_URL → o origin da requisição (exceto domínios .vercel.app) → eduonway.com.
 * Nunca devolve a URL de preview da Vercel, para os e-mails saírem sempre com o domínio oficial.
 */
export function publicBaseUrl(origin?: string | null): string {
  const env = loadEnv().APP_PUBLIC_URL?.replace(/\/+$/, '');
  if (env) return env;
  if (origin) {
    try {
      const host = new URL(origin).host;
      if (!/\.vercel\.app$/i.test(host)) return origin.replace(/\/+$/, '');
    } catch {
      // origin malformado: cai no oficial
    }
  }
  return FALLBACK;
}

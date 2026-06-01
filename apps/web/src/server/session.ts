import 'server-only';

import crypto from 'node:crypto';

import { requireEnv } from '@on-education/config';
import type { AuthContext } from '@on-education/auth';
import { cookies } from 'next/headers';

/**
 * Sessão de DESENVOLVIMENTO (stopgap até o Supabase Auth). A cookie é assinada por HMAC
 * com `DEV_SESSION_SECRET` no servidor: o client NÃO consegue forjar `tenantId`, então o
 * invariante "tenant_id vem da sessão, nunca do client" (Master Spec §7.4) é preservado.
 *
 * TODO(1B.1): trocar por adapter de Supabase Auth — resolver AuthContext a partir do
 * usuário autenticado + lookup de membership. A interface pública (getAuthContext) fica igual.
 */
const COOKIE = 'oe_session';

function sign(payload: string): string {
  return crypto
    .createHmac('sha256', requireEnv('DEV_SESSION_SECRET'))
    .update(payload)
    .digest('base64url');
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

export async function setSession(ctx: AuthContext): Promise<void> {
  const payload = Buffer.from(JSON.stringify(ctx)).toString('base64url');
  const value = `${payload}.${sign(payload)}`;
  (await cookies()).set(COOKIE, value, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [payload, sig] = raw.split('.');
  if (!payload || !sig || !safeEqual(sig, sign(payload))) return null;
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as AuthContext;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

export const GUARDIAN_SESSION_COOKIE = 'oe_guardian_session';

function getSecret(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXTAUTH_SECRET ?? 'dev-fallback';
  return key;
}

function sign(guardianId: string, tenantId: string): string {
  const payload = `${guardianId}:${tenantId}`;
  const hmac = createHmac('sha256', getSecret()).update(payload).digest('hex');
  return `${payload}:${hmac}`;
}

function verify(cookie: string): { guardianId: string; tenantId: string } | null {
  const parts = cookie.split(':');
  if (parts.length !== 3) return null;
  const [guardianId, tenantId, hmac] = parts;
  if (!guardianId || !tenantId || !hmac) return null;
  const expected = createHmac('sha256', getSecret()).update(`${guardianId}:${tenantId}`).digest('hex');
  try {
    if (!timingSafeEqual(Buffer.from(hmac, 'hex'), Buffer.from(expected, 'hex'))) return null;
  } catch {
    return null;
  }
  return { guardianId, tenantId };
}

export async function setGuardianSession(guardianId: string, tenantId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(GUARDIAN_SESSION_COOKIE, sign(guardianId, tenantId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 90, // 90 days
    path: '/portal',
  });
}

export async function getGuardianSession(): Promise<{ guardianId: string; tenantId: string } | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(GUARDIAN_SESSION_COOKIE)?.value;
  if (!value) return null;
  return verify(value);
}

export async function clearGuardianSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(GUARDIAN_SESSION_COOKIE);
}

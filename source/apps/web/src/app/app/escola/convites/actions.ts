'use server';

import { memberships } from '@on-education/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { db } from '@/server/db';
import { STAFF_ROLES } from '@/lib/roles';
import { getAuthContext } from '@/server/session';
import { createSupabaseAdmin } from '@/server/supabase';

type StaffRole = (typeof STAFF_ROLES)[number];

async function requireSchoolCtx() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  if (ctx.tenantType !== 'organization') redirect('/app');
  return ctx;
}

/**
 * Cria um usuário diretamente com e-mail e senha sem precisar de fluxo de convite.
 * Marca `must_change_password: true` nos metadados para forçar troca no primeiro acesso.
 */
export async function createMemberDirectAction(formData: FormData): Promise<void> {
  const ctx = await requireSchoolCtx();

  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const name = String(formData.get('name') ?? '').trim();
  const rawRole = String(formData.get('role') ?? 'teacher');
  const role = (STAFF_ROLES as readonly string[]).includes(rawRole)
    ? (rawRole as StaffRole)
    : ('teacher' as StaffRole);
  const password = String(formData.get('password') ?? '').trim();

  if (!email || !password || password.length < 6) return;

  const admin = createSupabaseAdmin();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: name || null,
      must_change_password: true,
    },
  });

  if (error || !data.user) {
    throw new Error(error?.message ?? 'Erro ao criar usuário.');
  }

  const userId = data.user.id;

  await db().withTenant(ctx.tenantId, (tx) =>
    tx.insert(memberships).values({
      tenantId: ctx.tenantId,
      userId,
      role,
      createdBy: ctx.userId,
    }),
  );

  revalidatePath('/app/escola/quadro');
  revalidatePath('/app/escola/convites');
}

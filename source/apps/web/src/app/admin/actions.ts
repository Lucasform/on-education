'use server';

import {
  applyComboPlanForTenant,
  createCustomFieldDef,
  CUSTOM_FIELD_TYPES,
  type CustomFieldType,
  deleteActivityAdmin,
  deleteCustomFieldDef,
  purgeTenant,
  removeMembership,
  restoreTenant,
  setTenantClient,
  setTenantEntitlements,
  softDeleteTenant,
} from '@on-education/module-nucleo';
import { FEATURES, type Feature } from '@on-education/entitlements';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { db } from '@/server/db';
import { emailHtml, escapeHtml, isEmailConfigured, sendEmail } from '@/server/email';
import { getSuperAdminEmail, IMPERSONATION_COOKIE } from '@/server/session';

/** Barreira: server actions de admin podem ser chamadas direto — exige super-admin. */
async function requireSuperAdmin(): Promise<void> {
  if (!(await getSuperAdminEmail())) throw new Error('Acesso restrito ao administrador.');
}

/**
 * Super-admin "entra como" um tenant (view-as). Guarda `tenantId|tenantType` no cookie para
 * que a sessão de impersonação seja montada sem consultar o banco a cada navegação.
 */
export async function enterTenantAction(formData: FormData): Promise<void> {
  const tenantId = String(formData.get('tenantId') ?? '');
  const tenantType = String(formData.get('tenantType') ?? '');
  if (!tenantId) return;
  const value =
    tenantType === 'organization' || tenantType === 'individual'
      ? `${tenantId}|${tenantType}`
      : tenantId;
  (await cookies()).set(IMPERSONATION_COOKIE, value, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: 60 * 60 * 8,
  });
  redirect('/app');
}

export async function exitImpersonationAction(): Promise<void> {
  (await cookies()).delete(IMPERSONATION_COOKIE);
  redirect('/admin');
}

// --- Exclusão de escola (super-admin) ----------------------------------------

export async function softDeleteTenantAction(formData: FormData): Promise<void> {
  await softDeleteTenant(db(), String(formData.get('tenantId')));
  revalidatePath('/admin');
}

export async function restoreTenantAction(formData: FormData): Promise<void> {
  await restoreTenant(db(), String(formData.get('tenantId')));
  revalidatePath('/admin');
}

/**
 * Remove o acesso de um usuário a uma conta (membership). Opcionalmente avisa por e-mail.
 * Recusa silenciosamente remover o dono (a função de domínio protege contra orfanar a conta).
 */
export async function removeUserAction(formData: FormData): Promise<void> {
  const tenantId = String(formData.get('tenantId') ?? '');
  const userId = String(formData.get('userId') ?? '');
  if (!tenantId || !userId) return;

  const isOwner = String(formData.get('owner') ?? '') === 'true';
  const notify = String(formData.get('notify') ?? '') === 'on';
  const email = String(formData.get('email') ?? '').trim();
  const name = String(formData.get('name') ?? '').trim();
  const tenantName = String(formData.get('tenantName') ?? '').trim() || 'a instituição';
  const canEmail = notify && email && isEmailConfigured();

  if (isOwner) {
    // Excluir o dono = apagar a CONTA inteira. As atividades sao preservadas no Banco Geral
    // (purgeTenant move antes de apagar o resto).
    await purgeTenant(db(), tenantId);
    if (canEmail) {
      await sendEmail({
        to: email,
        subject: 'Sua conta no Edu On Way foi removida',
        html: emailHtml(
          'Conta removida',
          `<p>Olá${name ? ` ${escapeHtml(name)}` : ''},</p>` +
            `<p>A conta <strong>${escapeHtml(tenantName)}</strong> no Edu On Way foi removida pela administração.</p>` +
            `<p>Se você acredita que foi um engano, entre em contato conosco.</p>`,
        ),
        text: `A conta ${tenantName} no Edu On Way foi removida pela administração.`,
      });
    }
  } else {
    const result = await removeMembership(db(), tenantId, userId);
    if (result.ok && canEmail) {
      await sendEmail({
        to: email,
        subject: 'Seu acesso ao Edu On Way foi removido',
        html: emailHtml(
          'Acesso removido',
          `<p>Olá${name ? ` ${escapeHtml(name)}` : ''},</p>` +
            `<p>Seu acesso a <strong>${escapeHtml(tenantName)}</strong> no Edu On Way foi removido pela administração.</p>` +
            `<p>Se você acredita que foi um engano, fale com a sua instituição.</p>`,
        ),
        text: `Seu acesso a ${tenantName} no Edu On Way foi removido pela administração.`,
      });
    }
  }
  revalidatePath('/admin/usuarios');
  revalidatePath('/admin');
  revalidatePath('/admin/contas');
}

/** Exclui definitivamente uma atividade (limpeza do admin, ex.: no Banco Geral). */
export async function deleteActivityAdminAction(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  await deleteActivityAdmin(db(), id);
  revalidatePath('/admin/atividades');
}

/** Exclui em LOTE as atividades selecionadas (admin). */
export async function bulkDeleteActivitiesAdminAction(formData: FormData): Promise<void> {
  await requireSuperAdmin();
  const ids = formData.getAll('ids').map(String).filter(Boolean);
  for (const id of ids) await deleteActivityAdmin(db(), id).catch(() => {});
  revalidatePath('/admin/atividades');
}

/** Marca/desmarca o tenant como cliente pagante (CRM do super-admin). */
export async function toggleTenantClientAction(formData: FormData): Promise<void> {
  const tenantId = String(formData.get('tenantId') ?? '');
  if (!tenantId) return;
  const next = String(formData.get('isClient') ?? '') === 'true';
  await setTenantClient(db(), tenantId, next);
  revalidatePath('/admin/contas');
  revalidatePath(`/admin/contas/${tenantId}`);
}

/**
 * Define EXATAMENTE os recursos liberados da conta (override de admin). Lê os checkboxes
 * marcados (`feature`) e sincroniza os entitlements. Sem mínimo: o admin libera o que quiser.
 */
export async function setTenantFeaturesAction(formData: FormData): Promise<void> {
  await requireSuperAdmin();
  const tenantId = String(formData.get('tenantId') ?? '');
  if (!tenantId) return;
  const valid = new Set<string>(FEATURES);
  const features = formData
    .getAll('feature')
    .map((f) => String(f))
    .filter((f) => valid.has(f)) as Feature[];
  await setTenantEntitlements(db(), tenantId, features);
  revalidatePath(`/admin/contas/${tenantId}`);
}

/** Aplica um plano combo à conta (define assinatura + liga as features do plano). */
export async function applyPlanToTenantAction(formData: FormData): Promise<void> {
  await requireSuperAdmin();
  const tenantId = String(formData.get('tenantId') ?? '');
  const planId = String(formData.get('planId') ?? '');
  if (!tenantId || !planId) return;
  await applyComboPlanForTenant(db(), tenantId, planId);
  revalidatePath(`/admin/contas/${tenantId}`);
}

/** Cria um campo personalizado para uma entidade da conta (setup do admin). */
export async function createCustomFieldAction(formData: FormData): Promise<void> {
  await requireSuperAdmin();
  const tenantId = String(formData.get('tenantId') ?? '');
  const entity = String(formData.get('entity') ?? 'student');
  const label = String(formData.get('label') ?? '').trim();
  const typeRaw = String(formData.get('fieldType') ?? 'text');
  const fieldType = (CUSTOM_FIELD_TYPES as readonly string[]).includes(typeRaw)
    ? (typeRaw as CustomFieldType)
    : 'text';
  if (!tenantId || !label) return;
  const options = String(formData.get('options') ?? '')
    .split('\n')
    .map((o) => o.trim())
    .filter(Boolean);
  const required = String(formData.get('required') ?? '') === 'on';
  await createCustomFieldDef(db(), tenantId, { entity, label, fieldType, options, required });
  revalidatePath(`/admin/contas/${tenantId}/campos`);
}

/** Remove um campo personalizado da conta. */
export async function deleteCustomFieldAction(formData: FormData): Promise<void> {
  await requireSuperAdmin();
  const tenantId = String(formData.get('tenantId') ?? '');
  const id = String(formData.get('id') ?? '');
  if (!tenantId || !id) return;
  await deleteCustomFieldDef(db(), tenantId, id);
  revalidatePath(`/admin/contas/${tenantId}/campos`);
}

/** Exclusão DEFINITIVA: exige o nome digitado bater com o nome da escola. */
export async function purgeTenantAction(formData: FormData): Promise<void> {
  const tenantId = String(formData.get('tenantId'));
  const confirmName = String(formData.get('confirmName') ?? '').trim();
  const realName = String(formData.get('tenantName') ?? '').trim();
  if (!confirmName || confirmName !== realName) {
    throw new Error('Confirmação não confere: digite o nome exato da escola para excluir.');
  }
  await purgeTenant(db(), tenantId);
  revalidatePath('/admin');
}

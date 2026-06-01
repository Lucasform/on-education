import crypto from 'node:crypto';

import { assertCan, type AuthContext } from '@on-education/auth';
import {
  type DbClient,
  entitlements,
  invitations,
  memberships,
  subscriptions,
  tenants,
  units,
  usageMeters,
} from '@on-education/db';
import { PLANS } from '@on-education/entitlements';
import type {
  CreateUnitInput,
  InviteMemberInput,
  OrganizationSignupInput,
} from '@on-education/validation';
import { and, eq } from 'drizzle-orm';

/** Plano default da escola no onboarding (Fase 1A.1). */
export const DEFAULT_ORG_PLAN = 'school_starter';

export interface ProvisionOrgResult {
  tenantId: string;
  planId: string;
  unitId: string;
}

/**
 * Provisiona uma escola (`organization`): tenant + membership owner/director + subscription
 * + entitlements semeados + medidor de IA + unidade "Sede". Operação ADMINISTRATIVA
 * (server-only, `client.db`) — roda antes de existir contexto de tenant (ver ADR 0003).
 */
export async function provisionOrganizationTenant(
  client: DbClient,
  ownerUserId: string,
  input: OrganizationSignupInput,
): Promise<ProvisionOrgResult> {
  const plan = PLANS[DEFAULT_ORG_PLAN];
  if (!plan) throw new Error(`Plano default ausente no catálogo: ${DEFAULT_ORG_PLAN}`);

  return client.db.transaction(async (tx) => {
    const tenantRows = await tx
      .insert(tenants)
      .values({ tenantType: 'organization', name: input.schoolName, createdBy: ownerUserId })
      .returning({ id: tenants.id });
    const tenantId = tenantRows[0]?.id;
    if (!tenantId) throw new Error('Falha ao criar tenant organization.');

    await tx.insert(memberships).values([
      { tenantId, userId: ownerUserId, role: 'owner', createdBy: ownerUserId },
      { tenantId, userId: ownerUserId, role: 'director', createdBy: ownerUserId },
    ]);

    await tx
      .insert(subscriptions)
      .values({ tenantId, planId: DEFAULT_ORG_PLAN, createdBy: ownerUserId });

    const featureRows = [...plan.features].map((feature) => ({
      tenantId,
      feature,
      enabled: true,
      createdBy: ownerUserId,
    }));
    if (featureRows.length > 0) await tx.insert(entitlements).values(featureRows);

    await tx.insert(usageMeters).values({
      tenantId,
      metric: 'ai_tokens',
      period: new Date().toISOString().slice(0, 7),
      used: 0,
      createdBy: ownerUserId,
    });

    const unitRows = await tx
      .insert(units)
      .values({ tenantId, name: 'Sede', createdBy: ownerUserId })
      .returning({ id: units.id });

    return { tenantId, planId: DEFAULT_ORG_PLAN, unitId: unitRows[0]!.id };
  });
}

export async function createUnit(client: DbClient, ctx: AuthContext, input: CreateUnitInput) {
  assertCan(ctx, 'create', 'unit');
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .insert(units)
      .values({ tenantId: ctx.tenantId, name: input.name, createdBy: ctx.userId })
      .returning();
    return rows[0]!;
  });
}

export async function listUnits(client: DbClient, ctx: AuthContext) {
  assertCan(ctx, 'read', 'unit');
  return client.withTenant(ctx.tenantId, (tx) => tx.select().from(units));
}

/** Cria um convite (RBAC: admin do tenant). Retorna o registro com o token. */
export async function inviteMember(client: DbClient, ctx: AuthContext, input: InviteMemberInput) {
  assertCan(ctx, 'create', 'invitation');
  const token = crypto.randomBytes(24).toString('base64url');
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .insert(invitations)
      .values({
        tenantId: ctx.tenantId,
        email: input.email,
        role: input.role,
        token,
        status: 'pending',
        createdBy: ctx.userId,
      })
      .returning();
    return rows[0]!;
  });
}

export async function listInvitations(client: DbClient, ctx: AuthContext) {
  assertCan(ctx, 'read', 'invitation');
  return client.withTenant(ctx.tenantId, (tx) => tx.select().from(invitations));
}

export interface AcceptInvitationResult {
  tenantId: string;
  role: string;
}

/**
 * Aceita um convite por token e cria a membership. ADMINISTRATIVO (server-only, `client.db`):
 * o usuário convidado ainda não tem contexto de tenant, então o lookup do token e a criação da
 * membership rodam fora do RLS (ver ADR 0003). Idempotência: só aceita convite `pending`.
 */
export async function acceptInvitation(
  client: DbClient,
  token: string,
  userId: string,
): Promise<AcceptInvitationResult> {
  return client.db.transaction(async (tx) => {
    const found = await tx
      .select()
      .from(invitations)
      .where(and(eq(invitations.token, token), eq(invitations.status, 'pending')));
    const invite = found[0];
    if (!invite) throw new Error('Convite inválido ou já utilizado.');

    await tx
      .insert(memberships)
      .values({ tenantId: invite.tenantId, userId, role: invite.role, createdBy: userId });
    await tx
      .update(invitations)
      .set({ status: 'accepted', updatedAt: new Date() })
      .where(eq(invitations.id, invite.id));

    return { tenantId: invite.tenantId, role: invite.role };
  });
}

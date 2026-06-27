import {
  collectionLogs,
  type DbClient,
  invoices,
  portalMessages,
  tenantSettings,
} from '@on-education/db';
import { and, eq, lt } from 'drizzle-orm';

import { listAllTenants } from './admin';

/**
 * Régua de cobrança automática (#7). Opt-in por escola (tenant_settings.dunning_enabled).
 * Roda no cron diário: para cada fatura em aberto e vencida, descobre o estágio mais alto
 * atingido por dias de atraso e, se ainda não cobrou aquele estágio (índice único invoice+stage),
 * envia um lembrete educado pelo portal do responsável. Idempotente: nunca cobra o mesmo
 * estágio duas vezes. Canal hoje é o portal; WhatsApp/e-mail entram como novos canais depois.
 */

const STAGES = [
  {
    stage: 3,
    minDays: 15,
    body:
      'Olá! A mensalidade está com atraso superior a 15 dias. Por favor, entre em contato com a ' +
      'secretaria para regularizar e evitar transtornos. Se o pagamento já foi feito, desconsidere.',
  },
  {
    stage: 2,
    minDays: 7,
    body:
      'Olá! A mensalidade segue em aberto há mais de uma semana. Pedimos a gentileza de regularizar ' +
      'quando possível. Estamos à disposição na secretaria. Se já pagou, desconsidere.',
  },
  {
    stage: 1,
    minDays: 1,
    body:
      'Olá! Notamos que a mensalidade está em aberto há poucos dias. Se já realizou o pagamento, ' +
      'desconsidere este aviso. Qualquer dúvida, fale com a secretaria.',
  },
] as const;

export function daysOverdue(dueDate: string, today: string): number {
  const ms = new Date(`${today}T00:00:00Z`).getTime() - new Date(`${dueDate}T00:00:00Z`).getTime();
  return Math.floor(ms / 86_400_000);
}

/** Estágio da régua para uma fatura com N dias de atraso (null = ainda não cobra). Puro, testável. */
export function dunningStageFor(days: number): number | null {
  const st = STAGES.find((s) => days >= s.minDays);
  return st ? st.stage : null;
}

export interface DunningSummary {
  tenants: number;
  sent: number;
  skipped: number;
}

/**
 * Executa a régua para todas as escolas que ativaram o opt-in. Usa client.db (sistema), pois o
 * cron não tem usuário logado; o escopo por tenant é explícito em cada consulta.
 */
export async function runDunning(client: DbClient, opts?: { today?: string }): Promise<DunningSummary> {
  const today = opts?.today ?? new Date().toISOString().slice(0, 10);
  const orgs = (await listAllTenants(client)).filter((t) => t.tenantType === 'organization');
  const summary: DunningSummary = { tenants: 0, sent: 0, skipped: 0 };

  for (const t of orgs) {
    const [cfg] = await client.db
      .select({ on: tenantSettings.dunningEnabled })
      .from(tenantSettings)
      .where(eq(tenantSettings.tenantId, t.id))
      .limit(1);
    if (!cfg?.on) continue;
    summary.tenants += 1;

    const vencidas = await client.db
      .select({ id: invoices.id, guardianId: invoices.guardianId, dueDate: invoices.dueDate })
      .from(invoices)
      .where(and(eq(invoices.tenantId, t.id), eq(invoices.status, 'aberto'), lt(invoices.dueDate, today)));

    for (const inv of vencidas) {
      if (!inv.guardianId) continue;
      const dias = daysOverdue(inv.dueDate, today);
      const st = STAGES.find((s) => dias >= s.minDays);
      if (!st) continue;

      // Idempotência: tenta gravar o log; se o estágio já existe, onConflict não insere nada.
      const inserted = await client.db
        .insert(collectionLogs)
        .values({ tenantId: t.id, invoiceId: inv.id, stage: st.stage, channel: 'portal' })
        .onConflictDoNothing()
        .returning({ id: collectionLogs.id });
      if (inserted.length === 0) {
        summary.skipped += 1;
        continue;
      }

      await client.db.insert(portalMessages).values({
        tenantId: t.id,
        guardianId: inv.guardianId,
        body: st.body,
        fromGuardian: false,
        target: 'coordenacao',
        authorName: 'Secretaria',
      });
      summary.sent += 1;
    }
  }

  return summary;
}

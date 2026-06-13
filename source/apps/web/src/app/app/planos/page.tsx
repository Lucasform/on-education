import { getTenantPlanId } from '@on-education/module-nucleo';
import { canUse, FEATURES, getPlan, PLANS } from '@on-education/entitlements';
import { CheckCircle2, XCircle } from 'lucide-react';
import { redirect } from 'next/navigation';

import { cardClass, PageHeader } from '@/components/form';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Planos · Edu On Way' };

const FEATURE_LABELS: Record<string, string> = {
  'ai.lessonPlan': 'Geração de planos de aula (WayOn)',
  'ai.activities': 'Geração de atividades e provas (WayOn)',
  'ai.essayGrading': 'Correção de redação e em lote (WayOn)',
  'ai.images': 'Geração de imagens (WayOn)',
  'activities.bank': 'Banco de atividades',
  'marketplace': 'Marketplace de conteúdo',
  'classes.manage': 'Turmas e alunos',
  'communication.light': 'Mensagens e comunicados',
  'communication.mass': 'Comunicação em massa (WhatsApp)',
  'finance.institutional': 'Gestão financeira (mensalidades)',
  'enrollment.official': 'Matrícula oficial',
  'analytics.director': 'Relatórios e dashboards avançados',
};

const PLAN_LABELS: Record<string, { name: string; badge: string; color: string }> = {
  teacher_free: { name: 'Professor Gratuito', badge: 'Grátis', color: 'bg-muted text-muted-foreground' },
  teacher_pro:  { name: 'Professor Pro',      badge: 'Pro',    color: 'bg-primary/15 text-primary' },
  school_starter: { name: 'Escola Starter',   badge: 'Starter', color: 'bg-blue-500/15 text-blue-600' },
  school_full:    { name: 'Escola Full',       badge: 'Full',    color: 'bg-emerald-500/15 text-emerald-600' },
};

const LIMITS_LABELS: Record<string, string> = {
  aiTokensPerMonth: 'Tokens IA/mês',
  students: 'Alunos',
  imagesPerMonth: 'Imagens/mês',
};

function fmt(val: number | undefined): string {
  if (val === undefined) return '—';
  if (val === -1) return 'Ilimitado';
  return val.toLocaleString('pt-BR');
}

export default async function PlanosPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');

  const planId = await getTenantPlanId(db(), ctx.tenantId).catch(() => null);
  const currentPlan = planId ? getPlan(planId) : null;

  const relevantPlanIds = ctx.tenantType === 'individual'
    ? ['teacher_free', 'teacher_pro']
    : ['school_starter', 'school_full'];

  const plans = relevantPlanIds.map((id) => ({ id, def: PLANS[id]! }));

  return (
    <>
      <PageHeader
        title="Planos"
        description="Compare os recursos disponíveis em cada plano e solicite um upgrade."
      />

      {/* Plano atual */}
      {currentPlan && (
        <div className={`${cardClass} border-primary/40 bg-primary/5`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Seu plano atual</p>
              <p className="text-xl font-semibold">{PLAN_LABELS[planId!]?.name ?? planId}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-sm font-medium ${PLAN_LABELS[planId!]?.color ?? 'bg-muted'}`}>
              {PLAN_LABELS[planId!]?.badge ?? planId}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            {Object.entries(currentPlan.limits).map(([k, v]) => (
              <span key={k} className="text-muted-foreground">
                {LIMITS_LABELS[k] ?? k}: <span className="font-medium text-foreground">{fmt(v)}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tabela comparativa */}
      <div className={cardClass}>
        <h2 className="mb-4 text-sm font-medium">Comparativo de planos</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-3 pr-4 text-left font-medium text-muted-foreground">Recurso</th>
                {plans.map(({ id }) => (
                  <th key={id} className="pb-3 px-3 text-center font-medium">
                    <div className="flex flex-col items-center gap-1">
                      <span>{PLAN_LABELS[id]?.name ?? id}</span>
                      {id === planId && (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                          atual
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((feature) => (
                <tr key={feature} className="border-b border-border/50 last:border-0">
                  <td className="py-2 pr-4 text-muted-foreground">
                    {FEATURE_LABELS[feature] ?? feature}
                  </td>
                  {plans.map(({ id }) => (
                    <td key={id} className="py-2 px-3 text-center">
                      {canUse(id, feature) ? (
                        <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-500" />
                      ) : (
                        <XCircle className="mx-auto h-4 w-4 text-muted-foreground/30" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              {/* Limites */}
              {Object.keys(LIMITS_LABELS).map((metric) => (
                <tr key={metric} className="border-b border-border/50 last:border-0 bg-muted/30">
                  <td className="py-2 pr-4 font-medium">{LIMITS_LABELS[metric]}</td>
                  {plans.map(({ id }) => (
                    <td key={id} className="py-2 px-3 text-center font-medium">
                      {fmt(PLANS[id]?.limits[metric])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CTA de upgrade */}
      {planId !== relevantPlanIds[relevantPlanIds.length - 1] && (
        <div className={`${cardClass} text-center`}>
          <p className="text-base font-semibold">Quer mais recursos?</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Entre em contato para fazer o upgrade do seu plano.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <a
              href="mailto:contato@onway.com.br?subject=Upgrade de plano"
              className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Solicitar upgrade por e-mail
            </a>
            <a
              href="https://wa.me/5511999999999?text=Quero+fazer+upgrade+do+meu+plano+Edu+On+Way"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-border px-5 py-2 text-sm font-medium hover:bg-accent"
            >
              Falar no WhatsApp
            </a>
          </div>
        </div>
      )}

      {planId === relevantPlanIds[relevantPlanIds.length - 1] && (
        <div className={`${cardClass} border-emerald-500/30 bg-emerald-500/5 text-center`}>
          <p className="text-sm font-medium text-emerald-600">
            Você está no plano mais completo. Aproveite todos os recursos!
          </p>
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Dúvidas?{' '}
        <a href="mailto:contato@onway.com.br" className="text-primary underline-offset-4 hover:underline">
          contato@onway.com.br
        </a>
      </p>
    </>
  );
}

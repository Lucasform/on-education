import { getTenantPlanId } from '@on-education/module-nucleo';
import { getPlan } from '@on-education/entitlements';
import { redirect } from 'next/navigation';

import { cardClass, PageHeader } from '@/components/form';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Planos · Edu On Way' };

const TEACHER_PLANS = [
  {
    id: 'teacher_free',
    name: 'Professor Gratuito',
    badge: 'Grátis',
    color: 'border-border bg-card',
    badgeColor: 'bg-muted text-muted-foreground',
    benefits: [
      'Turmas e alunos ilimitados',
      'Banco de atividades completo',
      'Calendário e comunicados',
      'Geração de conteúdo com IA (cota mensal)',
      'Chamada e diário de classe',
    ],
  },
  {
    id: 'teacher_pro',
    name: 'Professor Pro',
    badge: 'Pro',
    color: 'border-primary/40 bg-primary/5',
    badgeColor: 'bg-primary/15 text-primary',
    benefits: [
      'Tudo do plano Gratuito',
      'Geração de IA ampliada (muito mais conteúdo por mês)',
      'Correção de redação e provas em lote com IA',
      'Geração de imagens didáticas',
      'Flashcards e simulados com IA',
      'Suporte prioritário',
    ],
  },
];

const SCHOOL_PLANS = [
  {
    id: 'school_starter',
    name: 'Escola Starter',
    badge: 'Starter',
    color: 'border-blue-500/30 bg-blue-500/5',
    badgeColor: 'bg-blue-500/15 text-blue-600',
    benefits: [
      'Alunos, turmas e professores ilimitados',
      'Banco coletivo de atividades para toda a equipe',
      'Comunicados e mural dos pais',
      'Matrículas e gestão financeira',
      'Geração de conteúdo com IA para todos os professores',
      'Calendário letivo com contagem de dias MEC',
    ],
  },
  {
    id: 'school_full',
    name: 'Escola Full',
    badge: 'Full',
    color: 'border-emerald-500/30 bg-emerald-500/5',
    badgeColor: 'bg-emerald-500/15 text-emerald-600',
    benefits: [
      'Tudo do plano Starter',
      'IA para toda a escola sem limite mensal',
      'Correção em lote e geração de imagens para todos',
      'Dashboards e relatórios da direção',
      'Auditoria de operações sensíveis',
      'Comunicação em massa via WhatsApp',
      'Suporte dedicado',
    ],
  },
];

export default async function PlanosPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');

  const planId = await getTenantPlanId(db(), ctx.tenantId).catch(() => null);
  const currentPlan = planId ? getPlan(planId) : null;

  const plans = ctx.tenantType === 'individual' ? TEACHER_PLANS : SCHOOL_PLANS;
  const isOnHighest = planId === plans[plans.length - 1]?.id;

  return (
    <>
      <PageHeader
        title="Planos"
        description="Veja o que seu plano inclui e como crescer quando precisar."
      />

      {currentPlan && planId && (
        <div className={`${cardClass} border-primary/40 bg-primary/5`}>
          <p className="text-xs text-muted-foreground">Seu plano atual</p>
          <p className="mt-0.5 text-lg font-semibold">
            {plans.find((p) => p.id === planId)?.name ?? planId}
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {plans.map((plan) => {
          const isCurrentPlan = plan.id === planId;
          return (
            <div
              key={plan.id}
              className={`relative rounded-xl border p-5 ${plan.color} ${isCurrentPlan ? 'ring-2 ring-primary/40' : ''}`}
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="font-semibold">{plan.name}</h2>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${plan.badgeColor}`}>
                  {isCurrentPlan ? 'Seu plano' : plan.badge}
                </span>
              </div>
              <ul className="space-y-1.5">
                {plan.benefits.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5 text-emerald-500">✓</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {!isOnHighest && (
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
              Solicitar por e-mail
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

      {isOnHighest && (
        <div className={`${cardClass} border-emerald-500/30 bg-emerald-500/5 text-center`}>
          <p className="text-sm font-medium text-emerald-600">
            Você está no plano mais completo. Aproveite tudo!
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

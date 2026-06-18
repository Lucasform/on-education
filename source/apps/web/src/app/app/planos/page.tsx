import { getTenantFeatures, getTenantPlanId } from '@on-education/module-nucleo';
import {
  ALACARTE_MIN,
  comboPlans,
  FEATURE_CATALOG,
  featuresForSegment,
  getPlan,
  PLAN_TAGLINES,
  priceForFeatures,
  type Feature,
} from '@on-education/entitlements';
import { Check, CreditCard, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { redirect } from 'next/navigation';

import { cardClass, PageHeader } from '@/components/form';
import { isBillingConfigured, priceIdForPlan } from '@/server/billing';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { AlaCarteBuilder } from './AlaCarteBuilder';
import { ComboCards } from './ComboCards';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Planos · Edu On Way' };

const POPULAR = new Set(['teacher_pro', 'school_full']);

function precoFmt(p: number): { valor: string; sufixo: string } {
  if (p === 0) return { valor: 'Grátis', sufixo: '' };
  if (p < 0) return { valor: 'Sob consulta', sufixo: '' };
  return { valor: `R$ ${p}`, sufixo: '/mês' };
}

export default async function PlanosPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const { ok, erro } = await searchParams;
  const client = db();

  const [planId, featureSet] = await Promise.all([
    getTenantPlanId(client, ctx.tenantId).catch(() => null),
    getTenantFeatures(client, ctx.tenantId).catch(() => null),
  ]);
  const currentFeatures = featureSet ? [...featureSet] : [];
  const currentPlan = planId ? getPlan(planId) : null;
  const isCustom = planId?.endsWith('_custom') ?? false;

  // À la carte desativado por ora (manter o código). Trocar para true para reexibir a seção.
  const SHOW_ALACARTE: boolean = false;
  const combos = comboPlans(ctx.tenantType);
  const catalogo = featuresForSegment(ctx.tenantType);
  const min = ALACARTE_MIN[ctx.tenantType];
  const billingOn = isBillingConfigured();

  const planNome = currentPlan?.name ?? (currentFeatures.length ? 'Personalizado' : 'Sem plano definido');
  const precoAtual = isCustom
    ? `R$ ${priceForFeatures(currentFeatures as Feature[])}/mês`
    : currentPlan
      ? precoFmt(currentPlan.monthlyPrice).valor + precoFmt(currentPlan.monthlyPrice).sufixo
      : 'Tudo liberado';

  return (
    <>
      <PageHeader
        title="Planos e funcionalidades"
        description="Escolha um plano pronto ou monte o seu pacote. As funcionalidades são liberadas na hora."
      />

      {ok && (
        <div className="flex items-center gap-2 rounded-xl border border-success/40 bg-success/10 px-4 py-3 text-sm text-success">
          <Check className="h-4 w-4 shrink-0" />
          {ok === 'combo' ? 'Plano ativado! ' : 'Pacote ativado! '} As funcionalidades já estão no menu.
        </div>
      )}
      {erro && erro !== 'cancelado' && (
        <div className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {decodeURIComponent(erro)}
        </div>
      )}
      {erro === 'cancelado' && (
        <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Pagamento cancelado. Seu plano continua o mesmo.
        </div>
      )}

      {/* Dashboard do plano atual */}
      <section className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-primary/80">Seu plano atual</p>
            <h2 className="mt-1 text-2xl font-bold">{planNome}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{precoAtual}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background/60 px-2.5 py-1">
              <ShieldCheck className="h-3.5 w-3.5 text-success" /> {billingOn ? 'Pagamento seguro' : 'Ativação imediata'}
            </span>
            {billingOn && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background/60 px-2.5 py-1">
                <CreditCard className="h-3.5 w-3.5 text-primary" /> Pix · Boleto · Cartão
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Planos prontos */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
          <Sparkles className="h-4 w-4 text-primary" /> Planos prontos
        </h2>
        <ComboCards
          currentPlanId={planId}
          combos={combos.map((plan) => ({
            id: plan.id,
            name: plan.name,
            monthlyPrice: plan.monthlyPrice,
            tagline: PLAN_TAGLINES[plan.id] ?? '',
            labels: [...plan.features].map((f) => FEATURE_CATALOG[f]?.label ?? f),
            hasPrice: billingOn && plan.monthlyPrice > 0 && !!priceIdForPlan(plan.id),
            popular: POPULAR.has(plan.id),
          }))}
        />
      </section>

      {/* À la carte (desativado por ora — SHOW_ALACARTE) */}
      {SHOW_ALACARTE && (
        <section>
          <h2 className="mb-1 flex items-center gap-2 text-base font-semibold">
            <Zap className="h-4 w-4 text-primary" /> Monte o seu pacote
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Pague só pelo que usar. Escolha no mínimo {min} funcionalidades; o preço é a soma dos itens
            e elas ficam disponíveis assim que você ativar.
          </p>
          <div className={`${cardClass} rounded-2xl`}>
            <AlaCarteBuilder
              items={catalogo.map((m) => ({
                feature: m.feature,
                label: m.label,
                description: m.description,
                category: m.category,
                price: m.price,
              }))}
              min={min}
              initial={isCustom ? currentFeatures : []}
            />
          </div>
        </section>
      )}

      <p className="flex flex-wrap items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 text-success" />
        {billingOn
          ? 'Pagamento seguro (cartão, Pix e boleto).'
          : 'Ativação imediata enquanto o pagamento online não está ligado.'}{' '}
        Dúvidas?{' '}
        <a href="mailto:contato@onway.com.br" className="text-primary underline-offset-4 hover:underline">
          contato@onway.com.br
        </a>
      </p>
    </>
  );
}

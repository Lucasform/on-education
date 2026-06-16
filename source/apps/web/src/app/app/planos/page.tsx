import { getTenantFeatures, getTenantPlanId } from '@on-education/module-nucleo';
import {
  ALACARTE_MIN,
  comboPlans,
  FEATURE_CATALOG,
  featuresForSegment,
  getPlan,
  priceForFeatures,
  type Feature,
} from '@on-education/entitlements';
import { redirect } from 'next/navigation';

import { cardClass, PageHeader } from '@/components/form';
import { SubmitButton } from '@/components/submit-button';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { AlaCarteBuilder } from './AlaCarteBuilder';
import { applyComboPlanAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Planos · Edu On Way' };

function precoLabel(p: number): string {
  if (p === 0) return 'Grátis';
  if (p < 0) return 'Sob consulta';
  return `R$ ${p}/mês`;
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

  const combos = comboPlans(ctx.tenantType);
  const catalogo = featuresForSegment(ctx.tenantType);
  const min = ALACARTE_MIN[ctx.tenantType];

  return (
    <>
      <PageHeader
        title="Planos e funcionalidades"
        description="Escolha um plano pronto ou monte o seu pacote — as funcionalidades são liberadas na hora."
      />

      {ok && (
        <div className={`${cardClass} border-success/40 bg-success/5`}>
          <p className="text-sm text-success">
            {ok === 'combo' ? 'Plano ativado! ' : 'Pacote ativado! '}
            As funcionalidades já estão disponíveis no menu.
          </p>
        </div>
      )}
      {erro && (
        <div className={`${cardClass} border-danger/40 bg-danger/5`}>
          <p className="text-sm text-danger">{decodeURIComponent(erro)}</p>
        </div>
      )}

      {/* Plano atual */}
      <div className={`${cardClass} border-primary/40 bg-primary/5`}>
        <p className="text-xs text-muted-foreground">Plano atual</p>
        <p className="mt-0.5 text-lg font-semibold">
          {currentPlan?.name ?? (currentFeatures.length ? 'Personalizado' : 'Nenhum (tudo liberado)')}
        </p>
        {currentFeatures.length > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            {currentFeatures.length} funcionalidade(s) ativa(s)
            {isCustom && ` · R$ ${priceForFeatures(currentFeatures as Feature[])}/mês`}
          </p>
        )}
      </div>

      {/* Combos */}
      <section>
        <h2 className="mb-3 text-sm font-semibold">Planos prontos</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {combos.map((plan) => {
            const isCurrent = plan.id === planId;
            const feats = [...plan.features];
            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-xl border p-5 ${
                  isCurrent ? 'border-primary bg-primary/5 ring-2 ring-primary/40' : 'border-border bg-card'
                }`}
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <h3 className="font-semibold">{plan.name}</h3>
                  {isCurrent && (
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                      Atual
                    </span>
                  )}
                </div>
                <p className="mb-3 text-xl font-bold">{precoLabel(plan.monthlyPrice)}</p>
                <ul className="mb-4 flex-1 space-y-1.5 text-sm">
                  {feats.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span className="mt-0.5 text-success">✓</span>
                      <span>{FEATURE_CATALOG[f]?.label ?? f}</span>
                    </li>
                  ))}
                </ul>
                <form action={applyComboPlanAction}>
                  <input type="hidden" name="planId" value={plan.id} />
                  <SubmitButton
                    type="submit"
                    size="sm"
                    variant={isCurrent ? 'outline' : 'default'}
                    disabled={isCurrent}
                    className="w-full"
                  >
                    {isCurrent ? 'Plano atual' : 'Ativar este plano'}
                  </SubmitButton>
                </form>
              </div>
            );
          })}
        </div>
      </section>

      {/* À la carte */}
      <section>
        <h2 className="mb-1 text-sm font-semibold">Monte o seu pacote (à la carte)</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Escolha as funcionalidades que quiser, no mínimo {min}. O preço é a soma dos itens e elas
          ficam disponíveis assim que você ativar.
        </p>
        <div className={cardClass}>
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

      <p className="text-center text-xs text-muted-foreground">
        Preços ilustrativos. Pagamento online em breve; por ora a ativação é imediata. Dúvidas?{' '}
        <a href="mailto:contato@onway.com.br" className="text-primary underline-offset-4 hover:underline">
          contato@onway.com.br
        </a>
      </p>
    </>
  );
}

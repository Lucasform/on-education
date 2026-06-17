import type { TenantType } from '@on-education/core';
import { Lock } from 'lucide-react';
import Link from 'next/link';

const FEATURE_LABELS: Record<string, string> = {
  'ai.essayGrading': 'Correção avançada (redação e em lote)',
  'ai.images': 'Geração de imagens didáticas',
  marketplace: 'Banco coletivo de atividades',
  'finance.institutional': 'Gestão financeira institucional',
  'analytics.director': 'Relatórios e dashboards avançados',
};

const UPGRADE_TO: Record<TenantType, string> = {
  individual: 'Professor Pro',
  organization: 'Escola Full',
};

export function UpgradeGate({
  feature,
  tenantType,
}: {
  feature: string;
  tenantType: TenantType;
}) {
  const featureName = FEATURE_LABELS[feature];
  const upgradeTo = UPGRADE_TO[tenantType];

  return (
    <div className="flex flex-col items-center justify-center gap-5 rounded-xl border border-border bg-card px-8 py-14 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
        <Lock className="h-7 w-7 text-primary" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-base font-semibold">Disponível no plano {upgradeTo}</p>
        {featureName && (
          <p className="text-sm text-muted-foreground">
            {featureName} não está incluído no seu plano atual.
          </p>
        )}
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/app/planos"
          className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Ver planos
        </Link>
        <a
          href="mailto:contato@onway.com.br"
          className="rounded-md border border-border px-5 py-2 text-sm text-muted-foreground hover:bg-accent"
        >
          Falar conosco
        </a>
      </div>
    </div>
  );
}

import type { TenantType } from '@on-education/core';
import { Lock } from 'lucide-react';

const FEATURE_LABELS: Record<string, string> = {
  'ai.essayGrading': 'Correção avançada (redação e em lote)',
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
      <p className="text-sm text-muted-foreground">
        Entre em contato para fazer o upgrade:{' '}
        <a
          href="mailto:contato@onway.com.br"
          className="text-primary underline-offset-4 hover:underline"
        >
          contato@onway.com.br
        </a>
      </p>
    </div>
  );
}

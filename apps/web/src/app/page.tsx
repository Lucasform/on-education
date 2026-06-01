import { TENANT_TYPES } from '@on-education/core';
import { PLANS } from '@on-education/entitlements';
import { Button } from '@on-education/ui';

/**
 * Shell da Fase 0: prova que o monorepo está de pé e que os pacotes compartilhados
 * (core, entitlements, ui) são consumidos pelo app. Nenhuma feature de produto aqui.
 */
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold">On Education</h1>
        <p className="text-sm opacity-70">
          Fundação multi-tenant no ar. Segmentos: {TENANT_TYPES.join(' · ')}.
        </p>
      </div>

      <section className="rounded-md border p-4">
        <h2 className="mb-2 text-sm font-medium">Planos (placeholder)</h2>
        <ul className="space-y-1 text-sm opacity-80">
          {Object.values(PLANS).map((p) => (
            <li key={p.id}>
              {p.id} <span className="opacity-60">({p.tenantType})</span>
            </li>
          ))}
        </ul>
      </section>

      <Button>Tudo certo</Button>
    </main>
  );
}

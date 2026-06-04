import { SubmitButton } from '@/components/submit-button';
import { getTenantSettings, listGradeComponents } from '@on-education/module-nucleo';
import { redirect } from 'next/navigation';

import { ConfirmButton } from '@/components/confirm-button';
import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import {
  createGradeComponentAction,
  deleteGradeComponentAction,
  updateGradeScaleAction,
} from '../../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Notas e pesos · On Way Education' };

export default async function NotasConfigPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  if (ctx.tenantType !== 'organization') redirect('/app');
  const client = db();

  const [settings, componentes] = await Promise.all([
    getTenantSettings(client, ctx).catch(() => null),
    listGradeComponents(client, ctx),
  ]);
  const escala = settings?.gradeScale ?? 10;
  const somaPesos = componentes.reduce((a, c) => a + c.weight, 0);

  return (
    <>
      <PageHeader
        title="Notas e pesos"
        description="A escola define a escala e o peso de cada tipo de atividade. O sistema calcula a média ponderada por trás, sozinho."
      />

      <div className="grid gap-5 md:grid-cols-2">
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Escala da nota</h2>
          <form action={updateGradeScaleAction} className="flex items-end gap-2">
            <label className="flex flex-col gap-1 text-sm">
              Nota máxima
              <input
                name="gradeScale"
                type="number"
                min={1}
                max={1000}
                defaultValue={escala}
                className={fieldClass}
              />
            </label>
            <SubmitButton type="submit" size="sm">
              Salvar
            </SubmitButton>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">
            As notas vão de 0 a {escala}. Ex.: 10 (0–10) ou 100 (0–100).
          </p>
        </div>

        <div className={cardClass}>
          <h2 className="mb-1 text-sm font-medium">Como a média é calculada</h2>
          <p className="text-sm text-muted-foreground">
            Para cada componente abaixo, o sistema faz a média das notas daquele tipo e multiplica
            pelo peso. Soma tudo e divide pela soma dos pesos. Assim o número de trabalhos não
            desequilibra: vale a média do componente, não a quantidade.
          </p>
          {componentes.length > 0 && (
            <p className="mt-2 text-xs text-primary">Soma dos pesos atual: {somaPesos}.</p>
          )}
        </div>
      </div>

      <div className={cardClass}>
        <h2 className="mb-3 text-sm font-medium">Componentes da média ({componentes.length})</h2>
        {componentes.length === 0 ? (
          <p className="mb-3 text-sm text-muted-foreground">
            Nenhum componente. Sem componentes, a média é a aritmética simples das notas. Crie, por
            exemplo, Prova (peso 1) e Trabalho (peso 2).
          </p>
        ) : (
          <ul className="mb-4 space-y-2 text-sm">
            {componentes.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-2 border-b border-border/60 pb-2 last:border-0"
              >
                <span>
                  <span className="font-medium">{c.name}</span>
                  <span className="text-muted-foreground"> · peso {c.weight}</span>
                </span>
                <form action={deleteGradeComponentAction}>
                  <input type="hidden" name="id" value={c.id} />
                  <ConfirmButton
                    size="sm"
                    variant="ghost"
                    message={`Remover o componente "${c.name}"?`}
                    className="h-7 px-2 text-xs"
                  >
                    Remover
                  </ConfirmButton>
                </form>
              </li>
            ))}
          </ul>
        )}
        <form action={createGradeComponentAction} className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-sm">
            Componente
            <input name="name" required placeholder="ex.: Prova" className={fieldClass} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Peso
            <input
              name="weight"
              type="number"
              step="0.5"
              min={0}
              defaultValue={1}
              className={fieldClass}
            />
          </label>
          <SubmitButton type="submit" size="sm">
            Adicionar componente
          </SubmitButton>
        </form>
      </div>
    </>
  );
}

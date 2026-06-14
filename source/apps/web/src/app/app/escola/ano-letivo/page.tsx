import { SubmitButton } from '@/components/submit-button';
import { listAcademicYears, listTerms } from '@on-education/module-nucleo';
import { redirect } from 'next/navigation';

import { ConfirmButton } from '@/components/confirm-button';
import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import {
  createAcademicYearAction,
  createTermAction,
  createTermsBulkAction,
  deleteAcademicYearAction,
  deleteTermAction,
} from '../../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ano letivo · Edu On Way' };

const TIPO_LABELS: Record<string, string> = {
  bimestre: 'Bimestral (4 períodos)',
  trimestre: 'Trimestral (3 períodos)',
  semestre: 'Semestral (2 períodos)',
  mensal: 'Mensal (12 períodos)',
};

export default async function AnoLetivoPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  if (ctx.tenantType !== 'organization') redirect('/app');
  const client = db();
  const [anos, periodos] = await Promise.all([
    listAcademicYears(client, ctx).catch(() => [] as Awaited<ReturnType<typeof listAcademicYears>>),
    listTerms(client, ctx).catch(() => [] as Awaited<ReturnType<typeof listTerms>>),
  ]);

  const periodosPorAno = (anoId: string) => periodos.filter((p) => p.academicYearId === anoId);

  return (
    <>
      <PageHeader
        title="Ano letivo e períodos"
        description="Defina anos letivos e seus bimestres, trimestres ou semestres."
      />

      <div className="grid gap-5 md:grid-cols-2">
        {/* Anos letivos */}
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Anos letivos ({anos.length})</h2>
          {anos.length === 0 ? (
            <p className="mb-3 text-sm text-muted-foreground">Nenhum ano letivo ainda.</p>
          ) : (
            <ul className="mb-3 divide-y divide-border/60 text-sm">
              {anos.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 py-1.5">
                  <span className="font-medium">{a.name}</span>
                  <form action={deleteAcademicYearAction}>
                    <input type="hidden" name="id" value={a.id} />
                    <ConfirmButton
                      size="sm"
                      variant="ghost"
                      message={`Excluir o ano letivo "${a.name}" e todos os seus períodos?`}
                    >
                      Excluir
                    </ConfirmButton>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <form action={createAcademicYearAction} className="flex flex-col gap-2">
            <input name="name" required placeholder="Ex.: 2026" className={fieldClass} />
            <SubmitButton type="submit" size="sm">
              Adicionar ano letivo
            </SubmitButton>
          </form>
        </div>

        {/* Períodos */}
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Períodos ({periodos.length})</h2>
          {periodos.length === 0 ? (
            <p className="mb-3 text-sm text-muted-foreground">Nenhum período ainda.</p>
          ) : (
            <ul className="mb-3 divide-y divide-border/60 text-sm">
              {periodos.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 py-1.5">
                  <span>{p.name}</span>
                  <form action={deleteTermAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <ConfirmButton
                      size="sm"
                      variant="ghost"
                      message={`Excluir "${p.name}"?`}
                    >
                      Excluir
                    </ConfirmButton>
                  </form>
                </li>
              ))}
            </ul>
          )}

          {anos.length > 0 ? (
            <>
              {/* Criar em lote por tipo */}
              <div className="mb-4 rounded-md border border-border bg-muted/30 p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Criar períodos automáticos
                </p>
                <form action={createTermsBulkAction} className="flex flex-col gap-2">
                  <select name="academicYearId" className={fieldClass} defaultValue={anos[0]!.id}>
                    {anos.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                  <select name="tipo" className={fieldClass} defaultValue="bimestre">
                    {Object.entries(TIPO_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                  <SubmitButton type="submit" size="sm">
                    Criar períodos
                  </SubmitButton>
                </form>
              </div>

              {/* Adicionar período avulso */}
              <p className="mb-2 text-xs text-muted-foreground">Ou adicione um período avulso:</p>
              <form action={createTermAction} className="flex flex-col gap-2">
                <select name="academicYearId" className={fieldClass} defaultValue={anos[0]!.id}>
                  {anos.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                <input name="name" required placeholder="Ex.: 1º Bimestre" className={fieldClass} />
                <SubmitButton type="submit" size="sm" variant="outline">
                  Adicionar período
                </SubmitButton>
              </form>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              Crie um ano letivo para adicionar períodos.
            </p>
          )}
        </div>
      </div>

      {/* Visão por ano */}
      {anos.length > 0 && (
        <div className="flex flex-col gap-4">
          {anos.map((a) => {
            const ps = periodosPorAno(a.id);
            return (
              <div key={a.id} className={cardClass}>
                <h3 className="mb-2 text-sm font-medium">
                  {a.name}{' '}
                  <span className="font-normal text-muted-foreground">
                    ({ps.length} período{ps.length !== 1 ? 's' : ''})
                  </span>
                </h3>
                {ps.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sem períodos.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {ps.map((p) => (
                      <span
                        key={p.id}
                        className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
                      >
                        {p.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

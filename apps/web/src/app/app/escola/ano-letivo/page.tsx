import { listAcademicYears, listTerms } from '@on-education/module-nucleo';
import { Button } from '@on-education/ui';
import { redirect } from 'next/navigation';

import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { createAcademicYearAction, createTermAction } from '../../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ano letivo · On Way Education' };

export default async function AnoLetivoPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  if (ctx.tenantType !== 'organization') redirect('/app');
  const client = db();
  const [anos, periodos] = await Promise.all([
    listAcademicYears(client, ctx),
    listTerms(client, ctx),
  ]);

  return (
    <>
      <PageHeader title="Ano letivo e períodos" description="Defina anos letivos e bimestres." />
      <div className="grid gap-5 md:grid-cols-2">
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Anos letivos ({anos.length})</h2>
          <ul className="mb-3 space-y-1 text-sm text-muted-foreground">
            {anos.map((a) => (
              <li key={a.id}>{a.name}</li>
            ))}
          </ul>
          <form action={createAcademicYearAction} className="flex flex-col gap-2">
            <input name="name" required placeholder="Ex.: 2026" className={fieldClass} />
            <Button type="submit" size="sm">
              Adicionar ano letivo
            </Button>
          </form>
        </div>
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Períodos ({periodos.length})</h2>
          <ul className="mb-3 space-y-1 text-sm text-muted-foreground">
            {periodos.map((p) => (
              <li key={p.id}>{p.name}</li>
            ))}
          </ul>
          {anos.length > 0 ? (
            <form action={createTermAction} className="flex flex-col gap-2">
              <select name="academicYearId" className={fieldClass} defaultValue={anos[0]!.id}>
                {anos.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <input name="name" required placeholder="Ex.: 1º bimestre" className={fieldClass} />
              <Button type="submit" size="sm">
                Adicionar período
              </Button>
            </form>
          ) : (
            <p className="text-xs text-muted-foreground">
              Crie um ano letivo para adicionar períodos.
            </p>
          )}
        </div>
      </div>
    </>
  );
}

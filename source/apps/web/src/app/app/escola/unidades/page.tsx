import { SubmitButton } from '@/components/submit-button';
import { listUnits } from '@on-education/module-nucleo';
import { redirect } from 'next/navigation';

import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { createUnitAction } from '../../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Unidades · Edu On Way' };

export default async function UnidadesPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  if (ctx.tenantType !== 'organization') redirect('/app');
  const unidades = await listUnits(db(), ctx).catch(() => [] as Awaited<ReturnType<typeof listUnits>>);

  return (
    <>
      <PageHeader title="Unidades" description="Campus e unidades da instituição." />
      <div className="grid gap-5 md:grid-cols-2">
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Unidades ({unidades.length})</h2>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {unidades.map((u) => (
              <li key={u.id}>{u.name}</li>
            ))}
          </ul>
        </div>
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Nova unidade</h2>
          <form action={createUnitAction} className="flex flex-col gap-2">
            <input name="name" required placeholder="Nome da unidade" className={fieldClass} />
            <SubmitButton type="submit" size="sm">
              Adicionar unidade
            </SubmitButton>
          </form>
        </div>
      </div>
    </>
  );
}

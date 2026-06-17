import { isEntitled, listStudents } from '@on-education/module-nucleo';
import { redirect } from 'next/navigation';

import { cardClass, PageHeader } from '@/components/form';
import { UpgradeGate } from '@/components/upgrade-gate';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Diário Infantil · Edu On Way' };

export default async function DiarioInfantilPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  if (!(await isEntitled(db(), ctx.tenantId, 'classes.manage'))) {
    return (
      <>
        <PageHeader title="Diário Infantil" description="Registro diário da educação infantil." />
        <UpgradeGate feature="classes.manage" tenantType={ctx.tenantType} />
      </>
    );
  }
  const alunos = await listStudents(db(), ctx).catch(() => []);

  return (
    <>
      <PageHeader
        title="Diário Infantil"
        description="Registros diários de desenvolvimento dos alunos."
      />

      {alunos.length === 0 ? (
        <div className={cardClass}>
          <p className="text-sm text-muted-foreground">
            Cadastre alunos para usar o diário infantil.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {alunos.map((aluno) => (
            <a
              key={aluno.id}
              href={`/app/diario-infantil/${aluno.id}`}
              className={`${cardClass} block transition-colors hover:border-primary/40`}
            >
              <p className="text-sm font-medium">{aluno.fullName}</p>
              {aluno.birthDate && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {aluno.birthDate.split('-').reverse().join('/')}
                </p>
              )}
            </a>
          ))}
        </div>
      )}
    </>
  );
}

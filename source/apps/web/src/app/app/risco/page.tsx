import { getTenantSettings, listClasses } from '@on-education/module-nucleo';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { cardClass, PageHeader } from '@/components/form';
import { db } from '@/server/db';
import { listAtRiskStudents } from '@/server/at-risk';
import { getAuthContext } from '@/server/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Alunos em risco · Edu On Way' };

export default async function RiscoPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  if (ctx.tenantType !== 'organization') redirect('/app');
  const client = db();

  const [settings, turmas] = await Promise.all([
    getTenantSettings(client, ctx).catch(() => null),
    listClasses(client, ctx).catch(() => []),
  ]);
  const escala = settings?.gradeScale ?? 10;
  const turmaNome = new Map(turmas.map((t) => [t.id, t.name]));
  const alunos = await listAtRiskStudents(client, ctx, escala).catch(() => []);

  return (
    <>
      <PageHeader
        title="Alunos em risco"
        description="Quem está com média baixa ou frequência abaixo de 75% — para agir cedo."
      />

      <section className={cardClass}>
        <h2 className="mb-3 text-sm font-medium">Em atenção ({alunos.length})</h2>
        {alunos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ninguém em risco no momento. 🎉 (Critério: média abaixo de {(escala * 0.6).toFixed(1)} ou
            frequência abaixo de 75%.)
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-1.5 font-medium">Aluno</th>
                <th className="py-1.5 font-medium">Turma</th>
                <th className="py-1.5 text-right font-medium">Média</th>
                <th className="py-1.5 text-right font-medium">Frequência</th>
                <th className="py-1.5 font-medium">Motivo</th>
                <th className="py-1.5" />
              </tr>
            </thead>
            <tbody>
              {alunos.map((a) => (
                <tr key={a.id} className="border-b border-border/50 last:border-0">
                  <td className="py-1.5 font-medium">{a.name}</td>
                  <td className="py-1.5 text-muted-foreground">
                    {a.classId ? (turmaNome.get(a.classId) ?? '—') : '—'}
                  </td>
                  <td className="py-1.5 text-right">{a.avg === null ? '—' : a.avg.toFixed(1)}</td>
                  <td className="py-1.5 text-right">
                    {a.attendance === null ? '—' : `${Math.round(a.attendance)}%`}
                  </td>
                  <td className="py-1.5 text-xs text-muted-foreground">{a.reasons.join(' · ')}</td>
                  <td className="py-1.5 text-right">
                    <Link
                      href={`/app/alunos/${a.id}/boletim`}
                      className="rounded-md border border-border px-2 py-0.5 text-xs hover:bg-accent"
                    >
                      Boletim
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}

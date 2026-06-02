import { listStudentGuardians, listStudents } from '@on-education/module-nucleo';
import { listAttendance, listGrades } from '@on-education/module-sala-de-aula';
import { listPortfolioEntries } from '@on-education/module-pedagogico';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { cardClass, PageHeader } from '@/components/form';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

export const dynamic = 'force-dynamic';

export default async function AlunoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const client = db();

  const [alunos, notas, presencas, portfolio, vinculos] = await Promise.all([
    listStudents(client, ctx),
    listGrades(client, ctx),
    listAttendance(client, ctx),
    listPortfolioEntries(client, ctx),
    listStudentGuardians(client, ctx, id),
  ]);

  const aluno = alunos.find((a) => a.id === id);
  if (!aluno) redirect('/app/alunos');

  const minhasNotas = notas.filter((n) => n.studentId === id);
  const minhasPresencas = presencas.filter((p) => p.studentId === id);
  const meuPortfolio = portfolio.filter((p) => p.studentId === id);
  const media = minhasNotas.length
    ? (minhasNotas.reduce((a, b) => a + b.value, 0) / minhasNotas.length).toFixed(1)
    : '—';
  const freq = minhasPresencas.length
    ? `${Math.round((minhasPresencas.filter((p) => p.present).length / minhasPresencas.length) * 100)}%`
    : '—';

  return (
    <>
      <PageHeader title={aluno.fullName} description="Histórico do aluno." />
      <Link href="/app/alunos" className="text-sm text-primary underline-offset-4 hover:underline">
        ← Voltar para alunos
      </Link>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className={cardClass}>
          <div className="text-2xl font-semibold">{media}</div>
          <div className="text-xs text-muted-foreground">Média</div>
        </div>
        <div className={cardClass}>
          <div className="text-2xl font-semibold">{freq}</div>
          <div className="text-xs text-muted-foreground">Frequência</div>
        </div>
        <div className={cardClass}>
          <div className="text-2xl font-semibold">{minhasNotas.length}</div>
          <div className="text-xs text-muted-foreground">Notas</div>
        </div>
        <div className={cardClass}>
          <div className="text-2xl font-semibold">{meuPortfolio.length}</div>
          <div className="text-xs text-muted-foreground">Portfólio</div>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Notas</h2>
          {minhasNotas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem notas.</p>
          ) : (
            <ul className="space-y-1 text-sm text-muted-foreground">
              {minhasNotas.map((n) => (
                <li key={n.id} className="flex justify-between">
                  <span>{n.label}</span>
                  <span className="font-medium text-foreground">{n.value}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Responsáveis</h2>
          {vinculos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem responsáveis vinculados.</p>
          ) : (
            <ul className="space-y-1 text-sm text-muted-foreground">
              {vinculos.map((v) => (
                <li key={v.id}>
                  {v.relation ?? 'responsável'}
                  {v.isFinancial ? ' · financeiro' : ''}
                  {v.isEmergency ? ' · emergência' : ''}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className={cardClass}>
        <h2 className="mb-3 text-sm font-medium">Portfólio</h2>
        {meuPortfolio.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem registros.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {meuPortfolio.map((p) => (
              <li key={p.id}>
                <span className="font-medium">{p.title}</span>
                {p.description && <span className="text-muted-foreground"> · {p.description}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

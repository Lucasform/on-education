import { getStudent, getTenantSettings, listClasses } from '@on-education/module-nucleo';
import { notFound, redirect } from 'next/navigation';

import { cardClass, PageHeader } from '@/components/form';
import { PrintButton } from '@/components/print-button';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';
import { buildStudentBoletim } from '@/server/student-report';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Histórico escolar · Edu On Way' };

const RESULTADO: Record<string, string> = {
  aprovado: 'Aprovado',
  recuperacao: 'Em recuperação',
  reprovado: 'Reprovado',
  sem_nota: 'Cursando',
};

export default async function HistoricoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const client = db();

  const [boletim, aluno, classes, settings] = await Promise.all([
    buildStudentBoletim(client, ctx, id).catch(() => null),
    getStudent(client, ctx, id).catch(() => null),
    listClasses(client, ctx).catch(() => []),
    getTenantSettings(client, ctx).catch(() => null),
  ]);
  if (!aluno) notFound();

  const turma = aluno.classId ? classes.find((c) => c.id === aluno.classId) : null;
  const nascimento = aluno.birthDate
    ? new Date(`${aluno.birthDate}T00:00:00`).toLocaleDateString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
      })
    : '—';
  const hoje = new Date().toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const escola = settings?.profileName ?? 'Instituição de Ensino';

  return (
    <>
      <div className="flex items-start justify-between gap-2 print:hidden">
        <PageHeader
          title={`Histórico escolar · ${aluno.fullName}`}
          description="Histórico escolar imprimível, com a identidade da escola."
          back={{ href: `/app/alunos/${id}`, label: 'Voltar ao aluno' }}
        />
        <PrintButton label="Imprimir / PDF" />
      </div>

      <article className={`${cardClass} print:border-0 print:shadow-none`}>
        {/* Cabeçalho institucional */}
        <header className="mb-6 flex items-center gap-3 border-b border-border pb-4">
          {settings?.logoUrl ? (
            <img src={settings.logoUrl} alt="Logo" className="h-16 w-16 rounded-lg object-cover" />
          ) : (
            <span className="h-16 w-16 rounded-lg bg-primary" />
          )}
          <div className="flex-1">
            <h1 className="text-lg font-bold leading-tight">{escola}</h1>
            <p className="text-xs text-muted-foreground">
              {[settings?.profileAddress, settings?.profilePhone, settings?.profileEmail]
                .filter(Boolean)
                .join(' · ') || 'Histórico escolar'}
              {settings?.profileCnpj ? ` · CNPJ ${settings.profileCnpj}` : ''}
            </p>
          </div>
        </header>

        <h2 className="mb-4 text-center text-base font-bold uppercase tracking-wide">
          Histórico Escolar
        </h2>

        {/* Identificação do aluno */}
        <div className="mb-6 grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <div>
            <span className="text-muted-foreground">Aluno(a): </span>
            <span className="font-medium">{aluno.fullName}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Data de nascimento: </span>
            <span className="font-medium">{nascimento}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Turma / série: </span>
            <span className="font-medium">{turma?.name ?? '—'}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Resultado: </span>
            <span className="font-medium">{boletim ? (RESULTADO[boletim.status] ?? '—') : '—'}</span>
          </div>
        </div>

        {/* Desempenho por componente */}
        <h3 className="mb-2 text-sm font-semibold">Desempenho</h3>
        {boletim && boletim.components.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-1.5 font-medium">Componente</th>
                <th className="py-1.5 text-center font-medium">Peso</th>
                <th className="py-1.5 text-right font-medium">Média</th>
              </tr>
            </thead>
            <tbody>
              {boletim.components.map((c) => (
                <tr key={c.name} className="border-b border-border/50 last:border-0">
                  <td className="py-1.5">{c.name}</td>
                  <td className="py-1.5 text-center text-muted-foreground">{c.weight}</td>
                  <td className="py-1.5 text-right font-medium">{c.average}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-muted-foreground">Nada consta até o momento.</p>
        )}

        {/* Resumo */}
        {boletim && (
          <div className="mt-5 grid grid-cols-3 gap-4">
            <div className="rounded-lg border border-border p-3 text-center">
              <div className="text-xl font-semibold">{boletim.finalAverage}</div>
              <div className="text-xs text-muted-foreground">Média final</div>
            </div>
            <div className="rounded-lg border border-border p-3 text-center">
              <div className="text-xl font-semibold">{boletim.attendance}</div>
              <div className="text-xs text-muted-foreground">Frequência</div>
            </div>
            <div className="rounded-lg border border-border p-3 text-center">
              <div className="text-xl font-semibold">{boletim.absences}</div>
              <div className="text-xs text-muted-foreground">Faltas</div>
            </div>
          </div>
        )}

        <p className="mt-8 text-sm">
          {settings?.profileAddress ? `${settings.profileAddress}, ` : ''}
          {hoje}.
        </p>
        <div className="mt-12 grid grid-cols-2 gap-8 text-center text-xs text-muted-foreground">
          <div className="border-t border-foreground/60 pt-1">Secretaria</div>
          <div className="border-t border-foreground/60 pt-1">Direção</div>
        </div>
      </article>
    </>
  );
}

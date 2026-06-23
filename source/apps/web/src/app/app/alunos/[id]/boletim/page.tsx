import { reportComments } from '@on-education/db';
import { isAiConfigured } from '@on-education/module-ia';
import { getTenantSettings } from '@on-education/module-nucleo';
import { eq } from 'drizzle-orm';
import { redirect, notFound } from 'next/navigation';

import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { PrintButton } from '@/components/print-button';
import { SubmitButton } from '@/components/submit-button';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';
import { buildStudentBoletim } from '@/server/student-report';

import { generateReportCommentAction, saveReportCommentAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Boletim do aluno · Edu On Way' };

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  aprovado: { label: 'Aprovado', cls: 'bg-success/15 text-success' },
  recuperacao: { label: 'Recuperação', cls: 'bg-warning/15 text-warning' },
  reprovado: { label: 'Reprovado', cls: 'bg-danger/15 text-danger' },
  sem_nota: { label: 'Sem nota', cls: 'bg-muted text-muted-foreground' },
};

export default async function BoletimAlunoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const client = db();

  const [boletim, settings] = await Promise.all([
    buildStudentBoletim(client, ctx, id).catch(() => null),
    getTenantSettings(client, ctx).catch(() => null),
  ]);
  if (!boletim) notFound();

  const cmtRows = await client
    .withTenant(ctx.tenantId, (tx) =>
      tx
        .select({ c: reportComments.comment })
        .from(reportComments)
        .where(eq(reportComments.studentId, id))
        .limit(1),
    )
    .catch(() => [] as { c: string }[]);
  const comentario = cmtRows[0]?.c ?? '';
  const aiOn = isAiConfigured();

  const st = STATUS_LABEL[boletim.status] ?? { label: 'Sem nota', cls: 'bg-muted text-muted-foreground' };
  const hoje = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  return (
    <>
      <div className="flex items-start justify-between gap-2 print:hidden">
        <PageHeader
          title={`Boletim · ${boletim.studentName}`}
          description="Boletim individual imprimível."
          back={{ href: `/app/alunos/${id}`, label: 'Voltar ao aluno' }}
        />
        <PrintButton label="Imprimir / PDF" />
      </div>

      <article className={`${cardClass} print:border-0 print:shadow-none`}>
        {/* Cabeçalho com identidade da escola */}
        <header className="mb-5 flex items-center gap-3 border-b border-border pb-4">
          {settings?.logoUrl ? (
            <img src={settings.logoUrl} alt="Logo" className="h-14 w-14 rounded-lg object-cover" />
          ) : (
            <span className="h-14 w-14 rounded-lg bg-primary" />
          )}
          <div className="flex-1">
            <h1 className="text-lg font-bold leading-tight">{settings?.profileName ?? 'Boletim escolar'}</h1>
            <p className="text-xs text-muted-foreground">Boletim de desempenho · emitido em {hoje}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${st.cls}`}>{st.label}</span>
        </header>

        {/* Identificação do aluno */}
        <div className="mb-5">
          <p className="text-xs text-muted-foreground">Aluno</p>
          <p className="text-xl font-semibold">{boletim.studentName}</p>
        </div>

        {/* Resumo */}
        <div className="mb-5 grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-border p-3">
            <div className="text-2xl font-semibold">{boletim.finalAverage}</div>
            <div className="text-xs text-muted-foreground">Média final</div>
          </div>
          <div className="rounded-lg border border-border p-3">
            <div className="text-2xl font-semibold">{boletim.attendance}</div>
            <div className="text-xs text-muted-foreground">Frequência</div>
          </div>
          <div className="rounded-lg border border-border p-3">
            <div className="text-2xl font-semibold">{boletim.absences}</div>
            <div className="text-xs text-muted-foreground">Faltas</div>
          </div>
        </div>

        {/* Médias por componente */}
        {boletim.components.length > 0 && (
          <div className="mb-5">
            <h2 className="mb-2 text-sm font-medium">Médias por componente</h2>
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-1.5 font-medium">Componente</th>
                  <th className="py-1.5 font-medium text-center">Peso</th>
                  <th className="py-1.5 font-medium text-right">Média</th>
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
          </div>
        )}

        {/* Notas lançadas */}
        {boletim.grades.length > 0 && (
          <div>
            <h2 className="mb-2 text-sm font-medium">Notas lançadas</h2>
            <ul className="space-y-1 text-sm">
              {boletim.grades.map((g, i) => (
                <li key={i} className="flex justify-between gap-2 border-b border-border/40 py-1 last:border-0">
                  <span>
                    {g.label}
                    {g.componentName && (
                      <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {g.componentName}
                      </span>
                    )}
                  </span>
                  <span className="font-medium">{g.value === null ? '—' : g.value}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Comentário do boletim (gerado pela IA e/ou editado) */}
        <div className="mt-5">
          <h2 className="mb-2 text-sm font-medium">Comentário</h2>
          {comentario ? (
            <p className="whitespace-pre-wrap text-sm">{comentario}</p>
          ) : (
            <p className="text-sm text-muted-foreground print:hidden">Sem comentário ainda.</p>
          )}
          <div className="mt-3 flex flex-col gap-2 print:hidden">
            <form action={saveReportCommentAction} className="flex flex-col gap-2">
              <input type="hidden" name="studentId" value={id} />
              <textarea
                name="comment"
                defaultValue={comentario}
                rows={3}
                placeholder="Comentário do boletim…"
                className={`${fieldClass} resize-none`}
              />
              <SubmitButton type="submit" size="sm" variant="outline" className="self-start">
                Salvar comentário
              </SubmitButton>
            </form>
            {aiOn && (
              <form action={generateReportCommentAction}>
                <input type="hidden" name="studentId" value={id} />
                <SubmitButton type="submit" size="sm">
                  Gerar com IA
                </SubmitButton>
              </form>
            )}
          </div>
        </div>

        {/* Assinaturas (impressão) */}
        <div className="mt-10 hidden grid-cols-2 gap-8 print:grid">
          <div className="border-t border-foreground pt-1 text-center text-xs text-muted-foreground">
            Responsável
          </div>
          <div className="border-t border-foreground pt-1 text-center text-xs text-muted-foreground">
            Coordenação
          </div>
        </div>
      </article>
    </>
  );
}

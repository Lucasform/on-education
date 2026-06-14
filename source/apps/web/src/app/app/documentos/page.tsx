import { SubmitButton } from '@/components/submit-button';
import { getTenantSettings, listStudents } from '@on-education/module-nucleo';
import { redirect } from 'next/navigation';

import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { PrintButton } from '@/components/print-button';
import { hojeISO } from '@/lib/date';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Documentos · Edu On Way' };

const MODELOS: Record<string, { label: string; corpo: (aluno: string) => string }> = {
  declaracao_matricula: {
    label: 'Declaração de matrícula',
    corpo: (a) =>
      `Declaramos, para os devidos fins, que ${a} está regularmente matriculado(a) nesta instituição de ensino no presente ano letivo.`,
  },
  declaracao_frequencia: {
    label: 'Declaração de frequência',
    corpo: (a) =>
      `Declaramos, para os devidos fins, que ${a} frequenta regularmente as aulas nesta instituição de ensino.`,
  },
  autorizacao_saida: {
    label: 'Autorização de saída',
    corpo: (a) =>
      `Autorizo a saída antecipada de ${a} na data indicada, sob responsabilidade do(a) responsável legal.`,
  },
  livre: { label: 'Texto livre', corpo: () => '' },
};

export default async function DocumentosPage({
  searchParams,
}: {
  searchParams: Promise<{ model?: string; studentId?: string; extra?: string }>;
}) {
  const { model = 'declaracao_matricula', studentId, extra } = await searchParams;
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const client = db();
  const [settings, alunos] = await Promise.all([
    getTenantSettings(client, ctx).catch(() => null),
    listStudents(client, ctx).catch(() => [] as Awaited<ReturnType<typeof listStudents>>),
  ]);

  const modelo = MODELOS[model] ?? MODELOS.declaracao_matricula!;
  const aluno = alunos.find((a) => a.id === studentId);
  const alunoNome = aluno?.fullName ?? '__________________________';
  const corpo = model === 'livre' ? (extra ?? '') : modelo.corpo(alunoNome);
  const dataExtenso = new Date(`${hojeISO()}T00:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  });

  return (
    <>
      <div className="flex items-start justify-between gap-3 print:hidden">
        <PageHeader
          title="Documentos"
          description="Gere declarações e autorizações no padrão da escola e salve em PDF (Imprimir)."
        />
        <PrintButton label="Gerar PDF" />
      </div>

      <form method="get" className={`${cardClass} flex flex-wrap items-end gap-3 print:hidden`}>
        <label className="flex flex-col gap-1 text-sm">
          Modelo
          <select name="model" defaultValue={model} className={fieldClass}>
            {Object.entries(MODELOS).map(([k, m]) => (
              <option key={k} value={k}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Aluno
          <select name="studentId" defaultValue={studentId ?? ''} className={fieldClass}>
            <option value="">— (em branco)</option>
            {alunos.map((a) => (
              <option key={a.id} value={a.id}>
                {a.fullName}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[16rem] flex-1 flex-col gap-1 text-sm">
          Texto livre (modelo "Texto livre")
          <input
            name="extra"
            defaultValue={extra ?? ''}
            placeholder="Escreva o conteúdo do documento"
            className={fieldClass}
          />
        </label>
        <SubmitButton type="submit" size="sm" variant="outline">
          Atualizar
        </SubmitButton>
      </form>

      {/* Documento imprimível com a identidade da escola */}
      <article className="rounded-lg border border-border bg-card p-8 print:border-0 print:p-0">
        <header className="mb-8 flex items-center gap-3 border-b border-border pb-4">
          {settings?.logoUrl ? (
            <img src={settings.logoUrl} alt="Logo" className="h-12 w-12 rounded object-cover" />
          ) : null}
          <h2 className="text-lg font-semibold">{modelo.label}</h2>
        </header>

        <p className="min-h-[6rem] whitespace-pre-wrap text-sm leading-relaxed">
          {corpo || 'Selecione um modelo ou escreva o texto livre.'}
        </p>

        <p className="mt-10 text-sm">{dataExtenso}.</p>
        <div className="mt-12 text-center text-sm">
          <div className="mx-auto w-64 border-t border-foreground/60 pt-1">
            Assinatura e carimbo da instituição
          </div>
        </div>
      </article>
    </>
  );
}

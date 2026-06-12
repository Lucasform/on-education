import { isAiConfigured } from '@on-education/module-ia';
import { getTenantSettings, listStudentGuardians } from '@on-education/module-nucleo';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { MarkdownView } from '@/components/markdown-view';
import { PrintButton } from '@/components/print-button';
import { SubmitButton } from '@/components/submit-button';
import { db } from '@/server/db';
import { isEmailConfigured } from '@/server/email';
import { getAuthContext } from '@/server/session';
import { buildStudentSummary } from '@/server/student-report';

import {
  enviarRelatorioEmailAction,
  enviarRelatorioWhatsappAction,
  escreverRecadoPaisAction,
} from '../../../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Relatório do aluno · Edu On Way' };

export default async function RelatorioPaisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const client = db();

  const [resumo, settings, vinculos] = await Promise.all([
    buildStudentSummary(client, ctx, id),
    getTenantSettings(client, ctx).catch(() => null),
    listStudentGuardians(client, ctx, id).catch(() => []),
  ]);
  if (!resumo) notFound();

  const jar = await cookies();
  const recado = jar.get('oe_report_msg')?.value ?? null;
  const flash = jar.get('oe_report_flash')?.value ?? null;
  const aiOn = isAiConfigured();
  const emailOn = isEmailConfigured();
  const comTelefone = vinculos.filter((v) => v.guardianPhone);
  const comEmail = vinculos.filter((v) => v.guardianEmail);

  return (
    <>
      <div className="flex items-center justify-between gap-2 print:hidden">
        <Link
          href={`/app/alunos/${id}`}
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          ← Voltar ao aluno
        </Link>
        <PrintButton label="Imprimir / PDF" />
      </div>

      <PageHeader title={`Relatório · ${resumo.studentName}`} description="Resumo para os pais." />

      {flash && (
        <div className="rounded-md border border-border bg-muted p-3 text-sm print:hidden">
          {flash}
        </div>
      )}

      {/* relatório imprimível com identidade da escola */}
      <article className={`${cardClass} print:border-0 print:shadow-none`}>
        <header className="mb-4 flex items-center gap-3 border-b border-border pb-4">
          {settings?.logoUrl ? (
            <img src={settings.logoUrl} alt="Logo" className="h-12 w-12 rounded-lg object-cover" />
          ) : (
            <span className="h-12 w-12 rounded-lg bg-primary" />
          )}
          <div>
            <h1 className="text-xl font-bold leading-tight">{resumo.studentName}</h1>
            <p className="text-xs text-muted-foreground">Relatório de desempenho</p>
          </div>
        </header>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-2xl font-semibold">{resumo.average}</div>
            <div className="text-xs text-muted-foreground">Média</div>
          </div>
          <div>
            <div className="text-2xl font-semibold">{resumo.attendance}</div>
            <div className="text-xs text-muted-foreground">Frequência</div>
          </div>
          <div>
            <div className="text-2xl font-semibold">{resumo.gradeCount}</div>
            <div className="text-xs text-muted-foreground">Notas</div>
          </div>
        </div>

        {resumo.gradeLines.length > 0 && (
          <div className="mt-4">
            <h2 className="mb-1 text-sm font-medium">Notas</h2>
            <ul className="text-sm text-muted-foreground">
              {resumo.gradeLines.map((l) => (
                <li key={l}>{l.replace(/^- /, '')}</li>
              ))}
            </ul>
          </div>
        )}

        {recado && (
          <div className="mt-4 rounded-md bg-muted/60 p-3">
            <h2 className="mb-1 text-sm font-medium">Recado aos responsáveis</h2>
            <MarkdownView>{recado}</MarkdownView>
          </div>
        )}
      </article>

      {/* escrever recado com o WayOn */}
      <div className={`${cardClass} print:hidden`}>
        <h2 className="mb-1 text-sm font-medium">Recado aos pais</h2>
        <p className="mb-2 text-xs text-muted-foreground">
          O WayOn escreve um recado curto a partir dos números acima. Revise antes de enviar.
        </p>
        {aiOn ? (
          <form action={escreverRecadoPaisAction} className="flex flex-col gap-2">
            <input type="hidden" name="studentId" value={id} />
            <input
              name="notes"
              placeholder="Observações suas (opcional): comportamento, evolução…"
              className={fieldClass}
            />
            <SubmitButton type="submit" size="sm">
              {recado ? 'Gerar outro recado' : 'Escrever com o WayOn'}
            </SubmitButton>
          </form>
        ) : (
          <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
            Configure <code>ANTHROPIC_API_KEY</code> para o WayOn escrever o recado.
          </p>
        )}
      </div>

      {/* enviar no WhatsApp aos responsáveis */}
      <div className={`${cardClass} print:hidden`}>
        <h2 className="mb-1 text-sm font-medium">Enviar aos responsáveis</h2>
        {comTelefone.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Nenhum responsável com telefone vinculado. Vincule em Escola › Responsáveis.
          </p>
        ) : (
          <ul className="space-y-2">
            {comTelefone.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-2 text-sm">
                <span>
                  {v.guardianName ?? 'Responsável'}{' '}
                  <span className="text-muted-foreground">· {v.guardianPhone}</span>
                </span>
                <form action={enviarRelatorioWhatsappAction}>
                  <input type="hidden" name="studentId" value={id} />
                  <input type="hidden" name="guardianId" value={v.guardianId} />
                  <input type="hidden" name="recado" value={recado ?? ''} />
                  <SubmitButton type="submit" size="sm" variant="outline">
                    Enviar no WhatsApp
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        )}

        {emailOn && comEmail.length > 0 && (
          <ul className="mt-3 space-y-2 border-t border-border pt-3">
            {comEmail.map((v) => (
              <li key={`e-${v.id}`} className="flex items-center justify-between gap-2 text-sm">
                <span>
                  {v.guardianName ?? 'Responsável'}{' '}
                  <span className="text-muted-foreground">· {v.guardianEmail}</span>
                </span>
                <form action={enviarRelatorioEmailAction}>
                  <input type="hidden" name="studentId" value={id} />
                  <input type="hidden" name="guardianId" value={v.guardianId} />
                  <input type="hidden" name="recado" value={recado ?? ''} />
                  <SubmitButton type="submit" size="sm" variant="outline">
                    Enviar por e-mail
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

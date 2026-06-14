import {
  getStudent,
  getTenantSettings,
  listClasses,
  listStudentGuardians,
} from '@on-education/module-nucleo';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { cardClass } from '@/components/form';
import { PrintButton } from '@/components/print-button';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ficha de matrícula · Edu On Way' };

const br = (iso: string | null | undefined) =>
  iso ? iso.split('-').reverse().join('/') : '—';

export default async function FichaMatriculaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const client = db();

  const [aluno, vinculos, settings, turmas] = await Promise.all([
    getStudent(client, ctx, id).catch(() => null),
    listStudentGuardians(client, ctx, id).catch(() => []),
    getTenantSettings(client, ctx).catch(() => null),
    listClasses(client, ctx).catch(() => [] as { id: string; name: string }[]),
  ]);
  if (!aluno) notFound();

  const turmaNome = aluno.classId ? (turmas.find((t) => t.id === aluno.classId)?.name ?? '—') : '—';
  const hoje = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const escola = settings?.profileName?.trim() || 'Instituição de ensino';

  const Linha = ({ rotulo, valor }: { rotulo: string; valor: string }) => (
    <div className="flex gap-2 border-b border-border/60 py-1.5 text-sm">
      <span className="w-44 shrink-0 text-muted-foreground">{rotulo}</span>
      <span className="font-medium">{valor || '—'}</span>
    </div>
  );

  return (
    <>
      <div className="flex items-center justify-between gap-2 print:hidden">
        <Link href="/app/matricula" className="text-sm text-primary underline-offset-4 hover:underline">
          ← Voltar para matrícula
        </Link>
        <PrintButton label="Imprimir / PDF" />
      </div>

      {/* Documento imprimível com a identidade da escola */}
      <article className={`${cardClass} print:border-0 print:shadow-none`}>
        <header className="mb-6 flex items-center gap-3 border-b border-border pb-4">
          {settings?.logoUrl ? (
            <img src={settings.logoUrl} alt="Logo" className="h-14 w-14 rounded-lg object-cover" />
          ) : (
            <span className="h-14 w-14 rounded-lg bg-primary" />
          )}
          <div>
            <h1 className="text-xl font-bold leading-tight">{escola}</h1>
            <p className="text-xs text-muted-foreground">
              {[settings?.profileCnpj && `CNPJ ${settings.profileCnpj}`, settings?.profilePhone, settings?.profileEmail]
                .filter(Boolean)
                .join(' · ') || ' '}
            </p>
            {settings?.profileAddress && (
              <p className="text-xs text-muted-foreground">{settings.profileAddress}</p>
            )}
          </div>
        </header>

        <h2 className="mb-3 text-center text-lg font-semibold">Ficha de Matrícula</h2>

        <section className="mb-5">
          <h3 className="mb-1 text-sm font-semibold text-primary">Dados do aluno</h3>
          <Linha rotulo="Nome" valor={aluno.fullName} />
          <Linha rotulo="Data de nascimento" valor={br(aluno.birthDate)} />
          <Linha rotulo="Turma" valor={turmaNome} />
          <Linha
            rotulo="Endereço"
            valor={[aluno.address, aluno.city, aluno.state, aluno.zipCode].filter(Boolean).join(', ')}
          />
        </section>

        <section className="mb-5">
          <h3 className="mb-1 text-sm font-semibold text-primary">Responsáveis</h3>
          {vinculos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum responsável vinculado.</p>
          ) : (
            vinculos.map((v) => (
              <div key={v.id} className="border-b border-border/60 py-1.5 text-sm">
                <span className="font-medium">{v.guardianName ?? 'Responsável'}</span>
                <span className="text-muted-foreground">
                  {v.relation ? ` · ${v.relation}` : ''}
                  {v.guardianPhone ? ` · ${v.guardianPhone}` : ''}
                  {v.guardianEmail ? ` · ${v.guardianEmail}` : ''}
                  {[v.isFinancial && 'financeiro', v.canPickup && 'busca', v.isEmergency && 'emergência']
                    .filter(Boolean)
                    .join(', ')
                    ? ` (${[v.isFinancial && 'financeiro', v.canPickup && 'busca', v.isEmergency && 'emergência'].filter(Boolean).join(', ')})`
                    : ''}
                </span>
              </div>
            ))
          )}
        </section>

        {(aluno.bloodType || aluno.allergies || aluno.medicalNotes || aluno.emergencyName) && (
          <section className="mb-5">
            <h3 className="mb-1 text-sm font-semibold text-primary">Saúde e emergência</h3>
            {aluno.bloodType && <Linha rotulo="Tipo sanguíneo" valor={aluno.bloodType} />}
            {aluno.allergies && <Linha rotulo="Alergias" valor={aluno.allergies} />}
            {aluno.medicalNotes && <Linha rotulo="Observações médicas" valor={aluno.medicalNotes} />}
            {aluno.emergencyName && (
              <Linha
                rotulo="Contato de emergência"
                valor={[aluno.emergencyName, aluno.emergencyRelation, aluno.emergencyPhone]
                  .filter(Boolean)
                  .join(' · ')}
              />
            )}
          </section>
        )}

        <p className="mt-6 text-sm leading-relaxed">
          Declaro que as informações acima são verdadeiras e autorizo a matrícula de{' '}
          <strong>{aluno.fullName}</strong> em <strong>{escola}</strong>, comprometendo-me a cumprir
          o regimento e as normas da instituição.
        </p>

        <p className="mt-8 text-sm">{hoje}.</p>

        <div className="mt-12 grid grid-cols-2 gap-8 text-center text-sm">
          <div className="mx-auto w-full border-t border-foreground/60 pt-1">
            Assinatura do responsável
          </div>
          <div className="mx-auto w-full border-t border-foreground/60 pt-1">
            Assinatura e carimbo da instituição
          </div>
        </div>
      </article>
    </>
  );
}

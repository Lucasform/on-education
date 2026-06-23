import {
  getStudent,
  getTenantSettings,
  listClasses,
  listContractSignatures,
  listStudentGuardians,
} from '@on-education/module-nucleo';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { cardClass, fieldClass } from '@/components/form';
import { PrintButton } from '@/components/print-button';
import { SubmitButton } from '@/components/submit-button';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { signContractAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Contrato de matrícula · Edu On Way' };

const br = (iso: string | null | undefined) => (iso ? iso.split('-').reverse().join('/') : '___/___/______');
const reais = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default async function ContratoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ valor?: string; parcelas?: string; vencimento?: string; ano?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const client = db();

  const [aluno, vinculos, settings, turmas, assinaturas] = await Promise.all([
    getStudent(client, ctx, id).catch(() => null),
    listStudentGuardians(client, ctx, id).catch(() => []),
    getTenantSettings(client, ctx).catch(() => null),
    listClasses(client, ctx).catch(() => [] as { id: string; name: string }[]),
    listContractSignatures(client, ctx, id).catch(() => []),
  ]);
  if (!aluno) notFound();

  // Contratante = responsável financeiro, ou o primeiro vinculado.
  const resp = vinculos.find((v) => v.isFinancial) ?? vinculos[0] ?? null;
  const turmaNome = aluno.classId ? (turmas.find((t) => t.id === aluno.classId)?.name ?? '—') : '—';
  const escola = settings?.profileName?.trim() || 'Instituição de ensino';
  const cidade = settings?.profileAddress?.split('—').pop()?.trim() || 'comarca local';

  const anoLetivo = sp.ano?.trim() || String(new Date().getFullYear());
  const parcelas = Number(sp.parcelas) || 12;
  const valor = Number(String(sp.valor ?? '').replace(',', '.')) || 0;
  const vencimento = sp.vencimento?.trim() || '10';
  const hoje = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const termsSnapshot = `Ano ${anoLetivo} · ${parcelas}x de ${valor > 0 ? reais(valor) : '—'} · venc. dia ${vencimento}`;
  const sigResp = assinaturas.find((s) => s.signerKind === 'responsavel');
  const sigEsc = assinaturas.find((s) => s.signerKind === 'escola');
  const codigo = (s: { id: string }) => s.id.slice(0, 8).toUpperCase();
  const assinadoEm = (d: Date | string) =>
    new Date(d).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  const Clausula = ({ n, titulo, children }: { n: string; titulo: string; children: React.ReactNode }) => (
    <div className="mt-3 text-sm leading-relaxed">
      <p className="font-semibold">
        CLÁUSULA {n} — {titulo}
      </p>
      <div className="text-justify">{children}</div>
    </div>
  );

  return (
    <>
      {/* Controles (não imprimem): define os termos financeiros do contrato */}
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <Link href="/app/matricula" className="text-sm text-primary underline-offset-4 hover:underline">
          ← Voltar para matrícula
        </Link>
        <PrintButton label="Imprimir / PDF" />
      </div>

      <form method="get" className={`${cardClass} flex flex-wrap items-end gap-3 print:hidden`}>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Ano letivo
          <input name="ano" defaultValue={anoLetivo} className={`${fieldClass} w-24`} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Mensalidade (R$)
          <input name="valor" defaultValue={sp.valor ?? ''} placeholder="450,00" className={`${fieldClass} w-28`} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Nº de parcelas
          <input name="parcelas" type="number" min={1} max={12} defaultValue={parcelas} className={`${fieldClass} w-24`} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Dia de vencimento
          <input name="vencimento" type="number" min={1} max={28} defaultValue={vencimento} className={`${fieldClass} w-24`} />
        </label>
        <SubmitButton type="submit" size="sm" variant="outline">
          Atualizar contrato
        </SubmitButton>
      </form>

      {/* Documento imprimível */}
      <article className={`${cardClass} print:border-0 print:shadow-none`}>
        <header className="mb-5 flex items-center gap-3 border-b border-border pb-4">
          {settings?.logoUrl ? (
            <img src={settings.logoUrl} alt="Logo" className="h-12 w-12 rounded-lg object-cover" />
          ) : (
            <span className="h-12 w-12 rounded-lg bg-primary" />
          )}
          <div>
            <h1 className="text-lg font-bold leading-tight">{escola}</h1>
            <p className="text-xs text-muted-foreground">
              {[settings?.profileCnpj && `CNPJ ${settings.profileCnpj}`, settings?.profileAddress]
                .filter(Boolean)
                .join(' · ') || ' '}
            </p>
          </div>
        </header>

        <h2 className="mb-4 text-center text-base font-semibold uppercase">
          Contrato de Prestação de Serviços Educacionais
        </h2>

        <p className="text-justify text-sm leading-relaxed">
          <strong>CONTRATADA:</strong> {escola}
          {settings?.profileCnpj ? `, inscrita no CNPJ sob nº ${settings.profileCnpj}` : ''}
          {settings?.profileAddress ? `, com sede em ${settings.profileAddress}` : ''}.
        </p>
        <p className="mt-2 text-justify text-sm leading-relaxed">
          <strong>CONTRATANTE:</strong> {resp?.guardianName ?? '___________________________'}
          {resp ? '' : ''}, CPF nº ____________________, RG nº ____________________
          {resp?.guardianPhone ? `, telefone ${resp.guardianPhone}` : ''}, na qualidade de
          responsável legal pelo(a) aluno(a) <strong>{aluno.fullName}</strong>, nascido(a) em{' '}
          {br(aluno.birthDate)}
          {aluno.cpf ? `, CPF nº ${aluno.cpf}` : ''}.
        </p>

        <Clausula n="1ª" titulo="DO OBJETO">
          A CONTRATADA prestará serviços educacionais ao(à) aluno(a) acima identificado(a), na turma{' '}
          <strong>{turmaNome}</strong>
          {aluno.shift ? `, turno ${aluno.shift}` : ''}, referente ao ano letivo de{' '}
          <strong>{anoLetivo}</strong>, conforme sua proposta pedagógica e calendário escolar.
        </Clausula>

        <Clausula n="2ª" titulo="DO VALOR E DA FORMA DE PAGAMENTO">
          Pelos serviços, a CONTRATANTE pagará a anuidade escolar dividida em{' '}
          <strong>{parcelas}</strong> parcela(s) mensal(is) de{' '}
          <strong>{valor > 0 ? reais(valor) : 'R$ __________'}</strong>, com vencimento no dia{' '}
          <strong>{vencimento}</strong> de cada mês, nos termos da Lei nº 9.870/1999. O atraso
          implicará multa de 2% (dois por cento), juros de mora de 1% (um por cento) ao mês e
          atualização monetária, sem prejuízo das medidas de cobrança cabíveis.
        </Clausula>

        <Clausula n="3ª" titulo="DA VIGÊNCIA">
          O presente contrato vigora durante o ano letivo de {anoLetivo}, conforme o calendário
          escolar da CONTRATADA, não gerando expectativa de renovação automática.
        </Clausula>

        <Clausula n="4ª" titulo="DAS OBRIGAÇÕES DA CONTRATADA">
          Ministrar o ensino conforme sua proposta pedagógica e o Regimento Escolar; manter corpo
          docente habilitado; zelar pela segurança do(a) aluno(a) nas dependências da escola durante
          o horário escolar; e disponibilizar os meios de acompanhamento pedagógico.
        </Clausula>

        <Clausula n="5ª" titulo="DAS OBRIGAÇÕES DA CONTRATANTE">
          Efetuar o pagamento pontual das parcelas; fornecer a documentação exigida; acompanhar a
          vida escolar do(a) aluno(a); e respeitar, bem como fazer respeitar, as normas do Regimento
          Escolar.
        </Clausula>

        <Clausula n="6ª" titulo="DA RESCISÃO">
          O contrato poderá ser rescindido por iniciativa da CONTRATANTE mediante comunicação formal,
          permanecendo devidas as parcelas vencidas até a data do efetivo desligamento, e por
          iniciativa da CONTRATADA nas hipóteses previstas em lei e no Regimento Escolar.
        </Clausula>

        <Clausula n="7ª" titulo="DA PROTEÇÃO DE DADOS (LGPD)">
          As partes tratarão os dados pessoais do(a) aluno(a) e dos responsáveis em conformidade com
          a Lei nº 13.709/2018 (LGPD), exclusivamente para as finalidades educacionais,
          administrativas e legais decorrentes deste contrato, garantidos os direitos do titular.
        </Clausula>

        <Clausula n="8ª" titulo="DO REGIMENTO ESCOLAR">
          A CONTRATANTE declara conhecer e aceitar o Regimento Escolar e a proposta pedagógica da
          CONTRATADA, que integram este contrato independentemente de transcrição.
        </Clausula>

        <Clausula n="9ª" titulo="DO FORO">
          Fica eleito o foro da {cidade} para dirimir as questões oriundas deste contrato, com
          renúncia a qualquer outro, por mais privilegiado que seja.
        </Clausula>

        <p className="mt-6 text-sm">
          E, por estarem assim justas e contratadas, as partes assinam o presente instrumento.
        </p>
        <p className="mt-4 text-sm">{hoje}.</p>

        <div className="mt-12 grid gap-8 sm:grid-cols-2">
          {/* Responsável */}
          <div className="text-center text-sm">
            {sigResp ? (
              <>
                <p className="font-medium">{sigResp.signerName}</p>
                <div className="mt-1 border-t border-foreground/60 pt-1">CONTRATANTE (responsável)</div>
                <p className="mt-1 text-[11px] text-success">
                  ✓ Assinado eletronicamente em {assinadoEm(sigResp.signedAt)} · cód {codigo(sigResp)}
                </p>
              </>
            ) : (
              <>
                <div className="mt-8 border-t border-foreground/60 pt-1">CONTRATANTE (responsável)</div>
                <form
                  action={signContractAction}
                  className="mt-2 flex flex-col items-center gap-1 print:hidden"
                >
                  <input type="hidden" name="studentId" value={aluno.id} />
                  <input type="hidden" name="signerKind" value="responsavel" />
                  <input type="hidden" name="termsSnapshot" value={termsSnapshot} />
                  <input
                    name="signerName"
                    required
                    placeholder="Nome de quem assina"
                    defaultValue={resp?.guardianName ?? ''}
                    className={`${fieldClass} text-center`}
                  />
                  <SubmitButton type="submit" size="sm">
                    Assinar eletronicamente
                  </SubmitButton>
                </form>
              </>
            )}
          </div>
          {/* Escola */}
          <div className="text-center text-sm">
            {sigEsc ? (
              <>
                <p className="font-medium">{sigEsc.signerName}</p>
                <div className="mt-1 border-t border-foreground/60 pt-1">CONTRATADA ({escola})</div>
                <p className="mt-1 text-[11px] text-success">
                  ✓ Assinado eletronicamente em {assinadoEm(sigEsc.signedAt)} · cód {codigo(sigEsc)}
                </p>
              </>
            ) : (
              <>
                <div className="mt-8 border-t border-foreground/60 pt-1">CONTRATADA ({escola})</div>
                <form
                  action={signContractAction}
                  className="mt-2 flex flex-col items-center gap-1 print:hidden"
                >
                  <input type="hidden" name="studentId" value={aluno.id} />
                  <input type="hidden" name="signerKind" value="escola" />
                  <input type="hidden" name="termsSnapshot" value={termsSnapshot} />
                  <input
                    name="signerName"
                    required
                    placeholder="Nome do responsável da escola"
                    className={`${fieldClass} text-center`}
                  />
                  <SubmitButton type="submit" size="sm" variant="outline">
                    Assinar pela escola
                  </SubmitButton>
                </form>
              </>
            )}
          </div>
        </div>
        {(sigResp || sigEsc) && (
          <p className="mt-4 text-center text-[11px] text-muted-foreground">
            Assinatura eletrônica registrada nesta plataforma, com data, hora e código de
            verificação, nos termos da MP 2.200-2/2001.
          </p>
        )}
      </article>
    </>
  );
}

import { getPublicTenantBrand } from '@on-education/module-nucleo';
import { notFound } from 'next/navigation';

import { SubmitButton } from '@/components/submit-button';
import { db } from '@/server/db';

import { submitEnrollmentAction } from './actions';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const brand = await getPublicTenantBrand(db(), tenant).catch(() => null);
  return { title: brand ? `Matrícula · ${brand.name}` : 'Matrícula' };
}

const field =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none';

export default async function MatriculaPublicaPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const { tenant } = await params;
  const { ok, erro } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(tenant)) notFound();

  const brand = await getPublicTenantBrand(db(), tenant).catch(() => null);
  if (!brand) notFound();

  const style = brand.themeColor
    ? ({ ['--primary' as string]: brand.themeColor } as React.CSSProperties)
    : undefined;

  return (
    <div className="min-h-screen bg-background" style={style}>
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-xl items-center gap-3 px-6 py-5">
          {brand.logoUrl ? (
            <img src={brand.logoUrl} alt="Logo" className="h-10 w-10 rounded-lg object-cover" />
          ) : (
            <span className="h-10 w-10 rounded-lg bg-primary" />
          )}
          <div>
            <h1 className="text-lg font-bold leading-none">{brand.name}</h1>
            <p className="text-xs text-muted-foreground">Pré-matrícula online</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-6 py-8">
        {ok ? (
          <div className="rounded-xl border border-success/30 bg-success/5 p-6 text-center">
            <p className="text-lg font-semibold text-success">Solicitação enviada! ✓</p>
            <p className="mt-2 text-sm text-muted-foreground">
              A {brand.name} recebeu sua pré-matrícula e entrará em contato para confirmar. Você pode
              fechar esta página.
            </p>
          </div>
        ) : (
          <>
            <p className="mb-5 text-sm text-muted-foreground">
              Preencha os dados abaixo para solicitar a matrícula. A secretaria revisa e confirma com
              você. Os campos com * são obrigatórios.
            </p>

            {erro === 'campos' && (
              <p className="mb-4 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
                Informe ao menos o nome do aluno e do responsável.
              </p>
            )}
            {erro === 'falha' && (
              <p className="mb-4 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
                Não foi possível enviar. Tente novamente.
              </p>
            )}

            <form action={submitEnrollmentAction} className="space-y-5">
              <input type="hidden" name="tenantId" value={tenant} />

              <fieldset className="space-y-3">
                <legend className="mb-1 text-sm font-semibold">Dados do aluno</legend>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Nome completo *</label>
                  <input name="studentName" required className={field} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Nascimento</label>
                    <input name="birthDate" type="date" className={field} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Turno</label>
                    <select name="shift" defaultValue="" className={field}>
                      <option value="">—</option>
                      <option value="manhã">Manhã</option>
                      <option value="tarde">Tarde</option>
                      <option value="noite">Noite</option>
                      <option value="integral">Integral</option>
                    </select>
                  </div>
                </div>
              </fieldset>

              <fieldset className="space-y-3">
                <legend className="mb-1 text-sm font-semibold">Responsável</legend>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Nome completo *</label>
                  <input name="guardianName" required className={field} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Telefone</label>
                    <input name="guardianPhone" className={field} placeholder="(00) 00000-0000" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">E-mail</label>
                    <input name="guardianEmail" type="email" className={field} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">CPF</label>
                    <input name="guardianCpf" className={field} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Parentesco</label>
                    <input name="relation" className={field} placeholder="mãe, pai, responsável…" />
                  </div>
                </div>
              </fieldset>

              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Observações</label>
                <textarea name="notes" rows={3} className={field} placeholder="Algo que a escola deva saber (opcional)" />
              </div>

              <SubmitButton type="submit" className="w-full">
                Enviar solicitação
              </SubmitButton>
            </form>
          </>
        )}

        <p className="mt-8 text-center text-xs text-muted-foreground">
          {brand.name} · Edu On Way
        </p>
      </main>
    </div>
  );
}

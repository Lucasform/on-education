import { CUSTOM_FIELD_TYPES, getTenantDetail, listCustomFieldDefs } from '@on-education/module-nucleo';
import { notFound } from 'next/navigation';

import { ConfirmButton } from '@/components/confirm-button';
import { SubmitButton } from '@/components/submit-button';
import { db } from '@/server/db';

import { createCustomFieldAction, deleteCustomFieldAction } from '../../../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Campos personalizados · Admin' };

const TYPE_LABEL: Record<string, string> = {
  text: 'Texto',
  textarea: 'Texto longo',
  number: 'Número',
  date: 'Data',
  select: 'Lista (opções)',
  checkbox: 'Sim / Não',
  phone: 'Telefone',
  email: 'E-mail',
};

export default async function CamposPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = db();
  const t = await getTenantDetail(client, id).catch(() => null);
  if (!t) notFound();
  const fields = await listCustomFieldDefs(client, id, 'student').catch(() => []);

  return (
    <>
      <a
        href={`/admin/contas/${id}`}
        className="text-xs text-primary underline-offset-4 hover:underline"
      >
        ← Voltar para a conta
      </a>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Campos personalizados</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t.name} · entidade <span className="font-medium text-foreground">Alunos</span>. Os campos
          aparecem na ficha do aluno desta conta.
        </p>
      </div>

      {/* Lista atual */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Campos ({fields.length})</h2>
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Nome</th>
                <th className="px-4 py-2 font-medium">Tipo</th>
                <th className="px-4 py-2 font-medium">Obrigatório</th>
                <th className="px-4 py-2 font-medium">Chave</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {fields.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                    Nenhum campo personalizado ainda.
                  </td>
                </tr>
              ) : (
                fields.map((f) => (
                  <tr key={f.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-2 font-medium">
                      {f.label}
                      {f.fieldType === 'select' && f.options?.length ? (
                        <span className="block text-xs text-muted-foreground">
                          {f.options.join(' · ')}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {TYPE_LABEL[f.fieldType] ?? f.fieldType}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{f.required ? 'Sim' : '—'}</td>
                    <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                      {f.fieldKey}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <form action={deleteCustomFieldAction}>
                        <input type="hidden" name="tenantId" value={id} />
                        <input type="hidden" name="id" value={f.id} />
                        <ConfirmButton
                          size="sm"
                          variant="ghost"
                          message={`Remover o campo "${f.label}"?`}
                        >
                          Remover
                        </ConfirmButton>
                      </form>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Novo campo */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Adicionar campo</h2>
        <form
          action={createCustomFieldAction}
          className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4"
        >
          <input type="hidden" name="tenantId" value={id} />
          <input type="hidden" name="entity" value="student" />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Nome do campo</span>
              <input
                name="label"
                required
                minLength={2}
                placeholder="Ex.: Plano de saúde"
                className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Tipo</span>
              <select
                name="fieldType"
                defaultValue="text"
                className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                {CUSTOM_FIELD_TYPES.map((ty) => (
                  <option key={ty} value={ty}>
                    {TYPE_LABEL[ty] ?? ty}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">
              Opções <span className="text-muted-foreground">(só para o tipo Lista, uma por linha)</span>
            </span>
            <textarea
              name="options"
              rows={3}
              placeholder={'Manhã\nTarde\nIntegral'}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="required" className="h-4 w-4 accent-primary" />
            Obrigatório no cadastro
          </label>
          <div>
            <SubmitButton type="submit" size="sm">
              Adicionar campo
            </SubmitButton>
          </div>
        </form>
      </section>
    </>
  );
}

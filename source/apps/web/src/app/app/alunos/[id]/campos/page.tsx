import {
  getCustomFieldValues,
  getStudent,
  listCustomFieldDefs,
} from '@on-education/module-nucleo';
import { notFound, redirect } from 'next/navigation';

import { SubmitButton } from '@/components/submit-button';
import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { saveCamposAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Campos personalizados · Edu On Way' };

export default async function CamposAlunoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');

  const client = db();

  const [aluno, defs, valores] = await Promise.all([
    getStudent(client, ctx, id).catch(() => null),
    listCustomFieldDefs(client, ctx.tenantId, 'student').catch(() => []),
    getCustomFieldValues(client, ctx.tenantId, id).catch(() => ({} as Record<string, string>)),
  ]);

  if (!aluno) notFound();

  return (
    <>
      <PageHeader
        title="Campos personalizados"
        description={`Informações complementares de ${aluno.fullName}.`}
        back={{ href: `/app/alunos/${id}`, label: 'Voltar para o aluno' }}
      />

      <div className={cardClass}>
        {defs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            A escola ainda nao definiu campos personalizados para alunos. Os campos sao
            configurados pelo administrador nas configuracoes da conta.
          </p>
        ) : (
          <form action={saveCamposAction} className="flex flex-col gap-4">
            <input type="hidden" name="studentId" value={aluno.id} />

            <div className="grid gap-4 sm:grid-cols-2">
              {defs.map((f) => {
                const name = `cf_${f.id}`;
                const val = valores[f.id] ?? '';

                if (f.fieldType === 'checkbox') {
                  return (
                    <label key={f.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name={name}
                        defaultChecked={val === 'true'}
                        className="h-4 w-4 accent-primary"
                      />
                      {f.label}
                    </label>
                  );
                }

                return (
                  <div key={f.id} className={f.fieldType === 'textarea' ? 'sm:col-span-2' : ''}>
                    <label className="mb-1 block text-xs text-muted-foreground">
                      {f.label}
                      {f.required && ' *'}
                    </label>
                    {f.fieldType === 'textarea' ? (
                      <textarea
                        name={name}
                        required={f.required}
                        defaultValue={val}
                        rows={3}
                        className={fieldClass}
                      />
                    ) : f.fieldType === 'select' ? (
                      <select
                        name={name}
                        required={f.required}
                        defaultValue={val}
                        className={fieldClass}
                      >
                        <option value="">Selecione</option>
                        {(f.options ?? []).map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        name={name}
                        type={
                          f.fieldType === 'number'
                            ? 'number'
                            : f.fieldType === 'date'
                              ? 'date'
                              : f.fieldType === 'email'
                                ? 'email'
                                : f.fieldType === 'phone'
                                  ? 'tel'
                                  : 'text'
                        }
                        required={f.required}
                        defaultValue={val}
                        className={fieldClass}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <SubmitButton type="submit" size="sm" variant="outline">
              Salvar campos personalizados
            </SubmitButton>
          </form>
        )}
      </div>
    </>
  );
}

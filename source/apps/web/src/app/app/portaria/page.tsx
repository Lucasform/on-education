import { listGateLogs } from '@on-education/module-nucleo';
import { redirect } from 'next/navigation';

import { ConfirmButton } from '@/components/confirm-button';
import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { SubmitButton } from '@/components/submit-button';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { deleteGateLogAction, logGateAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Portaria · Edu On Way' };

const KIND: Record<string, string> = { aluno: 'Aluno', funcionario: 'Funcionário', visitante: 'Visitante' };

export default async function PortariaPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  if (ctx.tenantType !== 'organization') redirect('/app');
  const logs = await listGateLogs(db(), ctx).catch(() => []);

  return (
    <>
      <PageHeader title="Portaria" description="Registro de entrada e saída de alunos, funcionários e visitantes." />

      <section className={cardClass}>
        <h2 className="mb-3 text-sm font-medium">Registrar movimento</h2>
        <form action={logGateAction} className="flex flex-wrap items-end gap-2">
          <input name="personName" required placeholder="Nome" className={`${fieldClass} min-w-[12rem] flex-1`} />
          <select name="kind" className={fieldClass} defaultValue="visitante">
            <option value="aluno">Aluno</option>
            <option value="funcionario">Funcionário</option>
            <option value="visitante">Visitante</option>
          </select>
          <select name="direction" className={fieldClass} defaultValue="entrada">
            <option value="entrada">Entrada</option>
            <option value="saida">Saída</option>
          </select>
          <input name="note" placeholder="Observação (opcional)" className={`${fieldClass} min-w-[10rem] flex-1`} />
          <SubmitButton type="submit" size="sm">
            Registrar
          </SubmitButton>
        </form>
      </section>

      <section className={cardClass}>
        <h2 className="mb-3 text-sm font-medium">Movimentos recentes ({logs.length})</h2>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum registro ainda.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-1.5 font-medium">Quando</th>
                <th className="py-1.5 font-medium">Nome</th>
                <th className="py-1.5 font-medium">Tipo</th>
                <th className="py-1.5 font-medium">Movimento</th>
                <th className="py-1.5 font-medium">Obs.</th>
                <th className="py-1.5" />
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-b border-border/50 last:border-0">
                  <td className="py-1.5 text-muted-foreground">
                    {new Date(l.at).toLocaleString('pt-BR', {
                      timeZone: 'America/Sao_Paulo',
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="py-1.5 font-medium">{l.personName}</td>
                  <td className="py-1.5 text-muted-foreground">{KIND[l.kind] ?? l.kind}</td>
                  <td className="py-1.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] ${
                        l.direction === 'saida'
                          ? 'bg-orange-500/10 text-orange-500'
                          : 'bg-emerald-500/10 text-emerald-500'
                      }`}
                    >
                      {l.direction === 'saida' ? 'Saída' : 'Entrada'}
                    </span>
                  </td>
                  <td className="py-1.5 text-muted-foreground">{l.note ?? '—'}</td>
                  <td className="py-1.5 text-right">
                    <form action={deleteGateLogAction}>
                      <input type="hidden" name="id" value={l.id} />
                      <ConfirmButton size="sm" variant="ghost" message="Excluir registro?">
                        Excluir
                      </ConfirmButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}

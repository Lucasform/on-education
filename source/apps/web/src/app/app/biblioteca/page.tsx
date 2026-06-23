import { listLibraryItems, listLibraryLoans } from '@on-education/module-nucleo';
import { redirect } from 'next/navigation';

import { ConfirmButton } from '@/components/confirm-button';
import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { SubmitButton } from '@/components/submit-button';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import {
  createLibraryItemAction,
  deleteLibraryItemAction,
  loanLibraryItemAction,
  returnLibraryLoanAction,
} from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Biblioteca · Edu On Way' };

function quando(d: Date | string | null) {
  return d ? new Date(d).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '—';
}

export default async function BibliotecaPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  if (ctx.tenantType !== 'organization') redirect('/app');
  const client = db();
  const [acervo, emprestimos] = await Promise.all([
    listLibraryItems(client, ctx).catch(() => []),
    listLibraryLoans(client, ctx).catch(() => []),
  ]);
  const disponiveis = acervo.filter((i) => i.status !== 'emprestado');
  const ativos = emprestimos.filter((l) => !l.returnedAt);

  return (
    <>
      <PageHeader title="Biblioteca" description="Acervo e empréstimo de livros." />

      <div className="grid gap-5 lg:grid-cols-2">
        <section className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Novo livro no acervo</h2>
          <form action={createLibraryItemAction} className="flex flex-col gap-2">
            <input name="title" required placeholder="Título" className={fieldClass} />
            <div className="flex gap-2">
              <input name="author" placeholder="Autor (opcional)" className={fieldClass} />
              <input name="code" placeholder="Tombo/ISBN (opcional)" className={`${fieldClass} w-40`} />
            </div>
            <SubmitButton type="submit" size="sm">
              Adicionar ao acervo
            </SubmitButton>
          </form>
        </section>

        <section className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Emprestar</h2>
          {disponiveis.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum livro disponível.</p>
          ) : (
            <form action={loanLibraryItemAction} className="flex flex-col gap-2">
              <select name="itemId" required className={fieldClass} defaultValue="">
                <option value="" disabled>
                  Escolha o livro
                </option>
                {disponiveis.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.title}
                    {i.author ? ` — ${i.author}` : ''}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <input name="borrowerName" required placeholder="Quem está pegando" className={fieldClass} />
                <input name="dueDate" type="date" className={`${fieldClass} w-40`} aria-label="Devolução" />
              </div>
              <SubmitButton type="submit" size="sm">
                Registrar empréstimo
              </SubmitButton>
            </form>
          )}
        </section>
      </div>

      <section className={cardClass}>
        <h2 className="mb-3 text-sm font-medium">Empréstimos ativos ({ativos.length})</h2>
        {ativos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum empréstimo em aberto.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-1.5 font-medium">Livro</th>
                <th className="py-1.5 font-medium">Com quem</th>
                <th className="py-1.5 font-medium">Saída</th>
                <th className="py-1.5 font-medium">Devolver até</th>
                <th className="py-1.5" />
              </tr>
            </thead>
            <tbody>
              {ativos.map((l) => (
                <tr key={l.id} className="border-b border-border/50 last:border-0">
                  <td className="py-1.5">{l.itemTitle ?? '—'}</td>
                  <td className="py-1.5">{l.borrowerName}</td>
                  <td className="py-1.5 text-muted-foreground">{quando(l.loanedAt)}</td>
                  <td className="py-1.5 text-muted-foreground">{quando(l.dueDate)}</td>
                  <td className="py-1.5 text-right">
                    <form action={returnLibraryLoanAction}>
                      <input type="hidden" name="id" value={l.id} />
                      <SubmitButton type="submit" size="sm" variant="outline">
                        Devolver
                      </SubmitButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className={cardClass}>
        <h2 className="mb-3 text-sm font-medium">Acervo ({acervo.length})</h2>
        {acervo.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum livro cadastrado.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {acervo.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-2 border-b border-border/50 py-1 last:border-0">
                <span>
                  <span className="font-medium">{i.title}</span>
                  {i.author && <span className="text-muted-foreground"> — {i.author}</span>}
                  <span
                    className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] ${
                      i.status === 'emprestado'
                        ? 'bg-orange-500/10 text-orange-500'
                        : 'bg-emerald-500/10 text-emerald-500'
                    }`}
                  >
                    {i.status === 'emprestado' ? 'Emprestado' : 'Disponível'}
                  </span>
                </span>
                <form action={deleteLibraryItemAction}>
                  <input type="hidden" name="id" value={i.id} />
                  <ConfirmButton size="sm" variant="ghost" message={`Remover "${i.title}"?`}>
                    Remover
                  </ConfirmButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

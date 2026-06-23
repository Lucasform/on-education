import { SubmitButton } from '@/components/submit-button';
import { listMessages } from '@on-education/module-comunicacao';
import { getWhatsappConnection, listGuardians, listStudents } from '@on-education/module-nucleo';
import { redirect } from 'next/navigation';

import { ConfirmButton } from '@/components/confirm-button';
import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { createMessageAction, deleteMessageAction } from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Mensagens · Edu On Way' };

export default async function MensagensPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const client = db();
  const [mensagens, responsaveis, alunos] = await Promise.all([
    listMessages(client, ctx).catch(() => []),
    listGuardians(client, ctx).catch(() => []),
    listStudents(client, ctx).catch(() => []),
  ]);
  const nomeResp = new Map(responsaveis.map((g) => [g.id, g.fullName]));
  const nomeAluno = new Map(alunos.map((a) => [a.id, a.fullName]));
  const wa = await getWhatsappConnection(client, ctx).catch(() => null);

  return (
    <>
      <PageHeader
        title="Mensagens"
        description="Registre comunicações com os responsáveis, por aluno."
      />

      {responsaveis.length === 0 ? (
        <div className={cardClass}>
          <p className="text-sm text-muted-foreground">
            Cadastre responsáveis primeiro para enviar mensagens.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          <div className={cardClass}>
            <h2 className="mb-3 text-sm font-medium">Histórico ({mensagens.length})</h2>
            {mensagens.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {mensagens.map((mn) => (
                  <li key={mn.id} className="rounded-md border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">
                        {(mn as { sender?: string }).sender === 'guardian' && (
                          <span className="mr-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">
                            responsável
                          </span>
                        )}
                        {mn.subject}{' '}
                        <span className="text-muted-foreground">
                          · {nomeResp.get(mn.guardianId) ?? 'Responsável'}
                          {mn.studentId && ` · ${nomeAluno.get(mn.studentId) ?? 'Aluno'}`}
                        </span>
                      </span>
                      <form action={deleteMessageAction}>
                        <input type="hidden" name="id" value={mn.id} />
                        <ConfirmButton
                          size="sm"
                          variant="ghost"
                          message={`Excluir a mensagem "${mn.subject}"?`}
                        >
                          Excluir
                        </ConfirmButton>
                      </form>
                    </div>
                    {mn.body && (
                      <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{mn.body}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={cardClass}>
            <h2 className="mb-3 text-sm font-medium">Nova mensagem</h2>
            <form action={createMessageAction} className="flex flex-col gap-2">
              <select name="guardianId" required className={fieldClass} defaultValue="">
                <option value="" disabled>
                  Responsável
                </option>
                {responsaveis.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.fullName}
                  </option>
                ))}
              </select>
              <select name="studentId" className={fieldClass} defaultValue="">
                <option value="">Aluno (opcional)</option>
                {alunos.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.fullName}
                  </option>
                ))}
              </select>
              <input name="subject" required placeholder="Assunto" className={fieldClass} />
              <textarea name="body" rows={4} placeholder="Mensagem" className={fieldClass} />
              {wa?.active && (
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" name="sendWhatsapp" className="h-4 w-4" />
                  Enviar também no WhatsApp do responsável (se tiver telefone)
                </label>
              )}
              <SubmitButton type="submit" size="sm">
                Registrar mensagem
              </SubmitButton>
            </form>
            <p className="mt-2 text-xs text-muted-foreground">
              {wa?.active
                ? 'Fica registrado no sistema; marque a opção para enviar também no WhatsApp.'
                : 'Fica registrado no sistema. Conecte o WhatsApp (menu Comunicação) para enviar por lá.'}
            </p>
          </div>
        </div>
      )}
    </>
  );
}

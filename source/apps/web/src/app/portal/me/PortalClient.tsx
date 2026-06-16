'use client';

import { useEffect, useState, useTransition } from 'react';

import { logoutGuardianAction } from '../login/actions';
import {
  bookMeetingAction,
  changePasswordAction,
  markChatReadAction,
  requestExitAction,
  requestReenrollmentAction,
  sendMessageAction,
  submitJustificationAction,
  updateContactAction,
} from './actions';

interface Student {
  id: string;
  fullName: string;
  grades: { label: string; subjectName: string | null; value: number | null; kind: string }[];
  boletim: { finalAverage: string; status: string; components: { name: string; average: string }[] };
  absencesTotal: number;
  recentAbsences: { date: string; subjectName: string | null }[];
  recentLessons: { date: string; topic: string; subjectName: string | null }[];
  occurrences: { date: string; title: string; severity: string }[];
  exitRequests: { id: string; date: string; time: string | null; reason: string; status: string }[];
  justifications: { id: string; date: string; reason: string; status: string }[];
}
interface Data {
  guardian: { id: string; fullName: string; email: string | null; phone: string | null };
  students: Student[];
  communications: { id: string; title: string; body: string; createdAt: string }[];
  upcomingEvents: { date: string; name: string; type: string }[];
  meetingSlots: { id: string; date: string; startTime: string; durationMinutes: number; title: string }[];
  chat: { id: string; sender: string; subject: string; body: string; createdAt: string }[];
  invoices: { id: string; competencia: string; description: string; amountCents: number; dueDate: string; status: string }[];
  unread: { chat: number; communications: number };
}

const money = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const br = (d: string) => (d?.length >= 10 ? d.slice(0, 10).split('-').reverse().join('/') : d);
const field =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none';
const card = 'rounded-lg border border-border bg-card p-4 shadow-sm';

const TABS = [
  { id: 'geral', label: 'Visão geral' },
  { id: 'notas', label: 'Notas & faltas' },
  { id: 'solicitacoes', label: 'Solicitações' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'chat', label: 'Mensagens' },
  { id: 'conta', label: 'Conta' },
] as const;

const FLASH: Record<string, string> = {
  saida: 'Solicitação de saída enviada.',
  justificativa: 'Justificativa enviada.',
  reuniao: 'Reunião agendada!',
  rematricula: 'Pedido de rematrícula enviado.',
  contato: 'Dados atualizados.',
  senha: 'Senha alterada.',
};
const ERR: Record<string, string> = {
  campos: 'Preencha os campos obrigatórios.',
  falha: 'Não foi possível concluir. Tente novamente.',
  reuniao: 'Horário indisponível, escolha outro.',
  senha: 'Senha inválida (mín. 6, e iguais).',
  anexo: 'Não foi possível enviar o anexo (use imagem/PDF até 8 MB).',
};

function Badge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const cls = s.includes('aprov')
    ? 'bg-green-500/15 text-green-600'
    : s.includes('pend')
      ? 'bg-amber-500/15 text-amber-600'
      : s.includes('reprov') || s.includes('neg')
        ? 'bg-red-500/15 text-red-600'
        : 'bg-muted text-muted-foreground';
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}>{status}</span>;
}

export function PortalClient({ data, ok, erro }: { data: Data; ok: string | null; erro: string | null }) {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('geral');
  const [sid, setSid] = useState(data.students[0]?.id ?? '');
  const aluno = data.students.find((s) => s.id === sid) ?? data.students[0];
  const [, startTransition] = useTransition();
  const [chatSeen, setChatSeen] = useState(false);

  // Ao abrir a aba de mensagens, marca as da escola como lidas.
  useEffect(() => {
    if (tab === 'chat' && data.unread.chat > 0 && !chatSeen) {
      setChatSeen(true);
      startTransition(() => {
        void markChatReadAction();
      });
    }
  }, [tab, data.unread.chat, chatSeen]);
  const chatBadge = chatSeen ? 0 : data.unread.chat;

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Olá, {data.guardian.fullName}</h1>
          <p className="text-sm text-muted-foreground">Portal do responsável</p>
        </div>
        <form action={logoutGuardianAction}>
          <button type="submit" className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted">
            Sair
          </button>
        </form>
      </div>

      {ok && FLASH[ok] && (
        <div className="rounded-md border border-green-500/30 bg-green-500/5 px-3 py-2 text-sm text-green-600">{FLASH[ok]}</div>
      )}
      {erro && ERR[erro] && (
        <div className="rounded-md border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-600">{ERR[erro]}</div>
      )}

      {/* Seletor de filho */}
      {data.students.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {data.students.map((s) => (
            <button
              key={s.id}
              onClick={() => setSid(s.id)}
              className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                s.id === sid ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-accent'
              }`}
            >
              {s.fullName}
            </button>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((t) => {
          const badge = t.id === 'chat' ? chatBadge : t.id === 'geral' ? data.unread.communications : 0;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors ${
                tab === t.id ? 'border-primary font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
              {badge > 0 && (
                <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* VISÃO GERAL */}
      {tab === 'geral' && (
        <div className="space-y-5">
          {aluno && (
            <div className="grid grid-cols-3 gap-3">
              <div className={card}>
                <div className="text-xs text-muted-foreground">Média</div>
                <div className="text-2xl font-semibold">{aluno.boletim.finalAverage}</div>
              </div>
              <div className={card}>
                <div className="text-xs text-muted-foreground">Faltas</div>
                <div className="text-2xl font-semibold">{aluno.absencesTotal}</div>
              </div>
              <div className={card}>
                <div className="text-xs text-muted-foreground">Situação</div>
                <div className="mt-1"><Badge status={aluno.boletim.status} /></div>
              </div>
            </div>
          )}

          <section className={card}>
            <h2 className="mb-2 text-sm font-medium">Próximos eventos</h2>
            {data.upcomingEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nada agendado.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {data.upcomingEvents.map((e, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span>{e.name}</span>
                    <span className="shrink-0 text-muted-foreground">{br(e.date)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={card}>
            <h2 className="mb-2 text-sm font-medium">Comunicados da escola</h2>
            {data.communications.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum comunicado.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {data.communications.map((c) => (
                  <li key={c.id} className="border-b border-border/50 pb-2 last:border-0">
                    <p className="font-medium">{c.title}</p>
                    <p className="mt-0.5 whitespace-pre-wrap text-muted-foreground">{c.body}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{br(c.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {/* NOTAS & FALTAS */}
      {tab === 'notas' && aluno && (
        <div className="space-y-5">
          <section className={card}>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-medium">Boletim — {aluno.fullName}</h2>
              <Badge status={aluno.boletim.status} />
            </div>
            {aluno.boletim.components.length > 0 ? (
              <table className="w-full text-sm">
                <tbody>
                  {aluno.boletim.components.map((c) => (
                    <tr key={c.name} className="border-b border-border/40 last:border-0">
                      <td className="py-1.5">{c.name}</td>
                      <td className="py-1.5 text-right font-medium">{c.average}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="py-1.5 font-medium">Média final</td>
                    <td className="py-1.5 text-right font-semibold">{aluno.boletim.finalAverage}</td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-muted-foreground">Sem componentes definidos. Média: {aluno.boletim.finalAverage}</p>
            )}
          </section>

          {aluno.grades.length > 0 && (
            <section className={card}>
              <h2 className="mb-2 text-sm font-medium">Notas lançadas</h2>
              <ul className="space-y-1 text-sm">
                {aluno.grades.map((g, i) => (
                  <li key={i} className="flex justify-between gap-2 text-muted-foreground">
                    <span>{g.label}{g.subjectName && <span className="ml-1 text-xs opacity-70">· {g.subjectName}</span>}</span>
                    <span className="font-medium text-foreground">{g.value === null ? 'pend.' : g.value}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className={card}>
            <h2 className="mb-2 text-sm font-medium">Frequência — {aluno.absencesTotal} falta(s)</h2>
            {aluno.recentAbsences.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem faltas registradas. 🎉</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {aluno.recentAbsences.map((a, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span>{br(a.date)}{a.subjectName && <span className="ml-1 text-xs text-muted-foreground">· {a.subjectName}</span>}</span>
                    <span className="text-xs font-medium text-red-500">falta</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {aluno.recentLessons.length > 0 && (
            <section className={card}>
              <h2 className="mb-2 text-sm font-medium">Aulas recentes</h2>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {aluno.recentLessons.map((l, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span>{l.topic}{l.subjectName && <span className="opacity-70"> · {l.subjectName}</span>}</span>
                    <span className="shrink-0">{br(l.date)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {aluno.occurrences.length > 0 && (
            <section className={card}>
              <h2 className="mb-2 text-sm font-medium">Ocorrências</h2>
              <ul className="space-y-1 text-sm">
                {aluno.occurrences.map((o, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span>{o.title}</span>
                    <span className="shrink-0 text-muted-foreground">{br(o.date)} · {o.severity}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {/* SOLICITAÇÕES */}
      {tab === 'solicitacoes' && aluno && (
        <div className="space-y-5">
          <section id="saida" className={card}>
            <h2 className="mb-2 text-sm font-medium">Autorização de saída</h2>
            {aluno.exitRequests.length > 0 && (
              <ul className="mb-3 space-y-1 text-sm">
                {aluno.exitRequests.slice(0, 4).map((e) => (
                  <li key={e.id} className="flex justify-between gap-2">
                    <span>{br(e.date)}{e.time && ` ${e.time}`} · {e.reason}</span>
                    <Badge status={e.status} />
                  </li>
                ))}
              </ul>
            )}
            <form action={requestExitAction} className="grid gap-2 sm:grid-cols-2">
              <input type="hidden" name="studentId" value={aluno.id} />
              <input name="date" type="date" required className={field} />
              <input name="time" type="time" className={field} />
              <input name="authorizedByName" placeholder="Quem vai buscar (opcional)" className={`${field} sm:col-span-2`} />
              <input name="reason" required placeholder="Motivo" className={`${field} sm:col-span-2`} />
              <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground sm:col-span-2">Solicitar saída</button>
            </form>
          </section>

          <section id="justificativa" className={card}>
            <h2 className="mb-2 text-sm font-medium">Justificar falta</h2>
            {aluno.justifications.length > 0 && (
              <ul className="mb-3 space-y-1 text-sm">
                {aluno.justifications.slice(0, 4).map((j) => (
                  <li key={j.id} className="flex justify-between gap-2">
                    <span>{br(j.date)} · {j.reason}</span>
                    <Badge status={j.status} />
                  </li>
                ))}
              </ul>
            )}
            <form action={submitJustificationAction} className="grid gap-2">
              <input type="hidden" name="studentId" value={aluno.id} />
              <input name="date" type="date" required className={field} />
              <input name="reason" required placeholder="Motivo da falta" className={field} />
              <label className="text-xs text-muted-foreground">
                Anexar atestado (opcional, imagem ou PDF)
                <input name="document" type="file" accept="image/*,application/pdf" className="mt-1 block w-full text-xs file:mr-2 file:rounded file:border-0 file:bg-muted file:px-2 file:py-1" />
              </label>
              <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Enviar justificativa</button>
            </form>
          </section>

          <section id="reuniao" className={card}>
            <h2 className="mb-2 text-sm font-medium">Agendar reunião</h2>
            {data.meetingSlots.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum horário disponível no momento.</p>
            ) : (
              <form action={bookMeetingAction} className="grid gap-2">
                <input type="hidden" name="studentId" value={aluno.id} />
                <input type="hidden" name="guardianName" value={data.guardian.fullName} />
                <input type="hidden" name="guardianPhone" value={data.guardian.phone ?? ''} />
                <select name="slotId" required className={field} defaultValue="">
                  <option value="" disabled>Escolha um horário</option>
                  {data.meetingSlots.map((s) => (
                    <option key={s.id} value={s.id}>{br(s.date)} {s.startTime} · {s.title}</option>
                  ))}
                </select>
                <input name="notes" placeholder="Assunto (opcional)" className={field} />
                <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Agendar</button>
              </form>
            )}
          </section>

          <section id="matricula" className={card}>
            <h2 className="mb-2 text-sm font-medium">Rematrícula</h2>
            <p className="mb-2 text-xs text-muted-foreground">Solicite a renovação da matrícula de {aluno.fullName}. A secretaria confirma.</p>
            <form action={requestReenrollmentAction} className="grid gap-2">
              <input type="hidden" name="studentId" value={aluno.id} />
              <input name="notes" placeholder="Observação (opcional): turno, turma desejada…" className={field} />
              <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Solicitar rematrícula</button>
            </form>
          </section>
        </div>
      )}

      {/* FINANCEIRO */}
      {tab === 'financeiro' && (
        <section className={card}>
          <h2 className="mb-3 text-sm font-medium">Mensalidades</h2>
          {data.invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma fatura no momento.</p>
          ) : (
            <ul className="divide-y divide-border/50 text-sm">
              {data.invoices.map((inv) => {
                const overdue = inv.status === 'aberto' && inv.dueDate < new Date().toISOString().slice(0, 10);
                return (
                  <li key={inv.id} className="flex items-center justify-between gap-2 py-2">
                    <div>
                      <p className="font-medium">{inv.description}</p>
                      <p className="text-xs text-muted-foreground">
                        Comp. {inv.competencia} · vence {br(inv.dueDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{money(inv.amountCents)}</p>
                      <Badge status={inv.status === 'pago' ? 'pago' : overdue ? 'vencido' : 'aberto'} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Pagamento online (2ª via Pix/boleto) chega em breve. Por ora, fale com a secretaria pela aba Mensagens.
          </p>
        </section>
      )}

      {/* CHAT */}
      {tab === 'chat' && (
        <div id="chat" className="space-y-3">
          <section className={card}>
            <h2 className="mb-3 text-sm font-medium">Conversa com a escola</h2>
            {data.chat.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda. Envie a primeira abaixo.</p>
            ) : (
              <ul className="space-y-2">
                {data.chat.map((m) => (
                  <li key={m.id} className={`flex ${m.sender === 'guardian' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.sender === 'guardian' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      {m.subject && m.subject !== 'Mensagem do responsável' && <p className="text-xs font-semibold opacity-80">{m.subject}</p>}
                      <p className="whitespace-pre-wrap">{m.body}</p>
                      <p className="mt-0.5 text-[10px] opacity-70">{br(m.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <form action={sendMessageAction} className={`${card} flex flex-col gap-2`}>
            <textarea name="body" required rows={3} placeholder="Escreva sua mensagem para a escola…" className={field} />
            <button className="self-end rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Enviar</button>
          </form>
        </div>
      )}

      {/* CONTA */}
      {tab === 'conta' && (
        <div id="conta" className="space-y-5">
          {aluno && (
            <section className={`${card} bg-gradient-to-br from-primary/10 to-transparent`}>
              <h2 className="mb-3 text-sm font-medium">Carteirinha digital</h2>
              <div className="flex items-center gap-4">
                <img
                  alt="QR da carteirinha"
                  className="h-28 w-28 rounded-md border border-border bg-white p-1"
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                    `Edu On Way | Aluno: ${aluno.fullName} | ID: ${aluno.id}`,
                  )}`}
                />
                <div>
                  <p className="text-xs text-muted-foreground">Aluno</p>
                  <p className="text-lg font-semibold leading-tight">{aluno.fullName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Responsável: {data.guardian.fullName}</p>
                  <p className="text-[11px] text-muted-foreground">Apresente o QR na portaria/eventos.</p>
                </div>
              </div>
            </section>
          )}
          <section className={card}>
            <h2 className="mb-2 text-sm font-medium">Meus dados</h2>
            <form action={updateContactAction} className="grid gap-2">
              <input name="phone" defaultValue={data.guardian.phone ?? ''} placeholder="Telefone" className={field} />
              <input name="email" type="email" defaultValue={data.guardian.email ?? ''} placeholder="E-mail" className={field} />
              <input name="address" placeholder="Endereço" className={field} />
              <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Salvar dados</button>
            </form>
          </section>
          <section className={card}>
            <h2 className="mb-2 text-sm font-medium">Trocar senha</h2>
            <form action={changePasswordAction} className="grid gap-2">
              <input name="password" type="password" required placeholder="Nova senha (mín. 6)" className={field} />
              <input name="password2" type="password" required placeholder="Repita a senha" className={field} />
              <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Alterar senha</button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

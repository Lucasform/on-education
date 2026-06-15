import { SubmitButton } from '@/components/submit-button';
import {
  listMeetingBookings,
  listMeetingSlots,
  listStudents,
} from '@on-education/module-nucleo';
import { redirect } from 'next/navigation';

import { ConfirmButton } from '@/components/confirm-button';
import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { hojeISO } from '@/lib/date';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import {
  cancelMeetingBookingAction,
  confirmMeetingBookingAction,
  createMeetingBookingAction,
  createMeetingSlotAction,
  deleteMeetingSlotAction,
} from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Reunioes - Edu On Way' };

export default async function ReunioesPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const client = db();
  const [slots, bookings, alunos] = await Promise.all([
    listMeetingSlots(client, ctx).catch(() => []),
    listMeetingBookings(client, ctx).catch(() => []),
    listStudents(client, ctx).catch(() => []),
  ]);

  return (
    <>
      <PageHeader
        title="Reunioes"
        description="Agendamentos de reunioes escola-responsavel."
      />

      <div className="flex flex-col gap-8">
        {/* Horarios disponiveis */}
        <div className="grid gap-5 md:grid-cols-2">
          <div className={cardClass}>
            <h2 className="mb-3 text-sm font-medium">Horarios disponiveis ({slots.length})</h2>
            {slots.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum horario cadastrado.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {slots.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2 rounded-md border border-border p-3">
                    <div>
                      <p className="font-medium">
                        {s.date.split('-').reverse().join('/')} as {s.startTime}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {s.title} · {s.durationMinutes} min
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] ${
                          s.available
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {s.available ? 'Disponivel' : 'Reservado'}
                      </span>
                      {s.available && (
                        <form action={deleteMeetingSlotAction}>
                          <input type="hidden" name="id" value={s.id} />
                          <ConfirmButton
                            size="sm"
                            variant="ghost"
                            message="Excluir este horario?"
                          >
                            Excluir
                          </ConfirmButton>
                        </form>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={cardClass}>
            <h2 className="mb-3 text-sm font-medium">Novo horario</h2>
            <form action={createMeetingSlotAction} className="flex flex-col gap-2">
              <input
                name="date"
                type="date"
                required
                defaultValue={hojeISO()}
                className={fieldClass}
              />
              <input
                name="startTime"
                type="time"
                required
                className={fieldClass}
              />
              <select name="durationMinutes" defaultValue="30" className={fieldClass}>
                <option value="15">15 minutos</option>
                <option value="30">30 minutos</option>
                <option value="45">45 minutos</option>
                <option value="60">60 minutos</option>
              </select>
              <input
                name="title"
                placeholder="Titulo (ex.: Reuniao pedagogica)"
                className={fieldClass}
              />
              <SubmitButton type="submit" size="sm">
                Adicionar horario
              </SubmitButton>
            </form>
          </div>
        </div>

        {/* Agendamentos */}
        <div className="grid gap-5 md:grid-cols-2">
          <div className={cardClass}>
            <h2 className="mb-3 text-sm font-medium">Agendamentos ({bookings.length})</h2>
            {bookings.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum agendamento ainda.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {bookings.map((b) => (
                  <li key={b.id} className="rounded-md border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{b.guardianName}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] ${
                          b.confirmed
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : 'bg-amber-500/10 text-amber-500'
                        }`}
                      >
                        {b.confirmed ? 'Confirmado' : 'Pendente'}
                      </span>
                    </div>
                    {b.slotDate && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {b.slotDate.split('-').reverse().join('/')} as {b.slotStartTime}
                        {b.slotTitle ? ` · ${b.slotTitle}` : ''}
                      </p>
                    )}
                    {b.guardianPhone && (
                      <p className="text-xs text-muted-foreground">{b.guardianPhone}</p>
                    )}
                    {b.notes && (
                      <p className="mt-1 text-xs text-muted-foreground italic">{b.notes}</p>
                    )}
                    <div className="mt-2 flex gap-2">
                      {!b.confirmed && (
                        <form action={confirmMeetingBookingAction}>
                          <input type="hidden" name="id" value={b.id} />
                          <SubmitButton size="sm" variant="outline">
                            Confirmar
                          </SubmitButton>
                        </form>
                      )}
                      <form action={cancelMeetingBookingAction}>
                        <input type="hidden" name="id" value={b.id} />
                        <input type="hidden" name="slotId" value={b.slotId} />
                        <ConfirmButton
                          size="sm"
                          variant="ghost"
                          message="Cancelar este agendamento?"
                        >
                          Cancelar
                        </ConfirmButton>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={cardClass}>
            <h2 className="mb-3 text-sm font-medium">Novo agendamento</h2>
            {slots.filter((s) => s.available).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum horario disponivel. Crie um horario primeiro.
              </p>
            ) : (
              <form action={createMeetingBookingAction} className="flex flex-col gap-2">
                <select name="slotId" required className={fieldClass}>
                  <option value="">Selecione o horario...</option>
                  {slots
                    .filter((s) => s.available)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.date.split('-').reverse().join('/')} {s.startTime} - {s.title}
                      </option>
                    ))}
                </select>
                <input
                  name="guardianName"
                  required
                  placeholder="Nome do responsavel"
                  className={fieldClass}
                />
                <input
                  name="guardianPhone"
                  placeholder="Telefone (opcional)"
                  className={fieldClass}
                />
                {alunos.length > 0 && (
                  <select name="studentId" className={fieldClass}>
                    <option value="">Aluno (opcional)</option>
                    {alunos.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.fullName}
                      </option>
                    ))}
                  </select>
                )}
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Observacoes (opcional)"
                  className={fieldClass}
                />
                <SubmitButton type="submit" size="sm">
                  Agendar reuniao
                </SubmitButton>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

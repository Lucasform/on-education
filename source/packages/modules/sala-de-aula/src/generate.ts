import { assertCan, type AuthContext } from '@on-education/auth';
import { type DbClient, events, lessons, scheduleExceptions, scheduleSlots } from '@on-education/db';
import { assertEntitled } from '@on-education/module-nucleo';
import { and, eq, gte, lte, sql } from 'drizzle-orm';

/**
 * Motor de aulas previstas (diário automático). Cruza o cronograma semanal da turma
 * (`schedule_slots`) com o intervalo do ano letivo, descontando dias não letivos
 * (feriado/recesso em `events`) e alterações pontuais da turma (`schedule_exceptions`),
 * e materializa uma linha em `lessons` com status `prevista` para cada aula esperada.
 *
 * Idempotente: roda quantas vezes quiser sem duplicar (índice parcial único slot+data).
 * Regeneração segura: só remove/recria as previstas FUTURAS do intervalo; nunca toca em
 * aulas já `dada`/`cancelada`, nem no passado. Assim, mudar a grade ou marcar um feriado
 * depois só ajusta o que ainda vai acontecer.
 */

const FEATURE = 'classes.planning';

export interface GenerateLessonsInput {
  classId: string;
  from: string; // YYYY-MM-DD (início do intervalo, ex.: início do ano letivo ou do bimestre)
  to: string; // YYYY-MM-DD (fim do intervalo)
  today: string; // YYYY-MM-DD no fuso BR — a regeneração só altera datas >= hoje
}

export interface GenerateLessonsResult {
  created: number; // aulas previstas criadas
  removed: number; // previstas futuras removidas antes de recriar (regeneração)
  slots: number; // slots de cronograma considerados
}

export async function generateLessons(
  client: DbClient,
  ctx: AuthContext,
  input: GenerateLessonsInput,
): Promise<GenerateLessonsResult> {
  assertCan(ctx, 'create', 'lesson');
  await assertEntitled(client, ctx.tenantId, FEATURE);
  const { classId, from, to, today } = input;

  return client.withTenant(ctx.tenantId, async (tx) => {
    const slots = await tx
      .select()
      .from(scheduleSlots)
      .where(eq(scheduleSlots.classId, classId));
    if (slots.length === 0) return { created: 0, removed: 0, slots: 0 };

    // Dias não letivos do intervalo (feriado/recesso valem para a escola toda).
    const evs = await tx
      .select({ date: events.date, kind: events.kind })
      .from(events)
      .where(and(gte(events.date, from), lte(events.date, to)));
    const naoLetivo = new Set(
      evs.filter((e) => e.kind === 'feriado' || e.kind === 'recesso').map((e) => e.date),
    );

    // Alterações pontuais da turma: nessas datas não auto-geramos (o professor trata na mão).
    const exc = await tx
      .select({ date: scheduleExceptions.date })
      .from(scheduleExceptions)
      .where(
        and(
          eq(scheduleExceptions.classId, classId),
          gte(scheduleExceptions.date, from),
          lte(scheduleExceptions.date, to),
        ),
      );
    const excDates = new Set(exc.map((e) => e.date));

    // Slots agrupados por dia da semana (1=segunda..7=domingo, igual ao schema).
    const byWeekday = new Map<number, typeof slots>();
    for (const s of slots) {
      const arr = byWeekday.get(s.weekday) ?? [];
      arr.push(s);
      byWeekday.set(s.weekday, arr);
    }

    // Regeneração: limpa as previstas futuras do intervalo (serão recriadas a partir da grade
    // atual). As já marcadas (dada/cancelada) e o passado permanecem intactos.
    const cutoff = from > today ? from : today;
    const removedRows = await tx
      .delete(lessons)
      .where(
        and(
          eq(lessons.classId, classId),
          eq(lessons.status, 'prevista'),
          gte(lessons.date, cutoff),
          lte(lessons.date, to),
        ),
      )
      .returning({ id: lessons.id });

    // Percorre cada data do intervalo e monta as linhas previstas.
    const rows: (typeof lessons.$inferInsert)[] = [];
    const d = new Date(`${from}T00:00:00Z`);
    const end = new Date(`${to}T00:00:00Z`);
    for (; d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      const iso = d.toISOString().slice(0, 10);
      if (naoLetivo.has(iso) || excDates.has(iso)) continue;
      const jsDay = d.getUTCDay(); // 0=domingo..6=sábado
      const weekday = jsDay === 0 ? 7 : jsDay; // converte para 1=segunda..7=domingo
      const daySlots = byWeekday.get(weekday);
      if (!daySlots) continue;
      for (const s of daySlots) {
        rows.push({
          tenantId: ctx.tenantId,
          classId,
          subjectId: s.subjectId ?? null,
          slotId: s.id,
          date: iso,
          topic: '',
          status: 'prevista',
          createdBy: ctx.userId,
        });
      }
    }

    let created = 0;
    if (rows.length > 0) {
      // onConflictDoNothing no índice parcial (slot+data): protege o passado já materializado
      // e qualquer corrida, sem duplicar.
      const ins = await tx
        .insert(lessons)
        .values(rows)
        .onConflictDoNothing({
          target: [lessons.tenantId, lessons.slotId, lessons.date],
          where: sql`${lessons.slotId} is not null`,
        })
        .returning({ id: lessons.id });
      created = ins.length;
    }

    return { created, removed: removedRows.length, slots: slots.length };
  });
}

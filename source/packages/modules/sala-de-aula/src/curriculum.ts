import { assertCan, type AuthContext } from '@on-education/auth';
import { curriculumUnits, type DbClient, lessons, subjects } from '@on-education/db';
import {
  type AiProvider,
  assertWithinQuota,
  recordUsage,
  resolveTenantProvider,
} from '@on-education/module-ia';
import { applyAiStandard, assertEntitled, getAiStandard } from '@on-education/module-nucleo';
import type {
  CreateCurriculumUnitInput,
  GenerateCurriculumInput,
  UpdateCurriculumUnitInput,
} from '@on-education/validation';
import { and, asc, eq, gte, isNull, sql } from 'drizzle-orm';

/**
 * Plano de curso / sequência didática (ponto 3 do módulo calendário). A ementa da matéria
 * numa turma é uma lista ORDENADA de unidades, cada uma com quantas aulas deve ocupar.
 * O distribuidor espalha essas unidades pelas aulas previstas (geradas pelo cronograma),
 * preenchendo o tema de cada aula. Checagem tripla (RBAC `lesson` + entitlement + RLS).
 */
const FEATURE = 'classes.planning';

/** Unidades da matéria na turma, em ordem. subjectId nulo = turma de matéria única. */
export async function listCurriculumUnits(
  client: DbClient,
  ctx: AuthContext,
  classId: string,
  subjectId?: string | null,
) {
  assertCan(ctx, 'read', 'lesson');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .select()
      .from(curriculumUnits)
      .where(
        and(
          eq(curriculumUnits.classId, classId),
          subjectId ? eq(curriculumUnits.subjectId, subjectId) : isNull(curriculumUnits.subjectId),
          isNull(curriculumUnits.deletedAt),
        ),
      )
      .orderBy(asc(curriculumUnits.position)),
  );
}

export async function createCurriculumUnit(
  client: DbClient,
  ctx: AuthContext,
  input: CreateCurriculumUnitInput,
) {
  assertCan(ctx, 'create', 'lesson');
  await assertEntitled(client, ctx.tenantId, FEATURE);
  return client.withTenant(ctx.tenantId, async (tx) => {
    // Próxima posição (no fim da sequência da matéria).
    const maxRow = await tx
      .select({ m: sql<number>`coalesce(max(${curriculumUnits.position}), -1)` })
      .from(curriculumUnits)
      .where(
        and(
          eq(curriculumUnits.classId, input.classId),
          input.subjectId
            ? eq(curriculumUnits.subjectId, input.subjectId)
            : isNull(curriculumUnits.subjectId),
          isNull(curriculumUnits.deletedAt),
        ),
      );
    const position = Number(maxRow[0]?.m ?? -1) + 1;
    const rows = await tx
      .insert(curriculumUnits)
      .values({
        tenantId: ctx.tenantId,
        classId: input.classId,
        subjectId: input.subjectId ?? null,
        position,
        title: input.title,
        content: input.content ?? null,
        lessonsPlanned: input.lessonsPlanned,
        createdBy: ctx.userId,
      })
      .returning();
    return rows[0]!;
  });
}

export async function updateCurriculumUnit(
  client: DbClient,
  ctx: AuthContext,
  input: UpdateCurriculumUnitInput,
) {
  assertCan(ctx, 'update', 'lesson');
  await assertEntitled(client, ctx.tenantId, FEATURE);
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .update(curriculumUnits)
      .set({
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.content !== undefined ? { content: input.content } : {}),
        ...(input.lessonsPlanned !== undefined ? { lessonsPlanned: input.lessonsPlanned } : {}),
        updatedAt: sql`now()`,
      })
      .where(eq(curriculumUnits.id, input.id)),
  );
}

export async function deleteCurriculumUnit(client: DbClient, ctx: AuthContext, id: string) {
  assertCan(ctx, 'delete', 'lesson');
  await client.withTenant(ctx.tenantId, (tx) =>
    tx.update(curriculumUnits).set({ deletedAt: new Date() }).where(eq(curriculumUnits.id, id)),
  );
}

/** Move a unidade para cima/baixo trocando a posição com a vizinha. */
export async function moveCurriculumUnit(
  client: DbClient,
  ctx: AuthContext,
  id: string,
  dir: 'up' | 'down',
) {
  assertCan(ctx, 'update', 'lesson');
  await assertEntitled(client, ctx.tenantId, FEATURE);
  await client.withTenant(ctx.tenantId, async (tx) => {
    const cur = (
      await tx.select().from(curriculumUnits).where(eq(curriculumUnits.id, id))
    )[0];
    if (!cur) return;
    const irmas = await tx
      .select()
      .from(curriculumUnits)
      .where(
        and(
          eq(curriculumUnits.classId, cur.classId),
          cur.subjectId
            ? eq(curriculumUnits.subjectId, cur.subjectId)
            : isNull(curriculumUnits.subjectId),
          isNull(curriculumUnits.deletedAt),
        ),
      )
      .orderBy(asc(curriculumUnits.position));
    const i = irmas.findIndex((u) => u.id === id);
    const j = dir === 'up' ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= irmas.length) return;
    const a = irmas[i]!;
    const b = irmas[j]!;
    await tx
      .update(curriculumUnits)
      .set({ position: b.position })
      .where(eq(curriculumUnits.id, a.id));
    await tx
      .update(curriculumUnits)
      .set({ position: a.position })
      .where(eq(curriculumUnits.id, b.id));
  });
}

/**
 * Gera a ementa (lista de unidades) com o WayOn e já salva no plano de curso da turma/matéria.
 * Pede JSON e faz parse defensivo; se vier algo inesperado, não insere nada. Consome cota.
 */
export async function generateCurriculumWithWayOn(
  client: DbClient,
  ctx: AuthContext,
  input: GenerateCurriculumInput,
  provider?: AiProvider,
) {
  assertCan(ctx, 'create', 'lesson');
  const planId = await assertEntitled(client, ctx.tenantId, 'ai.activities');
  await assertWithinQuota(client, ctx.tenantId, planId);

  const ai = provider ?? (await resolveTenantProvider(client, ctx));
  const standard = await getAiStandard(client, ctx);

  const bnccLine = input.useBncc
    ? ' Quando fizer sentido, cite habilidades da BNCC pertinentes (ex.: EF05MA01) dentro do ' +
      'campo "content" como SUGESTÃO a confirmar; não invente códigos inexistentes.'
    : '';
  const totalLine = input.totalLessons
    ? ` A soma de "lessonsPlanned" deve ficar próxima de ${input.totalLessons} aulas no total.`
    : '';

  const system = applyAiStandard(
    'Você é o WayOn, um planejador pedagógico brasileiro. Monte a SEQUÊNCIA DIDÁTICA (plano de ' +
      'curso) de uma matéria como uma lista ordenada de unidades. Responda APENAS com JSON válido ' +
      'no formato {"units":[{"title":"...","content":"...","lessonsPlanned":N}]} sem texto fora do ' +
      'JSON. "title" é o nome curto da unidade; "content" traz objetivos/conteúdos em 1-3 frases; ' +
      `"lessonsPlanned" é o número inteiro de aulas previstas para a unidade.${bnccLine}${totalLine}`,
    standard,
  );
  const prompt =
    `Matéria: ${input.subject}.` +
    (input.gradeLevel ? ` Série/ano: ${input.gradeLevel}.` : '') +
    (input.notes ? ` Observações do professor: ${input.notes}.` : '') +
    ' Gere de 6 a 14 unidades cobrindo o ano letivo, em ordem pedagógica.';

  const result = await ai.generate({ prompt, system, maxTokens: 2048 });
  await recordUsage(client, ctx.tenantId, result.tokensIn + result.tokensOut);

  const parsed = parseUnits(result.text);
  if (parsed.length === 0) return { created: 0 };

  const created = await client.withTenant(ctx.tenantId, async (tx) => {
    const baseRow = await tx
      .select({ m: sql<number>`coalesce(max(${curriculumUnits.position}), -1)` })
      .from(curriculumUnits)
      .where(
        and(
          eq(curriculumUnits.classId, input.classId),
          input.subjectId
            ? eq(curriculumUnits.subjectId, input.subjectId)
            : isNull(curriculumUnits.subjectId),
          isNull(curriculumUnits.deletedAt),
        ),
      );
    let pos = Number(baseRow[0]?.m ?? -1) + 1;
    const values = parsed.map((u) => ({
      tenantId: ctx.tenantId,
      classId: input.classId,
      subjectId: input.subjectId ?? null,
      position: pos++,
      title: u.title.slice(0, 200),
      content: u.content?.slice(0, 10_000) ?? null,
      lessonsPlanned: u.lessonsPlanned,
      createdBy: ctx.userId,
    }));
    const ins = await tx.insert(curriculumUnits).values(values).returning({ id: curriculumUnits.id });
    return ins.length;
  });
  return { created };
}

/** Parse defensivo do JSON de unidades (aceita objeto com "units" ou array direto). */
function parseUnits(text: string): { title: string; content?: string; lessonsPlanned: number }[] {
  try {
    const start = text.indexOf('{');
    const startArr = text.indexOf('[');
    const from =
      startArr !== -1 && (startArr < start || start === -1) ? startArr : start;
    const end = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'));
    if (from === -1 || end === -1) return [];
    const raw = JSON.parse(text.slice(from, end + 1));
    const arr: unknown[] = Array.isArray(raw) ? raw : Array.isArray(raw?.units) ? raw.units : [];
    return arr
      .map((u) => {
        const o = u as Record<string, unknown>;
        const title = typeof o.title === 'string' ? o.title.trim() : '';
        const content = typeof o.content === 'string' ? o.content.trim() : undefined;
        const n = Number(o.lessonsPlanned);
        return { title, content, lessonsPlanned: Number.isFinite(n) && n > 0 ? Math.floor(n) : 1 };
      })
      .filter((u) => u.title.length > 0)
      .slice(0, 30);
  } catch {
    return [];
  }
}

export interface DistributeResult {
  assigned: number; // aulas que receberam unidade
  units: number; // unidades consideradas
  lessons: number; // aulas previstas futuras disponíveis
  leftover: number; // aulas sem unidade (ementa curta demais)
}

/**
 * Distribui a ementa pelas aulas previstas FUTURAS da turma/matéria: percorre as aulas em ordem
 * de data e atribui as unidades em sequência, conforme `lessonsPlanned` de cada uma. Preenche o
 * tema da aula só se estiver vazio (não sobrescreve o que o professor já escreveu) e grava o
 * vínculo `unitId`. Só toca em aulas `prevista` com data >= hoje — idempotente ao rodar de novo.
 */
export async function distributeCurriculum(
  client: DbClient,
  ctx: AuthContext,
  input: { classId: string; subjectId?: string | null; today: string },
): Promise<DistributeResult> {
  assertCan(ctx, 'update', 'lesson');
  await assertEntitled(client, ctx.tenantId, FEATURE);
  const { classId, subjectId, today } = input;

  return client.withTenant(ctx.tenantId, async (tx) => {
    const units = await tx
      .select()
      .from(curriculumUnits)
      .where(
        and(
          eq(curriculumUnits.classId, classId),
          subjectId ? eq(curriculumUnits.subjectId, subjectId) : isNull(curriculumUnits.subjectId),
          isNull(curriculumUnits.deletedAt),
        ),
      )
      .orderBy(asc(curriculumUnits.position));

    const futuras = await tx
      .select({ id: lessons.id, topic: lessons.topic })
      .from(lessons)
      .where(
        and(
          eq(lessons.classId, classId),
          subjectId ? eq(lessons.subjectId, subjectId) : isNull(lessons.subjectId),
          eq(lessons.status, 'prevista'),
          gte(lessons.date, today),
        ),
      )
      .orderBy(asc(lessons.date));

    if (units.length === 0 || futuras.length === 0) {
      return { assigned: 0, units: units.length, lessons: futuras.length, leftover: futuras.length };
    }

    // Sequência de unidades expandida pela quantidade de aulas de cada uma.
    let assigned = 0;
    let ui = 0;
    let restante = units[0]!.lessonsPlanned;
    for (const aula of futuras) {
      while (restante <= 0 && ui < units.length - 1) {
        ui++;
        restante = units[ui]!.lessonsPlanned;
      }
      if (restante <= 0) break; // acabou a ementa antes das aulas
      const unit = units[ui]!;
      await tx
        .update(lessons)
        .set({
          unitId: unit.id,
          // só preenche o tema se estiver vazio (respeita o que o professor já escreveu)
          ...(aula.topic && aula.topic.trim() ? {} : { topic: unit.title }),
          updatedAt: sql`now()`,
        })
        .where(eq(lessons.id, aula.id));
      assigned++;
      restante--;
    }

    return {
      assigned,
      units: units.length,
      lessons: futuras.length,
      leftover: Math.max(0, futuras.length - assigned),
    };
  });
}

/** Nome da matéria (para rótulos da tela de plano de curso). */
export async function subjectNameById(client: DbClient, ctx: AuthContext, subjectId: string) {
  assertCan(ctx, 'read', 'lesson');
  return client.withTenant(ctx.tenantId, async (tx) => {
    const r = await tx
      .select({ name: subjects.name })
      .from(subjects)
      .where(eq(subjects.id, subjectId));
    return r[0]?.name ?? null;
  });
}

import { assertCan, type AuthContext } from '@on-education/auth';
import { type DbClient, gradeComponents } from '@on-education/db';
import type { CreateGradeComponentInput } from '@on-education/validation';
import { asc, eq } from 'drizzle-orm';

/**
 * Composição da média (pesos das atividades) definida pela ESCOLA. Ex.: Prova peso 1,
 * Trabalho peso 2. Gestão institucional (RBAC `tenant_settings`: só gestão escreve).
 * O cálculo da média ponderada por componente é feito por `weightedAverage` (lib web).
 */
export async function createGradeComponent(
  client: DbClient,
  ctx: AuthContext,
  input: CreateGradeComponentInput,
) {
  assertCan(ctx, 'update', 'tenant_settings');
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .insert(gradeComponents)
      .values({
        tenantId: ctx.tenantId,
        name: input.name,
        weight: input.weight,
        createdBy: ctx.userId,
      })
      .returning();
    return rows[0]!;
  });
}

export async function listGradeComponents(client: DbClient, ctx: AuthContext) {
  assertCan(ctx, 'read', 'tenant_settings');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .select()
      .from(gradeComponents)
      .orderBy(asc(gradeComponents.position), asc(gradeComponents.createdAt)),
  );
}

export async function deleteGradeComponent(client: DbClient, ctx: AuthContext, id: string) {
  assertCan(ctx, 'update', 'tenant_settings');
  await client.withTenant(ctx.tenantId, (tx) =>
    tx.delete(gradeComponents).where(eq(gradeComponents.id, id)),
  );
}

/**
 * Média ponderada por componente (cálculo "por trás"): para cada componente presente nas
 * notas do aluno, faz a média das notas daquele componente e multiplica pelo peso; soma e
 * divide pela soma dos pesos. Notas sem componente caem num bucket padrão (peso 1).
 * Sem componentes configurados → vira média aritmética simples. Ignora notas sem valor.
 */
export function weightedAverage(
  grades: { value: number | null; componentId?: string | null }[],
  components: { id: string; weight: number }[],
): number | null {
  const valued = grades.filter((g) => g.value !== null) as {
    value: number;
    componentId?: string | null;
  }[];
  if (valued.length === 0) return null;

  const weightById = new Map(components.map((c) => [c.id, c.weight]));
  const DEFAULT = '__default__';
  const buckets = new Map<string, { sum: number; count: number; weight: number }>();

  for (const g of valued) {
    const key = g.componentId && weightById.has(g.componentId) ? g.componentId : DEFAULT;
    const weight = key === DEFAULT ? 1 : weightById.get(key)!;
    const b = buckets.get(key) ?? { sum: 0, count: 0, weight };
    b.sum += g.value;
    b.count += 1;
    b.weight = weight;
    buckets.set(key, b);
  }

  let num = 0;
  let den = 0;
  for (const b of buckets.values()) {
    if (b.weight <= 0) continue;
    num += (b.sum / b.count) * b.weight;
    den += b.weight;
  }
  return den > 0 ? num / den : null;
}

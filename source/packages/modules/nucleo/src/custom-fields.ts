import { type DbClient, customFieldDefs, customFieldValues } from '@on-education/db';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';

/** Tipos de campo suportados pelo builder. */
export const CUSTOM_FIELD_TYPES = [
  'text',
  'textarea',
  'number',
  'date',
  'select',
  'checkbox',
  'phone',
  'email',
] as const;
export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];

export interface CustomFieldDef {
  id: string;
  entity: string;
  fieldKey: string;
  label: string;
  fieldType: CustomFieldType;
  options: string[] | null;
  required: boolean;
  sortOrder: number;
}

export interface NewCustomFieldInput {
  entity: string;
  label: string;
  fieldType: CustomFieldType;
  /** Opções para `select` (uma por linha na UI). */
  options?: string[];
  required?: boolean;
  /** Chave estável; se ausente, derivada do label. */
  key?: string;
}

/** Slug estável a partir do label (a-z, 0-9, _). */
function toKey(label: string): string {
  return (
    label
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40) || `campo_${Date.now().toString(36)}`
  );
}

/** Lista as definições de campos personalizados de uma entidade do tenant (ativas). */
export async function listCustomFieldDefs(
  client: DbClient,
  tenantId: string,
  entity: string,
): Promise<CustomFieldDef[]> {
  const rows = await client.withTenant(tenantId, (tx) =>
    tx
      .select()
      .from(customFieldDefs)
      .where(and(eq(customFieldDefs.entity, entity), isNull(customFieldDefs.deletedAt)))
      .orderBy(asc(customFieldDefs.sortOrder), asc(customFieldDefs.createdAt)),
  );
  return rows.map((r) => ({
    id: r.id,
    entity: r.entity,
    fieldKey: r.fieldKey,
    label: r.label,
    fieldType: r.fieldType as CustomFieldType,
    options: (r.options as string[] | null) ?? null,
    required: r.required,
    sortOrder: r.sortOrder,
  }));
}

/** Cria uma definição de campo personalizado. Valida o tipo e gera a chave. */
export async function createCustomFieldDef(
  client: DbClient,
  tenantId: string,
  input: NewCustomFieldInput,
  actorUserId: string | null = null,
): Promise<void> {
  const fieldType = (CUSTOM_FIELD_TYPES as readonly string[]).includes(input.fieldType)
    ? input.fieldType
    : 'text';
  const label = input.label.trim();
  if (!label) throw new Error('Informe o nome do campo.');
  const fieldKey = (input.key?.trim() ? toKey(input.key) : toKey(label)) || toKey(label);
  const options =
    fieldType === 'select'
      ? (input.options ?? []).map((o) => o.trim()).filter(Boolean)
      : null;
  await client.withTenant(tenantId, async (tx) => {
    // Próxima posição (coloca no fim).
    const max = await tx
      .select({ m: sql<number>`coalesce(max(${customFieldDefs.sortOrder}), -1)` })
      .from(customFieldDefs)
      .where(eq(customFieldDefs.entity, input.entity));
    await tx.insert(customFieldDefs).values({
      tenantId,
      entity: input.entity,
      fieldKey,
      label,
      fieldType,
      options,
      required: input.required ?? false,
      sortOrder: (max[0]?.m ?? -1) + 1,
      createdBy: actorUserId,
    });
  });
}

/** Remove (soft delete) uma definição de campo. Os valores ficam órfãos, sem aparecer. */
export async function deleteCustomFieldDef(
  client: DbClient,
  tenantId: string,
  id: string,
): Promise<void> {
  await client.withTenant(tenantId, (tx) =>
    tx
      .update(customFieldDefs)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(customFieldDefs.id, id)),
  );
}

/** Valores dos campos personalizados de um registro: { fieldId → value }. */
export async function getCustomFieldValues(
  client: DbClient,
  tenantId: string,
  recordId: string,
): Promise<Record<string, string>> {
  const rows = await client.withTenant(tenantId, (tx) =>
    tx
      .select({ fieldId: customFieldValues.fieldId, value: customFieldValues.value })
      .from(customFieldValues)
      .where(eq(customFieldValues.recordId, recordId)),
  );
  const out: Record<string, string> = {};
  for (const r of rows) if (r.value != null) out[r.fieldId] = r.value;
  return out;
}

/** Grava (upsert) os valores dos campos personalizados de um registro. */
export async function setCustomFieldValues(
  client: DbClient,
  tenantId: string,
  recordId: string,
  values: Record<string, string>,
  actorUserId: string | null = null,
): Promise<void> {
  const entries = Object.entries(values);
  if (entries.length === 0) return;
  await client.withTenant(tenantId, async (tx) => {
    for (const [fieldId, value] of entries) {
      await tx
        .insert(customFieldValues)
        .values({ tenantId, fieldId, recordId, value, createdBy: actorUserId })
        .onConflictDoUpdate({
          target: [customFieldValues.fieldId, customFieldValues.recordId],
          set: { value, updatedAt: sql`now()` },
        });
    }
  });
}

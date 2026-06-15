import { assertCan, type AuthContext } from '@on-education/auth';
import { type DbClient, equipment, equipmentLoans } from '@on-education/db';
import { desc, eq, isNull } from 'drizzle-orm';

export async function listEquipment(client: DbClient, ctx: AuthContext) {
  assertCan(ctx, 'read', 'occurrence');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .select()
      .from(equipment)
      .where(isNull(equipment.deletedAt))
      .orderBy(equipment.name),
  );
}

export async function createEquipment(
  client: DbClient,
  ctx: AuthContext,
  input: {
    name: string;
    category?: string;
    serialNumber?: string;
    description?: string;
  },
) {
  assertCan(ctx, 'create', 'occurrence');
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .insert(equipment)
      .values({
        tenantId: ctx.tenantId,
        name: input.name,
        category: input.category ?? null,
        serialNumber: input.serialNumber ?? null,
        description: input.description ?? null,
        status: 'available',
        createdBy: ctx.userId,
      })
      .returning();
    return rows[0]!;
  });
}

export async function updateEquipmentStatus(
  client: DbClient,
  ctx: AuthContext,
  id: string,
  status: 'available' | 'loaned' | 'maintenance',
) {
  assertCan(ctx, 'update', 'occurrence');
  await client.withTenant(ctx.tenantId, (tx) =>
    tx
      .update(equipment)
      .set({ status, updatedAt: new Date() })
      .where(eq(equipment.id, id)),
  );
}

export async function deleteEquipment(client: DbClient, ctx: AuthContext, id: string) {
  assertCan(ctx, 'update', 'occurrence');
  await client.withTenant(ctx.tenantId, (tx) =>
    tx
      .update(equipment)
      .set({ deletedAt: new Date() })
      .where(eq(equipment.id, id)),
  );
}

export async function listEquipmentLoans(
  client: DbClient,
  ctx: AuthContext,
  equipmentId?: string,
) {
  assertCan(ctx, 'read', 'occurrence');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .select()
      .from(equipmentLoans)
      .where(equipmentId ? eq(equipmentLoans.equipmentId, equipmentId) : undefined)
      .orderBy(desc(equipmentLoans.loanedAt)),
  );
}

export async function createEquipmentLoan(
  client: DbClient,
  ctx: AuthContext,
  input: {
    equipmentId: string;
    loanedTo: string;
    expectedReturn?: string;
    notes?: string;
  },
) {
  assertCan(ctx, 'create', 'occurrence');
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .insert(equipmentLoans)
      .values({
        tenantId: ctx.tenantId,
        equipmentId: input.equipmentId,
        loanedTo: input.loanedTo,
        expectedReturn: input.expectedReturn ?? null,
        notes: input.notes ?? null,
        createdBy: ctx.userId,
      })
      .returning();
    await tx
      .update(equipment)
      .set({ status: 'loaned', updatedAt: new Date() })
      .where(eq(equipment.id, input.equipmentId));
    return rows[0]!;
  });
}

export async function returnEquipmentLoan(
  client: DbClient,
  ctx: AuthContext,
  loanId: string,
  equipmentId: string,
) {
  assertCan(ctx, 'update', 'occurrence');
  await client.withTenant(ctx.tenantId, async (tx) => {
    await tx
      .update(equipmentLoans)
      .set({ returnedAt: new Date(), updatedAt: new Date() })
      .where(eq(equipmentLoans.id, loanId));
    await tx
      .update(equipment)
      .set({ status: 'available', updatedAt: new Date() })
      .where(eq(equipment.id, equipmentId));
  });
}

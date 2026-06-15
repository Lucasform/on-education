import { assertCan, type AuthContext } from '@on-education/auth';
import { meetingBookings, meetingSlots, type DbClient } from '@on-education/db';
import { asc, desc, eq, isNull } from 'drizzle-orm';

export async function listMeetingSlots(client: DbClient, ctx: AuthContext) {
  assertCan(ctx, 'read', 'occurrence');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .select()
      .from(meetingSlots)
      .where(isNull(meetingSlots.deletedAt))
      .orderBy(asc(meetingSlots.date), asc(meetingSlots.startTime)),
  );
}

export async function createMeetingSlot(
  client: DbClient,
  ctx: AuthContext,
  input: {
    date: string;
    startTime: string;
    durationMinutes?: number;
    title?: string;
  },
) {
  assertCan(ctx, 'create', 'occurrence');
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .insert(meetingSlots)
      .values({
        tenantId: ctx.tenantId,
        hostId: ctx.userId,
        date: input.date,
        startTime: input.startTime,
        durationMinutes: input.durationMinutes ?? 30,
        title: input.title ?? 'Reuniao com responsavel',
        available: true,
        createdBy: ctx.userId,
      })
      .returning();
    return rows[0]!;
  });
}

export async function deleteMeetingSlot(client: DbClient, ctx: AuthContext, id: string) {
  assertCan(ctx, 'delete', 'occurrence');
  await client.withTenant(ctx.tenantId, (tx) =>
    tx
      .update(meetingSlots)
      .set({ deletedAt: new Date() })
      .where(eq(meetingSlots.id, id)),
  );
}

export async function listMeetingBookings(client: DbClient, ctx: AuthContext) {
  assertCan(ctx, 'read', 'occurrence');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .select({
        id: meetingBookings.id,
        tenantId: meetingBookings.tenantId,
        slotId: meetingBookings.slotId,
        studentId: meetingBookings.studentId,
        guardianName: meetingBookings.guardianName,
        guardianPhone: meetingBookings.guardianPhone,
        notes: meetingBookings.notes,
        confirmed: meetingBookings.confirmed,
        createdAt: meetingBookings.createdAt,
        slotDate: meetingSlots.date,
        slotStartTime: meetingSlots.startTime,
        slotTitle: meetingSlots.title,
        slotDurationMinutes: meetingSlots.durationMinutes,
      })
      .from(meetingBookings)
      .leftJoin(meetingSlots, eq(meetingSlots.id, meetingBookings.slotId))
      .where(isNull(meetingBookings.deletedAt))
      .orderBy(desc(meetingBookings.createdAt)),
  );
}

export async function createMeetingBooking(
  client: DbClient,
  ctx: AuthContext,
  input: {
    slotId: string;
    guardianName: string;
    guardianPhone?: string;
    studentId?: string;
    notes?: string;
  },
) {
  assertCan(ctx, 'create', 'occurrence');
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .insert(meetingBookings)
      .values({
        tenantId: ctx.tenantId,
        slotId: input.slotId,
        guardianName: input.guardianName,
        guardianPhone: input.guardianPhone ?? null,
        studentId: input.studentId ?? null,
        notes: input.notes ?? null,
        confirmed: false,
        createdBy: ctx.userId,
      })
      .returning();
    await tx
      .update(meetingSlots)
      .set({ available: false, updatedAt: new Date() })
      .where(eq(meetingSlots.id, input.slotId));
    return rows[0]!;
  });
}

export async function confirmMeetingBooking(
  client: DbClient,
  ctx: AuthContext,
  bookingId: string,
) {
  assertCan(ctx, 'update', 'occurrence');
  await client.withTenant(ctx.tenantId, (tx) =>
    tx
      .update(meetingBookings)
      .set({ confirmed: true, updatedAt: new Date() })
      .where(eq(meetingBookings.id, bookingId)),
  );
}

export async function cancelMeetingBooking(
  client: DbClient,
  ctx: AuthContext,
  bookingId: string,
  slotId: string,
) {
  assertCan(ctx, 'delete', 'occurrence');
  await client.withTenant(ctx.tenantId, async (tx) => {
    await tx
      .update(meetingBookings)
      .set({ deletedAt: new Date() })
      .where(eq(meetingBookings.id, bookingId));
    await tx
      .update(meetingSlots)
      .set({ available: true, updatedAt: new Date() })
      .where(eq(meetingSlots.id, slotId));
  });
}

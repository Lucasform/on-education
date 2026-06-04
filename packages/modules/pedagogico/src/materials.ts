import { assertCan, type AuthContext } from '@on-education/auth';
import { type DbClient, materials } from '@on-education/db';
import { and, desc, eq, isNull } from 'drizzle-orm';

export interface CreateMaterialInput {
  classId: string;
  title: string;
  subject?: string;
  storagePath: string;
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
}

/**
 * Materiais didáticos por turma (Storage Fatia 2). O arquivo vive no bucket PRIVADO
 * `tenant-files`; aqui só os metadados + `storagePath`. RLS isola por tenant; RBAC `material`
 * (recurso de ensino: professor e gestão criam/excluem).
 */
export async function createMaterial(
  client: DbClient,
  ctx: AuthContext,
  input: CreateMaterialInput,
) {
  assertCan(ctx, 'create', 'material');
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .insert(materials)
      .values({
        tenantId: ctx.tenantId,
        classId: input.classId,
        title: input.title,
        subject: input.subject ?? null,
        storagePath: input.storagePath,
        fileName: input.fileName,
        mimeType: input.mimeType ?? null,
        sizeBytes: input.sizeBytes ?? null,
        createdBy: ctx.userId,
      })
      .returning();
    return rows[0]!;
  });
}

export async function listMaterials(client: DbClient, ctx: AuthContext, classId: string) {
  assertCan(ctx, 'read', 'material');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .select()
      .from(materials)
      .where(and(eq(materials.classId, classId), isNull(materials.deletedAt)))
      .orderBy(desc(materials.createdAt)),
  );
}

/** Exclui o material e devolve o `storagePath` para a action remover o arquivo do bucket. */
export async function deleteMaterial(
  client: DbClient,
  ctx: AuthContext,
  id: string,
): Promise<string | null> {
  assertCan(ctx, 'delete', 'material');
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .select({ storagePath: materials.storagePath })
      .from(materials)
      .where(eq(materials.id, id));
    await tx.delete(materials).where(eq(materials.id, id));
    return rows[0]?.storagePath ?? null;
  });
}

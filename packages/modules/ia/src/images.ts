import { assertCan, type AuthContext } from '@on-education/auth';
import { loadEnv, requireEnv } from '@on-education/config';
import { type DbClient, generatedImages } from '@on-education/db';
import { assertEntitled } from '@on-education/module-nucleo';
import { desc, eq } from 'drizzle-orm';

import { assertImageQuota, imagesRemaining } from './quota';

export type ImageQuality = 'low' | 'medium' | 'high';

/** A geração de imagem está configurada? (sem OPENAI_API_KEY, fica off.) */
export function isImageConfigured(): boolean {
  return Boolean(loadEnv().OPENAI_API_KEY);
}

/** Chama o gpt-image-1 e devolve a imagem em base64 (PNG). Não persiste nem mede. */
export async function generateImageB64(
  prompt: string,
  quality: ImageQuality = 'low',
): Promise<string> {
  const apiKey = requireEnv('OPENAI_API_KEY');
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: 'gpt-image-1', prompt, n: 1, size: '1024x1024', quality }),
  });
  if (!res.ok) throw new Error(`OpenAI imagem erro ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { data?: { b64_json?: string }[] };
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error('OpenAI não retornou imagem.');
  return b64;
}

/**
 * Gera uma imagem para o tenant respeitando RBAC + entitlement `ai.images` + cota mensal do
 * plano + teto global. Devolve o base64 (a action sobe pro storage e persiste). NÃO mede aqui:
 * o consumo é registrado pela action só após o upload dar certo.
 */
export async function generateTenantImage(
  client: DbClient,
  ctx: AuthContext,
  prompt: string,
  quality: ImageQuality = 'low',
): Promise<{ b64: string }> {
  assertCan(ctx, 'create', 'activity');
  const planId = await assertEntitled(client, ctx.tenantId, 'ai.images');
  await assertImageQuota(client, ctx.tenantId, planId);
  const b64 = await generateImageB64(prompt, quality);
  return { b64 };
}

/** Quantas imagens ainda cabem no mês para o tenant (para mostrar na UI). */
export async function imagesLeftForTenant(client: DbClient, ctx: AuthContext): Promise<number> {
  const planId = await assertEntitled(client, ctx.tenantId, 'ai.images').catch(() => null);
  if (!planId) return 0;
  return imagesRemaining(client, ctx.tenantId, planId);
}

export async function saveGeneratedImage(
  client: DbClient,
  ctx: AuthContext,
  input: { prompt: string; url: string; quality?: string },
) {
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .insert(generatedImages)
      .values({
        tenantId: ctx.tenantId,
        prompt: input.prompt.slice(0, 1000),
        url: input.url,
        quality: input.quality ?? null,
        createdBy: ctx.userId,
      })
      .returning();
    return rows[0]!;
  });
}

export async function listGeneratedImages(client: DbClient, ctx: AuthContext) {
  assertCan(ctx, 'read', 'activity');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx.select().from(generatedImages).orderBy(desc(generatedImages.createdAt)),
  );
}

export async function deleteGeneratedImage(client: DbClient, ctx: AuthContext, id: string) {
  assertCan(ctx, 'delete', 'activity');
  await client.withTenant(ctx.tenantId, (tx) =>
    tx.delete(generatedImages).where(eq(generatedImages.id, id)),
  );
}

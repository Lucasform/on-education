import { assertCan, type AuthContext } from '@on-education/auth';
import { loadEnv, requireEnv } from '@on-education/config';
import { type DbClient, generatedImages } from '@on-education/db';
import { limitFor } from '@on-education/entitlements';
import { assertEntitled, getImageStyle } from '@on-education/module-nucleo';
import { desc, eq } from 'drizzle-orm';

import { assertImageQuota, imagesRemaining } from './quota';

export type ImageQuality = 'low' | 'medium' | 'high';
export type ImageSize = 'quadrado' | 'horizontal' | 'vertical';
export type ImageFrame = 'padrao' | 'centralizado' | 'preenchido';

// Teto de qualidade por plano (controle de custo: 'high' custa ~15x 'low').
const QUALITY_BY_RANK = ['low', 'low', 'medium', 'high'] as const;
const RANK_BY_QUALITY: Record<ImageQuality, number> = { low: 1, medium: 2, high: 3 };

/** Rebaixa a qualidade pedida ao teto do plano (`imageQualityMax`: 1=low, 2=medium, 3=high). */
function clampQuality(planId: string, requested: ImageQuality): ImageQuality {
  const max = limitFor(planId, 'imageQualityMax') ?? 1;
  return RANK_BY_QUALITY[requested] > max ? QUALITY_BY_RANK[max] ?? 'low' : requested;
}

const SIZE_MAP: Record<ImageSize, string> = {
  quadrado: '1024x1024',
  horizontal: '1536x1024',
  vertical: '1024x1536', // proporção tipo A4/retrato
};

const FRAME_RULES: Record<ImageFrame, string> = {
  padrao:
    'Enquadramento equilibrado: elemento principal em destaque, com respiro proporcional nas bordas.',
  centralizado:
    'Composição centralizada e simétrica: o tema exatamente no centro, com margens iguais nos quatro lados.',
  preenchido:
    'A ilustração deve PREENCHER todo o quadro, de borda a borda, sem moldura, sem bordas brancas e sem espaços vazios.',
};

/**
 * Monta o prompt final com força, para o padrão pedido ser executado de verdade: padrão visual da
 * escola, referências bem avaliadas (aprendizado), enquadramento e regras de posição/impressão.
 */
function buildImagePrompt(opts: {
  prompt: string;
  style: string | null;
  trainingStyle: string | null;
  frame: ImageFrame;
}): string {
  const parts: string[] = ['Ilustração para material escolar, pensada para impressão.'];
  if (opts.style) parts.push(`Siga FIELMENTE este padrão visual da escola: ${opts.style}.`);
  if (opts.trainingStyle)
    parts.push(
      `Espelhe o estilo das referências que o professor avaliou bem: ${opts.trainingStyle}.`,
    );
  parts.push(`Tema: ${opts.prompt}.`);
  parts.push(FRAME_RULES[opts.frame]);
  parts.push(
    'Posicionamento claro e hierarquia visual (elemento principal em primeiro plano). Linhas nítidas ' +
      'e alto contraste para imprimir bem. Sem texto na imagem, a menos que o tema peça; sem marca ' +
      "d'água, sem bordas tortas e sem cortar o elemento principal.",
  );
  return parts.join(' ');
}

/** A geração de imagem está configurada? (sem OPENAI_API_KEY, fica off.) */
export function isImageConfigured(): boolean {
  return Boolean(loadEnv().OPENAI_API_KEY);
}

/** Chama o gpt-image-1 e devolve a imagem em base64 (PNG). Não persiste nem mede. */
export async function generateImageB64(
  prompt: string,
  quality: ImageQuality = 'low',
  size: ImageSize = 'quadrado',
): Promise<string> {
  const apiKey = requireEnv('OPENAI_API_KEY');
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: 'gpt-image-1', prompt, n: 1, size: SIZE_MAP[size], quality }),
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
  size: ImageSize = 'quadrado',
  frame: ImageFrame = 'padrao',
  // Referência de estilo aprendida das imagens bem avaliadas (vem do caller, evita ciclo de módulo).
  trainingStyle: string | null = null,
): Promise<{ b64: string; finalPrompt: string }> {
  assertCan(ctx, 'create', 'activity');
  const planId = await assertEntitled(client, ctx.tenantId, 'ai.images');
  await assertImageQuota(client, ctx.tenantId, planId);
  const finalQuality = clampQuality(planId, quality);
  // Padrão visual do tenant + referências bem avaliadas + enquadramento + posição entram no prompt.
  const style = await getImageStyle(client, ctx).catch(() => null);
  const finalPrompt = buildImagePrompt({ prompt, style, trainingStyle, frame });
  const b64 = await generateImageB64(finalPrompt, finalQuality, size);
  return { b64, finalPrompt };
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

export async function getGeneratedImage(client: DbClient, ctx: AuthContext, id: string) {
  assertCan(ctx, 'read', 'activity');
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx.select().from(generatedImages).where(eq(generatedImages.id, id));
    return rows[0] ?? null;
  });
}

export async function deleteGeneratedImage(client: DbClient, ctx: AuthContext, id: string) {
  assertCan(ctx, 'delete', 'activity');
  await client.withTenant(ctx.tenantId, (tx) =>
    tx.delete(generatedImages).where(eq(generatedImages.id, id)),
  );
}

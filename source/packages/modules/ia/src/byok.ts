import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

import type { AuthContext } from '@on-education/auth';
import { type DbClient, tenantSettings } from '@on-education/db';
import { eq } from 'drizzle-orm';

import {
  type AiGenerationRequest,
  type AiGenerationResult,
  type AiProvider,
  createAnthropicProvider,
} from './provider';

/**
 * BYOK (Bring Your Own Key, Fase 2): o tenant pluga a própria chave de IA (OpenAI/Gemini/Claude)
 * e usa os tokens dele. A chave é guardada CRIPTOGRAFADA (AES-256-GCM). A resolução cai para o
 * nosso Claude padrão em QUALQUER falha — o caminho padrão nunca quebra.
 */

// Chave de criptografia derivada de um segredo do servidor (estável entre deploys).
function encKey(): Buffer {
  const material =
    process.env.APP_ENCRYPTION_KEY || process.env.DEV_SESSION_SECRET || 'on-education-fallback-key';
  return createHash('sha256').update(material).digest(); // 32 bytes
}

/** Criptografa uma API key. Formato: ivB64.tagB64.cipherB64. */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${enc.toString('base64')}`;
}

/** Descriptografa; devolve null se o blob estiver corrompido (não derruba o fluxo). */
export function decryptSecret(blob: string | null | undefined): string | null {
  if (!blob) return null;
  try {
    const [ivB64, tagB64, cipherB64] = blob.split('.');
    if (!ivB64 || !tagB64 || !cipherB64) return null;
    const decipher = createDecipheriv('aes-256-gcm', encKey(), Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    const dec = Buffer.concat([
      decipher.update(Buffer.from(cipherB64, 'base64')),
      decipher.final(),
    ]);
    return dec.toString('utf8');
  } catch {
    return null;
  }
}

// === Adaptadores no MESMO contrato AiProvider (texto + visão) =============================

/** OpenAI (Chat Completions). gpt-4o-mini: barato e com visão. */
export function createOpenAiProvider(apiKey: string, model = 'gpt-4o-mini'): AiProvider {
  return {
    async generate(req: AiGenerationRequest): Promise<AiGenerationResult> {
      const userContent: unknown = req.images?.length
        ? [
            { type: 'text', text: req.prompt },
            ...req.images.map((im) => ({
              type: 'image_url',
              image_url: { url: `data:${im.mediaType};base64,${im.data}` },
            })),
          ]
        : req.prompt;
      const messages = [
        ...(req.system ? [{ role: 'system', content: req.system }] : []),
        { role: 'user', content: userContent },
      ];
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({ model, max_tokens: req.maxTokens ?? 2048, messages }),
      });
      if (!res.ok) throw new Error(`OpenAI erro ${res.status}: ${await res.text()}`);
      const data = (await res.json()) as {
        choices: { message: { content: string } }[];
        usage?: { prompt_tokens: number; completion_tokens: number };
        model: string;
      };
      return {
        text: data.choices[0]?.message?.content ?? '',
        tokensIn: data.usage?.prompt_tokens ?? 0,
        tokensOut: data.usage?.completion_tokens ?? 0,
        model: data.model,
      };
    },
  };
}

/** Google Gemini (generateContent). gemini-2.0-flash: barato e com visão. */
export function createGeminiProvider(apiKey: string, model = 'gemini-2.0-flash'): AiProvider {
  return {
    async generate(req: AiGenerationRequest): Promise<AiGenerationResult> {
      const parts: unknown[] = [
        { text: req.prompt },
        ...(req.images ?? []).map((im) => ({
          inline_data: { mime_type: im.mediaType, data: im.data },
        })),
      ];
      const body: Record<string, unknown> = {
        contents: [{ role: 'user', parts }],
        generationConfig: { maxOutputTokens: req.maxTokens ?? 2048 },
      };
      if (req.system) body.systemInstruction = { parts: [{ text: req.system }] };
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) throw new Error(`Gemini erro ${res.status}: ${await res.text()}`);
      const data = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
        usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
      };
      const text = (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('');
      return {
        text,
        tokensIn: data.usageMetadata?.promptTokenCount ?? 0,
        tokensOut: data.usageMetadata?.candidatesTokenCount ?? 0,
        model,
      };
    },
  };
}

// === Resolução por tenant =================================================================

async function readAiSettings(
  client: DbClient,
  tenantId: string,
): Promise<{ provider: string; keyEnc: string | null }> {
  return client.withTenant(tenantId, async (tx) => {
    const rows = await tx
      .select({ provider: tenantSettings.aiProvider, keyEnc: tenantSettings.aiApiKeyEnc })
      .from(tenantSettings)
      .where(eq(tenantSettings.tenantId, tenantId));
    return { provider: rows[0]?.provider ?? 'default', keyEnc: rows[0]?.keyEnc ?? null };
  });
}

/** O tenant usa a PRÓPRIA chave de IA? (Se sim, pulamos a nossa cota.) */
export async function tenantUsesOwnAi(client: DbClient, tenantId: string): Promise<boolean> {
  try {
    const s = await readAiSettings(client, tenantId);
    return s.provider !== 'default' && Boolean(decryptSecret(s.keyEnc));
  } catch {
    return false;
  }
}

/**
 * Provedor de IA do tenant: o dele se configurado e válido; senão o nosso Claude padrão.
 * NUNCA lança — cai pro padrão em qualquer erro (o caminho que já funciona não quebra).
 */
export async function resolveTenantProvider(
  client: DbClient,
  ctx: AuthContext,
  tier: 'sonnet' | 'haiku' = 'sonnet',
): Promise<AiProvider> {
  try {
    const s = await readAiSettings(client, ctx.tenantId);
    if (s.provider === 'default') return createAnthropicProvider(tier);
    const key = decryptSecret(s.keyEnc);
    if (!key) return createAnthropicProvider(tier);
    if (s.provider === 'openai') return createOpenAiProvider(key);
    if (s.provider === 'gemini') return createGeminiProvider(key);
    if (s.provider === 'anthropic') {
      // Claude com a chave DELE (mesmo adaptador, key própria via header).
      return {
        async generate(req) {
          const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-api-key': key,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: 'claude-sonnet-4-6',
              max_tokens: req.maxTokens ?? 2048,
              system: req.system,
              messages: [
                {
                  role: 'user',
                  content: req.images?.length
                    ? [
                        ...req.images.map((im) => ({
                          type: 'image',
                          source: { type: 'base64', media_type: im.mediaType, data: im.data },
                        })),
                        { type: 'text', text: req.prompt },
                      ]
                    : req.prompt,
                },
              ],
            }),
          });
          if (!res.ok) throw new Error(`Anthropic erro ${res.status}`);
          const data = (await res.json()) as {
            content: { type: string; text?: string }[];
            usage: { input_tokens: number; output_tokens: number };
            model: string;
          };
          return {
            text: data.content
              .filter((c) => c.type === 'text')
              .map((c) => c.text ?? '')
              .join(''),
            tokensIn: data.usage.input_tokens,
            tokensOut: data.usage.output_tokens,
            model: data.model,
          };
        },
      };
    }
    return createAnthropicProvider(tier);
  } catch {
    return createAnthropicProvider(tier);
  }
}

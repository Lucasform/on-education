import { assertCan, type AuthContext } from '@on-education/auth';
import type { DbClient } from '@on-education/db';
import { assertEntitled } from '@on-education/module-nucleo';

import { type AiImage, type AiProvider, createAnthropicProvider } from './provider';
import { assertWithinQuota, recordUsage } from './quota';

/** Uma palavra/trecho que a IA não conseguiu ler na foto (não inventa: marca e relata). */
export interface EssayGap {
  /** Marcador inserido no texto, ex.: 〖?1〗. */
  marker: string;
  /** Linha aproximada na folha (1-based) ou null se incerto. */
  line: number | null;
  /** Palavras vizinhas legíveis, para o professor localizar. */
  around: string;
}

export interface EssayTranscription {
  /** Texto transcrito, com 〖?N〗 onde ficou ilegível. */
  transcription: string;
  /** Lista de trechos ilegíveis para o professor preencher. */
  gaps: EssayGap[];
}

const TRANSCRIBE_SYSTEM =
  'Você transcreve, palavra por palavra, uma redação manuscrita fotografada. Regras rígidas:\n' +
  '- Transcreva FIELMENTE, mantendo a ortografia e os erros do aluno (NÃO corrija nada).\n' +
  '- Preserve as quebras de linha do original.\n' +
  '- Se NÃO conseguir ler uma palavra com confiança, NÃO INVENTE. Marque o ponto com 〖?N〗 ' +
  '(N sequencial: 〖?1〗, 〖?2〗, ...) e registre cada um na lista "gaps".\n' +
  '- Não comente nem avalie a redação; apenas transcreva.\n' +
  '- Responda SOMENTE com um JSON válido, sem texto fora dele, no formato exato:\n' +
  '{"transcription":"...texto com marcadores 〖?N〗...","gaps":[{"marker":"〖?1〗","line":3,"around":"palavras legíveis ao redor"}]}';

/** Extrai o JSON da resposta (tolerante a cercas ```json e texto ao redor). */
function parseTranscription(raw: string): EssayTranscription {
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1]!.trim();
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start >= 0 && end > start) s = s.slice(start, end + 1);
  try {
    const obj = JSON.parse(s) as Partial<EssayTranscription>;
    const gaps = Array.isArray(obj.gaps)
      ? obj.gaps.map((g, i) => ({
          marker: String(g?.marker ?? `〖?${i + 1}〗`),
          line: typeof g?.line === 'number' ? g.line : null,
          around: String(g?.around ?? ''),
        }))
      : [];
    return { transcription: String(obj.transcription ?? ''), gaps };
  } catch {
    // Se o modelo não devolveu JSON, usa o texto cru como transcrição (sem gaps).
    return { transcription: raw.trim(), gaps: [] };
  }
}

/**
 * Transcreve a(s) foto(s) de uma redação manuscrita usando visão. NÃO inventa palavras
 * ilegíveis: marca com 〖?N〗 e devolve a lista `gaps` para o professor preencher antes de
 * corrigir. Checagem de RBAC + entitlement + cota; consumo medido. Não persiste (é só leitura).
 */
export async function transcribeEssay(
  client: DbClient,
  ctx: AuthContext,
  images: AiImage[],
  provider?: AiProvider,
): Promise<EssayTranscription> {
  assertCan(ctx, 'create', 'ai_draft');
  const planId = await assertEntitled(client, ctx.tenantId, 'ai.activities');
  await assertWithinQuota(client, ctx.tenantId, planId);

  const ai = provider ?? createAnthropicProvider('sonnet');
  const result = await ai.generate({
    system: TRANSCRIBE_SYSTEM,
    prompt:
      'Transcreva a redação da(s) imagem(ns). Lembre: não invente palavras ilegíveis, ' +
      'marque 〖?N〗 e liste em "gaps". Responda só o JSON.',
    images,
    maxTokens: 4096,
  });
  await recordUsage(client, ctx.tenantId, result.tokensIn + result.tokensOut);
  return parseTranscription(result.text);
}

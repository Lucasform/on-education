import { assertCan, type AuthContext } from '@on-education/auth';
import type { DbClient } from '@on-education/db';
import { applyAiStandard, assertEntitled, getAiStandard } from '@on-education/module-nucleo';

import { type AiImage, type AiProvider, createAnthropicProvider } from './provider';
import { assertWithinQuota, recordUsage } from './quota';

export interface CorrectWorkInput {
  /** Foto(s) do trabalho/prova de UM aluno. */
  images: AiImage[];
  /** Nota máxima da avaliação (ex.: 10). */
  maxScore: number;
  /** Rubrica/critérios de correção (opcional). */
  rubric?: string;
  /** Gabarito / respostas esperadas (opcional). */
  answerKey?: string;
  /** Contexto da atividade (ex.: "Prova de frações, 5º ano"). */
  context?: string;
}

export interface CorrectionResult {
  /** Nota sugerida (0..maxScore). */
  score: number;
  /** Resumo curto da correção. */
  summary: string;
  /** Pontos fortes. */
  strengths: string[];
  /** O que melhorar. */
  improvements: string[];
  /** Feedback em markdown, pronto pra mostrar/guardar. */
  feedback: string;
}

const CORRECT_SYSTEM =
  'Você é um corretor pedagógico criterioso. Receberá a foto do trabalho/prova de um aluno e ' +
  'deve corrigir com base na rubrica e/ou no gabarito fornecidos (se houver). Regras:\n' +
  '- Avalie o que está na imagem; NÃO invente respostas que o aluno não escreveu.\n' +
  '- Se algo estiver ilegível, considere com cautela e diga isso no resumo.\n' +
  '- Sugira uma NOTA de 0 até o máximo informado; é SUGESTÃO para o professor confirmar.\n' +
  '- Seja construtivo e adequado à idade.\n' +
  '- Responda SOMENTE com um JSON válido, sem texto fora dele, no formato exato:\n' +
  '{"score":<numero>,"summary":"...","strengths":["..."],"improvements":["..."]}';

function clampScore(n: unknown, max: number): number {
  const v = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(max, Math.round(v * 100) / 100));
}

function parseCorrection(raw: string, maxScore: number): CorrectionResult {
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1]!.trim();
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start >= 0 && end > start) s = s.slice(start, end + 1);
  let score = 0;
  let summary = raw.trim();
  let strengths: string[] = [];
  let improvements: string[] = [];
  try {
    const obj = JSON.parse(s) as Partial<CorrectionResult>;
    score = clampScore(obj.score, maxScore);
    summary = String(obj.summary ?? '').trim();
    strengths = Array.isArray(obj.strengths) ? obj.strengths.map(String).filter(Boolean) : [];
    improvements = Array.isArray(obj.improvements)
      ? obj.improvements.map(String).filter(Boolean)
      : [];
  } catch {
    // mantém summary = texto cru
  }
  const feedback = [
    summary && summary,
    strengths.length ? `**Pontos fortes**\n${strengths.map((x) => `- ${x}`).join('\n')}` : '',
    improvements.length ? `**A melhorar**\n${improvements.map((x) => `- ${x}`).join('\n')}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
  return { score, summary, strengths, improvements, feedback };
}

/**
 * Corrige a foto do trabalho de UM aluno por visão, contra rubrica/gabarito opcionais.
 * Devolve nota SUGERIDA + feedback estruturado (o professor confirma antes de lançar).
 * Checagem tripla + cota; consumo medido. Não persiste (a gravação da nota é decisão humana).
 */
export async function correctWorkFromPhotos(
  client: DbClient,
  ctx: AuthContext,
  input: CorrectWorkInput,
  provider?: AiProvider,
): Promise<CorrectionResult> {
  assertCan(ctx, 'create', 'ai_draft');
  const planId = await assertEntitled(client, ctx.tenantId, 'ai.activities');
  await assertWithinQuota(client, ctx.tenantId, planId);

  const ai = provider ?? createAnthropicProvider('sonnet');
  const standard = await getAiStandard(client, ctx);

  const prompt =
    `Nota máxima: ${input.maxScore}.` +
    (input.context ? ` Atividade: ${input.context}.` : '') +
    (input.rubric ? `\n\n--- RUBRICA/CRITÉRIOS ---\n${input.rubric}\n--- FIM ---` : '') +
    (input.answerKey ? `\n\n--- GABARITO ---\n${input.answerKey}\n--- FIM ---` : '') +
    '\n\nCorrija o trabalho da(s) imagem(ns) e responda só o JSON.';

  const result = await ai.generate({
    system: applyAiStandard(CORRECT_SYSTEM, standard),
    prompt,
    images: input.images,
    maxTokens: 2048,
  });
  await recordUsage(client, ctx.tenantId, result.tokensIn + result.tokensOut);
  return parseCorrection(result.text, input.maxScore);
}

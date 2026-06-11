import { assertCan, type AuthContext } from '@on-education/auth';
import type { DbClient } from '@on-education/db';
import { applyAiStandard, assertEntitled, getAiStandard } from '@on-education/module-nucleo';

import { resolveTenantProvider } from './byok';
import { type AiProvider } from './provider';
import { assertWithinQuota, recordUsage } from './quota';

export interface ParentNoteInput {
  studentName: string;
  /** Média atual (texto, ex.: "8,5" ou "—"). */
  average: string;
  /** Frequência (texto, ex.: "92%" ou "—"). */
  attendance: string;
  /** Linhas resumidas das notas (label: valor). */
  gradeLines: string[];
  /** Observações livres do professor (opcional). */
  notes?: string;
}

/**
 * WayOn escreve um recado curto, caloroso e respeitoso aos pais/responsáveis sobre o aluno,
 * com base nos números reais (não inventa). É um RASCUNHO para o professor revisar antes de
 * enviar. Consome cota. Não persiste.
 */
export async function writeParentNote(
  client: DbClient,
  ctx: AuthContext,
  input: ParentNoteInput,
  provider?: AiProvider,
): Promise<string> {
  assertCan(ctx, 'create', 'ai_draft');
  const planId = await assertEntitled(client, ctx.tenantId, 'ai.activities');
  await assertWithinQuota(client, ctx.tenantId, planId);

  const ai = provider ?? (await resolveTenantProvider(client, ctx));
  const standard = await getAiStandard(client, ctx);

  const system = applyAiStandard(
    'Você é o WayOn, assistente de um professor. Escreva um RECADO curto (3 a 6 frases) para os ' +
      'pais/responsáveis de um aluno, em português do Brasil, tom respeitoso e acolhedor. ' +
      'Baseie-se SOMENTE nos dados fornecidos; não invente fatos nem notas. Destaque o positivo, ' +
      'aponte com gentileza o que pode melhorar e termine com uma orientação prática ou convite ao ' +
      'diálogo. Sem saudação com data; pode começar por "Olá!". Apenas o texto do recado.',
    standard,
  );
  const prompt =
    `Aluno(a): ${input.studentName}.\n` +
    `Média atual: ${input.average}. Frequência: ${input.attendance}.\n` +
    (input.gradeLines.length ? `Notas:\n${input.gradeLines.join('\n')}\n` : '') +
    (input.notes ? `Observações do professor: ${input.notes}\n` : '') +
    '\nEscreva o recado aos responsáveis.';

  const result = await ai.generate({ prompt, system });
  await recordUsage(client, ctx.tenantId, result.tokensIn + result.tokensOut);
  return result.text.trim();
}

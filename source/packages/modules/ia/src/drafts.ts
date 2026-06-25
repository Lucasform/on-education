import { assertCan, type AuthContext } from '@on-education/auth';
import { aiDrafts, type DbClient } from '@on-education/db';
import type { Feature } from '@on-education/entitlements';
import {
  applyAiStandard,
  assertEntitled,
  type ContentType,
  contentSkill,
  getAiStandard,
} from '@on-education/module-nucleo';
import type { AiDraftKind, GenerateDraftInput } from '@on-education/validation';
import { desc, eq, sql } from 'drizzle-orm';

import { resolveTenantProvider } from './byok';
import { type AiProvider } from './provider';
import { assertWithinQuota, recordUsage } from './quota';
import { searchYouTube } from './youtube';

/**
 * Geração de rascunhos com human-in-the-loop (Fase 1B.2, Master Spec §9.3):
 * a saída da IA nasce como `draft`; o professor revisa e aprova (ou descarta).
 * Checagem tripla + cota antes de gerar; consumo medido por tenant após gerar.
 * O `provider` é injetável (testes usam um fake; produção usa Anthropic).
 */
const FEATURE_BY_KIND: Record<AiDraftKind, Feature> = {
  lesson_plan: 'ai.lessonPlan',
  activity: 'ai.activities',
  study_plan: 'ai.lessonPlan',
  essay: 'ai.activities',
  tutor: 'ai.activities',
  outro: 'ai.activities',
};

// Regra comum aos conteúdos imprimíveis: nada de placeholders de imagem/layout entre colchetes.
const PRINTABLE_RULES =
  ' Escreva apenas o texto final, pronto para imprimir. NUNCA inclua descrições de imagem, ' +
  'ilustração, desenho ou layout entre colchetes (por exemplo "[figura: ...]", "[imagem: ...]", ' +
  '"[espaço para colorir]", "[inserir ...]"). Você não gera imagens. Se um desenho fizer parte da ' +
  'atividade, escreva a instrução em linguagem natural para o aluno (ex.: "Pinte a letra A de ' +
  'vermelho." ou "Desenhe um animal que começa com a letra E."), sem colchetes. Formate bem: ' +
  'título, enunciados numerados e uma instrução por linha, com quebras de linha entre os itens.';

const SYSTEM_BY_KIND: Record<AiDraftKind, string> = {
  lesson_plan:
    'Você é um assistente pedagógico. Gere um plano de aula claro e prático em português. ' +
    'É um RASCUNHO para o professor revisar e ajustar.' +
    PRINTABLE_RULES,
  activity:
    'Você é um especialista em FOLHAS DE EXERCÍCIO imprimíveis (estilo TodaMatéria, alfabetização, ' +
    'caderno de atividades). Gere uma atividade pronta para imprimir em português do Brasil ' +
    '(RASCUNHO para o professor revisar). Monte como uma folha real: título em destaque, enunciado ' +
    'curto e itens bem organizados, sempre com espaço para o aluno responder. Escolha o formato pelo ' +
    'tipo pedido, entre estes: ' +
    'compreensão de texto → um texto curto e, abaixo, perguntas numeradas, cada uma seguida de uma ' +
    'linha em branco "______________________" para a resposta; ' +
    'múltipla escolha → cada alternativa começa com "( )" (ex.: "( ) o abraço"); ' +
    'completar, antônimos ou lacunas → frase com "______________" no lugar a preencher, com banco de ' +
    'palavras no topo quando ajudar; ' +
    'pontuação → escreva a frase e um "( )" no fim para o aluno marcar o sinal; ' +
    'juntar/ordenar sílabas → "JA + NE + LA = ______________"; ' +
    'caça-palavras → uma GRADE de letras alinhada (uma letra por célula separada por espaço, dentro de ' +
    'um bloco de código com três crases) e a lista de palavras; ' +
    'caligrafia/cópia → a palavra seguida de uma linha para copiar (ex.: "bola _______________"). ' +
    'Prefira bancos de palavras e linhas em branco em vez de depender de figuras. ' +
    PRINTABLE_RULES,
  study_plan:
    'Você é o WayOn. Monte um plano de estudo (trilha personalizada) para o aluno. ' +
    'É um RASCUNHO para o professor ou o responsável revisar e ajustar.',
  essay:
    'Você é um corretor de redações. Avalie o texto a seguir por competências (tema, coesão, ' +
    'coerência, gramática, proposta), aponte pontos fortes e o que melhorar, e sugira uma nota. ' +
    'É um RASCUNHO de correção para o professor revisar; não é a nota final.',
  tutor:
    'Você é um tutor paciente para estudantes. Responda de forma clara e adequada à idade, ' +
    'explicando o raciocínio passo a passo. Não faça a tarefa pelo aluno: oriente para ele ' +
    'chegar à resposta. Conteúdo seguro e apropriado.',
  outro:
    'Você é o WayOn, um assistente pedagógico. Produza o conteúdo pedido em português do Brasil, ' +
    'claro e pronto para uso. É um RASCUNHO para o professor revisar e ajustar.' +
    PRINTABLE_RULES,
};

/**
 * Rede de segurança: remove descrições meta de imagem/layout que o modelo às vezes insere entre
 * colchetes (ex.: "[figura: ...]"). Não toca em links markdown como "[texto](url)".
 */
function stripPlaceholders(text: string): string {
  return text
    .replace(
      /\[\s*(figura|imagem|ilustração|ilustracao|desenho|espaço|espaco|inserir|colocar|imagem aqui)[^\]]*\]/gi,
      '',
    )
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Mapa do tipo de rascunho para o tipo da fonte única de skill (camada BNCC/estrutura da casa).
const TYPE_BY_KIND: Record<AiDraftKind, ContentType> = {
  lesson_plan: 'lesson_plan',
  activity: 'activity',
  study_plan: 'study_plan',
  essay: 'correction',
  tutor: 'tutor',
  outro: 'outro',
};

export async function generateDraft(
  client: DbClient,
  ctx: AuthContext,
  input: GenerateDraftInput,
  provider?: AiProvider,
  /** Memória de rating (few-shot do estilo aprovado). Passado pelo caller para evitar ciclo de
   *  módulo, já que `buildTrainingContext` vive no pedagogico. Vai no fim do system. */
  fewShot?: string,
) {
  assertCan(ctx, 'create', 'ai_draft');
  const planId = await assertEntitled(client, ctx.tenantId, FEATURE_BY_KIND[input.kind]);
  await assertWithinQuota(client, ctx.tenantId, planId);

  const ai = provider ?? (await resolveTenantProvider(client, ctx));
  const standard = await getAiStandard(client, ctx);
  const sys = applyAiStandard(
    SYSTEM_BY_KIND[input.kind] + contentSkill(TYPE_BY_KIND[input.kind]),
    standard,
  );
  const result = await ai.generate({
    prompt: input.prompt,
    system: fewShot ? sys + fewShot : sys,
  });

  // Recurso externo: em PLANO DE AULA, sugere um vídeo do YouTube no fim (abaixo de tudo).
  // Link markdown → na tela vira link clicável com o nome; na impressão sai só o nome.
  let output = stripPlaceholders(result.text);
  if (input.kind === 'lesson_plan') {
    const video = await searchYouTube(`${input.prompt} aula`).catch(() => null);
    if (video) output += `\n\n📺 **Vídeo sugerido:** [${video.title}](${video.url})`;
  }

  const draft = await client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .insert(aiDrafts)
      .values({
        tenantId: ctx.tenantId,
        kind: input.kind,
        studentId: input.studentId ?? null,
        prompt: input.prompt,
        output,
        status: 'draft',
        model: result.model,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        createdBy: ctx.userId,
      })
      .returning();
    return rows[0]!;
  });

  await recordUsage(client, ctx.tenantId, result.tokensIn + result.tokensOut);
  return draft;
}

/** Conta quantos rascunhos estão pendentes de revisão (status 'draft'). Para badge de menu. */
export async function countPendingDrafts(client: DbClient, ctx: AuthContext): Promise<number> {
  assertCan(ctx, 'read', 'ai_draft');
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .select({ c: sql<number>`count(*)` })
      .from(aiDrafts)
      .where(eq(aiDrafts.status, 'draft'));
    return Number(rows[0]?.c ?? 0);
  });
}

/** Lista os rascunhos do tenant, escondendo os descartados (mais recentes primeiro). */
export async function listDrafts(client: DbClient, ctx: AuthContext) {
  assertCan(ctx, 'read', 'ai_draft');
  return client.withTenant(ctx.tenantId, (tx) =>
    tx
      .select()
      .from(aiDrafts)
      // Só os pendentes: ao aprovar (vai pro banco) ou descartar, some daqui.
      .where(eq(aiDrafts.status, 'draft'))
      .orderBy(desc(aiDrafts.createdAt)),
  );
}

async function setStatus(client: DbClient, ctx: AuthContext, id: string, status: string) {
  return client.withTenant(ctx.tenantId, async (tx) => {
    const rows = await tx
      .update(aiDrafts)
      .set({ status, updatedAt: new Date() })
      .where(eq(aiDrafts.id, id))
      .returning();
    return rows[0] ?? null;
  });
}

/** Aprovação humana do rascunho (human-in-the-loop). */
export async function approveDraft(client: DbClient, ctx: AuthContext, id: string) {
  assertCan(ctx, 'update', 'ai_draft');
  return setStatus(client, ctx, id, 'approved');
}

export async function discardDraft(client: DbClient, ctx: AuthContext, id: string) {
  assertCan(ctx, 'update', 'ai_draft');
  return setStatus(client, ctx, id, 'discarded');
}

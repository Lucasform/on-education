'use server';

import { resolveTenantProvider } from '@on-education/module-ia';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

export async function askCopilotoAction(
  snapshot: string,
  pergunta: string,
): Promise<{ text: string; error?: never } | { text?: never; error: string }> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: 'Sessão expirada. Faça login novamente.' };
  if (ctx.tenantType !== 'organization')
    return { error: 'Funcionalidade disponível apenas para escolas.' };

  if (!pergunta.trim()) return { error: 'Digite uma pergunta.' };

  try {
    const provider = await resolveTenantProvider(db(), ctx, 'haiku');
    const result = await provider.generate({
      system: `Você é o Copiloto de Gestão de uma escola. Responda em português do Brasil, de forma objetiva e direta.
Use SOMENTE os números do contexto abaixo para responder. Não invente dados, não acesse fontes externas.
Se a pergunta pedir informação que não está no contexto, diga claramente que não há esse dado disponível.
Nunca mencione nomes de alunos ou qualquer dado pessoal.
Contexto com os números da escola:
${snapshot}`,
      prompt: pergunta.trim(),
      maxTokens: 512,
    });
    return { text: result.text };
  } catch (err) {
    console.error('[copiloto] erro ao chamar IA', err);
    return { error: 'Não foi possível obter resposta da IA. Tente novamente em instantes.' };
  }
}

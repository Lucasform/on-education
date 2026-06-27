import { isAiConfigured, resolveTenantProvider } from '@on-education/module-ia';
import {
  canSeeFinanceValues,
  getFinanceSummary,
  listClasses,
  listStudents,
} from '@on-education/module-nucleo';
import { NextResponse } from 'next/server';

import { listAtRiskStudents } from '@/server/at-risk';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

export const dynamic = 'force-dynamic';

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/**
 * WayON flutuante: o usuário pergunta sobre o próprio app (turmas, alunos em risco, resultados).
 * O snapshot é montado no servidor conforme o papel (financeiro só entra para quem pode ver valores),
 * sempre agregado e sem nomes. A IA responde só com esses números.
 */
export async function POST(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: 'Sessão expirada. Entre novamente.' }, { status: 401 });
  if (!isAiConfigured()) {
    return NextResponse.json({ error: 'A IA não está configurada no momento.' });
  }

  let pergunta = '';
  try {
    const body = (await req.json()) as { pergunta?: string };
    pergunta = String(body?.pergunta ?? '').trim();
  } catch {
    /* corpo inválido */
  }
  if (!pergunta) return NextResponse.json({ error: 'Digite uma pergunta.' });

  const client = db();
  const isOrg = ctx.tenantType === 'organization';
  const [alunos, turmas, risco, financeiro] = await Promise.all([
    listStudents(client, ctx).catch(() => []),
    listClasses(client, ctx).catch(() => []),
    listAtRiskStudents(client, ctx).catch(() => []),
    (isOrg && canSeeFinanceValues(ctx) ? getFinanceSummary(client, ctx) : Promise.resolve(null)).catch(
      () => null,
    ),
  ]);

  const linhas = [
    `Alunos ativos: ${alunos.length}`,
    `Turmas ativas: ${turmas.length}`,
    `Alunos em risco (media baixa ou frequencia abaixo de 75%): ${risco.length}`,
  ];
  if (financeiro) {
    linhas.push(
      `Receitas pagas no mes: ${brl(financeiro.receitasPagas)}`,
      `Despesas pagas no mes: ${brl(financeiro.despesasPagas)}`,
      `Resultado do mes: ${brl(financeiro.resultado)}`,
      `A receber (mensalidades em aberto): ${brl(financeiro.aReceber)}`,
      `A pagar (despesas em aberto): ${brl(financeiro.aPagar)}`,
    );
  }
  const snapshot = linhas.join('\n');

  try {
    const provider = await resolveTenantProvider(client, ctx, 'haiku');
    const result = await provider.generate({
      system: `Você é o WayON, assistente do app Edu On Way. Responda em português do Brasil, de forma curta, direta e gentil.
Use SOMENTE os números do contexto abaixo. Não invente dados nem acesse fontes externas.
Se a pergunta pedir algo que não está no contexto, diga que esse dado não está aqui e sugira em qual tela do app encontrar (ex.: Dashboards, Alunos em risco, Inadimplência, Notas).
Nunca cite nomes de alunos nem dados pessoais.
Contexto atual:
${snapshot}`,
      prompt: pergunta,
      maxTokens: 512,
    });
    return NextResponse.json({ text: result.text });
  } catch (e) {
    console.error('[wayon] erro IA', e);
    return NextResponse.json({ error: 'Não consegui responder agora. Tente de novo em instantes.' });
  }
}

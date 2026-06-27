import type { AuthContext } from '@on-education/auth';
import { isAiConfigured, resolveTenantProvider } from '@on-education/module-ia';
import {
  getStudentByPortalToken,
  saveStudentTutorTurn,
  STUDENT_TUTOR_DAILY_LIMIT,
  studentTutorUsageToday,
} from '@on-education/module-nucleo';
import { NextResponse } from 'next/server';

import { db } from '@/server/db';

export const dynamic = 'force-dynamic';

/**
 * Tutor do aluno (portal público por token). Limite diário por aluno e custo sempre na conta do
 * tenant (resolveTenantProvider usa a config de IA da escola). O tutor explica o raciocínio mas
 * nunca entrega a resposta pronta.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { token?: string; pergunta?: string };
  const client = db();
  const aluno = await getStudentByPortalToken(client, String(body?.token ?? ''));
  if (!aluno) return NextResponse.json({ error: 'Link inválido.' }, { status: 404 });

  const q = String(body?.pergunta ?? '').trim();
  if (!q) return NextResponse.json({ error: 'Digite sua dúvida.' });
  if (!isAiConfigured()) return NextResponse.json({ error: 'O Tutor está indisponível agora.' });

  const usados = await studentTutorUsageToday(client, aluno.tenantId, aluno.id);
  if (usados >= STUDENT_TUTOR_DAILY_LIMIT) {
    return NextResponse.json({
      limited: true,
      error: `Você já fez ${STUDENT_TUTOR_DAILY_LIMIT} perguntas hoje. Volte amanhã que eu te ajudo de novo!`,
    });
  }

  await saveStudentTutorTurn(client, aluno.tenantId, aluno.id, 'user', q);
  try {
    const ctx = { tenantId: aluno.tenantId } as unknown as AuthContext;
    const provider = await resolveTenantProvider(client, ctx, 'haiku');
    const result = await provider.generate({
      system: `Você é o Tutor do Edu On Way, ajudando um aluno da escola. Responda em português do Brasil, com paciência e gentileza.
Explique o raciocínio passo a passo e dê dicas, mas NUNCA entregue a resposta pronta da tarefa: conduza o aluno até ele mesmo chegar lá.
Use linguagem simples e adequada à idade escolar. Seja breve e encorajador.`,
      prompt: q,
      maxTokens: 500,
    });
    await saveStudentTutorTurn(client, aluno.tenantId, aluno.id, 'tutor', result.text);
    return NextResponse.json({ text: result.text, used: usados + 1, limit: STUDENT_TUTOR_DAILY_LIMIT });
  } catch (e) {
    console.error('[aluno/tutor] erro IA', e);
    return NextResponse.json({ error: 'Não consegui responder agora. Tente de novo em instantes.' });
  }
}

'use server';

import { reportComments } from '@on-education/db';
import { isAiConfigured, recordUsage, resolveTenantProvider } from '@on-education/module-ia';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';
import { buildStudentBoletim } from '@/server/student-report';

async function requireCtx() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  return ctx;
}

/** Grava (upsert) o comentário do boletim do aluno. */
async function upsertComment(studentId: string, comment: string) {
  const ctx = await requireCtx();
  await db().withTenant(ctx.tenantId, async (tx) => {
    const existing = await tx
      .select({ id: reportComments.id })
      .from(reportComments)
      .where(eq(reportComments.studentId, studentId))
      .limit(1);
    if (existing.length) {
      await tx
        .update(reportComments)
        .set({ comment, updatedAt: new Date() })
        .where(eq(reportComments.studentId, studentId));
    } else {
      await tx
        .insert(reportComments)
        .values({ tenantId: ctx.tenantId, studentId, comment, createdBy: ctx.userId });
    }
  });
}

export async function saveReportCommentAction(formData: FormData): Promise<void> {
  const studentId = String(formData.get('studentId') ?? '');
  const comment = String(formData.get('comment') ?? '').trim();
  if (studentId) await upsertComment(studentId, comment);
  revalidatePath(`/app/alunos/${studentId}/boletim`);
}

export async function generateReportCommentAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const studentId = String(formData.get('studentId') ?? '');
  if (!studentId || !isAiConfigured()) {
    revalidatePath(`/app/alunos/${studentId}/boletim`);
    return;
  }
  const b = await buildStudentBoletim(db(), ctx, studentId).catch(() => null);
  if (!b) {
    revalidatePath(`/app/alunos/${studentId}/boletim`);
    return;
  }
  const componentes = b.components.map((c) => `${c.name}: ${c.average}`).join('; ') || 'sem componentes';
  const prompt = `Aluno(a): ${b.studentName}
Média final: ${b.finalAverage}
Frequência: ${b.attendance} (faltas: ${b.absences})
Médias por componente: ${componentes}
Situação: ${b.status}

Escreva o comentário do boletim para este(a) aluno(a).`;
  try {
    const provider = await resolveTenantProvider(db(), ctx);
    const r = await provider.generate({
      system:
        'Você é um(a) professor(a) escrevendo o comentário do boletim. Português do Brasil, ' +
        'tom profissional e acolhedor, 3 a 5 frases, sem travessão no meio de frase. ' +
        'Baseie-se SOMENTE nos dados fornecidos: destaque pontos fortes, o que precisa melhorar e ' +
        'uma orientação. Trate o aluno com respeito; não invente notas.',
      prompt,
      maxTokens: 400,
    });
    await recordUsage(db(), ctx.tenantId, r.tokensIn + r.tokensOut).catch(() => {});
    if (r.text.trim()) await upsertComment(studentId, r.text.trim());
  } catch {
    // sem cota/IA: não derruba a página.
  }
  revalidatePath(`/app/alunos/${studentId}/boletim`);
}

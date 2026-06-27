import { getStudentByPortalToken, postStudentMessage } from '@on-education/module-nucleo';
import { NextResponse } from 'next/server';

import { db } from '@/server/db';

export const dynamic = 'force-dynamic';

/** Portal do aluno: aluno manda mensagem para o professor (chat). Acesso por token. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { token?: string; body?: string };
  const client = db();
  const aluno = await getStudentByPortalToken(client, String(body?.token ?? ''));
  if (!aluno) return NextResponse.json({ error: 'Link inválido.' }, { status: 404 });

  const text = String(body?.body ?? '').trim();
  if (!text) return NextResponse.json({ error: 'Escreva uma mensagem.' });

  await postStudentMessage(client, {
    tenantId: aluno.tenantId,
    studentId: aluno.id,
    body: text,
    fromStudent: true,
    authorName: aluno.fullName,
  });
  return NextResponse.json({ ok: true });
}

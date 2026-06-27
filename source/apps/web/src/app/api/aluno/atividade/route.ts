import { getStudentByPortalToken, markAssignmentDone } from '@on-education/module-nucleo';
import { NextResponse } from 'next/server';

import { db } from '@/server/db';

export const dynamic = 'force-dynamic';

/** Portal do aluno: marca uma atividade como concluída (ou volta para pendente). Acesso por token. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    token?: string;
    assignmentId?: string;
    done?: boolean;
  };
  const client = db();
  const aluno = await getStudentByPortalToken(client, String(body?.token ?? ''));
  if (!aluno) return NextResponse.json({ error: 'Link inválido.' }, { status: 404 });

  await markAssignmentDone(
    client,
    aluno.tenantId,
    aluno.id,
    String(body?.assignmentId ?? ''),
    body?.done !== false,
  );
  return NextResponse.json({ ok: true });
}

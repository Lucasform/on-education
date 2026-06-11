import { listClasses, listStudents } from '@on-education/module-nucleo';
import { NextResponse } from 'next/server';

import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

export const dynamic = 'force-dynamic';

/** Escapa um campo CSV (aspas + ; como separador, compatível com Excel pt-BR). */
function cell(v: unknown): string {
  const s = String(v ?? '');
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Exporta os alunos do tenant em CSV (nome, turma, nascimento). */
export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const client = db();
  const [alunos, turmas] = await Promise.all([listStudents(client, ctx), listClasses(client, ctx)]);
  const turmaNome = new Map(turmas.map((t) => [t.id, t.name]));

  const linhas = [
    ['nome', 'turma', 'nascimento'].join(';'),
    ...alunos.map((a) =>
      [
        cell(a.fullName),
        cell(a.classId ? (turmaNome.get(a.classId) ?? '') : ''),
        cell(a.birthDate ?? ''),
      ].join(';'),
    ),
  ];
  // BOM para o Excel reconhecer UTF-8 (acentos).
  const csv = '﻿' + linhas.join('\r\n');

  return new NextResponse(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="alunos.csv"',
    },
  });
}

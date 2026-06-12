import { listStudents } from '@on-education/module-nucleo';
import { listGrades } from '@on-education/module-sala-de-aula';
import { NextResponse } from 'next/server';

import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

export const dynamic = 'force-dynamic';

function cell(v: unknown): string {
  const s = String(v ?? '');
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const KIND: Record<string, string> = {
  formal: 'avaliação',
  participacao: 'participação',
  anotacao: 'anotação',
};

/** Exporta todas as notas do tenant em CSV (aluno, tipo, avaliação, nota, observação). */
export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const client = db();
  const [notas, alunos] = await Promise.all([listGrades(client, ctx), listStudents(client, ctx)]);
  const alunoNome = new Map(alunos.map((a) => [a.id, a.fullName]));

  const linhas = [
    ['aluno', 'tipo', 'avaliacao', 'nota', 'observacao'].join(';'),
    ...notas.map((n) =>
      [
        cell(alunoNome.get(n.studentId) ?? ''),
        cell(KIND[n.kind] ?? n.kind),
        cell(n.label),
        cell(n.value ?? ''),
        cell(n.note ?? ''),
      ].join(';'),
    ),
  ];
  const csv = '﻿' + linhas.join('\r\n');

  return new NextResponse(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="notas.csv"',
    },
  });
}

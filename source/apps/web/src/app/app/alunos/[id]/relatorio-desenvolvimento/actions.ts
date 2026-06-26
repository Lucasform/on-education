'use server';

import { generateDraft } from '@on-education/module-ia';
import { redirect } from 'next/navigation';

import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';
import { buildStudentSummary } from '@/server/student-report';

async function requireCtx() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  return ctx;
}

export async function gerarRelatorioDesenvolvimentoAction(formData: FormData): Promise<void> {
  const ctx = await requireCtx();
  const studentId = String(formData.get('studentId') ?? '').trim();
  if (!studentId) redirect('/app/alunos');

  const periodo = String(formData.get('periodo') ?? '').trim();
  const descricaoGeral = String(formData.get('descricaoGeral') ?? '').trim();
  const pontosFort = String(formData.get('pontosFortes') ?? '').trim();
  const dificuldades = String(formData.get('dificuldades') ?? '').trim();
  const evolucao = String(formData.get('evolucao') ?? '').trim();

  // Busca dados reais do aluno para enriquecer o prompt
  const resumo = await buildStudentSummary(db(), ctx, studentId).catch(() => null);
  const nomeAluno = resumo?.studentName ?? 'Aluno';
  const mediaAluno = resumo?.average ?? 'sem dados';
  const frequenciaAluno = resumo?.attendance ?? 'sem dados';
  const notasAluno =
    resumo && resumo.gradeLines.length > 0
      ? resumo.gradeLines.join('\n')
      : 'Sem notas registradas no sistema.';

  const blocos: string[] = [
    `Aluno(a): ${nomeAluno}`,
    periodo ? `Periodo de avaliacao: ${periodo}` : '',
    `Dados do sistema: media ${mediaAluno} | frequencia ${frequenciaAluno}`,
    notasAluno !== 'Sem notas registradas no sistema.'
      ? `Notas registradas:\n${notasAluno}`
      : 'Sem notas registradas no sistema.',
    '',
    'Observacoes do professor:',
    descricaoGeral ? `Descricao geral: ${descricaoGeral}` : '',
    pontosFort ? `Pontos fortes: ${pontosFort}` : '',
    dificuldades ? `Dificuldades: ${dificuldades}` : '',
    evolucao ? `Evolucao observada: ${evolucao}` : '',
    '',
    'Com base nas informacoes acima, elabore o Relatorio de Desenvolvimento deste(a) aluno(a). ' +
      'Use tom profissional, acolhedor e objetivo. ' +
      'Estruture em paragrafos: apresentacao, desempenho academico, desenvolvimento integral, orientacoes. ' +
      'Portugues do Brasil. Sem travessao no meio de frase.',
  ];

  const prompt = blocos.filter(Boolean).join('\n');

  try {
    await generateDraft(db(), ctx, { kind: 'report', prompt, studentId }, undefined, undefined);
  } catch {
    redirect(`/app/alunos/${studentId}/relatorio-desenvolvimento?erro=1`);
  }

  redirect('/app/ia');
}

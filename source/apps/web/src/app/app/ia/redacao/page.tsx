import { isAiConfigured } from '@on-education/module-ia';
import { listStudents } from '@on-education/module-nucleo';
import { redirect } from 'next/navigation';

import { PageHeader } from '@/components/form';
import { IaGenerator } from '@/components/ia-generator';
import { RedacaoFoto } from '@/components/redacao-foto';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Correção de redação · Edu On Way' };

export default async function RedacaoPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');

  const alunos = await listStudents(db(), ctx).catch(() => []);
  const students = alunos.map((a) => ({ id: a.id, fullName: a.fullName }));

  return (
    <>
      <PageHeader
        title="Correção de redação"
        description="Tire foto da folha ou cole o texto. O WayOn transcreve sem inventar e devolve uma correção por competências, como rascunho para você revisar."
      />
      {isAiConfigured() && <RedacaoFoto students={students} />}
      <IaGenerator
        ctx={ctx}
        kind="essay"
        promptPlaceholder="Ou cole aqui o texto da redação do aluno..."
        generateLabel="Corrigir com o WayOn"
        students={students}
      />
    </>
  );
}

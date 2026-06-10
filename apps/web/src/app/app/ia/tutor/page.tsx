import { listClasses } from '@on-education/module-nucleo';
import { redirect } from 'next/navigation';

import { PageHeader } from '@/components/form';
import { IaGenerator } from '@/components/ia-generator';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Tutor do aluno · Edu On Way' };

export default async function TutorPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const turmas = await listClasses(db(), ctx).catch(() => []);

  return (
    <>
      <PageHeader
        title="Tutor do aluno"
        description="Tira-dúvidas que explica o raciocínio sem fazer a tarefa pelo aluno. Pode se basear nos materiais da turma."
      />
      <IaGenerator
        ctx={ctx}
        kind="tutor"
        promptPlaceholder="Qual é a dúvida? Ex.: como resolver uma equação do 1º grau?"
        generateLabel="Perguntar ao tutor"
        classes={turmas.map((t) => ({ id: t.id, name: t.name }))}
      />
    </>
  );
}

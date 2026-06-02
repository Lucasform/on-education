import { redirect } from 'next/navigation';

import { PageHeader } from '@/components/form';
import { IaGenerator } from '@/components/ia-generator';
import { getAuthContext } from '@/server/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Tutor do aluno · On Education' };

export default async function TutorPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');

  return (
    <>
      <PageHeader
        title="Tutor do aluno"
        description="Tira-dúvidas que explica o raciocínio sem fazer a tarefa pelo aluno."
      />
      <IaGenerator
        ctx={ctx}
        kind="tutor"
        promptPlaceholder="Qual é a dúvida? Ex.: como resolver uma equação do 1º grau?"
        generateLabel="Perguntar ao tutor"
      />
    </>
  );
}

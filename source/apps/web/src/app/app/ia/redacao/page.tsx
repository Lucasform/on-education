import { isAiConfigured } from '@on-education/module-ia';
import { isEntitled, listStudents } from '@on-education/module-nucleo';
import { redirect } from 'next/navigation';

import { UpgradeGate } from '@/components/upgrade-gate';

import { AgentNameText } from '@/components/agent-name-provider';
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
  const client = db();
  if (!await isEntitled(client, ctx.tenantId, 'ai.essayGrading')) {
    return <UpgradeGate feature="ai.essayGrading" tenantType={ctx.tenantType} />;
  }

  const alunos = await listStudents(client, ctx).catch(() => []);
  const students = alunos.map((a) => ({ id: a.id, fullName: a.fullName }));

  return (
    <>
      <PageHeader
        title="Correção de redação"
        description={<>Tire foto da folha ou cole o texto. O <AgentNameText /> transcreve sem inventar e devolve uma correção por competências, como rascunho para você revisar.</>}
      />
      {isAiConfigured() && <RedacaoFoto students={students} />}
      <IaGenerator
        ctx={ctx}
        kind="essay"
        promptPlaceholder="Ou cole aqui o texto da redação do aluno..."
        generateLabel={<>Corrigir com o <AgentNameText /></>}
        students={students}
      />
    </>
  );
}

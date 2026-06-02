import { redirect } from 'next/navigation';

import { PageHeader } from '@/components/form';
import { IaGenerator } from '@/components/ia-generator';
import { getAuthContext } from '@/server/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Correção de redação · On Education' };

export default async function RedacaoPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');

  return (
    <>
      <PageHeader
        title="Correção de redação"
        description="Cole a redação e a IA devolve uma correção por competências. Rascunho para você revisar."
      />
      <IaGenerator
        ctx={ctx}
        kind="essay"
        promptPlaceholder="Cole aqui o texto da redação do aluno..."
        generateLabel="Corrigir com IA"
      />
    </>
  );
}

import { getTenantSettings } from '@on-education/module-nucleo';
import { Button } from '@on-education/ui';
import { redirect } from 'next/navigation';

import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { updateAiStandardAction } from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Meu padrão · On Way Education' };

const EXEMPLO = `Ex.: Sempre em português do Brasil, tom claro e acolhedor.
Cabeçalho: "Prof. Fulano · Turma · Data". Provas com 5 questões e gabarito ao final.
Lição de casa curta (até 4 itens). Nível padrão: médio. Sem travessão no meio de frase.`;

export default async function MeuPadraoPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const isSchool = ctx.tenantType === 'organization';
  const settings = await getTenantSettings(db(), ctx).catch(() => null);

  return (
    <>
      <PageHeader
        title={isSchool ? 'Padrão do EduON' : 'Meu padrão'}
        description="Defina UMA vez o estilo e o formato. Todo conteúdo gerado pelo EduON (planos, atividades, provas, redação, simulados) sai nesse padrão."
      />

      <div className={cardClass}>
        <form action={updateAiStandardAction} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            {isSchool ? 'Padrão da escola' : 'Meu padrão de documentos e conteúdo'}
            <textarea
              name="aiStandard"
              rows={8}
              defaultValue={settings?.aiStandard ?? ''}
              placeholder={EXEMPLO}
              className={fieldClass}
            />
          </label>
          <p className="text-xs text-muted-foreground">
            Dica: descreva estilo, cabeçalho/rodapé, formato de prova/lição/roteiro/bilhete e o
            nível de dificuldade preferido. O EduON segue essas instruções em toda geração.
          </p>
          <div>
            <Button type="submit" size="sm">
              Salvar padrão
            </Button>
          </div>
        </form>
      </div>

      <div className={cardClass}>
        <h2 className="mb-1 text-sm font-medium">Como funciona</h2>
        <p className="text-sm text-muted-foreground">
          O padrão é aplicado automaticamente nas gerações do EduON: Gerar conteúdo, Correção de
          redação, Tutor, Gerar atividade e Gerar simulado. Você pode ajustar quando quiser.
        </p>
      </div>
    </>
  );
}

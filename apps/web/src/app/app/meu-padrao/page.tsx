import { getTenantSettings, listStandardSamples } from '@on-education/module-nucleo';
import { redirect } from 'next/navigation';

import { ConfirmButton } from '@/components/confirm-button';
import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { SubmitButton } from '@/components/submit-button';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import {
  deleteStandardSampleAction,
  updateAiStandardAction,
  updateGamificationAction,
  uploadStandardSampleAction,
} from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Meu padrão · Edu On Way' };

const EXEMPLO = `Ex.: Sempre em português do Brasil, tom claro e acolhedor.
Cabeçalho: "Prof. Fulano · Turma · Data". Provas com 5 questões e gabarito ao final.
Lição de casa curta (até 4 itens). Nível padrão: médio. Sem travessão no meio de frase.`;

export default async function MeuPadraoPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const isSchool = ctx.tenantType === 'organization';
  const settings = await getTenantSettings(db(), ctx).catch(() => null);
  const modelos = await listStandardSamples(db(), ctx).catch(() => []);

  return (
    <>
      <PageHeader
        title={isSchool ? 'Padrão do WayOn' : 'Meu padrão'}
        description="Defina UMA vez o estilo e o formato. Todo conteúdo gerado pelo WayOn (planos, atividades, provas, redação, simulados) sai nesse padrão."
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
            nível de dificuldade preferido. O WayOn segue essas instruções em toda geração.
          </p>

          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Estilo das imagens (aplicado a toda imagem gerada)
            <textarea
              name="imageStyle"
              rows={3}
              defaultValue={settings?.imageStyle ?? ''}
              placeholder="Ex.: ilustração flat, traço simples, cores suaves/pastel, estilo livro infantil, fundo branco, sem texto na imagem."
              className={fieldClass}
            />
          </label>
          <p className="text-xs text-muted-foreground">
            Não dá para &quot;treinar&quot; o gerador de imagem, mas esse estilo é colado em todo
            prompt, deixando as figuras com a mesma cara.
          </p>

          <div>
            <SubmitButton type="submit" size="sm">
              Salvar padrão
            </SubmitButton>
          </div>
        </form>
      </div>

      <div className={cardClass}>
        <h2 className="mb-1 text-sm font-medium">Modelos de referência (provas / atividades)</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Suba exemplos de prova ou atividade do seu jeito (PDF ou texto). O WayOn lê e passa a
          imitar o FORMATO e o ESTILO deles em tudo que gerar.
        </p>
        <form action={uploadStandardSampleAction} className="flex flex-wrap items-end gap-2">
          <select name="kind" defaultValue="prova" className={`${fieldClass} w-36`}>
            <option value="prova">Prova</option>
            <option value="atividade">Atividade</option>
            <option value="outro">Outro</option>
          </select>
          <input
            name="title"
            placeholder="Nome do modelo (ex.: Prova bimestral)"
            className={fieldClass}
          />
          <input
            type="file"
            name="file"
            accept=".pdf,.txt,.md,image/*"
            required
            className={`${fieldClass} cursor-pointer`}
          />
          <SubmitButton type="submit" size="sm">
            Subir modelo
          </SubmitButton>
        </form>

        {modelos.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm">
            {modelos.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-1.5"
              >
                <span>
                  <span className="mr-2 rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                    {m.kind === 'prova' ? 'Prova' : m.kind === 'atividade' ? 'Atividade' : 'Outro'}
                  </span>
                  {m.title}
                  {!m.extractedText && (
                    <span className="ml-2 text-xs text-warning">(texto não extraído)</span>
                  )}
                </span>
                <form action={deleteStandardSampleAction}>
                  <input type="hidden" name="id" value={m.id} />
                  <ConfirmButton size="sm" variant="ghost" message={`Remover "${m.title}"?`}>
                    Remover
                  </ConfirmButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!isSchool && (
        <form action={updateGamificationAction} className={cardClass}>
          <h2 className="mb-1 text-sm font-medium">Gamificação</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Pontos e medalhas para os alunos. Desligue se não usar.
          </p>
          <label className="mb-3 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="gamificationEnabled"
              defaultChecked={settings?.gamificationEnabled ?? true}
              className="h-4 w-4"
            />
            Ativar pontos e medalhas
          </label>
          <div className="grid grid-cols-3 gap-3">
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              🥉 Bronze
              <input
                name="medalBronze"
                type="number"
                min={1}
                defaultValue={settings?.medalBronze ?? 50}
                className={fieldClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              🥈 Prata
              <input
                name="medalPrata"
                type="number"
                min={1}
                defaultValue={settings?.medalPrata ?? 150}
                className={fieldClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              🥇 Ouro
              <input
                name="medalOuro"
                type="number"
                min={1}
                defaultValue={settings?.medalOuro ?? 300}
                className={fieldClass}
              />
            </label>
          </div>
          <div className="mt-3">
            <SubmitButton type="submit" size="sm" variant="outline">
              Salvar gamificação
            </SubmitButton>
          </div>
        </form>
      )}

      <div className={cardClass}>
        <h2 className="mb-1 text-sm font-medium">Como funciona</h2>
        <p className="text-sm text-muted-foreground">
          O padrão é aplicado automaticamente nas gerações do WayOn: Gerar conteúdo, Correção de
          redação, Tutor, Gerar atividade e Gerar simulado. Você pode ajustar quando quiser.
        </p>
      </div>
    </>
  );
}

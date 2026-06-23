import { getTenantSettings, isEntitled, listStandardSamples } from '@on-education/module-nucleo';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { ConfirmButton } from '@/components/confirm-button';
import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { TabPanel, Tabs } from '@/components/section-tabs';
import { SubmitButton } from '@/components/submit-button';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import {
  deleteStandardSampleAction,
  updateAiProviderAction,
  updateAiStandardAction,
  updateGamificationAction,
  uploadStandardSampleAction,
} from '../actions';

const AI_PROVIDERS = [
  { value: 'default', label: 'WayOn (nossa IA — usa sua cota do plano)' },
  { value: 'openai', label: 'OpenAI (GPT) — sua chave' },
  { value: 'gemini', label: 'Google Gemini — sua chave' },
  { value: 'anthropic', label: 'Anthropic (Claude) — sua chave' },
];

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
  const agente = settings?.agentName?.trim() || 'WayOn';
  const gamiOn = await isEntitled(db(), ctx.tenantId, 'gamification').catch(() => false);
  const aiProvider = settings?.aiProvider ?? 'default';
  const temChave = Boolean(settings?.aiApiKeyEnc);
  const aiFlash = (await cookies()).get('oe_ai_flash')?.value;
  // IA realmente ativa agora: a do professor só vale se houver chave salva; senão é a nossa.
  const usandoPropria = aiProvider !== 'default' && temChave;
  const aiAtivaLabel = usandoPropria
    ? `${AI_PROVIDERS.find((p) => p.value === aiProvider)?.label.split(' —')[0] ?? aiProvider} (sua chave, não consome a cota do plano)`
    : 'WayOn, a nossa IA (consome a cota do seu plano)';
  const modelos = await listStandardSamples(db(), ctx).catch(() => []);

  return (
    <>
      <PageHeader
        title={isSchool ? `Padrão do ${agente}` : 'Meu padrão'}
        description={`Defina UMA vez o estilo e o formato. Todo conteúdo gerado pelo ${agente} (planos, atividades, provas, redação, simulados) sai nesse padrão.`}
      />

      <Tabs
        tabs={[
          { id: 'padrao', label: 'Padrão de escrita' },
          ...(!isSchool && gamiOn ? [{ id: 'gamificacao', label: 'Gamificação' }] : []),
          { id: 'avancado', label: 'Avançado' },
        ]}
      >
      <TabPanel id="padrao">
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
            nível de dificuldade preferido. O {agente} segue essas instruções em toda geração.
          </p>

          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Estilo padrão das imagens
            <textarea
              name="imageStyle"
              rows={3}
              defaultValue={settings?.imageStyle ?? ''}
              placeholder="Ex.: ilustração flat, traço simples, cores suaves/pastel, estilo livro infantil, fundo branco, sem texto na imagem."
              className={fieldClass}
            />
          </label>
          <p className="text-xs text-muted-foreground">
            Aplicado por padrão para manter as imagens com a mesma cara. Para uma imagem específica,
            é só descrever o estilo que você quer na hora de gerar. Deixe em branco se não quiser um
            padrão.
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
          Suba exemplos de prova ou atividade do seu jeito (PDF ou texto). O {agente} lê e passa a
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

      </TabPanel>
      <TabPanel id="gamificacao">
      {!isSchool && gamiOn && (
        <form action={updateGamificationAction} className={cardClass}>
          <h2 className="mb-1 text-sm font-medium">Gamificação</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            O aluno acumula pontos quando você premia (e, opcionalmente, ao tirar boas notas) e
            desbloqueia as medalhas 🥉 🥈 🥇 ao atingir as faixas abaixo. Desligue se não usar.
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
          <label className="mt-3 flex flex-col gap-1 text-xs text-muted-foreground">
            Auto-pontos por boa nota (0 = desligado)
            <input
              name="autoPointsGrade"
              type="number"
              min={0}
              max={1000}
              defaultValue={settings?.autoPointsGrade ?? 0}
              className={`${fieldClass} w-40`}
            />
            <span>Dá esses pontos ao lançar uma nota formal &ge; 60% da escala.</span>
          </label>
          <div className="mt-3">
            <SubmitButton type="submit" size="sm" variant="outline">
              Salvar gamificação
            </SubmitButton>
          </div>
        </form>
      )}

      </TabPanel>
      <TabPanel id="avancado">
      <form action={updateAiProviderAction} className={cardClass}>
        <h2 className="mb-1 text-sm font-medium">Sua própria IA (avançado)</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Tem conta no GPT, Gemini ou Claude? Conecte sua própria chave e use os tokens dela, sem
          consumir a cota do seu plano. Tudo continua funcionando igual (seu padrão e suas regras
          valem do mesmo jeito) e a chave fica guardada de forma criptografada.
        </p>
        <div
          className={`mb-3 rounded-md border p-2 text-xs ${usandoPropria ? 'border-primary/40 bg-primary/5' : 'border-border bg-muted'}`}
        >
          <span className="font-medium">IA ativa agora:</span> {aiAtivaLabel}
        </div>
        {aiFlash && (
          <div className="mb-3 rounded-md border border-border bg-muted p-2 text-xs">{aiFlash}</div>
        )}
        <div className="flex flex-col gap-2">
          <select name="aiProvider" defaultValue={aiProvider} className={fieldClass}>
            {AI_PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <input
            name="apiKey"
            type="password"
            placeholder={
              temChave ? 'Chave salva — preencha só para trocar' : 'Cole sua API key (sk-…, AIza…)'
            }
            className={fieldClass}
            autoComplete="off"
          />
          <p className="text-[11px] text-muted-foreground">
            Na opção &quot;WayOn&quot; você usa a nossa IA e gasta a cota do seu plano. Nas outras,
            quem cobra é o seu provedor (GPT, Gemini ou Claude), pela chave que você conectou.
            {temChave ? ' Você já tem uma chave salva.' : ''} Se a sua chave falhar, o app mostra o
            erro e não usa a nossa no lugar. É só corrigir a chave ou voltar para &quot;WayOn&quot;.
          </p>
          <div>
            <SubmitButton type="submit" size="sm">
              Salvar e testar
            </SubmitButton>
          </div>
        </div>
      </form>

      <div className={cardClass}>
        <h2 className="mb-1 text-sm font-medium">Como funciona</h2>
        <p className="text-sm text-muted-foreground">
          O padrão é aplicado automaticamente nas gerações do {agente}: Gerar conteúdo, Correção de
          redação, Tutor, Gerar atividade e Gerar simulado. Você pode ajustar quando quiser.
        </p>
      </div>
      </TabPanel>
      </Tabs>
    </>
  );
}

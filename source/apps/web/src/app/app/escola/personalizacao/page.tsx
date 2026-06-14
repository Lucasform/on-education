import { SubmitButton } from '@/components/submit-button';
import { getTenantSettings } from '@on-education/module-nucleo';
import { redirect } from 'next/navigation';

import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { LogoUpload } from '@/components/logo-upload';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { updateGamificationAction, updateTenantSettingsAction } from '../../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Personalização · Edu On Way' };

// Presets de cor (triplo HSL aplicado como --primary). Evita lidar com hex/HSL na mão.
const CORES = [
  { nome: 'Roxo', hsl: '262 83% 58%' },
  { nome: 'Azul', hsl: '221 83% 53%' },
  { nome: 'Verde', hsl: '142 71% 45%' },
  { nome: 'Laranja', hsl: '25 95% 53%' },
  { nome: 'Rosa', hsl: '330 81% 60%' },
  { nome: 'Vermelho', hsl: '0 72% 51%' },
];

export default async function PersonalizacaoPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  if (ctx.tenantType !== 'organization') redirect('/app');
  const settings = await getTenantSettings(db(), ctx).catch(() => null);
  const corAtual = settings?.themeColor ?? CORES[0]!.hsl;

  return (
    <>
      <PageHeader
        title="Personalização da escola"
        description="Identidade visual, dados da instituição e documentos. Aplica em todo o sistema."
      />

      {/* Logo */}
      <div className={cardClass}>
        <h2 className="mb-1 text-sm font-medium">Logo da escola</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Aparece no topo do sistema, nos documentos e no mural dos pais.
        </p>
        <LogoUpload currentUrl={settings?.logoUrl ?? null} />
      </div>

      <form action={updateTenantSettingsAction} className="flex flex-col gap-5">
        {/* Dados da escola */}
        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Dados da escola</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Nome da escola (exibido no sistema)
              <input
                name="profileName"
                maxLength={120}
                defaultValue={settings?.profileName ?? ''}
                placeholder="Escola Estadual Dom Pedro II"
                className={fieldClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              CNPJ
              <input
                name="profileCnpj"
                maxLength={20}
                defaultValue={settings?.profileCnpj ?? ''}
                placeholder="00.000.000/0000-00"
                className={fieldClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Telefone
              <input
                name="profilePhone"
                maxLength={30}
                defaultValue={settings?.profilePhone ?? ''}
                placeholder="(11) 99999-0000"
                className={fieldClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              E-mail institucional
              <input
                name="profileEmail"
                type="email"
                maxLength={200}
                defaultValue={settings?.profileEmail ?? ''}
                placeholder="secretaria@escola.edu.br"
                className={fieldClass}
              />
            </label>
          </div>
          <label className="mt-3 flex flex-col gap-1 text-xs text-muted-foreground">
            Endereço completo
            <input
              name="profileAddress"
              maxLength={300}
              defaultValue={settings?.profileAddress ?? ''}
              placeholder="Rua das Flores, 100 — Bairro Centro, São Paulo/SP — CEP 01000-000"
              className={fieldClass}
            />
          </label>
        </div>

        <div className={cardClass}>
          <h2 className="mb-1 text-sm font-medium">Nome do assistente de IA</h2>
          <p className="mb-2 text-xs text-muted-foreground">
            Como o assistente aparece para sua escola. Padrão: WayOn.
          </p>
          <input
            name="agentName"
            maxLength={40}
            defaultValue={settings?.agentName ?? ''}
            placeholder="WayOn"
            className={fieldClass}
          />
        </div>

        <div className={cardClass}>
          <h2 className="mb-3 text-sm font-medium">Identidade visual</h2>
          <label className="text-xs text-muted-foreground">Cor do tema</label>
          <div className="mt-2 flex flex-wrap gap-3">
            {CORES.map((c) => (
              <label key={c.hsl} className="cursor-pointer">
                <input
                  type="radio"
                  name="themeColor"
                  value={c.hsl}
                  defaultChecked={c.hsl === corAtual}
                  className="peer sr-only"
                />
                <span
                  className="block h-9 w-9 rounded-full ring-2 ring-transparent ring-offset-2 ring-offset-card peer-checked:ring-foreground"
                  style={{ backgroundColor: `hsl(${c.hsl})` }}
                  title={c.nome}
                />
              </label>
            ))}
          </div>
        </div>

        <div className={cardClass}>
          <h2 className="mb-1 text-sm font-medium">Regimento da escola</h2>
          <p className="mb-2 text-xs text-muted-foreground">Regras e normas da instituição.</p>
          <textarea
            name="regimento"
            rows={6}
            defaultValue={settings?.regimento ?? ''}
            placeholder="Cole aqui o regimento interno..."
            className={fieldClass}
          />
        </div>

        <div className={cardClass}>
          <h2 className="mb-1 text-sm font-medium">Modelos de documento</h2>
          <p className="mb-2 text-xs text-muted-foreground">
            Modelos reutilizáveis (declaração, comunicado, autorização). Um por bloco.
          </p>
          <textarea
            name="docTemplates"
            rows={6}
            defaultValue={settings?.docTemplates ?? ''}
            placeholder={'Declaração de matrícula\n---\nAutorização de saída\n...'}
            className={fieldClass}
          />
        </div>

        <div>
          <SubmitButton type="submit">Salvar personalização</SubmitButton>
        </div>
      </form>

      <form action={updateGamificationAction} className={cardClass}>
        <h2 className="mb-1 text-sm font-medium">Gamificação</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Pontos e medalhas para os alunos. Desligue se sua escola não usa.
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
            🥉 Bronze a partir de
            <input
              name="medalBronze"
              type="number"
              min={1}
              defaultValue={settings?.medalBronze ?? 50}
              className={fieldClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            🥈 Prata a partir de
            <input
              name="medalPrata"
              type="number"
              min={1}
              defaultValue={settings?.medalPrata ?? 150}
              className={fieldClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            🥇 Ouro a partir de
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
    </>
  );
}

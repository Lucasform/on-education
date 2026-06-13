import { SubmitButton } from '@/components/submit-button';
import { getTenantSettings } from '@on-education/module-nucleo';
import { redirect } from 'next/navigation';

import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { LogoUpload } from '@/components/logo-upload';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { updateGamificationAction, updateTenantSettingsAction } from '../../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Configurações · Edu On Way' };

const CORES = [
  { nome: 'Roxo', hsl: '262 83% 58%' },
  { nome: 'Azul', hsl: '221 83% 53%' },
  { nome: 'Verde', hsl: '142 71% 45%' },
  { nome: 'Laranja', hsl: '25 95% 53%' },
  { nome: 'Rosa', hsl: '330 81% 60%' },
  { nome: 'Vermelho', hsl: '0 72% 51%' },
];

export default async function ConfiguracoesPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  if (ctx.tenantType !== 'individual') redirect('/app/escola/personalizacao');

  const settings = await getTenantSettings(db(), ctx);
  const corAtual = settings?.themeColor ?? CORES[0]!.hsl;

  return (
    <>
      <PageHeader
        title="Configurações"
        description="Identidade visual e preferências do seu perfil de professor."
      />

      <div className={cardClass}>
        <h2 className="mb-1 text-sm font-medium">Seu logo</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Aparece no topo do sistema no lugar do logo padrão do Edu On Way.
        </p>
        <LogoUpload currentUrl={settings?.logoUrl ?? null} />
      </div>

      <form action={updateTenantSettingsAction} className="flex flex-col gap-5">
        <div className={cardClass}>
          <h2 className="mb-1 text-sm font-medium">Seu nome de exibição</h2>
          <p className="mb-2 text-xs text-muted-foreground">
            Aparece no topo do sistema no lugar do nome padrão da conta.
          </p>
          <input
            name="profileName"
            maxLength={120}
            defaultValue={settings?.profileName ?? ''}
            placeholder="Prof. João Silva"
            className={fieldClass}
          />
        </div>

        <div className={cardClass}>
          <h2 className="mb-1 text-sm font-medium">Nome do agente WayOn</h2>
          <p className="mb-2 text-xs text-muted-foreground">
            Como o assistente aparece para você. Padrão: WayOn.
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
          <h2 className="mb-3 text-sm font-medium">Cor do tema</h2>
          <div className="flex flex-wrap gap-3">
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

        <div>
          <SubmitButton type="submit">Salvar configurações</SubmitButton>
        </div>
      </form>

      <form action={updateGamificationAction} className={cardClass}>
        <h2 className="mb-1 text-sm font-medium">Gamificação</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Pontos e medalhas para os alunos.
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
        <div className="mt-3">
          <SubmitButton type="submit" size="sm" variant="outline">
            Salvar gamificação
          </SubmitButton>
        </div>
      </form>
    </>
  );
}

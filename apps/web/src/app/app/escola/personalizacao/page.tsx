import { SubmitButton } from '@/components/submit-button';
import { getTenantSettings } from '@on-education/module-nucleo';
import { redirect } from 'next/navigation';

import { cardClass, fieldClass, PageHeader } from '@/components/form';
import { LogoUpload } from '@/components/logo-upload';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

import { updateTenantSettingsAction } from '../../actions';

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
  const settings = await getTenantSettings(db(), ctx);
  const corAtual = settings?.themeColor ?? CORES[0]!.hsl;

  return (
    <>
      <PageHeader
        title="Personalização da escola"
        description="Identidade visual e documentos. Aplica em todo o sistema da sua escola."
      />
      <div className={cardClass}>
        <h2 className="mb-1 text-sm font-medium">Logo da escola</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Aparece no topo do sistema, nos documentos e no mural dos pais.
        </p>
        <LogoUpload currentUrl={settings?.logoUrl ?? null} />
      </div>

      <form action={updateTenantSettingsAction} className="flex flex-col gap-5">
        <div className={cardClass}>
          <h2 className="mb-1 text-sm font-medium">Nome do seu agente</h2>
          <p className="mb-2 text-xs text-muted-foreground">
            Como o agente WayOn aparece para a sua escola. Padrão: WayOn.
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
          <label className="text-xs text-muted-foreground">Logo (URL da imagem, opcional)</label>
          <input
            name="logoUrl"
            type="url"
            defaultValue={settings?.logoUrl ?? ''}
            placeholder="https://.../logo.png"
            className={`${fieldClass} mb-4 mt-1`}
          />
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
    </>
  );
}

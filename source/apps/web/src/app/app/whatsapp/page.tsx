import { getWhatsappConnection } from '@on-education/module-nucleo';
import { redirect } from 'next/navigation';

import { ComunicacaoTabs } from '@/components/comunicacao-tabs';
import { cardClass, PageHeader } from '@/components/form';
import { WhatsappConnect } from '@/components/whatsapp-connect';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';
import { whatsappConfigured } from '@/server/whatsapp';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'WhatsApp · Edu On Way' };

export default async function WhatsappPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const conn = await getWhatsappConnection(db(), ctx).catch(() => null);
  const configured = whatsappConfigured();

  return (
    <>
      <PageHeader
        title="WhatsApp"
        description="Conecte o WhatsApp da escola para falar com os responsáveis, usando o seu próprio número."
      />
      <ComunicacaoTabs />

      <div className={cardClass}>
        <h2 className="mb-3 text-sm font-medium">Conexão</h2>
        {configured ? (
          <WhatsappConnect
            initialActive={conn?.active ?? false}
            initialPhone={conn?.phone ?? null}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            O servidor de WhatsApp ainda não está configurado. Defina <code>EVOLUTION_API_URL</code>{' '}
            e <code>EVOLUTION_API_KEY</code> no ambiente.
          </p>
        )}
      </div>

      <div className={cardClass}>
        <h2 className="mb-1 text-sm font-medium">Como funciona</h2>
        <ul className="ml-4 list-disc space-y-1 text-xs text-muted-foreground">
          <li>Clique em Conectar e escaneie o QR no app do WhatsApp (Aparelhos conectados).</li>
          <li>Conecte uma vez; mantenha o celular com internet.</li>
          <li>
            Em breve: enviar comunicados e mensagens também pelo WhatsApp dos responsáveis, e
            receber respostas aqui dentro.
          </li>
        </ul>
      </div>
    </>
  );
}

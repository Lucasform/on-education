import 'server-only';

/**
 * Cliente do servidor Evolution API (ADR 0006). Servidor único (env), instância por tenant
 * (`edu_<tenantId>`). Server-only: a `EVOLUTION_API_KEY` nunca pode ir ao browser.
 */
const EVOLUTION_URL = (process.env.EVOLUTION_API_URL ?? '').replace(/\/$/, '');
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY ?? '';

export function whatsappConfigured(): boolean {
  return Boolean(EVOLUTION_URL && EVOLUTION_KEY);
}

export function instanceNameFor(tenantId: string): string {
  return `edu_${tenantId}`;
}

export function normalizePhone(p: string): string {
  const d = p.replace(/\D/g, '');
  if (d.length === 11 || d.length === 10) return `55${d}`;
  return d;
}

async function evo(path: string, init?: RequestInit) {
  const r = await fetch(`${EVOLUTION_URL}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      apikey: EVOLUTION_KEY,
      ...(init?.headers ?? {}),
    },
  });
  const data = await r.json().catch(() => ({}) as Record<string, unknown>);
  return { ok: r.ok, status: r.status, data: data as Record<string, unknown> };
}

/** Cria a instância no Evolution se ainda não existir (idempotente). */
export async function evoEnsureInstance(inst: string): Promise<void> {
  const f = await evo(`/instance/fetchInstances?instanceName=${inst}`);
  const exists = Array.isArray(f.data) && (f.data as unknown[]).length > 0;
  if (!exists) {
    await evo('/instance/create', {
      method: 'POST',
      body: JSON.stringify({ instanceName: inst, integration: 'WHATSAPP-BAILEYS', qrcode: true }),
    });
  }
}

/** Registra o webhook (recebimento de mensagens → nossa rota). */
export async function evoSetWebhook(inst: string, url: string): Promise<void> {
  await evo(`/webhook/set/${inst}`, {
    method: 'POST',
    body: JSON.stringify({
      webhook: {
        enabled: true,
        url,
        base64: true,
        events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
      },
    }),
  });
}

export async function evoConnect(
  inst: string,
): Promise<{ qrBase64: string | null; pairingCode: string | null }> {
  const c = await evo(`/instance/connect/${inst}`);
  const d = c.data as {
    base64?: string;
    pairingCode?: string;
    qrcode?: { base64?: string; pairingCode?: string };
  };
  return {
    qrBase64: d.base64 ?? d.qrcode?.base64 ?? null,
    pairingCode: d.pairingCode ?? d.qrcode?.pairingCode ?? null,
  };
}

export async function evoState(inst: string): Promise<string> {
  const s = await evo(`/instance/connectionState/${inst}`);
  const d = s.data as { instance?: { state?: string }; state?: string };
  return d.instance?.state ?? d.state ?? 'close';
}

export async function evoLogout(inst: string): Promise<void> {
  await evo(`/instance/logout/${inst}`, { method: 'DELETE' });
}

/** Envia uma mensagem de texto. Retorna ok + se o número não tem WhatsApp. */
export async function evoSendText(
  inst: string,
  number: string,
  text: string,
): Promise<{ ok: boolean; noWhatsapp: boolean; raw: unknown }> {
  const r = await evo(`/message/sendText/${inst}`, {
    method: 'POST',
    body: JSON.stringify({ number, text }),
  });
  const noWhatsapp = /"exists"\s*:\s*false/.test(JSON.stringify(r.data));
  return { ok: r.ok, noWhatsapp, raw: r.data };
}

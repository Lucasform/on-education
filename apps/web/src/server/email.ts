import 'server-only';

/**
 * Envio de e-mail transacional via Resend (https://resend.com). Server-only: a API key NUNCA
 * chega ao cliente. No-op seguro quando não configurado (não derruba o fluxo que chamou).
 * Configurar no Vercel: RESEND_API_KEY (re_...) e RESEND_FROM (remetente verificado, ou
 * `onboarding@resend.dev` para testar).
 */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

// Domínio onwaytech.com.br já verificado no Resend (mesma conta do On Way Condomínio), então
// envia pros responsáveis de verdade. Sobrescrevível por RESEND_FROM (ex.: domínio da escola).
const FROM_FALLBACK = 'Edu On Way <noreply@onwaytech.com.br>';

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  /** Versão texto (opcional; melhora entregabilidade). */
  text?: string;
  /** Sobrescreve o remetente (senão usa RESEND_FROM ou o fallback de teste). */
  from?: string;
  /** Responder-para (ex.: e-mail da escola). */
  replyTo?: string;
}

export interface SendEmailResult {
  ok: boolean;
  id?: string;
  error?: string;
}

/** Dispara UM e-mail (um ou vários destinatários no `to`). Devolve ok/erro, nunca lança. */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: 'Resend não configurado (RESEND_API_KEY ausente).' };

  const from = input.from || process.env.RESEND_FROM || FROM_FALLBACK;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from,
        to: Array.isArray(input.to) ? input.to : [input.to],
        subject: input.subject,
        html: input.html,
        ...(input.text ? { text: input.text } : {}),
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) return { ok: false, error: data?.message || `HTTP ${res.status}` };
    return { ok: true, id: data?.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Falha ao enviar e-mail.' };
  }
}

/** Escapa texto para HTML (evita quebra/injeção no corpo). */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Embrulha um corpo em um HTML simples e limpo, com título. */
export function emailHtml(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f6f7f9;font-family:Arial,Helvetica,sans-serif;color:#1f2430">
    <div style="max-width:560px;margin:0 auto;padding:24px">
      <div style="background:#fff;border:1px solid #e6e8eb;border-radius:12px;padding:24px">
        <h1 style="margin:0 0 12px;font-size:18px">${escapeHtml(title)}</h1>
        <div style="font-size:14px;line-height:1.6">${bodyHtml}</div>
      </div>
      <p style="margin:16px 4px;color:#8a8f98;font-size:12px">Enviado pelo Edu On Way.</p>
    </div>
  </body></html>`;
}

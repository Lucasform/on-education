'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { isEmailConfigured, sendEmail } from '@/server/email';
import { createSupabaseAdmin, createSupabaseServerClient } from '@/server/supabase';

/** E-mail de acesso por link: marca Edu On Way, em PT, com botão de entrada. */
function magicEmailHtml(link: string, mode: string): string {
  const novo = mode === 'signup';
  const titulo = novo ? 'Sua conta está quase pronta 🎉' : 'Seu acesso ao Edu On Way';
  const frase = novo
    ? 'Confirme seu e-mail com um clique e seu espaço fica pronto para usar, sem senha para decorar.'
    : 'Clique no botão abaixo para entrar na sua conta. Rápido e sem senha.';
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f3f4f6;font-family:'Segoe UI',Arial,Helvetica,sans-serif;color:#1f2430">
    <div style="max-width:520px;margin:0 auto;padding:24px">
      <div style="border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;background:#ffffff">
        <div style="background:linear-gradient(135deg,#2f5bff,#6e3ce0);padding:28px">
          <div style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-.3px">Edu&nbsp;On&nbsp;<span style="color:#c7d2fe">Way</span></div>
          <div style="margin-top:6px;color:#e0e7ff;font-size:13px">Do plano de aula ao boletim, com o WayOn ao seu lado.</div>
        </div>
        <div style="padding:28px">
          <h1 style="margin:0 0 10px;font-size:20px;color:#111827">${titulo}</h1>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#4b5563">${frase}</p>
          <a href="${link}" style="display:inline-block;background:#2f5bff;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 30px;border-radius:10px">Entrar na minha conta →</a>
          <p style="margin:24px 0 0;font-size:12px;color:#9ca3af">O link expira em ~1 hora e só pode ser usado uma vez. Se você não pediu este acesso, ignore este e-mail.</p>
        </div>
      </div>
      <p style="margin:16px 4px;color:#9ca3af;font-size:12px;text-align:center">Edu On Way · plataforma para professores e escolas</p>
    </div>
  </body></html>`;
}

/**
 * Login/cadastro SEM senha (link mágico). Caminho preferido: a plataforma gera o link e envia
 * o PRÓPRIO e-mail (marca, PT), com o link apontando direto para /auth/confirm — que loga e,
 * no 1º acesso, provisiona o workspace (usando nome/espaço dos metadados). Se o Resend do app
 * não estiver configurado, cai no e-mail padrão do Supabase (não quebra).
 */
export async function magicLinkAction(formData: FormData): Promise<void> {
  const email = String(formData.get('email') ?? '').trim();
  const mode = String(formData.get('mode') ?? 'login');
  const ownerName = String(formData.get('ownerName') ?? '').trim();
  const workspaceName = String(formData.get('workspaceName') ?? '').trim();
  const back = mode === 'signup' ? '/signup' : '/login';
  if (!email) redirect(`${back}?magic=erro`);

  const origin = (await headers()).get('origin') ?? 'https://eduonway.com';

  if (isEmailConfigured()) {
    const admin = createSupabaseAdmin();
    if (mode === 'signup') {
      await admin.auth.admin
        .createUser({
          email,
          email_confirm: true,
          user_metadata: {
            full_name: ownerName || undefined,
            workspace_name: workspaceName || undefined,
          },
        })
        .catch(() => {});
    }
    let gen = await admin.auth.admin.generateLink({ type: 'magiclink', email });
    if (!gen.data?.properties?.hashed_token) {
      // E-mail ainda sem conta (login de quem nunca entrou): cria e tenta de novo.
      await admin.auth.admin.createUser({ email, email_confirm: true }).catch(() => {});
      gen = await admin.auth.admin.generateLink({ type: 'magiclink', email });
    }
    const tokenHash = gen.data?.properties?.hashed_token;
    if (tokenHash) {
      const link = `${origin}/auth/confirm?token_hash=${tokenHash}&type=magiclink&next=/app`;
      const r = await sendEmail({
        to: email,
        // Força o remetente do domínio verificado (independe de RESEND_FROM estar certo no ambiente).
        from: 'Edu On Way <nao-responda@onwaytech.com.br>',
        subject: mode === 'signup' ? 'Confirme sua conta · Edu On Way' : 'Seu link de acesso · Edu On Way',
        html: magicEmailHtml(link, mode),
      });
      if (r.ok) redirect(`${back}?magic=enviado&em=${encodeURIComponent(email)}`);
    }
    redirect(`${back}?magic=erro`);
  }

  // Fallback: e-mail padrão do Supabase.
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: mode === 'signup',
      emailRedirectTo: `${origin}/auth/confirm?next=/app`,
      data:
        mode === 'signup'
          ? { full_name: ownerName || undefined, workspace_name: workspaceName || undefined }
          : undefined,
    },
  });
  if (error) redirect(`${back}?magic=erro`);
  redirect(`${back}?magic=enviado&em=${encodeURIComponent(email)}`);
}

export async function loginAction(formData: FormData): Promise<void> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  // Em erro, volta para a tela de origem. Só aceitamos páginas de login de marca (/c/<slug>)
  // para evitar open-redirect; qualquer outra coisa cai no /login padrão.
  const returnTo = String(formData.get('returnTo') ?? '');
  const back = /^\/c\/[a-z0-9-]+$/.test(returnTo) ? returnTo : '/login';

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  // Erro de credencial NÃO deve "throw" (em prod isso vira a tela genérica de server error
  // com digest). Volta à tela de origem com uma mensagem amigável via querystring.
  if (error) redirect(`${back}?erro=credenciais`);

  // O destino real (/app ou /admin) é decidido em /app conforme o vínculo do usuário.
  redirect('/app');
}

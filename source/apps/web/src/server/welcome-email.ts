/**
 * E-mail de boas-vindas enviado no 1º acesso (quando o workspace é provisionado). Remetente do
 * domínio verificado no Resend (nao-responda@onwaytech.com.br). Copy humana, sem travessão no meio
 * de frase. O nome é o primeiro nome do dono da conta.
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function welcomeEmailHtml(nome: string): string {
  const primeiro = escapeHtml((nome || 'tudo bem').split(' ')[0] || 'tudo bem');
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light dark" />
    <title>Bem-vindo ao Edu On Way</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f3f2f8;-webkit-font-smoothing:antialiased;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#f3f2f8;font-size:1px;line-height:1px;">
      Sua conta está pronta. Mais tempo pra ensinar, menos tempo na papelada.
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f2f8;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;">
            <tr>
              <td style="padding:8px 8px 24px 8px;">
                <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="vertical-align:middle;">
                  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                    <td style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#7c3aed,#6d28d9);text-align:center;vertical-align:middle;color:#ffffff;font-size:20px;font-weight:700;">O</td>
                    <td style="padding-left:12px;vertical-align:middle;font-size:18px;font-weight:700;color:#1f1147;letter-spacing:-0.2px;">Edu On Way</td>
                  </tr></table>
                </td></tr></table>
              </td>
            </tr>
            <tr>
              <td style="background-color:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 1px 3px rgba(31,17,71,0.08);">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                  <td style="background:linear-gradient(135deg,#7c3aed 0%,#6d28d9 55%,#5b21b6 100%);padding:40px 40px 36px 40px;">
                    <div style="display:inline-block;background-color:rgba(255,255,255,0.18);color:#ffffff;font-size:12px;font-weight:600;padding:6px 12px;border-radius:999px;letter-spacing:0.3px;">SUA CONTA ESTÁ PRONTA</div>
                    <h1 style="margin:18px 0 0 0;color:#ffffff;font-size:26px;line-height:1.25;font-weight:700;letter-spacing:-0.4px;">Que bom ter você aqui, ${primeiro}.</h1>
                  </td>
                </tr></table>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                  <td style="padding:32px 40px 8px 40px;">
                    <p style="margin:0 0 16px 0;color:#3f3a52;font-size:16px;line-height:1.6;">
                      O Edu On Way junta num lugar só o que costuma tomar seu tempo: preparar material, lançar notas e frequência, e manter as famílias por dentro. A ideia é simples, sobrar mais tempo pra você fazer o que importa, que é ensinar.
                    </p>
                    <p style="margin:0 0 8px 0;color:#1f1147;font-size:15px;line-height:1.6;font-weight:700;">Por onde começar</p>
                  </td>
                </tr></table>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                  <td style="padding:6px 40px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;"><tr>
                      <td style="width:44px;vertical-align:top;"><div style="width:36px;height:36px;border-radius:10px;background-color:#f1ecfe;text-align:center;line-height:36px;font-size:18px;">✨</div></td>
                      <td style="vertical-align:top;padding-left:6px;">
                        <p style="margin:0;color:#1f1147;font-size:15px;font-weight:700;">Crie uma atividade com IA</p>
                        <p style="margin:2px 0 0 0;color:#6b6680;font-size:14px;line-height:1.55;">Diga o tema e o ano. Em segundos você tem uma atividade alinhada à BNCC, bonita e pronta pra imprimir.</p>
                      </td>
                    </tr></table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;"><tr>
                      <td style="width:44px;vertical-align:top;"><div style="width:36px;height:36px;border-radius:10px;background-color:#f1ecfe;text-align:center;line-height:36px;font-size:18px;">📋</div></td>
                      <td style="vertical-align:top;padding-left:6px;">
                        <p style="margin:0;color:#1f1147;font-size:15px;font-weight:700;">Monte suas turmas</p>
                        <p style="margin:2px 0 0 0;color:#6b6680;font-size:14px;line-height:1.55;">Cadastre alunos, faça a chamada e lance notas sem precisar de planilha.</p>
                      </td>
                    </tr></table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:4px;"><tr>
                      <td style="width:44px;vertical-align:top;"><div style="width:36px;height:36px;border-radius:10px;background-color:#f1ecfe;text-align:center;line-height:36px;font-size:18px;">💬</div></td>
                      <td style="vertical-align:top;padding-left:6px;">
                        <p style="margin:0;color:#1f1147;font-size:15px;font-weight:700;">Fale com as famílias</p>
                        <p style="margin:2px 0 0 0;color:#6b6680;font-size:14px;line-height:1.55;">Comunicados e mensagens direto pelo app, no seu tempo e do seu jeito.</p>
                      </td>
                    </tr></table>
                  </td>
                </tr></table>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                  <td style="padding:28px 40px 8px 40px;">
                    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                      <td style="border-radius:12px;background:linear-gradient(135deg,#7c3aed,#6d28d9);">
                        <a href="https://eduonway.com/app" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:12px;">Acessar minha conta</a>
                      </td>
                    </tr></table>
                  </td>
                </tr></table>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                  <td style="padding:24px 40px 36px 40px;">
                    <p style="margin:0;color:#3f3a52;font-size:15px;line-height:1.6;">Se travar em algo, a gente está por aqui pra ajudar. Bom começo!</p>
                    <p style="margin:14px 0 0 0;color:#1f1147;font-size:15px;font-weight:700;">Equipe Edu On Way</p>
                  </td>
                </tr></table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 16px;text-align:center;">
                <p style="margin:0 0 6px 0;color:#9b96ad;font-size:12px;line-height:1.5;">Você recebeu este e-mail porque criou uma conta no Edu On Way.</p>
                <p style="margin:0;color:#9b96ad;font-size:12px;line-height:1.5;"><a href="https://eduonway.com" style="color:#7c3aed;text-decoration:none;">eduonway.com</a></p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

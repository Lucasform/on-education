import { Button } from '@on-education/ui';

import { AuthShell } from '@/components/auth-shell';
import { Field, fieldClass } from '@/components/form';

import { magicLinkAction } from '@/app/login/actions';

import { signupAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Criar conta · Edu On Way' };

const ERROS: Record<string, string> = {
  existe: 'Este e-mail já tem conta. Faça login ou use outro e-mail.',
  senha: 'A senha precisa ter ao menos 8 caracteres.',
  config: 'Não foi possível criar o acesso (configuração do servidor). Já estamos verificando.',
  falha: 'Não foi possível criar a conta agora. Tente novamente em instantes.',
  link: 'Link inválido. Use só letras minúsculas, números e hífen (3 a 40 caracteres).',
  linkuso: 'Esse link já está em uso. Escolha outro.',
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; magic?: string }>;
}) {
  const { erro, magic } = await searchParams;
  return (
    <AuthShell
      title="Criar sua conta de professor"
      subtitle="Sua área de trabalho pessoal, organizada e descomplicada, com muitos recursos para deixar sua aula ainda melhor."
      footer={
        <>
          É uma escola?{' '}
          <a
            href="/signup/escola"
            className="rounded-sm font-medium text-foreground underline underline-offset-4 outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          >
            Cadastrar escola
          </a>{' '}
          · Já tem conta?{' '}
          <a
            href="/login"
            className="rounded-sm font-medium text-foreground underline underline-offset-4 outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          >
            Entrar
          </a>
        </>
      }
    >
      {erro && (
        <p className="mb-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-center text-sm text-danger">
          {ERROS[erro] ?? ERROS.falha}
        </p>
      )}
      {magic === 'enviado' && (
        <p className="mb-3 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-center text-sm text-success">
          Link enviado! Confira seu e-mail e clique para criar sua conta.
        </p>
      )}
      {magic === 'erro' && (
        <p className="mb-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-center text-sm text-danger">
          Não foi possível enviar o link. Confira o e-mail e tente de novo.
        </p>
      )}
      <form action={signupAction} className="flex flex-col gap-4">
        <Field label="Seu nome">
          <input name="ownerName" required minLength={2} className={fieldClass} />
        </Field>
        <Field label="E-mail">
          <input name="ownerEmail" type="email" required className={fieldClass} />
        </Field>
        <Field label="Senha" hint="(mín. 8 caracteres)">
          <input name="password" type="password" required minLength={8} className={fieldClass} />
        </Field>
        <Field label="Nome do seu espaço" hint="(você, sua empresa ou projeto)">
          <input
            name="workspaceName"
            required
            minLength={2}
            placeholder="Ex.: Profª Ana · Reforço de Matemática"
            className={fieldClass}
          />
        </Field>
        <Field label="Seu link público" hint="(opcional)">
          <div className="flex items-center gap-1">
            <span className="shrink-0 text-sm text-muted-foreground">eduonway.com/c/</span>
            <input name="slug" maxLength={40} placeholder="prof-ana" className={fieldClass} />
          </div>
        </Field>
        <Button type="submit" className="mt-2 w-full">
          Criar conta
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        ou
        <span className="h-px flex-1 bg-border" />
      </div>

      <form action={magicLinkAction} className="flex flex-col gap-3">
        <input type="hidden" name="mode" value="signup" />
        <p className="text-sm font-medium">Criar com seu e-mail</p>
        <p className="-mt-1 text-xs text-muted-foreground">
          Enviamos um link de acesso. Você entra com um clique, sem decorar senha.
        </p>
        <input name="ownerName" required minLength={2} placeholder="Seu nome" className={fieldClass} />
        <input
          name="workspaceName"
          required
          minLength={2}
          placeholder="Nome do seu espaço"
          className={fieldClass}
        />
        <input name="email" type="email" required placeholder="seu@email.com" className={fieldClass} />
        <Button type="submit" variant="outline" className="w-full">
          Criar com link mágico
        </Button>
      </form>
    </AuthShell>
  );
}

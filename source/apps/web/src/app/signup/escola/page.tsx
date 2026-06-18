import { Button } from '@on-education/ui';

import { AuthShell } from '@/components/auth-shell';
import { Field, fieldClass } from '@/components/form';

import { signupSchoolAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Criar escola · Edu On Way' };

const ERROS: Record<string, string> = {
  existe: 'Este e-mail já tem conta. Faça login ou use outro e-mail.',
  senha: 'A senha precisa ter ao menos 8 caracteres.',
  config: 'Não foi possível criar o acesso (configuração do servidor). Já estamos verificando.',
  falha: 'Não foi possível criar a escola agora. Tente novamente em instantes.',
  link: 'Link inválido. Use só letras minúsculas, números e hífen (3 a 40 caracteres).',
  linkuso: 'Esse link já está em uso. Escolha outro.',
};

export default async function SchoolSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  return (
    <AuthShell
      title="Cadastrar sua escola"
      subtitle="Cria a instituição, a unidade Sede e sua conta de diretor(a)."
      footer={
        <>
          Já tem conta?{' '}
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
      <form action={signupSchoolAction} className="flex flex-col gap-4">
        <Field label="Nome da escola">
          <input name="schoolName" required minLength={2} className={fieldClass} />
        </Field>
        <Field label="Seu nome">
          <input name="ownerName" required minLength={2} className={fieldClass} />
        </Field>
        <Field label="E-mail">
          <input name="ownerEmail" type="email" required className={fieldClass} />
        </Field>
        <Field label="Senha" hint="(mín. 8 caracteres)">
          <input name="password" type="password" required minLength={8} className={fieldClass} />
        </Field>
        <Field label="Link público da escola" hint="(opcional)">
          <div className="flex items-center gap-1">
            <span className="shrink-0 text-sm text-muted-foreground">eduonway.com/c/</span>
            <input name="slug" maxLength={40} placeholder="minha-escola" className={fieldClass} />
          </div>
        </Field>
        <Button type="submit" className="mt-2 w-full">
          Criar escola
        </Button>
      </form>
    </AuthShell>
  );
}

import { Button } from '@on-education/ui';

import { signupAction } from './actions';

export const metadata = { title: 'Criar conta — On Education' };

export default function SignupPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold">Criar sua conta de professor</h1>
        <p className="text-sm opacity-70">
          Workspace pessoal gratuito (plano teacher_free). Valor já no primeiro uso.
        </p>
      </div>

      <form action={signupAction} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Seu nome
          <input name="ownerName" required minLength={2} className="rounded-md border px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          E-mail
          <input name="ownerEmail" type="email" required className="rounded-md border px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Nome do workspace <span className="opacity-60">(opcional)</span>
          <input name="workspaceName" className="rounded-md border px-3 py-2" />
        </label>
        <Button type="submit">Criar conta</Button>
      </form>
    </main>
  );
}

import { Button } from '@on-education/ui';

import { loginAction } from './actions';

export const metadata = { title: 'Entrar — On Education' };

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-8">
      <h1 className="text-2xl font-semibold">Entrar</h1>

      <form action={loginAction} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          E-mail
          <input name="email" type="email" required className="rounded-md border px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Senha
          <input name="password" type="password" required className="rounded-md border px-3 py-2" />
        </label>
        <Button type="submit">Entrar</Button>
      </form>

      <p className="text-center text-sm opacity-70">
        Não tem conta?{' '}
        <a href="/signup" className="underline">
          Criar conta
        </a>
      </p>
    </main>
  );
}

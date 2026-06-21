import Link from 'next/link';

/** Aviso de consentimento exibido nos cadastros (sobre o gradiente das telas de entrada). */
export function ConsentNote() {
  return (
    <p className="mt-1 text-center text-[11px] leading-snug text-white/55">
      Ao criar conta, você concorda com os{' '}
      <Link href="/termos" className="underline underline-offset-2 hover:text-white">
        Termos de Uso
      </Link>{' '}
      e a{' '}
      <Link href="/privacidade" className="underline underline-offset-2 hover:text-white">
        Política de Privacidade
      </Link>
      .
    </p>
  );
}

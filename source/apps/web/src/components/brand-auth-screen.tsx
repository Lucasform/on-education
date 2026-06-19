import Link from 'next/link';
import type { ReactNode } from 'react';

import { LogoMark } from '@/components/logo-mark';

/** Classes padrão dos campos/botões das telas de entrada (sobre o gradiente). */
export const authInput =
  'w-full rounded-xl border border-white/15 bg-white/95 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm outline-none focus:ring-2 focus:ring-white/70';
export const authPrimaryBtn =
  'w-full rounded-xl bg-white px-4 py-3 text-sm font-bold text-[#2f5bff] shadow-md transition-opacity hover:opacity-95';
export const authGhostBtn =
  'block w-full rounded-xl border border-white/40 px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-white/10';

/**
 * Tela de entrada da marca (mobile-first), no estilo do app: fundo em gradiente, card do logo,
 * título e mote. Usada por login e pela entrada por e-mail, pra manter o MESMO padrão.
 */
export function BrandAuthScreen({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#1b2a7a] via-[#3f3ad0] to-[#6e3ce0] px-6 py-12 text-white">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Link
            href="/"
            className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white shadow-xl outline-none transition-opacity hover:opacity-90"
          >
            <LogoMark size={52} />
          </Link>
          <h1 className="mt-5 text-2xl font-extrabold tracking-tight">{title}</h1>
          {subtitle && (
            <p className="mt-1.5 max-w-[16rem] text-sm leading-snug text-white/70">{subtitle}</p>
          )}
        </div>

        {children}

        {footer && (
          <div className="mt-8 border-t border-white/15 pt-5 text-center text-sm text-white/75">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

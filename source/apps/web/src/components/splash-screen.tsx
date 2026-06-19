'use client';

import { useEffect, useState } from 'react';

import { AnimatedLogo } from './animated-logo';

// Pontinhos decorativos (faint), posições fixas pra dar o ar de "constelação".
const DOTS = [
  { top: '12%', left: '16%', s: 5, o: 0.5 },
  { top: '20%', left: '82%', s: 4, o: 0.4 },
  { top: '70%', left: '12%', s: 4, o: 0.35 },
  { top: '82%', left: '24%', s: 6, o: 0.45 },
  { top: '66%', left: '88%', s: 3, o: 0.4 },
  { top: '38%', left: '90%', s: 3, o: 0.3 },
];

/**
 * Tela de início (splash) da marca Edu On Way: fundo navy, a marca girando, nome e mote.
 * Aparece na entrada (web e mobile) e some suave. Mostra UMA vez por sessão.
 */
export function SplashScreen() {
  const [fading, setFading] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem('eow_splash') === '1';
    } catch {
      seen = false;
    }
    if (seen) {
      setGone(true);
      return;
    }
    const t1 = setTimeout(() => setFading(true), 2000);
    const t2 = setTimeout(() => {
      setGone(true);
      try {
        sessionStorage.setItem('eow_splash', '1');
      } catch {
        // ignora
      }
    }, 2750);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (gone) return null;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#1b1e46] via-[#15183a] to-[#13152e] transition-opacity duration-700 ${
        fading ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      {DOTS.map((d, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white"
          style={{ top: d.top, left: d.left, width: d.s, height: d.s, opacity: d.o }}
        />
      ))}
      <div className="pointer-events-none absolute h-80 w-80 rounded-full bg-[#4f46e5]/30 blur-3xl" />

      <div className="relative">
        <AnimatedLogo size={150} />
      </div>

      <div className="relative mt-10 text-center">
        <div className="text-4xl font-extrabold tracking-tight text-white">
          Edu <span className="text-[#ff9a2e]">On Way</span>
        </div>
        <p className="mt-3 text-sm font-medium text-white/55">Todo aprendizado tem um caminho.</p>
      </div>
    </div>
  );
}

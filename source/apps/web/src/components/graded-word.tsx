'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Elemento-assinatura da landing: uma palavra "grifada" por um traço de marca-texto desenhado
 * à mão (SVG) que se desenha quando entra na tela, como a correção de um professor. Concentra
 * a ousadia do design num lugar só. Cor pela variável --mark (âmbar da marca).
 */
export function GradedWord({
  children,
  variant = 'underline',
  className = '',
}: {
  children: React.ReactNode;
  /** underline = traço por baixo; circle = círculo de correção ao redor. */
  variant?: 'underline' | 'circle';
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setOn(true);
          io.disconnect();
        }
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const draw = {
    strokeDasharray: 1,
    strokeDashoffset: on ? 0 : 1,
    transition: 'stroke-dashoffset 0.75s cubic-bezier(0.22, 1, 0.36, 1) 0.15s',
  } as const;

  return (
    <span ref={ref} className={`relative inline-block whitespace-nowrap ${className}`}>
      <span className="relative z-10">{children}</span>
      {variant === 'underline' ? (
        <svg
          className="absolute -bottom-[0.12em] left-[-2%] h-[0.42em] w-[104%] overflow-visible"
          viewBox="0 0 200 16"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            d="M4 10 C 46 3, 150 2, 196 7"
            fill="none"
            stroke="var(--mark)"
            strokeWidth="5"
            strokeLinecap="round"
            pathLength={1}
            style={draw}
          />
        </svg>
      ) : (
        <svg
          className="absolute -inset-x-[6%] -inset-y-[28%] h-[1.56em] w-[112%] overflow-visible"
          viewBox="0 0 220 80"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            d="M150 8 C 60 0, 6 18, 12 42 C 16 70, 130 80, 196 64 C 232 54, 214 16, 120 12"
            fill="none"
            stroke="var(--mark)"
            strokeWidth="3"
            strokeLinecap="round"
            pathLength={1}
            style={draw}
          />
        </svg>
      )}
    </span>
  );
}

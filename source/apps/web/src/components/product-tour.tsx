'use client';

import { useCallback, useEffect, useState } from 'react';

export interface TourStep {
  /** Seletor CSS do elemento-alvo (ex.: '[data-tour="nav-/app/turmas"]'). */
  selector: string;
  title: string;
  body: string;
}

/**
 * Tour guiado: na 1ª visita, pergunta (popup central) se a pessoa quer ver o tour. Se sim,
 * percorre os passos EM SEQUÊNCIA, iluminando cada alvo. "Não" / "Não preciso" não mostra de novo.
 */
export function ProductTour({
  id,
  steps,
  intro,
}: {
  id: string;
  steps: TourStep[];
  intro?: { title: string; body: string };
}) {
  const [active, setActive] = useState(false);
  const [started, setStarted] = useState(false);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (localStorage.getItem('tour:disabled') === '1') return;
    if (localStorage.getItem(`tour:${id}`) === '1') return;
    const t = setTimeout(() => {
      setActive(true);
      if (!intro) setStarted(true); // sem popup → começa direto
    }, 600);
    return () => clearTimeout(t);
  }, [id, intro]);

  const place = useCallback(() => {
    const el = document.querySelector(steps[i]?.selector ?? '');
    const r = el?.getBoundingClientRect();
    setRect(r && r.width > 0 && r.height > 0 ? r : null);
  }, [i, steps]);

  useEffect(() => {
    if (!active || !started) return;
    document.querySelector(steps[i]?.selector ?? '')?.scrollIntoView({
      block: 'center',
      behavior: 'smooth',
    });
    const t = setTimeout(place, 350);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [active, started, i, place, steps]);

  if (!active || steps.length === 0) return null;

  const markSeen = () => localStorage.setItem(`tour:${id}`, '1');
  const finish = () => {
    markSeen();
    setActive(false);
  };
  const disableAll = () => {
    localStorage.setItem('tour:disabled', '1');
    setActive(false);
  };

  // Popup central: pergunta se quer começar.
  if (!started) {
    return (
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-4">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-2xl">
          <p className="text-base font-semibold">{intro?.title ?? 'Tour rápido'}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {intro?.body ?? 'Quer um tour pelas principais funcionalidades?'}
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <button
              type="button"
              onClick={finish}
              className="rounded-full border border-border px-4 py-2 text-sm hover:bg-accent"
            >
              Agora não
            </button>
            <button
              type="button"
              onClick={() => setStarted(true)}
              className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Sim, começar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const step = steps[i]!;
  const cardStyle: React.CSSProperties = rect
    ? {
        top: Math.min(rect.bottom + 12, window.innerHeight - 190),
        left: Math.min(Math.max(12, rect.left), Math.max(12, window.innerWidth - 332)),
      }
    : { top: window.innerHeight / 2 - 90, left: Math.max(12, window.innerWidth / 2 - 160) };

  return (
    <div className="fixed inset-0 z-[120]">
      {rect ? (
        <div
          className="pointer-events-none fixed rounded-lg ring-2 ring-primary transition-all"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-black/55" />
      )}

      <div
        className="fixed w-80 max-w-[calc(100vw-24px)] rounded-xl border border-border bg-card p-4 shadow-2xl"
        style={cardStyle}
      >
        <p className="text-sm font-semibold">{step.title}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.body}</p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={disableAll}
            className="text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            Não preciso
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">
              {i + 1}/{steps.length}
            </span>
            {i > 0 && (
              <button
                type="button"
                onClick={() => setI(i - 1)}
                className="rounded-md border border-border px-2 py-1 text-xs hover:bg-accent"
              >
                Voltar
              </button>
            )}
            {i < steps.length - 1 ? (
              <button
                type="button"
                onClick={() => setI(i + 1)}
                className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:opacity-90"
              >
                Próximo
              </button>
            ) : (
              <button
                type="button"
                onClick={finish}
                className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:opacity-90"
              >
                Concluir
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

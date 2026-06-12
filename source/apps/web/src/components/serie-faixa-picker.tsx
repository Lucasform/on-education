'use client';

import { useState } from 'react';

import { fieldClass } from '@/components/form';
import { FAIXAS, faixaForSerie, SERIES } from '@/lib/series';

/**
 * Seletor de Série + Faixa etária. Ao escolher a série, a faixa é preenchida automaticamente
 * (mas continua editável). Emite os campos `gradeLevel` e `ageBand` no form.
 */
export function SerieFaixaPicker({
  defaultSerie = '',
  defaultFaixa = '',
}: {
  defaultSerie?: string;
  defaultFaixa?: string;
}) {
  const [serie, setSerie] = useState(defaultSerie);
  const [faixa, setFaixa] = useState(defaultFaixa);

  return (
    <div className="flex flex-wrap gap-2">
      <select
        name="gradeLevel"
        value={serie}
        onChange={(e) => {
          setSerie(e.target.value);
          const f = faixaForSerie(e.target.value);
          if (f) setFaixa(f);
        }}
        className={`${fieldClass} sm:w-48`}
      >
        <option value="">Série/ano</option>
        {SERIES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.value}
          </option>
        ))}
      </select>
      <select
        name="ageBand"
        value={faixa}
        onChange={(e) => setFaixa(e.target.value)}
        className={`${fieldClass} sm:w-40`}
      >
        <option value="">Faixa etária</option>
        {FAIXAS.map((f) => (
          <option key={f} value={f}>
            {f} anos
          </option>
        ))}
      </select>
    </div>
  );
}

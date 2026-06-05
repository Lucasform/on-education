/** Faixas etárias fixas (definidas pelo Lucas) usadas na classificação de atividades. */
export const FAIXAS = [
  '1 a 3',
  '3 a 6',
  '6 a 8',
  '8 a 10',
  '11 a 13',
  '13 a 15',
  '15 a 18',
  'acima',
] as const;

/** Séries/etapas e a faixa etária correspondente (auto-preenchida ao escolher a série). */
export const SERIES: { value: string; faixa: string }[] = [
  { value: 'Berçário/Creche', faixa: '1 a 3' },
  { value: 'Maternal', faixa: '3 a 6' },
  { value: 'Pré-escola', faixa: '3 a 6' },
  { value: '1º ano (Fundamental)', faixa: '6 a 8' },
  { value: '2º ano', faixa: '6 a 8' },
  { value: '3º ano', faixa: '8 a 10' },
  { value: '4º ano', faixa: '8 a 10' },
  { value: '5º ano', faixa: '8 a 10' },
  { value: '6º ano', faixa: '11 a 13' },
  { value: '7º ano', faixa: '11 a 13' },
  { value: '8º ano', faixa: '13 a 15' },
  { value: '9º ano', faixa: '13 a 15' },
  { value: '1ª série (Médio)', faixa: '15 a 18' },
  { value: '2ª série (Médio)', faixa: '15 a 18' },
  { value: '3ª série (Médio)', faixa: '15 a 18' },
  { value: 'EJA / Adultos', faixa: 'acima' },
];

/** Faixa etária correspondente a uma série, ou '' se não mapeada. */
export function faixaForSerie(serie: string): string {
  return SERIES.find((s) => s.value === serie)?.faixa ?? '';
}

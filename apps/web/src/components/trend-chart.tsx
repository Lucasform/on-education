/**
 * Mini gráfico de linha (sparkline) em SVG puro, sem dependência. Mostra uma série de pontos
 * (valor por período) com rótulos no eixo X. Pontos nulos viram buracos (sem linha). Server-safe.
 */
export interface TrendPoint {
  label: string;
  value: number | null;
}

export function TrendChart({
  points,
  max,
  suffix = '',
  tone = 'stroke-primary',
}: {
  points: TrendPoint[];
  /** Valor máximo do eixo Y (ex.: 10 para nota, 100 para %). */
  max: number;
  suffix?: string;
  tone?: string;
}) {
  const w = 320;
  const h = 90;
  const padX = 8;
  const padY = 10;
  const n = points.length;
  const stepX = n > 1 ? (w - padX * 2) / (n - 1) : 0;
  const y = (v: number) => h - padY - (Math.max(0, Math.min(max, v)) / max) * (h - padY * 2);
  const x = (i: number) => padX + i * stepX;

  // Segmentos contínuos só entre pontos com valor (pula nulos).
  const segs: string[] = [];
  let cur: string[] = [];
  points.forEach((p, i) => {
    if (p.value === null) {
      if (cur.length) segs.push(cur.join(' '));
      cur = [];
    } else {
      cur.push(`${x(i).toFixed(1)},${y(p.value).toFixed(1)}`);
    }
  });
  if (cur.length) segs.push(cur.join(' '));

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-24 w-full min-w-[280px]" role="img">
        {/* linha de base */}
        <line
          x1={padX}
          y1={h - padY}
          x2={w - padX}
          y2={h - padY}
          className="stroke-border"
          strokeWidth="1"
        />
        {segs.map((pts, i) => (
          <polyline
            key={i}
            points={pts}
            fill="none"
            className={tone}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {points.map((p, i) =>
          p.value === null ? null : (
            <circle key={i} cx={x(i)} cy={y(p.value)} r="2.5" className="fill-primary" />
          ),
        )}
      </svg>
      <div className="flex justify-between px-1 text-[10px] text-muted-foreground">
        {points.map((p, i) => (
          <span key={i} className="flex-1 text-center">
            {p.label}
            {p.value !== null && (
              <span className="block font-medium text-foreground">
                {p.value}
                {suffix}
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

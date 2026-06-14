import { ImageResponse } from 'next/og';

/**
 * Marca "ON" (com adereços: arco de formatura + ponto de destaque), desenhada em VETOR
 * (sem fonte) para o mesmo logo aparecer em todo lugar: favicon da aba, ícone do iOS
 * (apple-icon) e ícones de instalação PWA (Android/desktop). Como o "ON" é vetorial, o
 * ImageResponse (resvg) rasteriza sem depender de fonte do sistema — build determinístico.
 */
const MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#8b5cf6"/><stop offset="1" stop-color="#d946ef"/>
  </linearGradient></defs>
  <rect width="64" height="64" rx="14" fill="url(#g)"/>
  <path d="M16 23 C18 13 26 10 32 10 C38 10 46 13 48 23" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="2.4" stroke-linecap="round"/>
  <circle cx="53" cy="12" r="3" fill="rgba(255,255,255,0.85)"/>
  <circle cx="23" cy="34" r="9.5" fill="none" stroke="#ffffff" stroke-width="5"/>
  <path d="M37 43 V24 L51 43 V24" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const DATA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(MARK_SVG)}`;

/**
 * Gera o PNG do ícone no tamanho pedido. `maskable` reserva a zona de segurança (Android
 * mascara o ícone): a marca fica em ~70% centralizada sobre o gradiente em sangria total,
 * garantindo que o "ON" nunca seja cortado pela máscara circular/squircle.
 */
export function iconResponse(size: number, opts?: { maskable?: boolean }): ImageResponse {
  const inner = opts?.maskable ? Math.round(size * 0.7) : size;
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
          background: opts?.maskable ? 'linear-gradient(135deg,#8b5cf6,#d946ef)' : 'transparent',
        }}
      >
        <img src={DATA_URI} width={inner} height={inner} alt="On Education" />
      </div>
    ),
    { width: size, height: size },
  );
}

/**
 * Marca animada Edu On Way: anel (órbita) girando com um ponto que orbita, e a estrela âmbar
 * fixa no centro. Só CSS (sem JS) — anima via utilitário arbitrário do Tailwind.
 */
export function AnimatedLogo({ size = 128 }: { size?: number }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* brilho atrás */}
      <div className="absolute inset-0 rounded-full bg-[#4f46e5]/40 blur-2xl" />
      <svg
        viewBox="0 0 120 120"
        width={size}
        height={size}
        className="relative"
        aria-label="Edu On Way"
      >
        {/* anel + ponto que orbitam (giro lento) */}
        <g
          className="animate-[spin_16s_linear_infinite]"
          style={{ transformOrigin: '60px 60px' }}
        >
          <ellipse cx="60" cy="60" rx="46" ry="27" fill="none" stroke="#ffffff" strokeWidth="5" />
          <circle cx="106" cy="60" r="6.5" fill="#ffffff" />
        </g>
        {/* estrela âmbar fixa no centro */}
        <path
          d="M60 30 C61 47 63 49 80 50 C63 51 61 53 60 70 C59 53 57 51 40 50 C57 49 59 47 60 30 Z"
          fill="#ff9a2e"
        />
      </svg>
    </div>
  );
}

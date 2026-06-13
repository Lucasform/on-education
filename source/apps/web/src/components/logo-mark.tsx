export function LogoMark({ size = 28 }: { size?: number }) {
  const r = size / 28;

  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: Math.round(7 * r),
        background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.62))',
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Graduation arc — subtle decoration behind text */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 28 28"
        fill="none"
        style={{ position: 'absolute', inset: 0 }}
      >
        {/* Open-book / mortarboard arc */}
        <path
          d="M8 13.5 C8.5 8.5 11 6.5 14 6.5 C17 6.5 19.5 8.5 20 13.5"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="1.4"
          strokeLinecap="round"
          fill="none"
        />
        {/* Small accent dot — top-right corner */}
        <circle cx="21.5" cy="6.5" r="1.3" fill="rgba(255,255,255,0.28)" />
      </svg>

      {/* ON lettering */}
      <span
        style={{
          position: 'relative',
          zIndex: 1,
          color: 'white',
          fontSize: Math.round(10.5 * r),
          fontWeight: 800,
          letterSpacing: '-0.04em',
          lineHeight: 1,
          userSelect: 'none',
          marginTop: Math.round(1.5 * r),
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
        }}
      >
        ON
      </span>
    </span>
  );
}

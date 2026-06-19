/** Marca oficial Edu On Way (ícone colorido). Quadrado, cantos arredondados. */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <img
      src="/brand/logo-mark.png"
      alt="Edu On Way"
      width={size}
      height={size}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size / 4.5),
        flexShrink: 0,
        objectFit: 'cover',
        display: 'inline-block',
      }}
    />
  );
}

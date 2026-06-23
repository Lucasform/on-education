'use client';

import { ImageIcon } from 'lucide-react';
import { useState } from 'react';

/**
 * Moldura de foto da landing. Renderiza a imagem de `src` (ex.: /landing/hero.jpg); se o arquivo
 * não existir ou falhar, cai num placeholder com gradiente da marca (sem ícone de "imagem
 * quebrada"). Assim dá pra publicar antes das fotos reais: é só dropar os arquivos em
 * `apps/web/public/landing/` que aparecem sozinhos.
 */
export function LandingPhoto({
  src,
  alt,
  className,
  label,
}: {
  src: string;
  alt: string;
  className?: string;
  label?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-primary/20 via-primary/8 to-transparent ${className ?? ''}`}
        aria-label={alt}
      >
        <ImageIcon className="h-8 w-8 text-primary/60" />
        {label && <span className="px-6 text-center text-xs text-muted-foreground">{label}</span>}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`h-full w-full object-cover ${className ?? ''}`}
    />
  );
}

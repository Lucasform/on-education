import { iconResponse } from '@/lib/brand-icon';

// Ícone de instalação no iOS (apple-touch-icon). 180x180 é o tamanho recomendado.
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return iconResponse(180);
}

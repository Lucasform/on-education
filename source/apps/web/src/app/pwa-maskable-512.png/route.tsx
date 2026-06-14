import { iconResponse } from '@/lib/brand-icon';

// Ícone PWA maskable 512x512: zona de segurança para a máscara do Android não cortar o "ON".
export function GET() {
  return iconResponse(512, { maskable: true });
}

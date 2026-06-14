import { iconResponse } from '@/lib/brand-icon';

// Ícone PWA 192x192 (instalação Android/desktop). Referenciado no manifest.
export function GET() {
  return iconResponse(192);
}

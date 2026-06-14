import { iconResponse } from '@/lib/brand-icon';

// Ícone PWA 512x512 (splash/instalação). Referenciado no manifest.
export function GET() {
  return iconResponse(512);
}

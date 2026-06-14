import { iconResponse, logoIconResponse } from '@/lib/brand-icon';
import { resolveTenantBrand } from '@/server/tenant-brand';

// Ícone PWA 192 do tenant logado (logo da escola) ou "ON" padrão. Por-sessão = dinâmico.
export const dynamic = 'force-dynamic';

export async function GET() {
  const { logoUrl } = await resolveTenantBrand();
  if (logoUrl) {
    try {
      return await logoIconResponse(192, logoUrl);
    } catch {
      // logo indisponível: cai no ícone do produto
    }
  }
  return iconResponse(192);
}

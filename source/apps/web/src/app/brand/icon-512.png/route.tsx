import { iconResponse, logoIconResponse } from '@/lib/brand-icon';
import { resolveTenantBrand } from '@/server/tenant-brand';

// Ícone PWA 512 do tenant logado (logo da escola) ou "ON" padrão.
export const dynamic = 'force-dynamic';

export async function GET() {
  const { logoUrl } = await resolveTenantBrand();
  if (logoUrl) {
    try {
      return await logoIconResponse(512, logoUrl);
    } catch {
      // logo indisponível: cai no ícone do produto
    }
  }
  return iconResponse(512);
}

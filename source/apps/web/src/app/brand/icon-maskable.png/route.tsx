import { iconResponse, logoIconResponse } from '@/lib/brand-icon';
import { resolveTenantBrand } from '@/server/tenant-brand';

// Ícone PWA maskable do tenant logado (logo da escola, com zona de segurança) ou "ON".
export const dynamic = 'force-dynamic';

export async function GET() {
  const { logoUrl } = await resolveTenantBrand();
  if (logoUrl) {
    try {
      return await logoIconResponse(512, logoUrl, { maskable: true });
    } catch {
      // logo indisponível: cai no ícone do produto
    }
  }
  return iconResponse(512, { maskable: true });
}

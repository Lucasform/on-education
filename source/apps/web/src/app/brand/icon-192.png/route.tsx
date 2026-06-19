import { logoIconResponse } from '@/lib/brand-icon';
import { resolveTenantBrand } from '@/server/tenant-brand';

// Ícone PWA 192 do tenant logado (logo da escola) ou a marca oficial Edu On Way. Por-sessão.
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { logoUrl } = await resolveTenantBrand();
  if (logoUrl) {
    try {
      return await logoIconResponse(192, logoUrl);
    } catch {
      // logo indisponível: cai na marca do produto
    }
  }
  return Response.redirect(new URL('/brand/app-icon-192.png', req.url));
}

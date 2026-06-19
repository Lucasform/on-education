import { logoIconResponse } from '@/lib/brand-icon';
import { resolveTenantBrand } from '@/server/tenant-brand';

// Ícone PWA maskable do tenant logado (logo da escola, com zona de segurança) ou a marca oficial.
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { logoUrl } = await resolveTenantBrand();
  if (logoUrl) {
    try {
      return await logoIconResponse(512, logoUrl, { maskable: true });
    } catch {
      // logo indisponível: cai na marca do produto
    }
  }
  return Response.redirect(new URL('/brand/app-icon-512.png', req.url));
}

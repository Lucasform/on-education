import {
  adminTenantContext,
  listClasses,
  listStudents,
  resolveTenantByApiKey,
} from '@on-education/module-nucleo';
import { NextResponse, type NextRequest } from 'next/server';

import { db } from '@/server/db';

export const dynamic = 'force-dynamic';

/** API aberta v1. Auth por Bearer (chave da escola). Read-only: students | classes. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params;
  const key = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!key) return NextResponse.json({ error: 'Bearer token obrigatório.' }, { status: 401 });

  const t = await resolveTenantByApiKey(db(), key).catch(() => null);
  if (!t) return NextResponse.json({ error: 'Chave de API inválida.' }, { status: 401 });

  const ctx = adminTenantContext(t.tenantId, t.tenantType);
  try {
    if (resource === 'students') {
      const rows = await listStudents(db(), ctx);
      return NextResponse.json({
        data: rows.map((s) => ({ id: s.id, fullName: s.fullName, classId: s.classId })),
      });
    }
    if (resource === 'classes') {
      const rows = await listClasses(db(), ctx);
      return NextResponse.json({
        data: rows.map((c) => ({ id: c.id, name: c.name, gradeLevel: c.gradeLevel })),
      });
    }
    return NextResponse.json(
      { error: 'Recurso desconhecido. Disponíveis: students, classes.' },
      { status: 404 },
    );
  } catch {
    return NextResponse.json({ error: 'Erro ao consultar.' }, { status: 500 });
  }
}

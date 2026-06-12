import { isAiConfigured } from '@on-education/module-ia';
import {
  getTenantSettings,
  listClasses,
  listGradeComponents,
  listStudents,
} from '@on-education/module-nucleo';
import { redirect } from 'next/navigation';

import { cardClass, PageHeader } from '@/components/form';
import { CorrecaoLote } from '@/components/correcao-lote';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Correção em lote · Edu On Way' };

export default async function CorrecaoPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const client = db();
  const isSchool = ctx.tenantType === 'organization';

  const [turmas, alunos, componentes, settings] = await Promise.all([
    listClasses(client, ctx).catch(() => []),
    listStudents(client, ctx).catch(() => []),
    isSchool ? listGradeComponents(client, ctx).catch(() => []) : Promise.resolve([]),
    getTenantSettings(client, ctx).catch(() => null),
  ]);
  const aiOn = isAiConfigured();

  return (
    <>
      <PageHeader
        title="Correção em lote"
        description="Fotografe a pilha de provas/trabalhos. O WayOn corrige um a um e sugere a nota; você confirma e lança tudo no diário."
      />

      {!aiOn ? (
        <div className={cardClass}>
          <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
            WayOn indisponível. Configure <code>ANTHROPIC_API_KEY</code> para corrigir por foto.
          </p>
        </div>
      ) : (
        <CorrecaoLote
          turmas={turmas.map((t) => ({ id: t.id, name: t.name }))}
          alunos={alunos.map((a) => ({
            id: a.id,
            fullName: a.fullName,
            classId: a.classId ?? null,
          }))}
          componentes={componentes.map((c) => ({ id: c.id, name: c.name }))}
          maxScoreDefault={settings?.gradeScale ?? 10}
        />
      )}
    </>
  );
}

import { listGradeComponents, listStudents, weightedAverage } from '@on-education/module-nucleo';
import { listAttendance, listGrades } from '@on-education/module-sala-de-aula';
import { redirect } from 'next/navigation';

import { cardClass, PageHeader } from '@/components/form';
import { PrintButton } from '@/components/print-button';
import { db } from '@/server/db';
import { getAuthContext } from '@/server/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Boletim · On Way Education' };

export default async function BoletimPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  const client = db();
  const isSchool = ctx.tenantType === 'organization';
  const [alunos, notas, presencas, componentes] = await Promise.all([
    listStudents(client, ctx),
    listGrades(client, ctx),
    listAttendance(client, ctx),
    isSchool ? listGradeComponents(client, ctx) : Promise.resolve([]),
  ]);

  // Média ponderada por componente (pesos definidos pela escola). Sem componentes → simples.
  const media = (sid: string) => {
    const m = weightedAverage(
      notas.filter((n) => n.studentId === sid),
      componentes,
    );
    return m === null ? '—' : m.toFixed(1);
  };
  const presenca = (sid: string) => {
    const rs = presencas.filter((p) => p.studentId === sid);
    if (!rs.length) return '—';
    const presentes = rs.filter((r) => r.present).length;
    return `${Math.round((presentes / rs.length) * 100)}%`;
  };

  // Média de um componente para o aluno (detalhamento do boletim por componente).
  const mediaComponente = (sid: string, compId: string) => {
    const vs = notas
      .filter((n) => n.studentId === sid && n.componentId === compId && n.value !== null)
      .map((n) => n.value as number);
    return vs.length ? (vs.reduce((a, b) => a + b, 0) / vs.length).toFixed(1) : '—';
  };
  const colspan = componentes.length + 3;

  return (
    <>
      <div className="flex items-start justify-between gap-3 print:hidden">
        <PageHeader
          title="Boletim"
          description="Média por componente, média final (ponderada) e frequência por aluno."
        />
        <PrintButton />
      </div>
      <div className={`${cardClass} overflow-x-auto p-0`}>
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Aluno</th>
              {componentes.map((c) => (
                <th key={c.id} className="px-4 py-2 font-medium">
                  {c.name}
                  <span className="font-normal opacity-70"> (peso {c.weight})</span>
                </th>
              ))}
              <th className="px-4 py-2 font-medium">Média final</th>
              <th className="px-4 py-2 font-medium">Frequência</th>
            </tr>
          </thead>
          <tbody>
            {alunos.length === 0 && (
              <tr>
                <td colSpan={colspan} className="px-4 py-6 text-center text-muted-foreground">
                  Cadastre alunos e lance notas para ver o boletim.
                </td>
              </tr>
            )}
            {alunos.map((a) => (
              <tr key={a.id} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-2">{a.fullName}</td>
                {componentes.map((c) => (
                  <td key={c.id} className="px-4 py-2 text-muted-foreground">
                    {mediaComponente(a.id, c.id)}
                  </td>
                ))}
                <td className="px-4 py-2 font-medium">{media(a.id)}</td>
                <td className="px-4 py-2 text-muted-foreground">{presenca(a.id)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {componentes.length === 0 && isSchool && (
        <p className="text-xs text-muted-foreground print:hidden">
          Dica: defina componentes em Escola › Notas e pesos para detalhar o boletim por Prova,
          Trabalho etc.
        </p>
      )}
    </>
  );
}

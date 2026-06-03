import { listStudents } from '@on-education/module-nucleo';
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
  const [alunos, notas, presencas] = await Promise.all([
    listStudents(client, ctx),
    listGrades(client, ctx),
    listAttendance(client, ctx),
  ]);

  const media = (sid: string) => {
    const vs = notas.filter((n) => n.studentId === sid).map((n) => n.value);
    return vs.length ? (vs.reduce((a, b) => a + b, 0) / vs.length).toFixed(1) : '—';
  };
  const presenca = (sid: string) => {
    const rs = presencas.filter((p) => p.studentId === sid);
    if (!rs.length) return '—';
    const presentes = rs.filter((r) => r.present).length;
    return `${Math.round((presentes / rs.length) * 100)}%`;
  };

  return (
    <>
      <div className="flex items-start justify-between gap-3 print:hidden">
        <PageHeader title="Boletim" description="Média das notas e frequência por aluno." />
        <PrintButton />
      </div>
      <div className={`${cardClass} overflow-x-auto p-0`}>
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Aluno</th>
              <th className="px-4 py-2 font-medium">Média</th>
              <th className="px-4 py-2 font-medium">Frequência</th>
            </tr>
          </thead>
          <tbody>
            {alunos.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                  Cadastre alunos e lance notas para ver o boletim.
                </td>
              </tr>
            )}
            {alunos.map((a) => (
              <tr key={a.id} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-2">{a.fullName}</td>
                <td className="px-4 py-2 font-medium">{media(a.id)}</td>
                <td className="px-4 py-2 text-muted-foreground">{presenca(a.id)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

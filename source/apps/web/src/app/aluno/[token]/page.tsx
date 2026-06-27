import {
  getStudentByPortalToken,
  listStudentAssignments,
  listStudentMessages,
  listStudentTutor,
  studentTutorUsageToday,
  STUDENT_TUTOR_DAILY_LIMIT,
} from '@on-education/module-nucleo';
import { db } from '@/server/db';
import { AlunoAtividades } from './atividades';
import { AlunoTutor } from './tutor';
import { AlunoMensagens } from './mensagens';
import { AlunoTabs } from './tabs';

export const dynamic = 'force-dynamic';

export default async function PortalAlunoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const client = db();

  const aluno = await getStudentByPortalToken(client, token).catch(() => null);

  if (!aluno) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-50 to-indigo-50 p-6">
        <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-lg ring-1 ring-violet-100">
          <div className="mb-4 text-5xl">🔑</div>
          <h1 className="mb-2 text-xl font-bold text-gray-800">Link invalido ou expirado</h1>
          <p className="text-sm leading-relaxed text-gray-500">
            Este link nao funciona mais. Peca ao seu professor um novo link de acesso.
          </p>
        </div>
      </div>
    );
  }

  const primeiroNome = aluno.fullName.split(' ')[0] ?? aluno.fullName;

  const [assignments, mensagens, historico, usadoHoje] = await Promise.all([
    listStudentAssignments(client, aluno.tenantId, aluno.id).catch(() => []),
    listStudentMessages(client, aluno.tenantId, aluno.id).catch(() => []),
    listStudentTutor(client, aluno.tenantId, aluno.id).catch(() => []),
    studentTutorUsageToday(client, aluno.tenantId, aluno.id).catch(() => 0),
  ]);

  const limite = STUDENT_TUTOR_DAILY_LIMIT;

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-indigo-50">
      {/* Header */}
      <header className="border-b border-violet-100 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-violet-500">Portal do Aluno</p>
            <h1 className="text-lg font-bold text-gray-900">
              Oi, {primeiroNome}!
            </h1>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-lg font-bold text-white shadow-sm">
            {primeiroNome.charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      {/* Conteudo */}
      <main className="mx-auto max-w-3xl px-4 py-6">
        <AlunoTabs
          token={token}
          atividades={
            <AlunoAtividades
              token={token}
              assignments={assignments}
            />
          }
          tutor={
            <AlunoTutor
              token={token}
              historico={historico.map((h) => ({
                role: h.role === 'tutor' ? ('tutor' as const) : ('user' as const),
                body: h.body,
                createdAt: new Date(h.createdAt).toISOString(),
              }))}
              usadoHoje={usadoHoje}
              limite={limite}
            />
          }
          mensagens={
            <AlunoMensagens
              token={token}
              mensagens={mensagens.map((m) => ({
                id: m.id,
                body: m.body,
                fromStudent: m.fromStudent,
                authorName: m.authorName ?? '',
                createdAt: new Date(m.createdAt).toISOString(),
              }))}
            />
          }
        />
      </main>
    </div>
  );
}

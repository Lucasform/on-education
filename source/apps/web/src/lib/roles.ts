/** Rótulos pt-BR dos papéis (enum em inglês no banco). Centralizado para a UI não mostrar cru. */
export const ROLE_LABEL: Record<string, string> = {
  owner: 'Dono(a)',
  director: 'Diretor(a)',
  vice_director: 'Vice-diretor(a)',
  coordinator: 'Coordenador(a)',
  teacher: 'Professor(a)',
  monitor: 'Monitor(a)',
  staff_secretary: 'Secretaria',
  staff_finance: 'Financeiro',
  guardian: 'Responsável',
  student: 'Aluno(a)',
};

export const roleLabel = (r: string): string => ROLE_LABEL[r] ?? r;

/** Papéis que fazem sentido CONVIDAR como equipe (sem dono/responsável/aluno). */
export const STAFF_ROLES = [
  'director',
  'vice_director',
  'coordinator',
  'teacher',
  'monitor',
  'staff_secretary',
  'staff_finance',
] as const;

const INVITE_STATUS: Record<string, string> = {
  pending: 'pendente',
  accepted: 'aceito',
  revoked: 'revogado',
  expired: 'expirado',
};
export const inviteStatusLabel = (s: string): string => INVITE_STATUS[s] ?? s;

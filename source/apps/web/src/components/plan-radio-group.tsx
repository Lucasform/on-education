/**
 * Seletor de plano do professor no cadastro (com senha ou por link de e-mail). Sem cobrança
 * nesta fase: a escolha só semeia os recursos do plano. Os `id` casam com o catálogo
 * (packages/entitlements). Componente de servidor: radios nativos, sem JS.
 */
export const PLANOS_SIGNUP = [
  { id: 'teacher_free', nome: 'Free', desc: 'Gere planos e atividades com IA', preco: 'R$ 0' },
  { id: 'teacher_basic', nome: 'Professor', desc: 'Turmas, chamada, notas e boletim', preco: 'R$ 39' },
  {
    id: 'teacher_pro',
    nome: 'Professor Pro',
    desc: 'Tudo + gamificação e correção com IA',
    preco: 'R$ 79',
  },
] as const;

/** Normaliza um plano vindo de query/metadata para um id válido (default Free). */
export function normalizePlano(plano?: string): string {
  return PLANOS_SIGNUP.some((p) => p.id === plano) ? (plano as string) : 'teacher_free';
}

export function PlanRadioGroup({ selected }: { selected: string }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-white/80">
        Escolha seu plano <span className="text-white/50">· lançamento gratuito</span>
      </span>
      <div className="grid gap-2">
        {PLANOS_SIGNUP.map((p) => (
          <label
            key={p.id}
            className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 transition-colors has-[:checked]:border-white has-[:checked]:bg-white/15"
          >
            <span className="flex items-center gap-2.5">
              <input
                type="radio"
                name="plano"
                value={p.id}
                defaultChecked={selected === p.id}
                className="h-4 w-4 shrink-0 accent-white"
              />
              <span>
                <span className="block text-sm font-semibold text-white">{p.nome}</span>
                <span className="block text-[11px] text-white/60">{p.desc}</span>
              </span>
            </span>
            <span className="shrink-0 text-right text-sm font-bold text-white">
              {p.preco}
              <span className="block text-[10px] font-normal text-emerald-300">grátis no lançamento</span>
            </span>
          </label>
        ))}
      </div>
      <span className="text-[11px] text-white/50">
        Lançamento gratuito: você usa os recursos do plano escolhido sem pagar agora. Pode trocar
        de plano quando quiser.
      </span>
    </div>
  );
}

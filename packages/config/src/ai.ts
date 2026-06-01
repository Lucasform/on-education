import { loadEnv } from './env';

/**
 * Nomes de modelos de IA ficam em config, NUNCA hardcoded espalhados (Master Spec §9.1).
 * São fatos voláteis: confira em https://docs.claude.com/en/docs/about-claude/models
 * antes de fixar. Override por env permite trocar sem deploy de código.
 *
 * Tiers (Master Spec §9.1):
 *  - haiku:  alto volume / baixa complexidade (classificação, extração, tutor básico)
 *  - sonnet: geração pedagógica de qualidade (plano de aula, parecer, correção, atividades)
 *  - opus:   tarefas complexas/agênticas/relatórios longos
 */
const DEFAULT_MODELS = {
  haiku: 'claude-haiku-4-5',
  sonnet: 'claude-sonnet-4-6',
  opus: 'claude-opus-4-8',
} as const;

export type AiTier = keyof typeof DEFAULT_MODELS;

export function modelFor(tier: AiTier): string {
  const env = loadEnv() as Record<string, string | undefined>;
  const override = env[`ANTHROPIC_MODEL_${tier.toUpperCase()}`];
  return override ?? DEFAULT_MODELS[tier];
}

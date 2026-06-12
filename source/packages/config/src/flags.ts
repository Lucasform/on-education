/**
 * Feature flags — complementam os entitlements (Master Spec §3.3) para rollout gradual.
 * Entitlement = "o plano permite?"; flag = "está ligado para rollout?". Os dois são checados.
 *
 * Aqui é um stub estático; evoluir para flags por tenant (tabela/serviço) quando necessário.
 */
export const FEATURE_FLAGS = {
  marketplace: false,
  whatsappOfficial: false,
  aiTutorStudent: false,
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

export function isFlagEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag];
}

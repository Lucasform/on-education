import type { TenantType } from '@on-education/core';

/**
 * Fonte ÚNICA do "quem pode o quê" (Master Spec §3.3). O gate de funcionalidade é o
 * entitlement, NUNCA um `if` solto por segmento (CLAUDE.md §13 das convenções).
 *
 * Planos placeholder da Fase 0. Limites/preços são fatos voláteis e definitivos só nas
 * fases comerciais; aqui ficam só os módulos habilitados e cotas-exemplo.
 */
export const FEATURES = [
  'ai.lessonPlan',
  'ai.activities',
  'ai.essayGrading',
  'ai.images',
  'activities.bank',
  'marketplace',
  'classes.manage',
  'communication.light',
  'communication.mass',
  'finance.institutional',
  'enrollment.official',
  'analytics.director',
] as const;
export type Feature = (typeof FEATURES)[number];

export interface PlanDefinition {
  id: string;
  tenantType: TenantType;
  features: ReadonlySet<Feature>;
  /** Cotas-exemplo (ex.: tokens de IA/mês, nº de alunos). -1 = ilimitado. */
  limits: Readonly<Record<string, number>>;
}

function plan(
  id: string,
  tenantType: TenantType,
  features: Feature[],
  limits: Record<string, number>,
): PlanDefinition {
  return { id, tenantType, features: new Set(features), limits };
}

export const PLANS: Readonly<Record<string, PlanDefinition>> = {
  teacher_free: plan(
    'teacher_free',
    'individual',
    [
      'ai.lessonPlan',
      'ai.activities',
      'ai.images',
      'activities.bank',
      'classes.manage',
      'communication.light',
    ],
    { aiTokensPerMonth: 50_000, students: 30, imagesPerMonth: 5 },
  ),
  teacher_pro: plan(
    'teacher_pro',
    'individual',
    [
      'ai.lessonPlan',
      'ai.activities',
      'ai.essayGrading',
      'ai.images',
      'activities.bank',
      'marketplace',
      'classes.manage',
      'communication.light',
    ],
    { aiTokensPerMonth: 1_000_000, students: -1, imagesPerMonth: 100 },
  ),
  school_starter: plan(
    'school_starter',
    'organization',
    [
      'ai.lessonPlan',
      'ai.activities',
      'ai.images',
      'activities.bank',
      'classes.manage',
      'communication.light',
      'communication.mass',
    ],
    { aiTokensPerMonth: 2_000_000, students: -1, imagesPerMonth: 300 },
  ),
  school_full: plan('school_full', 'organization', [...FEATURES], {
    aiTokensPerMonth: 10_000_000,
    students: -1,
    imagesPerMonth: 1000,
  }),
};

export function getPlan(planId: string): PlanDefinition | undefined {
  return PLANS[planId];
}

/** O plano habilita esta funcionalidade? (a perna comercial da checagem tripla). */
export function canUse(planId: string, feature: Feature): boolean {
  return PLANS[planId]?.features.has(feature) ?? false;
}

/** Limite do plano para uma métrica (-1 = ilimitado, undefined = não definido). */
export function limitFor(planId: string, metric: string): number | undefined {
  return PLANS[planId]?.limits[metric];
}

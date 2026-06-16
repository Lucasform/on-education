import type { TenantType } from '@on-education/core';

/**
 * Fonte ÚNICA do "quem pode o quê" (Master Spec §3.3). O gate de funcionalidade é o
 * entitlement, NUNCA um `if` solto por segmento.
 *
 * Modelo comercial (2026-06): combos (planos prontos) E à la carte (o tenant monta o
 * próprio pacote, mínimo de funcionalidades). Os dois escrevem no MESMO lugar — a tabela
 * `entitlements` por tenant — e o app libera as telas automaticamente conforme as flags.
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

export type FeatureSegment = 'individual' | 'organization' | 'both';

export interface FeatureMeta {
  feature: Feature;
  label: string;
  description: string;
  category: string;
  segment: FeatureSegment;
  /** Preço à la carte em BRL/mês (ilustrativo, ajustável). */
  price: number;
}

/**
 * Catálogo de funcionalidades para a montagem à la carte e a tabela de planos.
 * `price` é o valor mensal somado quando o tenant escolhe a funcionalidade avulsa.
 */
export const FEATURE_CATALOG: Readonly<Record<Feature, FeatureMeta>> = {
  'classes.manage': {
    feature: 'classes.manage',
    label: 'Turmas, diário, chamada e notas',
    description: 'Gestão de turmas e alunos, diário de classe, chamada, notas, faltas e boletim.',
    category: 'Sala de aula',
    segment: 'both',
    price: 12,
  },
  'activities.bank': {
    feature: 'activities.bank',
    label: 'Banco de atividades e portfólio',
    description: 'Banco pessoal de atividades, portfólio do aluno e documentos.',
    category: 'Pedagógico',
    segment: 'both',
    price: 6,
  },
  marketplace: {
    feature: 'marketplace',
    label: 'Banco coletivo (marketplace)',
    description: 'Compartilhar e reutilizar atividades entre professores/equipe.',
    category: 'Pedagógico',
    segment: 'both',
    price: 6,
  },
  'ai.lessonPlan': {
    feature: 'ai.lessonPlan',
    label: 'WayOn: planos de aula',
    description: 'Geração de planos de aula, plano de curso e cronograma com IA.',
    category: 'WayOn (IA)',
    segment: 'both',
    price: 8,
  },
  'ai.activities': {
    feature: 'ai.activities',
    label: 'WayOn: atividades e conteúdo',
    description: 'Geração de atividades, exercícios, comunicados e flashcards com IA.',
    category: 'WayOn (IA)',
    segment: 'both',
    price: 8,
  },
  'ai.images': {
    feature: 'ai.images',
    label: 'WayOn: geração de imagens',
    description: 'Imagens didáticas geradas por IA (com cota mensal).',
    category: 'WayOn (IA)',
    segment: 'both',
    price: 6,
  },
  'ai.essayGrading': {
    feature: 'ai.essayGrading',
    label: 'WayOn: correção de redação e provas',
    description: 'Correção de redação e correção em lote de provas com IA.',
    category: 'WayOn (IA)',
    segment: 'both',
    price: 14,
  },
  'communication.light': {
    feature: 'communication.light',
    label: 'Comunicados e mural',
    description: 'Comunicados com confirmação de leitura e mural dos pais.',
    category: 'Comunicação',
    segment: 'both',
    price: 5,
  },
  'communication.mass': {
    feature: 'communication.mass',
    label: 'WhatsApp e mensagens em massa',
    description: 'Envio em massa por WhatsApp/e-mail, inbox e portal do responsável.',
    category: 'Comunicação',
    segment: 'organization',
    price: 20,
  },
  'enrollment.official': {
    feature: 'enrollment.official',
    label: 'Matrícula e secretaria',
    description: 'Matrícula completa, matrícula pública online, responsáveis, ocorrências e secretaria.',
    category: 'Gestão escolar',
    segment: 'organization',
    price: 15,
  },
  'analytics.director': {
    feature: 'analytics.director',
    label: 'Relatórios e dashboards da direção',
    description: 'Relatórios de direção, dashboards, relatório de faltas e auditoria.',
    category: 'Gestão & analytics',
    segment: 'organization',
    price: 20,
  },
  'finance.institutional': {
    feature: 'finance.institutional',
    label: 'Financeiro (mensalidades)',
    description: 'Mensalidades, inadimplência e gestão financeira da escola.',
    category: 'Financeiro',
    segment: 'organization',
    price: 25,
  },
};

/** Mínimo de funcionalidades para montar um pacote à la carte, por segmento. */
export const ALACARTE_MIN: Record<TenantType, number> = {
  individual: 5,
  organization: 10,
};

/** Funcionalidades elegíveis ao à la carte para um segmento. */
export function featuresForSegment(tenantType: TenantType): FeatureMeta[] {
  return FEATURES.map((f) => FEATURE_CATALOG[f]).filter(
    (m) => m.segment === 'both' || m.segment === tenantType,
  );
}

/** Preço total (BRL/mês) de um conjunto de funcionalidades à la carte. */
export function priceForFeatures(features: Feature[]): number {
  return features.reduce((sum, f) => sum + (FEATURE_CATALOG[f]?.price ?? 0), 0);
}

export interface PlanDefinition {
  id: string;
  name: string;
  tenantType: TenantType;
  features: ReadonlySet<Feature>;
  /** Cotas (ex.: tokens de IA/mês, nº de alunos). -1 = ilimitado. */
  limits: Readonly<Record<string, number>>;
  /** Preço mensal do combo em BRL (0 = grátis, -1 = sob consulta). */
  monthlyPrice: number;
}

function plan(
  id: string,
  name: string,
  tenantType: TenantType,
  features: Feature[],
  limits: Record<string, number>,
  monthlyPrice: number,
): PlanDefinition {
  return { id, name, tenantType, features: new Set(features), limits, monthlyPrice };
}

const TEACHER_BASIC: Feature[] = [
  'classes.manage',
  'ai.lessonPlan',
  'ai.activities',
  'ai.images',
  'activities.bank',
  'communication.light',
];

export const PLANS: Readonly<Record<string, PlanDefinition>> = {
  teacher_free: plan(
    'teacher_free',
    'Free',
    'individual',
    ['classes.manage', 'ai.lessonPlan', 'ai.activities', 'activities.bank', 'communication.light'],
    { aiTokensPerMonth: 50_000, students: 30, imagesPerMonth: 5 },
    0,
  ),
  teacher_basic: plan(
    'teacher_basic',
    'Professor',
    'individual',
    TEACHER_BASIC,
    { aiTokensPerMonth: 300_000, students: -1, imagesPerMonth: 30 },
    39,
  ),
  teacher_pro: plan(
    'teacher_pro',
    'Professor Pro',
    'individual',
    [...TEACHER_BASIC, 'ai.essayGrading', 'marketplace'],
    { aiTokensPerMonth: 1_000_000, students: -1, imagesPerMonth: 100 },
    79,
  ),
  teacher_custom: plan(
    'teacher_custom',
    'Professor à la carte',
    'individual',
    [],
    { aiTokensPerMonth: 1_000_000, students: -1, imagesPerMonth: 100 },
    -1,
  ),
  school_starter: plan(
    'school_starter',
    'Escola Starter',
    'organization',
    [
      'classes.manage',
      'ai.lessonPlan',
      'ai.activities',
      'ai.images',
      'activities.bank',
      'marketplace',
      'communication.light',
      'communication.mass',
      'enrollment.official',
    ],
    { aiTokensPerMonth: 2_000_000, students: -1, imagesPerMonth: 300 },
    -1,
  ),
  school_full: plan(
    'school_full',
    'Escola Full',
    'organization',
    [...FEATURES],
    { aiTokensPerMonth: 10_000_000, students: -1, imagesPerMonth: 1000 },
    -1,
  ),
  school_custom: plan(
    'school_custom',
    'Escola à la carte',
    'organization',
    [],
    { aiTokensPerMonth: 5_000_000, students: -1, imagesPerMonth: 500 },
    -1,
  ),
};

/** Planos combo (exclui os `*_custom`, que são montados pelo tenant) por segmento. */
export function comboPlans(tenantType: TenantType): PlanDefinition[] {
  return Object.values(PLANS).filter((p) => p.tenantType === tenantType && !p.id.endsWith('_custom'));
}

export function getPlan(planId: string): PlanDefinition | undefined {
  return PLANS[planId];
}

/** O plano habilita esta funcionalidade? (perna comercial da checagem tripla). */
export function canUse(planId: string, feature: Feature): boolean {
  return PLANS[planId]?.features.has(feature) ?? false;
}

/** Limite do plano para uma métrica (-1 = ilimitado, undefined = não definido). */
export function limitFor(planId: string, metric: string): number | undefined {
  return PLANS[planId]?.limits[metric];
}

import { canUse, limitFor, PLANS } from '@on-education/entitlements';
import { describe, expect, it } from 'vitest';

import { DEFAULT_INDIVIDUAL_PLAN } from '../provisioning';

/** Unit (sem banco): garante que o plano de signup do professor é coerente com 1B.1. */
describe('plano default do signup individual', () => {
  it('existe no catálogo e é do segmento individual', () => {
    expect(PLANS[DEFAULT_INDIVIDUAL_PLAN]?.tenantType).toBe('individual');
  });

  it('free habilita geração de conteúdo e impõe cota finita de alunos', () => {
    // Sala de aula (classes.manage) e gamificação começam no Professor Pro; no free, não.
    expect(canUse(DEFAULT_INDIVIDUAL_PLAN, 'ai.lessonPlan')).toBe(true);
    expect(canUse(DEFAULT_INDIVIDUAL_PLAN, 'classes.manage')).toBe(false);
    const cap = limitFor(DEFAULT_INDIVIDUAL_PLAN, 'students') ?? 0;
    expect(cap).toBeGreaterThan(0);
  });
});

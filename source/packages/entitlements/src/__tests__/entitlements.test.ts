import { describe, expect, it } from 'vitest';

import { canUse, getPlan, limitFor } from '../index';

describe('entitlements', () => {
  it('teacher_free não libera funcionalidade institucional', () => {
    expect(canUse('teacher_free', 'finance.institutional')).toBe(false);
    expect(canUse('teacher_free', 'ai.lessonPlan')).toBe(true);
  });

  it('school_full libera tudo', () => {
    expect(canUse('school_full', 'finance.institutional')).toBe(true);
    expect(canUse('school_full', 'analytics.director')).toBe(true);
  });

  it('teacher_pro amplia a cota de IA em relação ao free', () => {
    const free = limitFor('teacher_free', 'aiTokensPerMonth') ?? 0;
    const pro = limitFor('teacher_pro', 'aiTokensPerMonth') ?? 0;
    expect(pro).toBeGreaterThan(free);
  });

  it('plano inexistente não libera nada', () => {
    expect(canUse('nope', 'ai.lessonPlan')).toBe(false);
    expect(getPlan('nope')).toBeUndefined();
  });
});

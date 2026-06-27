import { describe, expect, it } from 'vitest';

import { daysOverdue, dunningStageFor } from '../dunning';

describe('régua de cobrança (dunning)', () => {
  it('daysOverdue conta os dias entre o vencimento e hoje', () => {
    expect(daysOverdue('2026-01-01', '2026-01-01')).toBe(0);
    expect(daysOverdue('2026-01-01', '2026-01-08')).toBe(7);
    expect(daysOverdue('2026-01-10', '2026-01-01')).toBe(-9);
  });

  it('classifica o estágio por dias de atraso (1 / 7 / 15)', () => {
    expect(dunningStageFor(0)).toBeNull();
    expect(dunningStageFor(1)).toBe(1);
    expect(dunningStageFor(6)).toBe(1);
    expect(dunningStageFor(7)).toBe(2);
    expect(dunningStageFor(14)).toBe(2);
    expect(dunningStageFor(15)).toBe(3);
    expect(dunningStageFor(99)).toBe(3);
  });
});

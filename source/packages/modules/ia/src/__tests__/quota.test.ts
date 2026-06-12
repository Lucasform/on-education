import { describe, expect, it } from 'vitest';

import { isAiConfigured } from '../provider';
import { tokensRemaining } from '../quota';

describe('cota de IA (puro)', () => {
  it('trata -1 e undefined como ilimitado', () => {
    expect(tokensRemaining(-1, 9999)).toBe(Number.POSITIVE_INFINITY);
    expect(tokensRemaining(undefined, 5)).toBe(Number.POSITIVE_INFINITY);
  });

  it('respeita o limite e nunca fica negativo', () => {
    expect(tokensRemaining(100, 30)).toBe(70);
    expect(tokensRemaining(100, 130)).toBe(0);
  });

  it('sem ANTHROPIC_API_KEY a IA fica indisponível', () => {
    if (!process.env.ANTHROPIC_API_KEY) {
      expect(isAiConfigured()).toBe(false);
    }
  });
});

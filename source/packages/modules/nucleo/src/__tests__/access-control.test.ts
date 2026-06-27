import type { AuthContext } from '@on-education/auth';
import { describe, expect, it } from 'vitest';

import { canSeeFinanceValues, isGestao } from '../work-requests';

const ctx = (roles: string[]): AuthContext =>
  ({ userId: 'u', tenantId: 't', tenantType: 'organization', roles } as unknown as AuthContext);

describe('controle de acesso: gestão e financeiro (FLS)', () => {
  it('isGestao reconhece os papéis de gestão', () => {
    for (const r of ['owner', 'director', 'vice_director', 'coordinator']) {
      expect(isGestao(ctx([r]))).toBe(true);
    }
  });

  it('isGestao nega professor, secretaria e sem papel', () => {
    expect(isGestao(ctx(['teacher']))).toBe(false);
    expect(isGestao(ctx(['secretary']))).toBe(false);
    expect(isGestao(ctx([]))).toBe(false);
  });

  it('canSeeFinanceValues libera dono, diretoria, secretaria e tesouraria', () => {
    for (const r of ['owner', 'director', 'vice_director', 'secretary', 'treasurer']) {
      expect(canSeeFinanceValues(ctx([r]))).toBe(true);
    }
  });

  it('canSeeFinanceValues nega coordenação e professor', () => {
    expect(canSeeFinanceValues(ctx(['coordinator']))).toBe(false);
    expect(canSeeFinanceValues(ctx(['teacher']))).toBe(false);
  });

  it('coordenação é gestão mas NÃO vê valores financeiros', () => {
    const c = ctx(['coordinator']);
    expect(isGestao(c)).toBe(true);
    expect(canSeeFinanceValues(c)).toBe(false);
  });
});

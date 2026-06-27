import { describe, expect, it } from 'vitest';

import { bnccGuidance, COMPETENCIAS_GERAIS } from '../bncc';
import { BNCC_ALIGNMENT, contentSkill, type ContentType } from '../content-skill';

const TIPOS: ContentType[] = [
  'activity',
  'lesson_plan',
  'exam',
  'quiz',
  'correction',
  'essay',
  'report',
  'study_plan',
  'tutor',
  'outro',
];

describe('content-skill (casa de geração BNCC)', () => {
  it('cada tipo retorna uma spec não vazia', () => {
    for (const t of TIPOS) {
      expect(contentSkill(t).length).toBeGreaterThan(0);
    }
  });

  it('a atividade carrega o alinhamento BNCC', () => {
    expect(contentSkill('activity')).toContain(BNCC_ALIGNMENT);
  });
});

describe('referência BNCC', () => {
  it('tem exatamente as 10 competências gerais', () => {
    expect(COMPETENCIAS_GERAIS.length).toBe(10);
  });

  it('bnccGuidance orienta a partir do componente e cita a BNCC', () => {
    const g = bnccGuidance({ componente: 'Língua Portuguesa', ano: '5º' });
    expect(g.length).toBeGreaterThan(0);
    expect(g).toContain('BNCC');
  });
});

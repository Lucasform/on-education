import { describe, expect, it } from 'vitest';

import { medalFor } from '../gamification';

describe('medalFor — faixas de medalha (padrão 50/150/300)', () => {
  it('sem pontos: nenhuma medalha, faltam 50 para bronze', () => {
    const m = medalFor(0);
    expect(m.tier).toBe('nenhuma');
    expect(m.toNext).toBe(50);
  });

  it('na borda do bronze (50) já é bronze', () => {
    expect(medalFor(50).tier).toBe('bronze');
    expect(medalFor(49).tier).toBe('nenhuma');
  });

  it('prata e ouro nas bordas', () => {
    expect(medalFor(150).tier).toBe('prata');
    expect(medalFor(149).tier).toBe('bronze');
    expect(medalFor(300).tier).toBe('ouro');
    expect(medalFor(299).tier).toBe('prata');
  });

  it('ouro: toNext = 0 (topo)', () => {
    expect(medalFor(500).tier).toBe('ouro');
    expect(medalFor(500).toNext).toBe(0);
  });

  it('toNext aponta para a próxima faixa', () => {
    expect(medalFor(30).toNext).toBe(20); // bronze em 50
    expect(medalFor(100).toNext).toBe(50); // prata em 150
    expect(medalFor(200).toNext).toBe(100); // ouro em 300
  });
});

describe('medalFor — faixas personalizadas pela escola', () => {
  const faixas = { bronze: 10, prata: 20, ouro: 30 };

  it('respeita os limites customizados', () => {
    expect(medalFor(5, faixas).tier).toBe('nenhuma');
    expect(medalFor(10, faixas).tier).toBe('bronze');
    expect(medalFor(20, faixas).tier).toBe('prata');
    expect(medalFor(30, faixas).tier).toBe('ouro');
  });

  it('toNext usa os limites customizados', () => {
    expect(medalFor(5, faixas).toNext).toBe(5); // bronze em 10
    expect(medalFor(15, faixas).toNext).toBe(5); // prata em 20
  });

  it('faixa parcial cai no default para o que faltar', () => {
    // só bronze custom; prata/ouro voltam ao default (150/300)
    const m = medalFor(60, { bronze: 50 });
    expect(m.tier).toBe('bronze');
    expect(m.toNext).toBe(90); // prata default 150
  });
});

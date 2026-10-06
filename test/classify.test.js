import { describe, it, expect } from 'vitest';
import { classify, CATEGORIES } from '../src/logic/classify.js';

const label = (s, d) => CATEGORIES[classify(s, d)];

describe('classify', () => {
  it('Normal: menos de 120 y menos de 80', () => {
    expect(label(119, 79)).toBe('Normal');
  });
  it('Elevada: 120–129 y menos de 80', () => {
    expect(label(120, 79)).toBe('Elevada');
    expect(label(129, 70)).toBe('Elevada');
  });
  it('Alta etapa 1: 130–139 o 80–89', () => {
    expect(label(130, 70)).toBe('Alta etapa 1');
    expect(label(115, 80)).toBe('Alta etapa 1');
    expect(label(139, 89)).toBe('Alta etapa 1');
  });
  it('Alta etapa 2: 140 o más, o 90 o más', () => {
    expect(label(140, 70)).toBe('Alta etapa 2');
    expect(label(118, 90)).toBe('Alta etapa 2');
    expect(label(180, 120)).toBe('Alta etapa 2');
  });
  it('Crisis: más de 180 o más de 120', () => {
    expect(label(181, 80)).toBe('Crisis');
    expect(label(150, 121)).toBe('Crisis');
  });
});

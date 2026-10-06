import { describe, it, expect } from 'vitest';
import { inPeriod, summarize, yRange } from '../src/logic/stats.js';

const NOW = new Date(2026, 9, 6, 12, 0); // martes 6 oct 2026, 12:00
const r = (id, d, h, sys, dia, pul = null) => ({ id, sys, dia, pul, note: '', ts: new Date(2026, 9, d, h).getTime() });

describe('inPeriod', () => {
  const data = [r('a', 6, 8, 120, 80), r('b', 30, 8, 130, 85), r('c', 1, 0, 118, 76), r('d', 6, 13, 125, 82)];
  it('7 días incluye hoy y los 6 anteriores desde las 00:00', () => {
    const sept = { ...r('e', 29, 23, 140, 90), ts: new Date(2026, 8, 29, 23, 59).getTime() };
    const inside = { ...r('f', 30, 0, 140, 90), ts: new Date(2026, 8, 30, 0, 0).getTime() };
    expect(inPeriod([...data, sept, inside], 7, NOW).map((x) => x.id)).toEqual(['f', 'c', 'a']);
  });
  it('ignora mediciones después de ahora y ordena por fecha', () => {
    expect(inPeriod(data, 30, NOW).map((x) => x.id)).toEqual(['c', 'a']);
  });
});

describe('summarize', () => {
  it('regresa null sin mediciones', () => {
    expect(summarize([])).toBeNull();
  });

  it('calcula promedios redondeados y su clasificación', () => {
    const s = summarize([r('a', 1, 8, 120, 80, 70), r('b', 2, 8, 131, 85), r('c', 3, 8, 125, 81, 75)]);
    expect(s.count).toBe(3);
    expect(s.average).toEqual({ sys: 125, dia: 82, pul: 73, category: 2 });
  });

  it('pulso promedio es null si ninguna medición tiene pulso', () => {
    expect(summarize([r('a', 1, 8, 120, 80)]).average.pul).toBeNull();
  });

  it('encuentra la más alta y la más baja por sistólica, desempatando por diastólica', () => {
    const s = summarize([r('a', 1, 8, 150, 90), r('b', 2, 8, 150, 95), r('c', 3, 8, 110, 70), r('d', 4, 8, 110, 65)]);
    expect(s.highest.id).toBe('b');
    expect(s.lowest.id).toBe('d');
  });

  it('cuenta mediciones por clasificación', () => {
    const s = summarize([r('a', 1, 8, 115, 75), r('b', 2, 8, 125, 75), r('c', 3, 8, 135, 75), r('d', 4, 8, 145, 75), r('e', 5, 8, 190, 100), r('f', 5, 9, 112, 70)]);
    expect(s.byCategory).toEqual([2, 1, 1, 1, 1]);
  });
});

describe('yRange', () => {
  it('siempre incluye las líneas de 80 y 120 con margen', () => {
    expect(yRange([r('a', 1, 8, 110, 85)])).toEqual({ min: 70, max: 130 });
  });
  it('se amplía con valores extremos', () => {
    expect(yRange([r('a', 1, 8, 182, 58)])).toEqual({ min: 40, max: 200 });
  });
});

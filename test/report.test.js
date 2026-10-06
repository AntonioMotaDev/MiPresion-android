import { describe, it, expect } from 'vitest';
import { buildReport, pdfSafe, formatDateShort, formatTime24, formatDateFull, reportFileName } from '../src/logic/report.js';

const NOW = new Date(2026, 9, 6, 12, 0);
const r = (id, m, d, h, sys, dia, pul = null, note = '') => ({ id, sys, dia, pul, note, ts: new Date(2026, m, d, h).getTime() });
const data = [
  r('a', 9, 6, 8, 120, 80, 70), r('b', 9, 5, 20, 130, 84), r('c', 9, 5, 8, 126, 82, 66, 'café'),
  r('d', 8, 20, 9, 140, 90), r('e', 6, 1, 9, 110, 70), r('f', 9, 6, 18, 150, 95), // f es después de NOW
];

describe('buildReport', () => {
  it('7 días: agrupa por día en orden y excluye lo futuro', () => {
    const rep = buildReport(data, '7', NOW);
    expect(rep.count).toBe(3);
    expect(rep.days.map((d) => d.readings.map((x) => x.id))).toEqual([['c', 'b'], ['a']]);
    expect(rep.average).toMatchObject({ sys: 125, dia: 82, pul: 68 });
    expect(formatDateShort(rep.rangeFrom)).toBe('30/09/2026');
  });
  it('30 días incluye el 20 de septiembre', () => {
    expect(buildReport(data, '30', NOW).count).toBe(4);
  });
  it('Todo incluye todo lo pasado', () => {
    const rep = buildReport(data, 'all', NOW);
    expect(rep.count).toBe(5);
    expect(formatDateShort(rep.from)).toBe('01/07/2026');
    expect(formatDateShort(rep.to)).toBe('06/10/2026');
  });
  it('sin mediciones regresa conteo 0 y sin promedio', () => {
    const rep = buildReport([], '7', NOW);
    expect(rep).toMatchObject({ count: 0, days: [], average: null, from: null });
  });
});

describe('formatos', () => {
  it('fecha y hora para papel', () => {
    expect(formatDateShort(NOW)).toBe('06/10/2026');
    expect(formatTime24(new Date(2026, 0, 1, 7, 5))).toBe('07:05');
    expect(formatDateFull(NOW)).toBe('6 de octubre de 2026');
    expect(reportFileName(NOW)).toBe('mi-presion-2026-10-06.pdf');
  });
  it('quita emojis pero conserva acentos y ñ', () => {
    expect(pdfSafe('Después del café 😊 ñandú\n')).toBe('Después del café ñandú');
  });
});

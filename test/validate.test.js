import { describe, it, expect } from 'vitest';
import { validateReading } from '../src/logic/validate.js';

const NOW = new Date(2026, 9, 6, 12, 0).getTime();
const v = (over) => validateReading({ sys: '120', dia: '80', pul: '', note: '', ts: NOW, ...over }, NOW);

describe('validateReading', () => {
  it('acepta una medición normal y convierte a números', () => {
    const r = v({ pul: '70', note: '  brazo izq.  ' });
    expect(r.ok).toBe(true);
    expect(r.reading).toEqual({ sys: 120, dia: 80, pul: 70, note: 'brazo izq.', ts: NOW });
  });

  it('el pulso es opcional', () => {
    expect(v({ pul: '' }).reading.pul).toBeNull();
  });

  it('pide los campos vacíos', () => {
    expect(v({ sys: '' }).message).toMatch(/presión alta/);
    expect(v({ dia: '' }).message).toMatch(/presión baja/);
  });

  it('respeta los límites de sistólica 50–300', () => {
    expect(v({ sys: '50', dia: '40' }).ok).toBe(true);
    expect(v({ sys: '300' }).ok).toBe(true);
    expect(v({ sys: '49', dia: '40' }).ok).toBe(false);
    expect(v({ sys: '301' }).ok).toBe(false);
  });

  it('respeta los límites de diastólica 30–200', () => {
    expect(v({ sys: '100', dia: '30' }).ok).toBe(true);
    expect(v({ sys: '250', dia: '200' }).ok).toBe(true);
    expect(v({ dia: '29' }).ok).toBe(false);
    expect(v({ sys: '250', dia: '201' }).ok).toBe(false);
  });

  it('respeta los límites de pulso 25–250', () => {
    expect(v({ pul: '25' }).ok).toBe(true);
    expect(v({ pul: '250' }).ok).toBe(true);
    expect(v({ pul: '24' }).message).toMatch(/pulso/);
    expect(v({ pul: '251' }).ok).toBe(false);
  });

  it('la sistólica debe ser mayor que la diastólica', () => {
    expect(v({ sys: '80', dia: '80' }).message).toMatch(/mayor/);
    expect(v({ sys: '70', dia: '90' }).ok).toBe(false);
  });

  it('rechaza fechas en el futuro', () => {
    expect(v({ ts: NOW + 60 * 60 * 1000 }).message).toMatch(/futuro/);
    expect(v({ ts: NaN }).ok).toBe(false);
  });

  it('corta las notas a 200 caracteres', () => {
    expect(v({ note: 'x'.repeat(250) }).reading.note).toHaveLength(200);
  });
});

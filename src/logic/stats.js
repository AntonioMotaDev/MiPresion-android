import { classify, CATEGORIES } from './classify.js';

export const PERIODS = [7, 30, 90];

// Mediciones de los últimos `days` días contando hoy (desde las 00:00 de hace days-1 días).
export function inPeriod(readings, days, now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  const from = start.getTime();
  const to = new Date(now).getTime();
  return readings.filter((r) => r.ts >= from && r.ts <= to).sort((a, b) => a.ts - b.ts);
}

const avg = (xs) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);

// Números del resumen. No interpreta nada: solo promedios, extremos y conteos.
export function summarize(readings) {
  if (!readings.length) return null;
  const sys = avg(readings.map((r) => r.sys));
  const dia = avg(readings.map((r) => r.dia));
  const pulses = readings.map((r) => r.pul).filter((p) => p != null);

  // Más alta / más baja: por sistólica; si empatan, decide la diastólica; si también, la más reciente.
  const highest = readings.reduce((best, r) =>
    r.sys > best.sys || (r.sys === best.sys && (r.dia > best.dia || (r.dia === best.dia && r.ts > best.ts))) ? r : best);
  const lowest = readings.reduce((best, r) =>
    r.sys < best.sys || (r.sys === best.sys && (r.dia < best.dia || (r.dia === best.dia && r.ts > best.ts))) ? r : best);

  const byCategory = CATEGORIES.map(() => 0);
  readings.forEach((r) => byCategory[classify(r.sys, r.dia)]++);

  return {
    count: readings.length,
    average: { sys, dia, pul: pulses.length ? avg(pulses) : null, category: classify(sys, dia) },
    highest,
    lowest,
    byCategory,
  };
}

// Límites del eje vertical: múltiplos de 10 con margen, incluyendo siempre 80 y 120.
export function yRange(readings) {
  const lo = Math.min(80, ...readings.map((r) => r.dia));
  const hi = Math.max(120, ...readings.map((r) => r.sys));
  return { min: Math.floor((lo - 10) / 10) * 10, max: Math.ceil((hi + 10) / 10) * 10 };
}

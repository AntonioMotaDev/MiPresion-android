// Datos de la hoja para el doctor (sin dibujar nada): periodo, días con sus filas y promedio.
import { inPeriod, summarize } from './stats.js';
import { sameDay } from './dates.js';

export const REPORT_PERIODS = [
  { value: '7', label: 'Últimos 7 días', days: 7 },
  { value: '30', label: 'Últimos 30 días', days: 30 },
  { value: 'all', label: 'Todo', days: null },
];

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const pad = (n) => String(n).padStart(2, '0');

// 06/10/2026
export function formatDateShort(ts) {
  const d = new Date(ts);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

// 6 de octubre de 2026
export function formatDateFull(ts) {
  const d = new Date(ts);
  return `${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
}

// 08:15 (24 h: no se presta a confusión entre a. m. y p. m. en papel)
export function formatTime24(ts) {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// La fuente estándar del PDF solo tiene caracteres latinos; se quitan emojis y similares.
export function pdfSafe(text) {
  return String(text ?? '').replace(/[^\x20-\x7E\xA0-\xFF]/g, '').replace(/\s+/g, ' ').trim();
}

export function buildReport(all, periodValue, now = new Date()) {
  const period = REPORT_PERIODS.find((p) => p.value === periodValue) ?? REPORT_PERIODS[1];
  const readings = period.days
    ? inPeriod(all, period.days, now)
    : [...all].filter((r) => r.ts <= new Date(now).getTime()).sort((a, b) => a.ts - b.ts);

  const days = [];
  for (const r of readings) {
    const last = days[days.length - 1];
    if (last && sameDay(last.ts, r.ts)) last.readings.push(r);
    else days.push({ ts: r.ts, readings: [r] });
  }

  const summary = summarize(readings);
  // Rango que se imprime: el periodo pedido (o desde la primera medición si es "Todo") hasta hoy.
  const rangeFrom = new Date(now);
  rangeFrom.setHours(0, 0, 0, 0);
  if (period.days) rangeFrom.setDate(rangeFrom.getDate() - (period.days - 1));
  return {
    period,
    rangeFrom: period.days ? rangeFrom.getTime() : (readings[0]?.ts ?? null),
    rangeTo: new Date(now).getTime(),
    from: readings[0]?.ts ?? null,
    to: readings[readings.length - 1]?.ts ?? null,
    days,
    count: readings.length,
    average: summary?.average ?? null,
  };
}

// "mi-presion-2026-10-06.pdf"
export function reportFileName(now = new Date()) {
  const d = new Date(now);
  return `mi-presion-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.pdf`;
}

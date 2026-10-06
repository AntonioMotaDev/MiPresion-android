const pad = (n) => String(n).padStart(2, '0');

// Valor para <input type="datetime-local"> en hora local.
export function toLocalInputValue(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' });
}

export function formatDateLong(ts) {
  return new Date(ts).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
}

export const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export const DAY_MS = 24 * 60 * 60 * 1000;

// Lunes a las 00:00 (hora local) de la semana que contiene `date`.
export function mondayOf(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

// Los 7 días (lunes a domingo, 00:00) de la semana `offset` respecto a `now` (0 = esta, -1 = la pasada).
export function weekDays(offset, now = new Date()) {
  const monday = mondayOf(now);
  monday.setDate(monday.getDate() + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

// Cuántas semanas hay entre la semana de `now` y la de `ts` (negativo = pasado).
// Se redondea porque con horario de verano una semana no mide exactamente 7×24 h.
export function weekOffsetOf(ts, now = new Date()) {
  return Math.round((mondayOf(ts) - mondayOf(now)) / (7 * DAY_MS));
}

export function sameDay(a, b) {
  const x = new Date(a), y = new Date(b);
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
}

// Reparte las mediciones en los 7 días de la semana, cada día ordenado por hora.
export function groupByDay(readings, days) {
  return days.map((day) => ({
    day,
    readings: readings.filter((r) => sameDay(r.ts, day)).sort((a, b) => a.ts - b.ts),
  }));
}

export function formatDayMonth(date) {
  const d = new Date(date);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

export function weekTitle(offset, days) {
  if (offset === 0) return 'Esta semana';
  if (offset === -1) return 'Semana pasada';
  return `${formatDayMonth(days[0])} al ${formatDayMonth(days[6])}`;
}

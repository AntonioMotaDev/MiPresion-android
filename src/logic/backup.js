// Respaldo a archivo: { "version": 1, "exportado": <ts>, "lecturas": [...] }.
// El mismo formato servirá para migrar a la nube más adelante.
import { LIMITS, NOTE_MAX } from './validate.js';

export const BACKUP_VERSION = 1;
const FIELDS = ['id', 'sys', 'dia', 'pul', 'note', 'ts', 'created_at'];

export function buildBackup(readings, now = Date.now()) {
  return {
    version: BACKUP_VERSION,
    exportado: now,
    lecturas: readings.map((r) => Object.fromEntries(FIELDS.map((k) => [k, r[k] ?? (k === 'note' ? '' : null)]))),
  };
}

export function backupFileName(now = new Date()) {
  const d = new Date(now);
  const pad = (n) => String(n).padStart(2, '0');
  return `mi-presion-respaldo-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
}

const isInt = (n) => Number.isInteger(n);
const inRange = (n, [min, max]) => isInt(n) && n >= min && n <= max;
const MIN_TS = Date.UTC(2000, 0, 1);

// Revisa una medición del archivo. Devuelve un texto con el problema, o null si está bien.
function problemWith(r, now) {
  if (!r || typeof r !== 'object') return 'tiene un dato que no es una medición';
  if (typeof r.id !== 'string' || !r.id.trim()) return 'tiene una medición sin identificador';
  if (!inRange(r.sys, LIMITS.sys)) return 'tiene una presión alta fuera de rango';
  if (!inRange(r.dia, LIMITS.dia)) return 'tiene una presión baja fuera de rango';
  if (r.sys <= r.dia) return 'tiene una medición con la presión alta menor o igual que la baja';
  if (r.pul != null && !inRange(r.pul, LIMITS.pul)) return 'tiene un pulso fuera de rango';
  if (r.note != null && (typeof r.note !== 'string' || r.note.length > NOTE_MAX)) return 'tiene una nota inválida o demasiado larga';
  if (!isInt(r.ts) || r.ts < MIN_TS || r.ts > now + 24 * 60 * 60 * 1000) return 'tiene una fecha inválida';
  if (r.created_at != null && (!isInt(r.created_at) || r.created_at < MIN_TS)) return 'tiene una fecha de registro inválida';
  return null;
}

// Lee el texto del archivo. Todo o nada: si algo no cuadra, no se importa ninguna medición.
export function parseBackup(text, now = Date.now()) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return fail('El archivo no es un respaldo de Mi presión. Elija el archivo que termina en .json y empieza con "mi-presion-respaldo".');
  }
  if (!data || typeof data !== 'object' || !Array.isArray(data.lecturas)) {
    return fail('El archivo no es un respaldo de Mi presión.');
  }
  if (data.version !== BACKUP_VERSION) {
    return fail('Este respaldo es de otra versión de la app y no se puede leer.');
  }
  for (let i = 0; i < data.lecturas.length; i++) {
    const problem = problemWith(data.lecturas[i], now);
    if (problem) return fail(`El respaldo ${problem} (medición ${i + 1}). No se importó nada.`);
  }

  // Normaliza y quita ids repetidos dentro del mismo archivo.
  const seen = new Set();
  const readings = [];
  for (const r of data.lecturas) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    readings.push({
      id: r.id, sys: r.sys, dia: r.dia, pul: r.pul ?? null, note: r.note ?? '', ts: r.ts, created_at: r.created_at ?? r.ts,
    });
  }
  readings.sort((a, b) => a.ts - b.ts);
  return { ok: true, readings, exportado: Number.isFinite(data.exportado) ? data.exportado : null };
}

function fail(message) {
  return { ok: false, message };
}

// Las mediciones del respaldo que todavía no existen (se combina por id: nunca se borra ni se duplica).
export function missingReadings(existing, incoming) {
  const ids = new Set(existing.map((r) => r.id));
  return incoming.filter((r) => !ids.has(r.id) && ids.add(r.id));
}

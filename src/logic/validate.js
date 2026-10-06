export const LIMITS = {
  sys: [50, 300],
  dia: [30, 200],
  pul: [25, 250],
};

export const NOTE_MAX = 200;

const inRange = (n, [min, max]) => Number.isInteger(n) && n >= min && n <= max;

// Recibe los textos del formulario y devuelve { ok, reading } o { ok: false, message }.
// `ts` es el momento de la medición en ms; `now` permite probar sin depender del reloj.
export function validateReading({ sys, dia, pul, note, ts }, now = Date.now()) {
  const s = String(sys ?? '').trim();
  const d = String(dia ?? '').trim();
  const p = String(pul ?? '').trim();

  if (!s) return fail('Escriba la presión alta (sistólica).');
  if (!d) return fail('Escriba la presión baja (diastólica).');

  const sysN = Number(s);
  const diaN = Number(d);
  const pulN = p ? Number(p) : null;

  if (!inRange(sysN, LIMITS.sys)) return fail('La presión alta (sistólica) debe estar entre 50 y 300.');
  if (!inRange(diaN, LIMITS.dia)) return fail('La presión baja (diastólica) debe estar entre 30 y 200.');
  if (pulN !== null && !inRange(pulN, LIMITS.pul)) return fail('El pulso debe estar entre 25 y 250. Si no lo tiene, déjelo vacío.');
  if (sysN <= diaN) return fail('La presión alta (sistólica) debe ser mayor que la baja (diastólica).');
  if (!Number.isFinite(ts)) return fail('La fecha u hora no es válida.');
  if (ts > now + 5 * 60 * 1000) return fail('La fecha y hora no pueden ser en el futuro.');

  return {
    ok: true,
    reading: {
      sys: sysN,
      dia: diaN,
      pul: pulN,
      note: String(note ?? '').trim().slice(0, NOTE_MAX),
      ts,
    },
  };
}

function fail(message) {
  return { ok: false, message };
}

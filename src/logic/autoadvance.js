// Deja solo dígitos, máximo 3.
export function sanitizeDigits(value) {
  return String(value ?? '').replace(/\D/g, '').slice(0, 3);
}

// Un valor está completo con 3 dígitos, o con 2 si el primero es 3 o mayor
// (así 95, 120, 78 y 105 avanzan solos sin tocar la pantalla).
export function isComplete(value) {
  return value.length === 3 || (value.length === 2 && Number(value[0]) >= 3);
}

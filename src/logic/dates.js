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

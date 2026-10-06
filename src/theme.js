// Tema claro/oscuro/automático: atributo data-theme en <html> + barras del sistema.
import { SystemBars, SystemBarsStyle } from '@capacitor/core';

const mq = window.matchMedia('(prefers-color-scheme: dark)');
const CACHE_KEY = 'mi-presion-tema'; // copia síncrona para aplicar el tema sin parpadeo al abrir
let current = 'auto';

export function isDark() {
  return current === 'dark' || (current === 'auto' && mq.matches);
}

export function applyTheme(pref) {
  current = pref;
  const root = document.documentElement;
  if (pref === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', pref);
  try { localStorage.setItem(CACHE_KEY, pref); } catch { /* sin almacenamiento: no pasa nada */ }
  sync();
}

// Aplica de inmediato el último tema conocido, antes de leer Preferences.
export function applyCachedTheme() {
  let pref = 'auto';
  try { pref = localStorage.getItem(CACHE_KEY) || 'auto'; } catch { /* nada */ }
  applyTheme(pref);
}

function sync() {
  const dark = isDark();
  // Íconos claros sobre fondo oscuro (Dark) o íconos oscuros sobre fondo claro (Light).
  SystemBars.setStyle({ style: dark ? SystemBarsStyle.Dark : SystemBarsStyle.Light }).catch(() => {});
  document.dispatchEvent(new CustomEvent('tema-cambiado', { detail: { dark } }));
}

mq.addEventListener('change', () => {
  if (current === 'auto') sync();
});

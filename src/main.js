import '@fontsource/barlow/latin-400.css';
import '@fontsource/barlow/latin-600.css';
import '@fontsource/barlow-condensed/latin-700.css';
import './styles.css';

import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';
import { mountRegistrar } from './ui/registrar.js';

const isNative = Capacitor.isNativePlatform();

const registrar = mountRegistrar(document.getElementById('view-registrar'));

/* ---------- pestañas ---------- */
const tabs = document.querySelectorAll('.tabbar [data-tab]');
const views = document.querySelectorAll('main [data-view]');

function showTab(name) {
  tabs.forEach((t) => {
    if (t.dataset.tab === name) t.setAttribute('aria-current', 'page');
    else t.removeAttribute('aria-current');
  });
  views.forEach((v) => (v.hidden = v.dataset.view !== name));
  window.scrollTo(0, 0);
}
tabs.forEach((t) => t.addEventListener('click', () => showTab(t.dataset.tab)));

/* ---------- teclado ---------- */
// Mientras el teclado está abierto se oculta la barra inferior para dejar espacio al formulario.
if (isNative) {
  Keyboard.addListener('keyboardWillShow', () => document.body.classList.add('kb-open'));
  Keyboard.addListener('keyboardWillHide', () => document.body.classList.remove('kb-open'));
}

/* ---------- arranque ---------- */
// Al abrir, Registrar con el teclado numérico listo.
showTab('registrar');
registrar.focusFirst();
if (isNative) setTimeout(() => Keyboard.show().catch(() => {}), 300);

import '@fontsource/barlow/latin-400.css';
import '@fontsource/barlow/latin-600.css';
import '@fontsource/barlow-condensed/latin-700.css';
import './styles.css';

import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';
import * as settings from './settings.js';
import { applyCachedTheme, applyTheme } from './theme.js';
import { mountRegistrar } from './ui/registrar.js';
import { mountHistorial } from './ui/historial.js';
import { mountAjustes } from './ui/ajustes.js';
import { mountResumen } from './ui/resumen.js';

const isNative = Capacitor.isNativePlatform();

// Tema antes de pintar nada, para que no parpadee.
applyCachedTheme();
settings.getTheme().then(applyTheme);

const $ = (id) => document.getElementById(id);
const registrar = mountRegistrar($('view-registrar'));
const historial = mountHistorial($('view-historial'));
const resumen = mountResumen($('view-resumen'));
const ajustes = mountAjustes($('view-ajustes'), { onBack: closeSettings });

document.addEventListener('lectura-guardada', (e) => historial.showWeekOf(e.detail.ts));

/* ---------- navegación ---------- */
const tabs = document.querySelectorAll('.tabbar [data-tab]');
const views = document.querySelectorAll('main [data-view]');
const settingsBtn = $('settingsBtn');
let currentTab = 'registrar';
let pendingTab = null;

function showView(name) {
  views.forEach((v) => (v.hidden = v.dataset.view !== name));
  tabs.forEach((t) => {
    if (t.dataset.tab === name) t.setAttribute('aria-current', 'page');
    else t.removeAttribute('aria-current');
  });
  settingsBtn.setAttribute('aria-pressed', String(name === 'ajustes'));
  if (name === 'historial') historial.refresh();
  if (name === 'resumen') resumen.refresh();
  if (name === 'ajustes') ajustes.refresh();
  window.scrollTo(0, 0);
}

const inSettings = () => history.state?.view === 'ajustes';

function showTab(name) {
  currentTab = name;
  if (inSettings()) {
    // Salir de Ajustes quitando su entrada del historial; popstate muestra la pestaña.
    pendingTab = name;
    history.back();
  } else {
    showView(name);
  }
}

// Ajustes es una entrada del historial: el botón "atrás" de Android regresa a la pestaña.
function openSettings() {
  if (inSettings()) return;
  history.pushState({ view: 'ajustes' }, '');
  showView('ajustes');
}

function closeSettings() {
  if (inSettings()) history.back();
}

window.addEventListener('popstate', () => {
  if (!inSettings() && !$('view-ajustes').hidden) {
    showView(pendingTab ?? currentTab);
    pendingTab = null;
  }
});

tabs.forEach((t) => t.addEventListener('click', () => showTab(t.dataset.tab)));
settingsBtn.addEventListener('click', () => (inSettings() ? closeSettings() : openSettings()));

/* ---------- teclado ---------- */
// Mientras el teclado está abierto se oculta la barra inferior para dejar espacio al formulario.
if (isNative) {
  Keyboard.addListener('keyboardWillShow', () => document.body.classList.add('kb-open'));
  Keyboard.addListener('keyboardWillHide', () => document.body.classList.remove('kb-open'));
}

/* ---------- arranque ---------- */
// Al abrir, Registrar con el teclado numérico listo.
showView('registrar');
registrar.focusFirst();
if (isNative) setTimeout(() => Keyboard.show().catch(() => {}), 300);

import * as settings from '../settings.js';
import { applyTheme } from '../theme.js';
import { icons } from './icons.js';
import { toast } from './toast.js';

const THEME_OPTIONS = [
  { value: 'auto', label: 'Automático', help: 'Igual que el teléfono', icon: icons.auto },
  { value: 'light', label: 'Claro', help: 'Fondo blanco', icon: icons.sun },
  { value: 'dark', label: 'Oscuro', help: 'Más cómodo de noche', icon: icons.moon },
];

const TEMPLATE = `
  <div class="back-row">
    <button type="button" class="btn-link" data-act="back">${icons.arrowLeft} Volver</button>
  </div>
  <h2 class="view-title" id="t-ajustes">Ajustes</h2>

  <section class="settings-section" aria-labelledby="s-tema">
    <h3 class="section-title" id="s-tema">Apariencia</h3>
    <p class="section-help">Elija cómo se ve la app.</p>
    <div class="card choice-list" role="radiogroup" aria-labelledby="s-tema">
      ${THEME_OPTIONS.map((o) => `
        <label class="choice">
          ${o.icon}
          <span class="choice-label">${o.label}<small>${o.help}</small></span>
          <input type="radio" name="tema" value="${o.value}">
          <span class="radio" aria-hidden="true"></span>
        </label>`).join('')}
    </div>
  </section>

  <section class="settings-section" aria-labelledby="s-nombre">
    <h3 class="section-title" id="s-nombre">Nombre del paciente</h3>
    <p class="section-help">Aparece en la hoja que se imprime para el doctor.</p>
    <form class="card name-form" id="nameForm" novalidate autocomplete="off">
      <div class="field">
        <label for="patientName">Nombre completo</label>
        <input id="patientName" maxlength="80" autocapitalize="words" enterkeyhint="done">
      </div>
      <button type="submit" class="btn-secondary">Guardar nombre</button>
    </form>
  </section>
`;

export function mountAjustes(root, { onBack }) {
  root.innerHTML = TEMPLATE;
  const nameInput = root.querySelector('#patientName');

  root.querySelector('[data-act="back"]').addEventListener('click', onBack);

  root.querySelectorAll('input[name="tema"]').forEach((input) => {
    input.addEventListener('change', async () => {
      applyTheme(input.value);
      await settings.setTheme(input.value);
    });
  });

  root.querySelector('#nameForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    await settings.setPatientName(name);
    nameInput.value = name;
    nameInput.blur();
    toast(name ? 'Nombre guardado' : 'Nombre borrado');
  });

  return {
    async refresh() {
      const [theme, name] = await Promise.all([settings.getTheme(), settings.getPatientName()]);
      root.querySelector(`input[name="tema"][value="${theme}"]`).checked = true;
      nameInput.value = name;
    },
  };
}

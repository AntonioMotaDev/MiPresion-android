import * as settings from '../settings.js';
import { createModal } from './modal.js';
import { icons } from './icons.js';

// Ilustraciones hechas con los mismos estilos de la app (se adaptan al tema).
const STEPS = [
  {
    title: 'Registre su presión',
    text: 'Escriba la presión alta y la baja. El cursor pasa solo al siguiente número. Después toque Guardar.',
    illus: `
      <div class="tut-card">
        <div class="tut-reading">
          <span class="tut-label">Presión alta</span><span class="tut-label">Presión baja</span>
          <span class="tut-num num">120</span><span class="tut-num num">80</span>
        </div>
        <span class="tut-save">${icons.check} Guardar</span>
      </div>`,
  },
  {
    title: 'Vea su historial',
    text: 'En Historial están sus mediciones por semana. Si se equivocó, toque la medición y luego Eliminar.',
    illus: `
      <div class="tut-card">
        <p class="tut-day">Lunes <span class="muted">5 oct</span></p>
        <div class="tut-row"><span class="muted">8:15</span><span class="num">128/82</span><span class="tag c2">Alta etapa 1</span></div>
        <div class="tut-row is-picked"><span class="muted">20:10</span><span class="num">135/85</span><span class="tut-delete">Eliminar</span></div>
      </div>`,
  },
  {
    title: 'Resumen y doctor',
    text: 'En Resumen verá su gráfica y su promedio. En Historial, toque "Imprimir para el doctor" para mandar o imprimir sus registros.',
    illus: `
      <div class="tut-card">
        <svg class="tut-chart" viewBox="0 0 240 90" aria-hidden="true">
          <line x1="0" y1="30" x2="240" y2="30" class="tut-ref"/>
          <line x1="0" y1="66" x2="240" y2="66" class="tut-ref"/>
          <polyline points="10,28 50,20 90,32 130,18 170,26 210,22 230,24" class="tut-sys"/>
          <polyline points="10,64 50,58 90,68 130,60 170,66 210,62 230,63" class="tut-dia"/>
        </svg>
        <span class="tut-print">${icons.printer} Imprimir para el doctor</span>
      </div>`,
  },
];

export function createTutorial() {
  const modal = createModal('modal-full');
  let step = 0;
  let decided = false; // se eligió con Empezar o Saltar (si no, se cerró con "atrás")

  modal.el.innerHTML = `
    <div class="tut">
      <div class="tut-top">
        <span class="tut-count" id="tutCount"></span>
        <button type="button" class="btn-link" data-act="skip">Saltar</button>
      </div>
      <div class="tut-body" aria-live="polite">
        <div class="tut-illus" id="tutIllus" aria-hidden="true"></div>
        <h2 class="tut-title" id="tutTitle"></h2>
        <p class="tut-text" id="tutText"></p>
      </div>
      <div class="tut-bottom">
        <div class="tut-dots" aria-hidden="true">${STEPS.map(() => '<span></span>').join('')}</div>
        <label class="tut-check" id="tutCheckRow" hidden>
          <input type="checkbox" id="tutDontShow" checked>
          <span class="tut-box" aria-hidden="true">${icons.check}</span>
          No volver a mostrar
        </label>
        <button type="button" class="btn-primary" id="tutNext"></button>
      </div>
    </div>`;

  const $ = (id) => modal.el.querySelector('#' + id);
  const dontShow = $('tutDontShow');

  function render() {
    const s = STEPS[step];
    const last = step === STEPS.length - 1;
    $('tutCount').textContent = `Paso ${step + 1} de ${STEPS.length}`;
    $('tutIllus').innerHTML = s.illus;
    $('tutTitle').textContent = s.title;
    $('tutText').textContent = s.text;
    $('tutCheckRow').hidden = !last;
    $('tutNext').textContent = last ? 'Empezar' : 'Siguiente';
    modal.el.querySelectorAll('.tut-dots span').forEach((d, i) => d.classList.toggle('on', i === step));
    $('tutNext').focus();
  }

  $('tutNext').addEventListener('click', () => {
    if (step < STEPS.length - 1) {
      step++;
      render();
    } else {
      finish(dontShow.checked);
    }
  });
  // "Saltar" (o "atrás") cuenta como no volver a mostrar: ya decidió que no lo necesita.
  modal.el.querySelector('[data-act="skip"]').addEventListener('click', () => finish(true));

  async function finish(seen) {
    decided = true;
    await settings.setTutorialSeen(seen);
    await modal.close();
  }

  // Abre el tutorial; la promesa se cumple cuando se cierra.
  function show() {
    step = 0;
    decided = false;
    dontShow.checked = true;
    render();
    return new Promise((resolve) => {
      modal.open(async () => {
        if (!decided) await settings.setTutorialSeen(true); // "atrás" = como Saltar
        resolve();
      });
      $('tutNext').focus(); // showModal enfoca "Saltar"; el paso natural es "Siguiente"
    });
  }

  return { show };
}

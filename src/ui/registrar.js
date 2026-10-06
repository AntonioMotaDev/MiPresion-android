import * as storage from '../storage.js';
import { classify, CATEGORIES, CRISIS_MESSAGE } from '../logic/classify.js';
import { validateReading, NOTE_MAX } from '../logic/validate.js';
import { isComplete, sanitizeDigits } from '../logic/autoadvance.js';
import { toLocalInputValue, formatTime, formatDateLong } from '../logic/dates.js';

const TEMPLATE = `
  <div class="saved" id="saved" role="status" hidden></div>
  <form class="card" id="form" novalidate autocomplete="off">
    <div class="reading">
      <div class="field">
        <label for="sys">Presión alta <small>Sistólica</small></label>
        <input id="sys" class="big" inputmode="numeric" pattern="[0-9]*" maxlength="3" enterkeyhint="next">
      </div>
      <div class="slash" aria-hidden="true">/</div>
      <div class="field">
        <label for="dia">Presión baja <small>Diastólica</small></label>
        <input id="dia" class="big" inputmode="numeric" pattern="[0-9]*" maxlength="3" enterkeyhint="next">
      </div>
    </div>
    <div class="row2">
      <div class="field">
        <label for="pul"><span class="pulse-heart" aria-hidden="true">♥</span> Pulso <small>Opcional</small></label>
        <input id="pul" class="mid" inputmode="numeric" pattern="[0-9]*" maxlength="3" enterkeyhint="next">
      </div>
      <div class="field">
        <label for="note">Notas <small>Opcional</small></label>
        <input id="note" maxlength="${NOTE_MAX}" placeholder="Ej. brazo izquierdo" enterkeyhint="done">
      </div>
    </div>
    <div class="when">
      <span class="when-text" id="whenText">Fecha y hora: ahora</span>
      <button type="button" class="btn-link" id="whenBtn">Cambiar fecha u hora</button>
      <input type="datetime-local" id="whenInput" aria-label="Fecha y hora de la medición" hidden>
      <button type="button" class="btn-link" id="whenNow" hidden>Usar la hora actual</button>
    </div>
    <p class="hint" id="hint" aria-live="polite"></p>
    <button type="submit" class="btn-primary" id="save">Guardar</button>
  </form>
`;

export function mountRegistrar(root) {
  root.innerHTML = TEMPLATE;
  const $ = (id) => root.querySelector('#' + id);
  const sys = $('sys'), dia = $('dia'), pul = $('pul'), note = $('note');
  const order = [sys, dia, pul, note];
  const hint = $('hint'), saved = $('saved'), form = $('form'), saveBtn = $('save');
  const whenText = $('whenText'), whenBtn = $('whenBtn'), whenInput = $('whenInput'), whenNow = $('whenNow');

  let customWhen = null; // null = "ahora"

  const currentTs = () => (customWhen === null ? Date.now() : customWhen);
  const values = () => ({ sys: sys.value, dia: dia.value, pul: pul.value, note: note.value, ts: currentTs() });

  function showError(message) {
    hint.className = 'hint error';
    hint.textContent = message;
  }

  function showCategory(s, d) {
    const c = classify(s, d);
    hint.className = 'hint';
    hint.innerHTML = `<span class="tag c${c}">${CATEGORIES[c]}</span>`;
    if (c === 4) hint.insertAdjacentHTML('beforeend', `<span class="crisis">${CRISIS_MESSAGE}</span>`);
  }

  // Revisa mientras escribe, pero solo opina cuando los números ya están completos.
  function liveCheck() {
    const ready = isComplete(sys.value) && isComplete(dia.value) && (!pul.value || isComplete(pul.value));
    if (!ready) {
      hint.className = 'hint';
      hint.textContent = '';
      return;
    }
    const r = validateReading(values());
    if (r.ok) showCategory(r.reading.sys, r.reading.dia);
    else showError(r.message);
  }

  [sys, dia, pul].forEach((el, i) => {
    el.addEventListener('input', () => {
      el.value = sanitizeDigits(el.value);
      saved.hidden = true;
      if (isComplete(el.value)) order[i + 1].focus();
      liveCheck();
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        order[i + 1].focus();
      }
    });
  });
  note.addEventListener('input', () => (saved.hidden = true));

  /* ---------- fecha y hora ---------- */
  whenBtn.addEventListener('click', () => {
    customWhen = Date.now();
    whenInput.value = toLocalInputValue(customWhen);
    whenInput.max = toLocalInputValue(Date.now());
    whenText.textContent = 'Fecha y hora:';
    whenBtn.hidden = true;
    whenInput.hidden = false;
    whenNow.hidden = false;
    whenInput.focus();
  });
  whenInput.addEventListener('change', () => {
    const t = new Date(whenInput.value).getTime();
    customWhen = Number.isFinite(t) ? t : NaN;
    liveCheck();
  });
  whenNow.addEventListener('click', resetWhen);

  function resetWhen() {
    customWhen = null;
    whenText.textContent = 'Fecha y hora: ahora';
    whenBtn.hidden = false;
    whenInput.hidden = true;
    whenNow.hidden = true;
  }

  /* ---------- guardar ---------- */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const r = validateReading(values());
    if (!r.ok) {
      showError(r.message);
      return;
    }
    saveBtn.disabled = true;
    try {
      const reading = await storage.add(r.reading);
      form.reset();
      resetWhen();
      hint.className = 'hint';
      hint.textContent = '';
      document.activeElement?.blur();
      showSaved(reading);
    } catch (err) {
      console.error(err);
      showError('No se pudo guardar. Intente de nuevo.');
    } finally {
      saveBtn.disabled = false;
    }
  });

  function showSaved(r) {
    const c = classify(r.sys, r.dia);
    saved.innerHTML = `
      <div class="saved-title">Guardado ✓</div>
      <div class="saved-values">${r.sys}/${r.dia}${r.pul ? ` <span class="pulse-heart">♥</span> ${r.pul}` : ''}</div>
      <span class="tag c${c}">${CATEGORIES[c]}</span>
      ${c === 4 ? `<span class="crisis">${CRISIS_MESSAGE}</span>` : ''}
      <p>${formatDateLong(r.ts)}, ${formatTime(r.ts)}</p>`;
    saved.hidden = false;
    window.scrollTo(0, 0);
  }

  return {
    focusFirst: () => sys.focus(),
  };
}

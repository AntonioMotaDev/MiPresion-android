import * as storage from '../storage.js';
import { classify, CATEGORIES } from '../logic/classify.js';
import {
  DAY_NAMES, weekDays, weekOffsetOf, groupByDay, weekTitle, formatDayMonth, formatTime, formatDateLong, sameDay,
} from '../logic/dates.js';
import { createModal } from './modal.js';
import { toast } from './toast.js';

const TEMPLATE = `
  <div class="weekhead">
    <h2 id="weekTitle">Esta semana</h2>
    <p id="weekRange" class="muted"></p>
  </div>
  <div class="weeknav">
    <button type="button" class="btn-secondary" id="prev">‹ Semana anterior</button>
    <button type="button" class="btn-secondary" id="next">Semana siguiente ›</button>
  </div>
  <p id="emptyWeek" class="placeholder" hidden></p>
  <div id="days"></div>
`;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function mountHistorial(root) {
  root.innerHTML = TEMPLATE;
  const $ = (id) => root.querySelector('#' + id);
  const daysEl = $('days'), prev = $('prev'), next = $('next'), emptyWeek = $('emptyWeek');

  let offset = 0;
  let all = [];

  async function refresh() {
    all = await storage.list();
    render();
  }

  function render() {
    const days = weekDays(offset);
    $('weekTitle').textContent = weekTitle(offset, days);
    $('weekRange').textContent = offset > -2 ? `${formatDayMonth(days[0])} al ${formatDayMonth(days[6])}` : '';

    const oldest = all.length ? weekOffsetOf(all[0].ts) : 0;
    prev.disabled = offset <= oldest;
    next.disabled = offset >= 0;

    const groups = groupByDay(all, days);
    const total = groups.reduce((n, g) => n + g.readings.length, 0);
    emptyWeek.hidden = total > 0;
    emptyWeek.textContent = all.length === 0
      ? 'Aún no hay mediciones. Registre la primera en la pestaña Registrar.'
      : 'No hay mediciones en esta semana.';

    const today = new Date();
    daysEl.replaceChildren(...groups.map(({ day, readings }, i) => {
      const wrap = document.createElement('section');
      wrap.className = 'day' + (sameDay(day, today) ? ' today' : '');
      wrap.innerHTML = `<h3 class="day-name">${DAY_NAMES[i]} <small>${formatDayMonth(day)}${sameDay(day, today) ? ' · Hoy' : ''}</small></h3>`;
      if (!readings.length) {
        wrap.insertAdjacentHTML('beforeend', '<p class="day-empty">Sin mediciones</p>');
      }
      readings.forEach((r) => wrap.appendChild(readingButton(r)));
      return wrap;
    }));
  }

  function readingButton(r) {
    const c = classify(r.sys, r.dia);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'reading-row';
    b.setAttribute('aria-label', `${formatTime(r.ts)}: ${r.sys} sobre ${r.dia}${r.pul ? `, pulso ${r.pul}` : ''}, ${CATEGORIES[c]}. Toque para ver o eliminar.`);
    b.innerHTML = `
      <span class="rr-time">${formatTime(r.ts)}</span>
      <span class="rr-value">${r.sys}/${r.dia}</span>
      <span class="tag c${c}">${CATEGORIES[c]}</span>
      ${r.pul || r.note ? `<span class="rr-extra">${r.pul ? `<span class="pulse-heart">♥</span> ${r.pul}` : ''}${r.pul && r.note ? ' · ' : ''}${esc(r.note)}</span>` : ''}`;
    b.addEventListener('click', () => openDetail(r));
    return b;
  }

  /* ---------- detalle y eliminar ---------- */
  const modal = createModal();

  function openDetail(r) {
    showDetail(r);
    modal.open();
  }

  function showDetail(r) {
    const c = classify(r.sys, r.dia);
    modal.el.innerHTML = `
      <p class="modal-value">${r.sys}/${r.dia}${r.pul ? ` <span class="pulse-heart">♥</span> ${r.pul}` : ''}</p>
      <p><span class="tag c${c}">${CATEGORIES[c]}</span></p>
      <p>${formatDateLong(r.ts)}, ${formatTime(r.ts)}</p>
      ${r.note ? `<p class="modal-note">${esc(r.note)}</p>` : ''}
      <div class="modal-actions">
        <button type="button" class="btn-secondary" data-act="close">Cerrar</button>
        <button type="button" class="btn-danger" data-act="ask">Eliminar</button>
      </div>`;
    modal.el.querySelector('[data-act="close"]').addEventListener('click', modal.close);
    modal.el.querySelector('[data-act="ask"]').addEventListener('click', () => showConfirm(r));
    modal.el.querySelector('[data-act="close"]').focus();
  }

  function showConfirm(r) {
    modal.el.innerHTML = `
      <p class="modal-question">¿Eliminar esta medición?</p>
      <p><strong>${r.sys}/${r.dia}</strong> del ${formatDateLong(r.ts).replace(',', '')}, ${formatTime(r.ts)}</p>
      <p class="muted">No se puede deshacer.</p>
      <div class="modal-actions">
        <button type="button" class="btn-secondary" data-act="no">No, dejarla</button>
        <button type="button" class="btn-danger" data-act="yes">Sí, eliminar</button>
      </div>`;
    modal.el.querySelector('[data-act="no"]').addEventListener('click', modal.close);
    modal.el.querySelector('[data-act="yes"]').addEventListener('click', async (e) => {
      e.currentTarget.disabled = true;
      try {
        await storage.remove(r.id);
        modal.close();
        toast('Medición eliminada');
        await refresh();
      } catch (err) {
        console.error(err);
        modal.close();
        toast('No se pudo eliminar. Intente de nuevo.');
      }
    });
    modal.el.querySelector('[data-act="no"]').focus();
  }

  prev.addEventListener('click', () => { offset--; render(); });
  next.addEventListener('click', () => { if (offset < 0) { offset++; render(); } });

  return {
    refresh,
    // Después de guardar, mostrar la semana de esa medición.
    showWeekOf(ts) {
      offset = Math.min(0, weekOffsetOf(ts));
    },
  };
}

import * as storage from '../storage.js';
import { CATEGORIES } from '../logic/classify.js';
import { PERIODS, inPeriod, summarize } from '../logic/stats.js';
import { formatDayMonth, formatTime } from '../logic/dates.js';

const DEFAULT_DAYS = 30;
const MIN_FOR_CHART = 3;

const TEMPLATE = `
  <h2 class="view-title" id="t-resumen">Resumen</h2>
  <div class="segmented" role="radiogroup" aria-label="Periodo">
    ${PERIODS.map((d) => `
      <label class="segment">
        <input type="radio" name="periodo" value="${d}" ${d === DEFAULT_DAYS ? 'checked' : ''}>
        <span>${d} días</span>
      </label>`).join('')}
  </div>
  <div id="summary" class="summary"></div>
`;

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const when = (ts) => `${formatDayMonth(ts)}, ${formatTime(ts)}`;

export function mountResumen(root) {
  root.innerHTML = TEMPLATE;
  const summaryEl = root.querySelector('#summary');
  let days = DEFAULT_DAYS;
  let chart = null;
  let chartModule = null;
  let current = null; // { readings, from, to } para redibujar al cambiar de tema

  root.querySelectorAll('input[name="periodo"]').forEach((input) =>
    input.addEventListener('change', () => {
      days = Number(input.value);
      refresh();
    }));

  document.addEventListener('tema-cambiado', () => {
    if (current && !root.hidden) drawChart();
  });

  async function refresh() {
    const all = await storage.list();
    const now = new Date();
    const readings = inPeriod(all, days, now);
    render(all.length, readings, now);
  }

  function render(totalAll, readings, now) {
    destroyChart();
    current = null;
    const s = summarize(readings);

    if (!s) {
      summaryEl.innerHTML = `<p class="card placeholder">${totalAll
        ? `No hay mediciones en los últimos ${days} días.`
        : 'Aún no hay mediciones. Registre la primera en la pestaña Registrar.'}</p>`;
      return;
    }

    const { average: a } = s;
    summaryEl.innerHTML = `
      <section class="card stat-hero" aria-label="Promedio">
        <p class="stat-label">Promedio de ${plural(s.count, 'medición', 'mediciones')}</p>
        <p class="stat-value num">${a.sys}/${a.dia}</p>
        <p class="stat-sub">
          <span class="tag c${a.category}">${CATEGORIES[a.category]}</span>
          ${a.pul ? `<span class="stat-pulse"><span class="pulse-heart">♥</span> Pulso ${a.pul}</span>` : ''}
        </p>
      </section>

      ${s.count >= MIN_FOR_CHART ? `
        <section class="card chart-card" aria-labelledby="chartTitle">
          <h3 class="card-title" id="chartTitle">Presión en el tiempo</h3>
          <ul class="legend">
            <li><span class="key key-sys" aria-hidden="true"></span> Alta (sistólica)</li>
            <li><span class="key key-dia" aria-hidden="true"></span> Baja (diastólica)</li>
            <li><span class="key key-ref" aria-hidden="true"></span> Referencia 120 y 80</li>
          </ul>
          <div class="chart-box">
            <canvas id="chart" role="img" aria-label="Gráfica de la presión alta y baja en los últimos ${days} días"></canvas>
          </div>
          <p class="chart-help">Toque un punto para ver el valor.</p>
        </section>` : `
        <p class="card placeholder">La gráfica aparece cuando hay al menos ${MIN_FOR_CHART} mediciones en el periodo. Por ahora hay ${s.count}.</p>`}

      <div class="stat-pair">
        <section class="card stat-tile">
          <p class="stat-label">Más alta</p>
          <p class="stat-value-sm num">${s.highest.sys}/${s.highest.dia}</p>
          <p class="stat-date">${when(s.highest.ts)}</p>
        </section>
        <section class="card stat-tile">
          <p class="stat-label">Más baja</p>
          <p class="stat-value-sm num">${s.lowest.sys}/${s.lowest.dia}</p>
          <p class="stat-date">${when(s.lowest.ts)}</p>
        </section>
      </div>

      <section class="card" aria-labelledby="catTitle">
        <h3 class="card-title" id="catTitle">Por clasificación</h3>
        <ul class="cat-list">
          ${CATEGORIES.map((name, i) => {
            const n = s.byCategory[i];
            const pct = Math.round((n / s.count) * 100);
            return `
              <li class="cat-row">
                <span class="cat-name">${name}</span>
                <span class="cat-count num">${n}</span>
                <span class="cat-track" aria-hidden="true"><span class="cat-fill b${i}" style="width:${pct}%"></span></span>
              </li>`;
          }).join('')}
        </ul>
      </section>`;

    if (s.count >= MIN_FOR_CHART) {
      const to = new Date(now);
      to.setHours(23, 59, 59, 999);
      const from = new Date(now);
      from.setHours(0, 0, 0, 0);
      from.setDate(from.getDate() - (days - 1));
      current = { readings, from: from.getTime(), to: to.getTime() };
      drawChart();
    }
  }

  async function drawChart() {
    destroyChart();
    const canvas = summaryEl.querySelector('#chart');
    if (!canvas || !current) return;
    chartModule ??= await import('./chart.js'); // chart.js se carga solo al abrir Resumen
    await document.fonts.ready;
    chart = chartModule.drawPressureChart(canvas, current.readings, current);
  }

  function destroyChart() {
    chart?.destroy();
    chart = null;
  }

  return { refresh };
}

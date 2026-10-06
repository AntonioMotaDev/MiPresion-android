// Gráfica de presión en el tiempo. Solo lo necesario de chart.js (tree-shaking).
import { Chart, LineController, LineElement, PointElement, LinearScale, Tooltip } from 'chart.js';
import { formatDayMonth, formatDateLong, formatTime } from '../logic/dates.js';
import { yRange } from '../logic/stats.js';

Chart.register(LineController, LineElement, PointElement, LinearScale, Tooltip);

const REFERENCE = [80, 120];
const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Líneas punteadas de referencia en 120 y 80 (sin plugins extra).
const referenceLines = {
  id: 'referenceLines',
  beforeDatasetsDraw(chart, _args, opts) {
    const { ctx, chartArea: a, scales: { y } } = chart;
    ctx.save();
    ctx.setLineDash([6, 5]);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = opts.color;
    for (const v of REFERENCE) {
      const py = Math.round(y.getPixelForValue(v)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(a.left, py);
      ctx.lineTo(a.right, py);
      ctx.stroke();
    }
    ctx.restore();
  },
};

export function drawPressureChart(canvas, readings, { from, to }) {
  const colors = {
    sys: css('--series-sys'),
    dia: css('--series-dia'),
    surface: css('--surface'),
    muted: css('--muted'),
    line: css('--line'),
    ref: css('--ref-line'),
    tipBg: css('--primary'),
    tipFg: css('--on-primary'),
  };
  const dense = readings.length > 20;
  const { min, max } = yRange(readings);
  const font = { family: 'Barlow, system-ui, sans-serif', size: 15 };

  const series = (key, label, color, pointStyle) => ({
    label,
    data: readings.map((r) => ({ x: r.ts, y: r[key] })),
    borderColor: color,
    backgroundColor: color,
    borderWidth: 2.5,
    pointStyle,
    pointRadius: dense ? 3 : 5,
    pointHoverRadius: 8,
    pointHitRadius: 18,
    pointBorderColor: colors.surface, // anillo del color de la tarjeta (solo con pocos puntos)
    pointBorderWidth: dense ? 0 : 2,
    pointHoverBorderWidth: 2,
    cubicInterpolationMode: 'monotone', // suaviza sin inventar picos
    tension: 0.3,
  });

  return new Chart(canvas, {
    type: 'line',
    data: {
      datasets: [
        series('sys', 'Alta (sistólica)', colors.sys, 'circle'),
        series('dia', 'Baja (diastólica)', colors.dia, 'rect'),
      ],
    },
    plugins: [referenceLines],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: reducedMotion() ? false : { duration: 300 },
      layout: { padding: { top: 8, right: 8 } },
      interaction: { mode: 'index', intersect: false },
      events: ['click', 'touchstart'], // tocar un punto muestra el valor; nada de arrastrar ni zoom
      scales: {
        x: {
          type: 'linear',
          min: from,
          max: to,
          grid: { display: false },
          border: { color: colors.line },
          afterBuildTicks: (axis) => {
            // Cuatro fechas repartidas en el periodo, de la primera a hoy.
            const step = (to - from) / 3;
            axis.ticks = [0, 1, 2, 3].map((i) => ({ value: Math.round(from + i * step) }));
          },
          ticks: {
            color: colors.muted,
            font,
            maxRotation: 0,
            callback: (v) => formatDayMonth(v),
          },
        },
        y: {
          min,
          max,
          grid: { display: false },
          border: { display: false },
          afterBuildTicks: (axis) => {
            // Marcas cada 40 (incluye 80 y 120, las líneas de referencia).
            const ticks = [];
            for (let v = Math.ceil(min / 40) * 40; v <= max; v += 40) ticks.push({ value: v });
            axis.ticks = ticks;
          },
          ticks: { color: colors.muted, font, padding: 6 },
        },
      },
      plugins: {
        referenceLines: { color: colors.ref },
        legend: { display: false }, // la leyenda va en HTML, más grande y legible
        tooltip: {
          backgroundColor: colors.tipBg,
          titleColor: colors.tipFg,
          bodyColor: colors.tipFg,
          titleFont: { ...font, size: 16, weight: '600' },
          bodyFont: { ...font, size: 17 },
          padding: 12,
          cornerRadius: 12,
          boxPadding: 6,
          usePointStyle: true,
          callbacks: {
            title: (items) => {
              const ts = items[0].parsed.x;
              return `${formatDateLong(ts)}, ${formatTime(ts)}`;
            },
            label: (item) => `${item.datasetIndex === 0 ? 'Alta' : 'Baja'}: ${item.parsed.y}`,
            labelColor: (item) => ({ borderColor: colors.surface, backgroundColor: item.dataset.borderColor }),
            labelPointStyle: (item) => ({ pointStyle: item.dataset.pointStyle, rotation: 0 }),
          },
        },
      },
    },
  });
}

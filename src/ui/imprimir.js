import * as storage from '../storage.js';
import * as settings from '../settings.js';
import { REPORT_PERIODS, buildReport, reportFileName } from '../logic/report.js';
import { createModal } from './modal.js';
import { toast } from './toast.js';
import { isShareCancel } from '../share.js';

// Ventana "Imprimir para el doctor": periodo, con o sin notas, y el nombre la primera vez.
export function createPrintDialog() {
  const modal = createModal('modal-print');
  let busy = false;

  async function open() {
    const name = await settings.getPatientName();
    modal.el.innerHTML = `
      <form id="printForm" novalidate>
        <p class="modal-question">Imprimir para el doctor</p>

        <fieldset class="print-group">
          <legend>¿Qué mediciones?</legend>
          <div class="choice-list compact">
            ${REPORT_PERIODS.map((p) => `
              <label class="choice">
                <span class="choice-label">${p.label}</span>
                <input type="radio" name="periodoPdf" value="${p.value}" ${p.value === '30' ? 'checked' : ''}>
                <span class="radio" aria-hidden="true"></span>
              </label>`).join('')}
          </div>
        </fieldset>

        <fieldset class="print-group">
          <legend>Notas</legend>
          <div class="segmented two">
            <label class="segment"><input type="radio" name="notas" value="si" checked><span>Con notas</span></label>
            <label class="segment"><input type="radio" name="notas" value="no"><span>Sin notas</span></label>
          </div>
        </fieldset>

        ${name ? '' : `
        <div class="field print-group">
          <label for="printName">Nombre del paciente <small>Se guarda para la próxima vez</small></label>
          <input id="printName" maxlength="80" autocapitalize="words" enterkeyhint="done">
        </div>`}

        <p class="hint error" id="printError" role="alert"></p>
        <div class="modal-actions">
          <button type="button" class="btn-secondary" data-act="cancel">Cancelar</button>
          <button type="submit" class="btn-primary inline" id="printGo">Crear PDF</button>
        </div>
      </form>`;

    const form = modal.el.querySelector('#printForm');
    const errorEl = modal.el.querySelector('#printError');
    modal.el.querySelector('[data-act="cancel"]').addEventListener('click', modal.close);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      generate(form, errorEl, name);
    });
    modal.open();
  }

  async function generate(form, errorEl, savedName) {
    if (busy) return;
    errorEl.textContent = '';
    const nameInput = form.querySelector('#printName');
    const name = savedName || nameInput.value.trim();
    if (!name) {
      errorEl.textContent = 'Escriba el nombre del paciente para la hoja.';
      nameInput.focus();
      return;
    }

    const periodValue = form.querySelector('input[name="periodoPdf"]:checked').value;
    const withNotes = form.querySelector('input[name="notas"]:checked').value === 'si';
    const report = buildReport(await storage.list(), periodValue);
    if (!report.count) {
      errorEl.textContent = 'No hay mediciones en ese periodo. Elija otro.';
      return;
    }

    busy = true;
    const button = form.querySelector('#printGo');
    button.disabled = true;
    button.textContent = 'Creando…';
    try {
      if (!savedName) await settings.setPatientName(name);
      const { createReportPdf, sharePdf } = await import('../pdf.js'); // jsPDF solo se carga aquí
      const doc = createReportPdf(report, { name, withNotes });
      modal.close();
      await sharePdf(doc, reportFileName());
    } catch (err) {
      if (!isShareCancel(err)) {
        console.error(err);
        toast('No se pudo crear el PDF. Intente de nuevo.');
      }
    } finally {
      busy = false;
    }
  }

  return { open };
}

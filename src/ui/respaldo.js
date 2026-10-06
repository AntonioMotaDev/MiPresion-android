import * as storage from '../storage.js';
import { buildBackup, backupFileName, parseBackup } from '../logic/backup.js';
import { formatDateFull } from '../logic/report.js';
import { shareFile, isShareCancel } from '../share.js';
import { createModal } from './modal.js';
import { icons } from './icons.js';
import { toast } from './toast.js';

const TEMPLATE = `
  <h3 class="section-title" id="s-respaldo">Respaldo</h3>
  <p class="section-help">Guarde una copia de sus mediciones por si cambia de teléfono. Mándela a Drive, WhatsApp o correo.</p>
  <div class="card backup-actions">
    <button type="button" class="btn-secondary" data-act="save">${icons.download} Guardar respaldo</button>
    <button type="button" class="btn-secondary" data-act="restore">${icons.upload} Restaurar respaldo</button>
    <input type="file" id="backupFile" accept="application/json,.json,text/plain,application/octet-stream" hidden>
  </div>
`;

const plural = (n) => `${n} ${n === 1 ? 'medición' : 'mediciones'}`;

export function mountRespaldo(root) {
  root.innerHTML = TEMPLATE;
  const fileInput = root.querySelector('#backupFile');
  const modal = createModal();

  /* ---------- guardar ---------- */
  root.querySelector('[data-act="save"]').addEventListener('click', async (e) => {
    const button = e.currentTarget;
    const all = await storage.list();
    if (!all.length) {
      toast('Aún no hay mediciones para respaldar.');
      return;
    }
    button.disabled = true;
    try {
      const text = JSON.stringify(buildBackup(all));
      await shareFile(backupFileName(), { text }, { title: 'Respaldo de Mi presión', mime: 'application/json' });
    } catch (err) {
      if (!isShareCancel(err)) {
        console.error(err);
        toast('No se pudo guardar el respaldo. Intente de nuevo.');
      }
    } finally {
      button.disabled = false;
    }
  });

  /* ---------- restaurar ---------- */
  root.querySelector('[data-act="restore"]').addEventListener('click', () => {
    fileInput.value = '';
    fileInput.click();
  });

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    let text;
    try {
      text = await file.text();
    } catch {
      showMessage('No se pudo leer el archivo', 'Intente de nuevo o elija otro archivo.');
      return;
    }
    const parsed = parseBackup(text);
    if (!parsed.ok) {
      showMessage('No se puede restaurar', parsed.message);
      return;
    }
    if (!parsed.readings.length) {
      showMessage('El respaldo está vacío', 'Ese archivo no tiene mediciones.');
      return;
    }
    confirmRestore(parsed.readings);
  });

  function confirmRestore(readings) {
    const first = readings[0].ts;
    const last = readings[readings.length - 1].ts;
    modal.el.innerHTML = `
      <p class="modal-question">¿Restaurar este respaldo?</p>
      <p>Tiene <strong>${plural(readings.length)}</strong>, del ${formatDateFull(first)} al ${formatDateFull(last)}.</p>
      <p class="muted">Se agregan las que falten. No se borra ni se repite ninguna.</p>
      <div class="modal-actions">
        <button type="button" class="btn-secondary" data-act="no">No</button>
        <button type="button" class="btn-primary inline" data-act="yes">Sí, restaurar</button>
      </div>`;
    modal.el.querySelector('[data-act="no"]').addEventListener('click', modal.close);
    modal.el.querySelector('[data-act="yes"]').addEventListener('click', async (e) => {
      e.currentTarget.disabled = true;
      try {
        const added = await storage.importMany(readings);
        await modal.close();
        showMessage(
          'Respaldo restaurado',
          added ? `Se agregaron ${plural(added)}.` : 'No había mediciones nuevas: ya estaban todas en este teléfono.',
          true,
        );
      } catch (err) {
        console.error(err);
        modal.close();
        toast('No se pudo restaurar. Intente de nuevo.');
      }
    });
    modal.open();
  }

  function showMessage(title, text, success = false) {
    modal.el.innerHTML = `
      ${success ? `<span class="saved-check">${icons.check}</span>` : ''}
      <p class="modal-question">${title}</p>
      <p>${text}</p>
      <div class="modal-actions single">
        <button type="button" class="btn-primary inline" data-act="ok">Entendido</button>
      </div>`;
    modal.el.querySelector('[data-act="ok"]').addEventListener('click', modal.close);
    modal.open();
  }
}

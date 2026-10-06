// <dialog> que se cierra con el botón "atrás" de Android sin salir de la app.
// Al abrir se agrega una entrada al historial; "atrás" la quita y cerramos el diálogo.
export function createModal(className = '') {
  const dlg = document.createElement('dialog');
  dlg.className = `modal ${className}`.trim();
  document.body.appendChild(dlg);

  let onClose = null;

  window.addEventListener('popstate', () => {
    if (dlg.open) finish();
  });
  dlg.addEventListener('cancel', (e) => {
    e.preventDefault();
    close();
  });
  // Tocar fuera del cuadro también cierra.
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) close();
  });

  function finish() {
    dlg.close();
    const cb = onClose;
    onClose = null;
    cb?.();
  }

  function open(callbackOnClose) {
    onClose = callbackOnClose ?? null;
    dlg.showModal();
    history.pushState({ modal: true }, '');
  }

  function close() {
    if (!dlg.open) return;
    if (history.state?.modal) history.back(); // dispara popstate → finish()
    else finish();
  }

  return { el: dlg, open, close };
}

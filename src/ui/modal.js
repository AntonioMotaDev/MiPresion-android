// <dialog> que se cierra con el botón "atrás" de Android sin salir de la app.
// Al abrir se agrega una entrada al historial; "atrás" la quita y cerramos el diálogo.
let nextId = 1;

export function createModal(className = '') {
  const dlg = document.createElement('dialog');
  dlg.className = `modal ${className}`.trim();
  document.body.appendChild(dlg);

  let currentId = null; // entrada del historial de esta apertura
  let onClose = null;
  let closing = null; // promesa del cierre en curso (esperando el popstate de history.back())

  window.addEventListener('popstate', () => {
    // "Atrás" del teléfono con el diálogo abierto. Solo si ya no estamos en la entrada de esta
    // apertura, para que un "atrás" tardío no cierre otro diálogo.
    if (dlg.open && !closing && history.state?.modal !== currentId) finish();
  });
  dlg.addEventListener('cancel', (e) => {
    // Chromium también dispara "cancel" al recorrer el historial; si ya estamos cerrando, nada.
    e.preventDefault();
    if (!closing) close();
  });
  // Tocar fuera del cuadro también cierra.
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) close();
  });

  function finish() {
    dlg.close();
    currentId = null;
    const cb = onClose;
    onClose = null;
    cb?.();
  }

  function open(callbackOnClose) {
    onClose = callbackOnClose ?? null;
    currentId = nextId++;
    dlg.showModal();
    history.pushState({ modal: currentId }, '');
  }

  // Devuelve una promesa que se cumple cuando el diálogo ya se cerró del todo.
  function close() {
    if (closing) return closing;
    if (!dlg.open) return Promise.resolve();
    if (history.state?.modal !== currentId) {
      finish();
      return Promise.resolve();
    }
    closing = new Promise((resolve) => {
      window.addEventListener('popstate', () => {
        closing = null;
        finish();
        resolve();
      }, { once: true });
      history.back();
    });
    return closing;
  }

  return { el: dlg, open, close };
}

// Guarda un archivo en la caché y abre el menú de compartir de Android (imprimir, WhatsApp, Drive, correo).
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

// contenido: { base64 } o { text }. En el navegador se descarga directo, para probar.
export async function shareFile(fileName, content, { title, mime }) {
  if (!Capacitor.isNativePlatform()) {
    const blob = content.text != null
      ? new Blob([content.text], { type: mime })
      : new Blob([Uint8Array.from(atob(content.base64), (c) => c.charCodeAt(0))], { type: mime });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: fileName });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    return;
  }
  const { uri } = await Filesystem.writeFile({
    path: fileName,
    directory: Directory.Cache,
    ...(content.text != null ? { data: content.text, encoding: Encoding.UTF8 } : { data: content.base64 }),
  });
  await Share.share({ title, files: [uri], dialogTitle: title });
}

// Cerrar el menú de compartir sin elegir nada no es un error.
export const isShareCancel = (err) => /cancel/i.test(String(err?.message ?? err));

# Mi presión — guía para Claude

App Android (Capacitor) para que un adulto mayor registre su presión arterial e imprima un PDF para el médico. Usuario final: el papá de Antonio. Todo en español de México.

**Spec completa:** `docs/especificacion.md` — lee solo la sección que toque el hito actual (usa Grep por el encabezado `## ...`), no el archivo entero.

## Regla número uno
Extremadamente sencilla. Si no está en la spec, **no se agrega**: pregúntale a Antonio. Fuera de alcance: nube/Supabase/sync, cuentas, notificaciones, perfiles, analíticas, anuncios, **cualquier llamada de red**, ajustes extra. Sin consejos médicos (solo etiqueta de clasificación y números).

## Stack (versiones verificadas oct-2026)
- Capacitor 8 (`@capacitor/core` 8.x) → **JDK 21**. Plugins: `@capacitor-community/sqlite`, `@capacitor/preferences`, `@capacitor/filesystem`, `@capacitor/share`, `@capacitor/assets` (dev). Barras del sistema: `SystemBars` de `@capacitor/core` 8 (reemplaza a `@capacitor/status-bar`; cubre barra de estado y de navegación).
- Vite + HTML/CSS/JS vanilla (ES modules). **Sin frameworks ni librerías de UI. Nada desde CDN** (ni Google Fonts: fuentes del sistema o empaquetadas).
- `chart.js` con imports selectivos (tree-shaking). `jspdf` + `jspdf-autotable`. Vitest.
- `window.print()` no sirve en el WebView: PDF → Filesystem (Cache) → Share.
- `android:allowBackup="true"` en el manifiesto, siempre.

## Arquitectura
```
src/
  main.js        arranque, navegación por pestañas, tutorial si aplica
  storage.js     ÚNICA puerta a datos: list(), add(r), remove(id), importMany(rs)
                 SQLite en Android, localStorage en navegador (Capacitor.isNativePlatform())
  settings.js    Preferences: tema, tutorialVisto, nombrePaciente
  logic/         funciones PURAS y probadas (sin DOM ni Capacitor):
    classify.js  validate.js  autoadvance.js  stats.js  backup.js  dates.js
  ui/            una vista por archivo: registrar, historial, resumen, ajustes, tutorial
  pdf.js  theme.js  styles.css
test/            *.test.js de Vitest sobre src/logic/
```
La UI nunca toca SQLite/localStorage directo; todo pasa por `storage.js` (la nube se agregará ahí después).

## Datos
Tabla `lecturas`: `id` TEXT uuid PK (`crypto.randomUUID()`), `sys` INT, `dia` INT, `pul` INT NULL, `note` TEXT ≤200, `ts` INT ms (momento de la medición), `created_at` INT ms.
Respaldo JSON: `{ "version": 1, "exportado": <ts>, "lecturas": [...] }`, archivo `mi-presion-respaldo-AAAA-MM-DD.json`. Importar = combinar por `id` (nunca borrar ni duplicar); validar todo antes, si algo falla no importar nada.

## Reglas de negocio (ya probadas en `referencia/presion-arterial.html`)
- Validación: sys 50–300, dia 30–200, pul 25–250 (opcional), sys > dia. Mensajes claros en español.
- Avance automático: `complete(v) = v.length === 3 || (v.length === 2 && Number(v[0]) >= 3)`.
- Clasificación AHA (en la app; el PDF no la lleva) (evaluar en este orden): Crisis `s>180 || d>120` → Alta etapa 2 `s>=140 || d>=90` → Alta etapa 1 `s>=130 || d>=80` → Elevada `s>=120` → Normal. Crisis añade: "Si tiene síntomas, busque atención médica de inmediato."
- Semana lunes–domingo: `wd = (getDay()+6)%7`.
- Resumen: periodos 7/30/90 días (def. 30); <3 mediciones → mensaje amable en vez de gráfica.

## UI / accesibilidad
Texto base ≥20px, botones ≥56px de alto, alto contraste, la clasificación siempre con texto (nunca solo color). Trato de "usted". Etiquetas "Sistólica (alta)" / "Diastólica (baja)". Barra inferior: Registrar · Historial · Resumen; engrane arriba → Ajustes. Respetar `env(safe-area-inset-*)`. Tema: variables CSS en `:root` + `data-theme` (auto/claro/oscuro); la gráfica relee colores al cambiar; la status bar sigue al tema; el PDF siempre blanco y negro, tamaño carta.
Diseño (hito 4, pedido de Antonio: bonito, elegante, atemporal, minimalista): paleta del ícono — azul marino `--primary #13213D` (oscuro: fondo `#0B1424`), acento rojo del corazón, etiquetas de clasificación suaves `--cN-bg/--cN-fg` (Crisis sólida). Tarjetas `.card` con sombra suave, sin bordes duros. Íconos de línea en `src/ui/icons.js`. Títulos Barlow 600, números Barlow Condensed 700 (`.num`). Todo en tokens de `src/styles.css`; no meter colores sueltos.

## Comandos
```
npm run dev        # navegador, usa localStorage
npm test           # vitest run
npm run build      # vite → dist/
npx cap sync android
```
No hay Android SDK local: el APK se compila **solo en GitHub Actions** (`.github/workflows/android.yml`): npm ci → test → build → cap sync → JDK 21 → `./gradlew assembleRelease` → artifact. `versionCode = github.run_number`.
Vigilar builds: con `gh` (`gh run watch`, `gh run view --log-failed`) o, si no hay `gh`, con las herramientas MCP de GitHub (`actions_list`, `get_job_logs`). Si falla: leer log, corregir, reintentar antes de reportar.

## Firma (crítico)
Keystore fijo en secretos: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`. Si cambia la llave, Android no actualiza y desinstalar borra las mediciones del papá. **Nunca** subir `*.jks`, `*.keystore`, `keystore.properties` ni contraseñas.

## Forma de trabajar
- Plan breve y aprobación antes de código nuevo. Avanzar por hitos; cada uno = commit + build verde + decirle a Antonio cómo bajar e instalar el APK.
- Pruebas obligatorias: clasificación, validación, avance automático, estadísticas, combinación de respaldos (restaurar 2 veces no duplica).
- Ahorro de tokens: no leer `node_modules/`, `android/` generado, `dist/`, ni `package-lock.json`. Lógica nueva va en `src/logic/` (pura, fácil de probar). Actualiza la sección **Estado** al cerrar cada hito para no re-derivar contexto.

## Estado
Hitos: 1 APK firmado vacío · 2 Registrar + SQLite + 3 pestañas · 3 Historial + eliminar · 4 Ajustes + tema · 5 Resumen · 6 PDF · 7 Respaldo · 8 Tutorial · 9 Ícono/nombre/accesibilidad.
- [x] Hito 1 — Vite+Capacitor 8, `android/` versionado, APK firmado en Actions (run 2 verde). Firma por env (`ANDROID_KEYSTORE_PATH`, ver `android/app/build.gradle`); sin secretos compila sin firmar y falla al final a propósito. Keystore alias `mipresion`, secretos ya cargados. Ojo Gradle: usar `versionCode = ...` (asignación explícita).
- [x] Hito 2 — Registrar (`src/ui/registrar.js`), `storage.js` (SQLite/localStorage), pestañas en `main.js`, Barlow empaquetada, pruebas de validate/autoadvance. Build #4 verde (APK ~8 MB por SQLite). Pendiente: Antonio confirma en teléfono que el teclado abre solo y que lo guardado sobrevive al cerrar la app.
- [x] Hito 3 — `src/ui/historial.js` (semana lun–dom, navegación con texto, detalle → confirmar → eliminar), `ui/modal.js` (diálogo que cierra con "atrás" de Android vía `history.pushState`, sin plugin), `ui/toast.js`, helpers de semana en `logic/dates.js` con pruebas. Registrar emite `lectura-guardada` y Historial salta a esa semana. Sin promedio semanal (no está en la spec; va en Resumen). Build #6 verde.
- [x] Hito 4 — `src/ui/ajustes.js` (tema + nombre del paciente; Volver/"atrás" vía `history.pushState({view:'ajustes'})` en `main.js`), `settings.js` (Preferences), `theme.js` (data-theme + SystemBars + caché en localStorage para no parpadear; emite `tema-cambiado` para la gráfica del hito 5). Rediseño visual completo. Ícono de Antonio aplicado (adelanto del hito 9): fuentes en `assets/`, regenerar con `python3 scripts/icono.py referencia/icono-original.webp` y `npx capacitor-assets generate --android --assetPath assets --iconBackgroundColor '#0D1B31' --iconBackgroundColorDark '#0D1B31' --splashBackgroundColor '#0D1B31' --splashBackgroundColorDark '#0D1B31'` (después `git checkout android/app/src/main/AndroidManifest.xml`, solo reformatea). Splash azul marino (`windowSplashScreenBackground` en styles.xml). Build #8 verde.
- [x] Hito 5 — `src/ui/resumen.js` (periodo 7/30/90 en control segmentado, promedio grande con clasificación y conteo, más alta/más baja con fecha, barras por clasificación; <3 mediciones → mensaje en lugar de gráfica), `src/ui/chart.js` (chart.js con import dinámico: solo carga al abrir Resumen; líneas punteadas 120/80 con plugin propio; leyenda en HTML; tocar = tooltip; sin zoom/arrastre; redibuja con `tema-cambiado`), `logic/stats.js` con pruebas. Colores de series `--series-sys/--series-dia` validados con el script de la skill dataviz (CVD/contraste) en ambos temas; marcador círculo vs cuadro. No se dibujan 140/90 (saturaba). Build #10 verde.
- [x] Hito 6 — Cambios de Antonio (ya en la spec): título "REGISTRO DE PRESIÓN ARTERIAL", sin clasificación, notas opcionales, al final solo el promedio; se hizo sin la foto de la hoja. Botón "Imprimir para el doctor" en Historial → `ui/imprimir.js` (periodo 7/30/Todo, con/sin notas, nombre solo si falta). `logic/report.js` (datos de la hoja, con pruebas) + `src/pdf.js` (jsPDF + autoTable con import dinámico; fecha con rowSpan por día; hora 24 h; `pdfSafe` quita emojis porque Helvetica solo es Latin-1; Android: Filesystem Cache → Share con `files`; navegador: `doc.save`). Revisar PDFs: `pdftoppm -png`. Build #12 verde. Pendiente: Antonio confirma compartir/imprimir en el teléfono.
- [ ] Hito 7 — siguiente: Respaldo (guardar JSON → Share; restaurar con <input type=file>, validar todo, combinar por id con `logic/backup.js` + pruebas de no duplicar).
- Notas técnicas: `@capacitor/keyboard` agregado para abrir el teclado al iniciar (`focus()` solo no lo abre en el WebView) y ocultar la barra inferior al escribir (`body.kb-open`). El README de SQLite sugiere `allowBackup=false`: **ignorarlo** (usamos BD sin cifrar y la spec exige `true`). Sin placeholders numéricos en sys/dia/pul (en oscuro parecían valores capturados). Verificación en navegador: `npx vite preview` + Playwright global (`$(npm root -g)/playwright/index.mjs`).
- Decisiones: appId `com.antoniomota.mipresion`; fuente Barlow/Barlow Condensed empaquetada con `@fontsource` (aprobado); `src/logic/classify.js` ya existe con pruebas.

Pendientes de Antonio: (opcional) foto de la hoja original para ajustar el PDF.

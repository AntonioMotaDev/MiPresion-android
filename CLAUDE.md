# Mi presión — guía para Claude

App Android (Capacitor) para que un adulto mayor registre su presión arterial e imprima un PDF para el médico. Usuario final: el papá de Antonio. Todo en español de México.

**Spec completa:** `docs/especificacion.md` — lee solo la sección que toque el hito actual (usa Grep por el encabezado `## ...`), no el archivo entero.

## Regla número uno
Extremadamente sencilla. Si no está en la spec, **no se agrega**: pregúntale a Antonio. Fuera de alcance: nube/Supabase/sync, cuentas, notificaciones, perfiles, analíticas, anuncios, **cualquier llamada de red**, ajustes extra. Sin consejos médicos (solo etiqueta de clasificación y números).

## Stack (versiones verificadas oct-2026)
- Capacitor 8 (`@capacitor/core` 8.x) → **JDK 21**. Plugins: `@capacitor-community/sqlite`, `@capacitor/preferences`, `@capacitor/filesystem`, `@capacitor/share`, `@capacitor/status-bar`, `@capacitor/assets` (dev).
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
- Clasificación AHA (evaluar en este orden): Crisis `s>180 || d>120` → Alta etapa 2 `s>=140 || d>=90` → Alta etapa 1 `s>=130 || d>=80` → Elevada `s>=120` → Normal. Crisis añade: "Si tiene síntomas, busque atención médica de inmediato."
- Semana lunes–domingo: `wd = (getDay()+6)%7`.
- Resumen: periodos 7/30/90 días (def. 30); <3 mediciones → mensaje amable en vez de gráfica.

## UI / accesibilidad
Texto base ≥20px, botones ≥56px de alto, alto contraste, la clasificación siempre con texto (nunca solo color). Trato de "usted". Etiquetas "Sistólica (alta)" / "Diastólica (baja)". Barra inferior: Registrar · Historial · Resumen; engrane arriba → Ajustes. Respetar `env(safe-area-inset-*)`. Tema: variables CSS en `:root` + `data-theme` (auto/claro/oscuro); la gráfica relee colores al cambiar; la status bar sigue al tema; el PDF siempre blanco y negro, tamaño carta.
Paleta y estilos base: copiar variables de `referencia/presion-arterial.html` líneas 12–31 (no leer el resto salvo que haga falta).

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
- [ ] Hito 2 — siguiente: Registrar + SQLite + 3 pestañas + fuente Barlow.
- Decisiones: appId `com.antoniomota.mipresion`; fuente Barlow/Barlow Condensed empaquetada con `@fontsource` (aprobado); `src/logic/classify.js` ya existe con pruebas.

Pendientes de Antonio: subir `referencia/hoja.jpeg` (foto de la hoja original, necesaria para el hito 6).

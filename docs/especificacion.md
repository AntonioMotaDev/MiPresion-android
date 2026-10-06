# Mi presión — especificación completa (v1)

> Documento fuente. `CLAUDE.md` tiene el resumen operativo; lee aquí solo la sección que necesites.

## Qué es y para quién

App Android para que un adulto mayor (el papá de Antonio) registre su presión arterial en su propio teléfono y pueda imprimir sus registros para llevárselos al médico. Está basada en una hoja impresa de "Registro de tensión arterial" (`referencia/hoja.jpeg`) y en una versión web previa (`referencia/presion-arterial.html`), que sirve como referencia de lógica y de diseño.

**Regla número uno:** la app debe ser extremadamente sencilla. Si una función, pantalla, botón o ajuste no es indispensable, no va. Ante la duda, no se agrega: pregúntale a Antonio antes de agregar cualquier función que no esté en este documento.

## Alcance de la versión 1

- Registrar una medición: sistólica, diastólica, pulso (opcional) y notas (opcional). La fecha y la hora se llenan solas con el momento actual; solo se cambian si el usuario lo pide.
- Ver el historial agrupado por día, igual que la hoja (lunes a domingo, semana por semana).
- Eliminar una medición equivocada (con confirmación). No hay edición: si algo está mal, se borra y se vuelve a capturar.
- Resumen con gráfica y estadísticas sencillas (ver "Resumen").
- Imprimir para el doctor: generar un PDF con el formato de la hoja y abrir el menú de compartir de Android (imprimir, WhatsApp, correo).
- Ajustes mínimos: tema claro, oscuro o automático; ver el tutorial otra vez; nombre del paciente; respaldo.
- Tutorial de bienvenida con casilla "No volver a mostrar" (ver "Tutorial").
- Respaldo a archivo, para que las mediciones no se pierdan si cambia de teléfono (ver "Respaldo").
- Todo funciona sin internet y sin cuenta. Los datos viven solo en el teléfono.

## Fuera de alcance (no implementar sin preguntar)

Nube / Supabase / sincronización, cuentas o inicio de sesión, recordatorios o notificaciones, varios usuarios o perfiles, analíticas, anuncios, cualquier llamada de red, cualquier ajuste adicional a los listados arriba.

La nube (Supabase) llegará después, cuando el papá ya la esté usando. Por eso el acceso a datos debe estar detrás de un módulo único (`src/storage.js`) para poder agregar sincronización sin tocar la UI.

## Stack

- Capacitor (última versión estable; revisa la documentación oficial antes de fijar versiones de plugins y de JDK).
- HTML + CSS + JavaScript sin framework, empaquetado con Vite. Nada de React ni librerías de UI.
- Almacenamiento de mediciones: `@capacitor-community/sqlite` en Android. En el navegador (`npm run dev`) usar un respaldo con `localStorage` para probar rápido. Ambos detrás de la misma interfaz en `src/storage.js`: `list()`, `add(reading)`, `remove(id)`, `importMany(readings)`.
- Preferencias (tema, tutorial visto, nombre del paciente): `@capacitor/preferences`, en un módulo `src/settings.js`.
- Gráficas: `chart.js`, importando solo los componentes que se usan (tree-shaking) y empaquetado en el APK. Nada desde CDN.
- Barra de estado: `@capacitor/status-bar` para que combine con el tema activo.
- PDF: `jspdf` + `jspdf-autotable`. Guardar el PDF con `@capacitor/filesystem` en el directorio de caché y abrirlo con `@capacitor/share`. `window.print()` no funciona dentro del WebView de Capacitor, no lo uses.
- Mantener `android:allowBackup="true"` en el manifiesto: así Android respalda los datos de la app en la cuenta de Google del teléfono sin que hagamos nada.

## Modelo de datos

Tabla `lecturas`:

| campo | tipo | notas |
|---|---|---|
| id | TEXT (uuid) | clave primaria; usar uuid desde ya pensando en la sincronización futura |
| sys | INTEGER | sistólica |
| dia | INTEGER | diastólica |
| pul | INTEGER NULL | pulso |
| note | TEXT | máx. 200 caracteres |
| ts | INTEGER | fecha y hora de la medición, epoch en ms |
| created_at | INTEGER | epoch en ms |

## Reglas de negocio (copiar de la versión web)

- **Validación:** sistólica 50–300, diastólica 30–200, pulso 25–250, sistólica mayor que diastólica. Mensajes de error claros y en español, nunca bloquear sin explicar por qué.
- **Avance automático entre campos:** al escribir un valor se pasa solo al siguiente campo cuando tiene 3 dígitos, o 2 dígitos si el primero es 3 o mayor (así funcionan 95, 120, 78, 105 sin tocar la pantalla).
- **Clasificación** (rangos de referencia de la American Heart Association):
  - Normal: menos de 120 y menos de 80
  - Elevada: 120–129 y menos de 80
  - Alta etapa 1: 130–139 o 80–89
  - Alta etapa 2: 140 o más, o 90 o más
  - Crisis: más de 180 o más de 120 → mostrar además "Si tiene síntomas, busque atención médica de inmediato."
- La app no da consejos médicos ni interpreta más allá de la etiqueta de clasificación y los números del resumen.

## Diseño y usabilidad (usuario adulto mayor)

- Toda la UI en español de México, con "usted" o neutro, sin tecnicismos ("Presión alta" y "Presión baja" junto a "Sistólica" y "Diastólica").
- Texto base de 20 px o más, números de captura muy grandes, botones de al menos 56 px de alto, alto contraste en ambos temas. Nunca transmitir información solo con color: la clasificación siempre lleva texto.
- Navegación: barra inferior con tres pestañas grandes con ícono y texto: Registrar, Historial, Resumen. Ajustes se abre con un ícono de engrane en la parte superior. No hay más pantallas.
- Al abrir la app, lo primero es Registrar, con el teclado numérico listo (después del tutorial, si aplica). Botón principal grande: "Guardar".
- Después de guardar: confirmación grande y clara ("Guardado ✓" con los valores), y el formulario se limpia.
- El botón "Imprimir para el doctor" vive en Historial.
- Respetar las zonas seguras del sistema (barra de estado y de navegación).
- Nombre visible de la app: **Mi presión**. Ícono: corazón rojo con línea de pulso (generar con `@capacitor/assets`).

## Resumen (gráfica y estadísticas)

- Selector de periodo con tres opciones grandes: 7 días, 30 días, 90 días. Por defecto, 30 días.
- Gráfica de líneas: sistólica y diastólica en el tiempo, con líneas de referencia punteadas en 120 y 80 (y, si no satura, 140 y 90). Las dos series se distinguen por color y por estilo o marcador, y llevan leyenda en texto. Sin zoom, sin arrastre, sin interacciones complejas; tocar un punto puede mostrar el valor.
- Estadísticas, como tarjetas grandes y pocas:
  - Promedio del periodo (sistólica/diastólica y pulso) con su clasificación.
  - Medición más alta y más baja, con fecha.
  - Número de mediciones.
  - Cuántas mediciones cayeron en cada clasificación, como barras simples o lista con texto.
- Si hay menos de 3 mediciones en el periodo, mostrar un mensaje amable en lugar de la gráfica.
- Nada de tendencias calculadas, predicciones ni frases que interpreten la salud.

## Tema (modo oscuro)

- En Ajustes: Automático (como el teléfono), Claro, Oscuro. Por defecto, Automático.
- Implementar con variables CSS en `:root` y un atributo `data-theme`; la gráfica también debe leer los colores del tema y redibujarse al cambiarlo.
- La barra de estado del sistema cambia con el tema.
- El PDF siempre es claro (blanco y negro), sin importar el tema.

## Tutorial de bienvenida

- Se muestra la primera vez que se abre la app.
- 3 o 4 pasos como máximo, a pantalla completa, con una ilustración o captura sencilla y una frase corta cada uno:
  1. Cómo registrar una medición (escribir los números, se pasa solo al siguiente, Guardar).
  2. Dónde ver el historial y cómo borrar un error.
  3. Cómo ver el resumen e imprimir para el doctor.
- Botones grandes "Siguiente" y "Empezar"; "Saltar" visible en todo momento.
- En el último paso, casilla "No volver a mostrar", marcada por defecto. Si se deja sin marcar, el tutorial vuelve a aparecer en la próxima apertura.
- Desde Ajustes, "Ver tutorial" lo abre de nuevo en cualquier momento.

## PDF para el doctor

> Ajustado por Antonio (hito 6): título con "PRESIÓN" en lugar de "TENSIÓN", sin columna de clasificación, notas opcionales y al final solo el promedio.

- Título "REGISTRO DE PRESIÓN ARTERIAL", campo Nombre y tabla con columnas Fecha, Hora, Sistólica (alta), Diastólica (baja), Pulso y, si el usuario lo elige, Notas; agrupada por día (la fecha aparece una vez por día).
- Sin columna de clasificación.
- El usuario elige el periodo con opciones grandes: "Últimos 7 días", "Últimos 30 días", "Todo", y si se imprime "Con notas" o "Sin notas". Nada de selectores de fecha complicados.
- Al final solo el promedio del periodo (sin leyenda de rangos).
- Pensado para imprimirse en blanco y negro en tamaño carta.
- El nombre del paciente se pide la primera vez que se genera un PDF y se recuerda; también se puede cambiar en Ajustes.

## Respaldo

- Vive en Ajustes, con dos botones: "Guardar respaldo" y "Restaurar respaldo".
- **Guardar respaldo:** genera un archivo `mi-presion-respaldo-AAAA-MM-DD.json` con todas las mediciones y una versión de formato (`{ "version": 1, "exportado": <ts>, "lecturas": [...] }`), y lo abre en el menú de compartir de Android para mandarlo a WhatsApp, Drive o correo.
- **Restaurar respaldo:** el usuario elige el archivo (`<input type="file">` funciona en el WebView de Capacitor; si da problemas, usar un plugin de selección de archivos). Pide confirmación antes de importar. Las mediciones se combinan por id: nunca se borra ni se duplica nada. Al terminar, mostrar cuántas mediciones se agregaron.
- Validar el archivo antes de importar (formato, versión y rangos); si algo no cuadra, no importar nada y explicar por qué en lenguaje sencillo.
- El mismo formato JSON servirá después para migrar los datos a la nube.

## Compilación (sin Android Studio)

- El APK se compila en GitHub Actions, no localmente. Repo privado en GitHub; usar el CLI `gh` para crearlo, subir cambios y vigilar los builds (`gh run watch`, `gh run view --log-failed`).
- Workflow en `.github/workflows/android.yml`: Node → `npm ci` → `npm test` → `npm run build` → `npx cap sync android` → JDK que pida la versión de Capacitor → `./gradlew assembleRelease` → subir el APK como artifact.
- Firma: usar un keystore fijo guardado en secretos de GitHub (`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`). Esto es obligatorio: si cada build se firma con una llave distinta, Android no deja actualizar la app y habría que desinstalarla, lo que borra todas las mediciones del papá. Genera el keystore una sola vez, súbelo a los secretos y dile a Antonio dónde guardar una copia.
- `versionCode = github.run_number`, para que cada APK nuevo se instale encima del anterior.
- Nunca subir el keystore ni contraseñas al repo (agregar a `.gitignore`).

## Forma de trabajar

- Antes de escribir código, propón un plan breve y espera aprobación.
- Avanza por hitos; cada hito termina con un build verde en GitHub Actions y un commit:
  1. Proyecto Capacitor vacío que compila y produce un APK firmado.
  2. Pantalla de registro con validación, avance automático y guardado en SQLite; navegación de tres pestañas.
  3. Historial semanal y eliminar.
  4. Ajustes y tema claro/oscuro/automático.
  5. Resumen: gráfica y estadísticas.
  6. PDF y compartir.
  7. Respaldo: guardar y restaurar.
  8. Tutorial de bienvenida.
  9. Ícono, nombre, pulido final de accesibilidad en ambos temas.
- Pruebas unitarias (Vitest) para la clasificación, la validación, la regla de avance automático, el cálculo de estadísticas del resumen y la combinación de respaldos (que restaurar dos veces el mismo archivo no duplique nada).
- Si un build falla, lee el log, corrige y vuelve a intentar antes de reportar.
- Al terminar cada hito, dile a Antonio cómo descargar el APK e instalarlo.

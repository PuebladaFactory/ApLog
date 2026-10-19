# Prompt — Frente "Informes Excel/PDF" (reemplazo de los servicios viejos)

Pegá esto al comienzo del chat nuevo del Project "App Logística".

---

Vamos a encarar un frente nuevo en ApLog (Angular 20 + Firebase, rama `refactor`, entorno demo): **los informes Excel/PDF que todavía salen de los servicios viejos** (`ExcelService` / `PdfService`, en `servicios/informes/`). La idea es pasarlos al camino nuevo (`DocumentoTabular` / `LibroTabular` + los renderers genéricos de `servicios/exportacion/`) y, al final, retirar los servicios viejos.

## Primer paso: acceso al proyecto
Antes de cualquier otra cosa, pedime acceso a la carpeta del proyecto en mi computadora (`~/Desktop/Proyectos/Vantruck/ApLog`, en Windows `C:\Users\anico\Desktop\Proyectos\Vantruck\ApLog`) con la herramienta de acceso a carpetas. Después:
- traé el código real (`src`, `angular.json`, `package.json`, `tsconfig*.json`, `CLAUDE.md`, `CHANGELOG.md`) a tu espacio de trabajo y armá una copia con git y `node_modules` (`npm ci --legacy-peer-deps`) para compilar y probar;
- tomá como línea base `npm run build:demo` (9 advertencias, inicial 1,53 MB) y anotá los tamaños de los chunks que este frente va a mover.

## Alcance inicial
**Fase 1 (sin escribir código): entender qué hay.**
1. Leer COMPLETOS los servicios viejos y a quién sirven. Del relevamiento previo (verificarlo):
   - `ExcelService` (≈ 890 líneas, `exceljs` con import ESTÁTICO):
     - `exportarClientesTablaExcel`: listados de Clientes y de **Proveedores** (proveedores reusa el de clientes);
     - `exportarChoferesTablaExcel`: listado de Choferes;
     - `generarInformeOperaciones`: tablero de operaciones (`tablero-op`); por este import estático, `exceljs` (≈ 0,95 MB) se descarga al entrar a `/op`;
     - `exportToExcelInforme`: Papelera legado (`objeto-papelera`, documentos viejos);
     - `exportarExcelInfomeOpLiquidadas`, `getQuincena`, `getChofer`, `getCliente`, `getCategoria`, `obtenerDatos`: posiblemente sin uso; confirmarlo.
   - `PdfService` (≈ 360 líneas, `jsPDF` + `pdfmake`):
     - `exportToPdfInforme`: Papelera legado;
     - `exportarPdfInfomeOpLiquidadas` y helpers: posiblemente sin uso;
     - `pdfmake` (≈ 2,5 MB) queda en el chunk de Ajustes solo por esto.
   - Otros consumidores a revisar: `finanzas-nueva/modales/detalle-movimiento`, `recibo-pdf.service.ts`, `recibo-movimiento.util.ts` y `exportacion/logo-empresa.ts` aparecen al buscar `ExcelService|PdfService`. Ver si es uso real o solo un nombre parecido.
   - El botón "Descargar" de `tablero-asignaciones` está inerte (muestra un aviso): `generarInformeAsignaciones` se retiró con el modelo viejo.
2. Leer COMPLETO el camino nuevo:
   - `interfaces/documento-tabular.ts` (`DocumentoTabular`, `LibroTabular`, `HojaDoc`, `TablaDoc`, tipos de celda);
   - `servicios/exportacion/` (`ExcelTabularService.generar` / `generarLibro`, `PdfTabularService.generar` / `generarLibro`, `formato-exportacion.ts`, `logo-empresa.ts`); cargan sus librerías con `import()`;
   - las funciones puras que arman el QUÉ (`shared/utils/documento-liq.util.ts`, `documento-resumen.util.ts`, `documento-comisiones.util.ts`, `exportacion-finanzas.util.ts`);
   - las fachadas por dominio (`LiquidacionExportService`, `ResumenOpExportService`, `ComisionesExportService`, `FinanzasExportService`) y `preguntarFormatoDescarga`.
3. Con eso, armar el diseño en `claude/diseno-informes-excel-pdf.md` (Project), con:
   - una tabla de inventario: informe viejo → pantalla y botón → qué produce (columnas, formato, nombre de archivo, log) → equivalente en el camino nuevo → qué falta;
   - lo que está muerto y se puede borrar sin reemplazo;
   - la estrategia de reemplazo y las decisiones (abajo);
   - el plan de bloques.

**Fase 2: reemplazar, bloque por bloque**, según el plan aprobado. **Fase 3: retirar** `ExcelService` / `PdfService` (y sus `.spec.ts`) cuando no quede ningún consumidor, y medir el resultado en los chunks.

## Cómo está construido el camino nuevo (encapsulación)
Es la regla del frente: separar **QUÉ dice el documento** de **CÓMO se dibuja** y de **QUIÉN lo pide**.
- **QUÉ:** una función PURA por informe (`shared/utils/documento-<x>.util.ts`) recibe los datos ya resueltos y devuelve un `DocumentoTabular` (un documento) o un `LibroTabular` (varias hojas y tablas). Esa función decide título, subtítulos, columnas tipadas (texto / número / moneda / fecha / porcentaje), filas con valores CRUDOS, pie y notas. No sabe de Excel ni de PDF, se prueba sola y es la única definición de cada informe: el Excel y el PDF no pueden divergir.
- **CÓMO:** los renderers genéricos (`ExcelTabularService`, `PdfTabularService`) dibujan cualquier `DocumentoTabular` / `LibroTabular`. No saben de qué informe se trata. Cargan `exceljs` / `jspdf` con `import()`, así que la librería se descarga recién al exportar.
- **QUIÉN:** una fachada por dominio (`XxxExportService`) es la ÚNICA puerta de los componentes. Junta los datos, llama a la función pura y al renderer, descarga o abre, y decide el log. El componente solo llama a la fachada: nunca importa `exceljs` / `jspdf` ni arma celdas.
- Es el mismo principio del resto del proyecto ("Ownership por entidad primaria", segmentación por GESTO): cada gesto del usuario ("descargar el listado de clientes") tiene un método con nombre de intención en su fachada, y los servicios de apoyo (renderers) son tontos respecto del dominio.
- Reglas ya aprendidas:
  - fechas 'YYYY-MM-DD' formateadas sin `Date` (`fecha.util`), nombres de archivo con `hoyNegocio()`;
  - en PDF, solo caracteres WinAnsi (sin "−" U+2212, comillas tipográficas, "…" ni emojis);
  - montos como números con formato en Excel (no texto);
  - el logo tiene una sola copia (`exportacion/logo-empresa.ts`); los servicios viejos tienen la suya.

## Cómo se construye el reemplazo (en paralelo al viejo)
- El camino nuevo se construye AL LADO del viejo, sin tocarlo. Para cada informe: función pura + método en la fachada, probados con datos reales de demo y comparados con lo que sale hoy.
- Recién después, el **switch** de esa pantalla: el botón pasa a llamar a la fachada nueva. Es un cambio chico, por pantalla, y reversible (el viejo sigue ahí).
- El código viejo de ese informe se borra cuando ya no tiene consumidores (verificar con búsqueda de referencias, incluidos `.html` y `.spec.ts`). Los servicios viejos se retiran enteros solo al final.
- Si un informe viejo hace algo raro o roto, se documenta y se decide: replicarlo, corregirlo o dejarlo afuera. No se "mejora" en silencio.
- Nada de esto toca datos ni reglas: es todo cliente.

## Forma de trabajo (la de siempre)
- Respuestas en español, sin relleno, con el razonamiento y el código listos para usar. Antes de implementar: qué debe hacer, cómo encaja con la arquitectura, y recién ahí la instrucción para Claude Code.
- Trabajar SIEMPRE sobre el código real. Antes de cada instrucción, comparar con el repo real (por el puente) los archivos que se van a tocar, porque commiteo entre bloques. Si este prompt contradice el código, gana el código y se avisa.
- Primero el **diseño** en el Project. Después, **bloques chicos**, de a uno: los aplico con Claude Code, pruebo en demo, commiteo y te paso el reporte.
- Cada instrucción va en UN bloque con fence de 4 backticks (un solo botón de copiar).
  - Primera línea: "Si no ves la línea FIN DE LA INSTRUCCIÓN <bloque> al final, el texto llegó cortado: leé el archivo completo."
  - Secciones: Contexto y razonamiento; Reglas; PASO 0 (verificación sin modificar); pasos con BUSCAR/REEMPLAZAR de líneas completas (archivos nuevos completos, marcados NUEVO; si un archivo cambia casi entero, REEMPLAZO COMPLETO con `git hash-object` en el PASO 0); Verificación (greps + numstat + `tsc` + build); Pruebas manuales en demo (las hago yo); Mensaje de commit.
  - Última línea: "FIN DE LA INSTRUCCIÓN <bloque>".
- Entrega de cada instrucción:
  - guardarla en el Project como `claude/instruccion-<bloque>-informes.md`;
  - enviármela como archivo y copiarla a `~/Desktop/Proyectos/Vantruck/ApLog/Claude outputs/`;
  - registrarla en el "Avance" del diseño (entregada → aplicada / probada / commiteada, con las notas del reporte).
- Reglas dentro de cada instrucción:
  - "Hacé SOLO lo indicado. NO deploy. NO commit.";
  - validar TODOS los BUSCAR antes de escribir el primero; si uno no está o está repetido → detenerse;
  - aplicar EN ORDEN; editar en el lugar (leer antes de escribir); LF;
  - no tocar CLAUDE.md/CHANGELOG.md hasta el bloque DOC de cierre;
  - revisar todos los usos (incluidos `.spec.ts` y `.html`) cuando se toca un tipo, módulo o export;
  - NO correr `npm run build`, `deploy:*` ni `node set-version.js`; compilar con `npm run build:demo` (baseline: 9 advertencias);
  - npm con `--legacy-peer-deps`.
- Verificación antes de entregar (lecciones de los frentes anteriores):
  - aplicar la instrucción RENDERIZADA, con un script, sobre una copia limpia en el commit actual y comparar con la referencia (round-trip): lo probado es exactamente lo que se entrega. Ya atrapó errores reales (un BUSCAR recortado en el cierre de bloque equivocado);
  - BUSCAR de líneas completas, sin bordes en blanco ni espacios finales;
  - los greps de verificación no pueden matchear comentarios que agrega la propia instrucción;
  - el PASO 0 controla que los archivos estén como se espera (líneas o hash), no que el último commit sea el del bloque anterior;
  - `tsc` también con `--noUnusedLocals` sobre lo tocado;
  - para informes, generar el archivo de verdad en la copia (Node o Karma) y revisarlo (columnas, tipos, fórmulas, totales, caracteres del PDF) antes de entregar;
  - cuando hay UI nueva, prueba de render con Karma + Chromium (spec temporal con `tsconfig` propio, porque los 7 specs rotos impiden `npm test`).
- **Seguridad:** todo se hace y se prueba en demo. NADA va a Vantruck hasta la migración final de datos (que empieza con un backup completo). Los deploys los hago yo, solo a demo. `main` = producción, no se toca. No absorber temas de otros frentes sin preguntar.

## Decisiones a plantear en el diseño
- **Papelera legado** (`objeto-papelera` → `exportToExcelInforme` / `exportToPdfInforme`, `pdfmake`): según CLAUDE.md su retiro es decisión de producto del frente Ajustes. ¿Se migra acá, se deja como único consumidor del viejo hasta ese frente, o se retira la exportación?
- **Listados de entidades** (Clientes, Choferes, Proveedores):
  - ¿Solo Excel, como hoy, o Excel + PDF con `preguntarFormatoDescarga`?
  - ¿Exportan lo filtrado y visible, como hoy?
  - ¿Qué columnas?
- **Informe de operaciones** (`tablero-op`): columnas, totales y formato, comparados con lo que sale hoy; si suma PDF.
- **Tablero de asignaciones:** ¿se repone el "Descargar" (hoy inerte) o queda afuera?
- **Log** (`REIMPRIMIR` / `DESCARGAR`): qué descargas se registran.
- **Paridad o mejora:** qué diferencias con los archivos viejos se aceptan (formato de números, fechas, nombres de archivo).
- **Orden de los bloques:** sugerido, primero lo que libera más bundle (`tablero-op` → `exceljs` fuera de `/op`), después los listados, al final el retiro.

## Contexto que conviene leer en CLAUDE.md
"Frente Excel/PDF — InformeLiqNuevo" (arquitectura, variantes, formato, fachada), "Frente Reportes → Excel/PDF del resumen", "Frente Vendedores → Excel/PDF", "Frente Finanzas → Excel/PDF", "Deuda — Excel/PDF", "Deuda — tras el frente Lazy loading + fechas" (bundle) y "Convenciones" (fechas, estilo de código).

PROMPT — Nuevo chat: Frente Lazy loading de RaizModule + Auditoría de fechas (ApLog)
=====================================================================================

Hola. Vamos a encarar un frente nuevo de ApLog con dos temas transversales:
el **lazy loading real de los módulos de feature** (hoy anulado por
`RaizModule`) y la **auditoría de fechas 'YYYY-MM-DD' contra el huso
horario** en toda la app. Te paso el contexto para que arranques con el mismo
nivel de conocimiento que el chat anterior, pero **verificá todo contra el
código**: la documentación puede estar desactualizada (ver §9).

## 0. Primer paso: acceso al código

Antes de analizar nada, pedime acceso a la carpeta del proyecto:
`C:\Users\anico\Desktop\Proyectos\Vantruck\ApLog`

- Trabajá SIEMPRE sobre el código real: leelo, no lo supongas.
- Traé los archivos frescos de la carpeta conectada (no copias viejas de
  una sesión anterior). Antes de armar cada instrucción, volvé a traer los
  archivos que toca: entre bloque y bloque yo commiteo cambios.
- Si algo de este prompt no coincide con el código, manda el código y
  avisame.

Fuentes de contexto:
- **CLAUDE.md del repo** (está al día al 12/10/2026):
  - "Deuda — RaizModule importa los módulos de feature en forma eager".
  - "Pendiente — auditar fechas 'YYYY-MM-DD' vs huso horario en toda la
    app".
  - "Deuda — Excel/PDF" y "Deuda — Facturación" (imports estáticos de
    exceljs / jspdf / pdfjs / jsQR que pesan en el bundle inicial).
  - "Estructura de módulos", "Entornos de build", "Convenciones" y
    "Patrones de refactorización establecidos".
- **CHANGELOG.md del repo:** lista "Pendiente" (al final).
- **Docs del Project** (leelos con la herramienta del Project, no del
  disco): `claude/diseno-tarifas-cierre.md` (el frente anterior, cerrado:
  sirve como modelo de cómo se documenta un frente y su "Avance") y
  `claude/diseno-reportes.md` (decisión R8: la auditoría de fechas quedó
  fuera de Reportes; `periodoDeFecha` nació ahí).

## 1. El proyecto

ApLog es una app web de administración de una empresa de logística
(Vantruck), en producción.

- **Stack:** Angular 20 (componentes `standalone: false`, sintaxis
  `@if`/`@for`, `strictTemplates`), Firebase (Firestore, Auth con custom
  claims, Storage, Cloud Functions), Bootstrap, NgbModal, SweetAlert2,
  exceljs, jsPDF.
- Soy autodidacta y es mi primer proyecto serio, así que hay código
  temprano poco prolijo.

Entornos:
- `demo`: proyecto Firebase `demoapplog`, alias `demo`.
- `vantruck`: `pf-logistics`, producción.

Ramas:
- `main` = producción (Vantruck, código viejo). NO se toca.
- `refactor` = desarrollo, contra demo. Todo este frente va acá.

**Regla de seguridad:**
- Todo se hace y se prueba en demo.
- NADA va a Vantruck hasta la migración final de datos, que empieza con un
  backup completo.
- Los deploys (reglas, índices, functions) los hago yo, SOLO a demo
  (`--project demo`).
- Claude Code nunca deploya ni commitea.

## 2. Qué se hizo hasta ahora (refactor en `refactor`, todo cerrado)

Infraestructura transversal y frentes cerrados (detalle en CLAUDE.md y
CHANGELOG):
- Choferes, Proveedores, Clientes y Operaciones migrados a servicios por
  entidad, con snapshot + id en la operación.
- Roles y Seguridad (Security Rules por matriz rol × módulo × acción),
  Botones y Permisos.
- Legajos reconstruido (con Cloud Function de vencimientos y pantalla de
  próximos vencimientos).
- Log unificado (`registroLog`) y Papelera por referencia.
- Liquidación y Facturación sobre `InformeLiqNuevo` / `informesOp`.
- Herramientas de desarrollo (solo demo): Limpieza y Generador de
  operaciones.
- Excel/PDF de InformeLiqNuevo sobre `DocumentoTabular` + renderers
  genéricos (`servicios/exportacion/`).
- Reportes (`resumenesOp`), Vendedores (`comisionesVenta` /
  `liquidacionesVenta`) y Finanzas (`movimientosFin`).
- **Tarifas** (cerrado el 12/10/2026): tarifario nuevo con versionado
  append-only y vigencia por fecha, motor `ValoresTarifaService`, retiro
  del módulo viejo y de los campos legacy de `Operacion` y de las
  entidades. Ver CLAUDE.md → "Frente Tarifas — tarifario nuevo".

## 3. Pendiente general y orden decidido

Orden que decidí:
1. **Este frente:** lazy loading de RaizModule + auditoría de fechas.
2. Frente de UX: sidebar (`claude/pendiente-sidebar.md`), spinner
   (`claude/pendiente-spinner.md`), estilo global `.col-numero` /
   `.col-moneda`, datos que quedan congelados en `tablero-op` tras un rato
   en segundo plano (CLAUDE.md → "Frente futuro — persistencia de
   filtros…").
3. Excel/PDF de los demás informes sobre `DocumentoTabular` (operaciones,
   asignaciones, clientes, choferes; retirar `ExcelService` / `PdfService`
   viejos donde se pueda).
4. **Funcionalidad nueva de Legajos** pedida por el usuario (te paso los
   detalles cuando lleguemos).
5. Otros pendientes sin orden: rediseño de no-disponibilidad; Finanzas
   (cartera de cheques, pago de liquidaciones de vendedores como
   movimiento, plazo de pago por entidad); Ajustes (retirar `LogService`
   viejo y Papelera legado, restaurar ops con `restaurarOperacion`); carga
   manual de factura sin QR; permisos de UI con fuente única.
6. **Al final:** plan y ejecución de la migración completa a Vantruck (los
   checklists están en CLAUDE.md → "Deuda conocida").

Si al analizar este frente encontrás algo que cruza con los otros (por
ejemplo, los imports estáticos de exceljs/jspdf, que son de Excel/PDF),
señalalo y lo decidimos: no lo absorbas sin preguntar.

## 4. Alcance inicial de este frente

### 4.1 Lazy loading real (RaizModule)

Situación registrada (VERIFICAR):
- `RaizModule` importa en forma EAGER casi todos los módulos de feature
  (Ajustes, Choferes, Legajos, Proveedores, Liquidacion, Vendedores,
  NuevaFacturacion, Reportes; Finanzas ya salió en su frente y Tarifas es
  lazy), que además se cargan lazy desde `raiz-routing`. Resultado: el lazy
  loading queda anulado, todo va al bundle inicial (budget excedido; tras
  Finanzas el bundle inicial era 8,60 MB) y el `RouterModule.forChild` de
  cada feature registra sus rutas también en el router de Raiz (hoy no
  ganan porque `RaizRoutingModule` va primero).
- No se quita a ciegas: hay dependencias reales vía exports (ej.
  `MigracionComponent`, declarado en RaizModule, puede depender de
  `MigrarDatosComponent`, exportado por `LiquidacionModule`). Hay que
  auditar qué usan realmente `HomeComponent`, `SidebarComponent`,
  `MigracionComponent` y el resto de lo declarado en RaizModule, y qué
  componentes/pipes/directivas compartidos están mal ubicados en un módulo
  de feature (candidatos a un `SharedModule`).
- Objetivo: cada feature lazy de verdad, sin rutas duplicadas, bundle
  inicial medido antes y después (`npm run build:demo` informa los
  tamaños). Quitar los imports eager de a uno (un módulo por bloque o
  pocos), probando cada uno.
- Tener en cuenta: servicios `providedIn: 'root'` (no cambian), providers
  declarados en módulos de feature (sí cambian de instancia si el módulo
  pasa a lazy), guards, y librerías pesadas importadas en forma estática
  (exceljs, jspdf, pdfjs, jsQR): medir cuánto aportan y decidir conmigo si
  se pasan a import dinámico acá o en el frente de Excel/PDF.

### 4.2 Auditoría de fechas

Situación registrada (relevamiento PRELIMINAR por patrón, sin verificar caso
por caso):
- `new Date('YYYY-MM-DD').getFullYear()/getMonth()/getDate()` → interpreta
  UTC y en Argentina da el día anterior (el 1/1 cae en el año anterior):
  `excel.service`, `liquidaciones-op`, `proforma`; `pdf.service` con
  `new Date(<fecha>)`.
- `toISOString().split('T')[0]` (o `slice`) sobre una fecha LOCAL → desde
  las 21:00 en Argentina da el día siguiente. ~16 archivos, con código
  vivo: `tablero-asignaciones`, `TableroService`, `tablero-calendario`,
  `InformeOpFactoryService`, `registro-log`, `papelera`, `baja-objeto`;
  además `StorageService` y servicios de migración.
- Pipe `date` sobre strings 'YYYY-MM-DD' (muestra el día anterior):
  `informe-liq-nuevo-detalle`, `informe-op-anulados`. En Facturación ya se
  resolvió con `fechaComprobanteLegible`.
- Comparaciones/ordenamientos con `getTime()` no se ven afectados
  (corrimiento parejo).

Criterio propuesto (a confirmar en el diseño):
- Las fechas de negocio son strings 'YYYY-MM-DD' y se operan como strings
  o con helpers en hora local. No usar `new Date(string)` ni
  `toISOString()` para fechas de negocio.
- Ya existen: `toISODateString` en `servicios/fechas/date-range.service.ts`
  (hora local) y `shared/utils/periodo.util.ts` (`periodoDeFecha` toma año
  y mes del string, sin `Date`). Posible util único de fechas puro.
- Revisar también: timestamps ISO completos (logs, `fechaCarga`,
  anulaciones: son instantes, no fechas de negocio, y está bien que sean
  UTC), los rangos de consulta a Firestore por fecha, `DateRangeService` /
  `app-tablero-fechas` / `app-filtro-periodo` ("últimos 12 meses" puede
  quedar en 11 los días 29–31), y la Cloud Function de vencimientos
  (`functions/`, corre en el servidor: ¿en qué huso?).
- Clasificar cada hallazgo: bug real con efecto visible / bug latente /
  correcto. Priorizar el código vivo; el camino viejo de Liquidación
  (`liquidaciones-op`, `proforma`, `ExcelService`/`PdfService` de
  liquidación) se retira con la migración: decidir conmigo si se corrige o
  solo se documenta.

## 5. Cómo trabajo (importante)

1. **Primero se analiza y se diseña:** qué hace hoy, qué está mal, qué se
   puede mejorar, preguntas abiertas. Me consultás las dudas numeradas (L1,
   L2… para lazy; D1, D2… para fechas) y yo decido. Recién después vienen
   las instrucciones.
2. **El diseño se guarda en el Project** (`claude/diseno-lazy-fechas.md`)
   y se actualiza con cada decisión: las respuestas de cada ronda y una
   sección "Avance" con cada bloque (entregado → CERRADO, con las notas del
   informe de Claude Code).
3. **Bloques CHICOS:** las instrucciones para Claude Code van de a una
   (prefijos LZ1, LZ2… y FE1, FE2…; ajustes LZ1b, etc.). Cada una se prueba
   en demo y se commitea antes de la siguiente. Yo te pego el informe de
   Claude Code y te confirmo con "las pruebas fueron correctas y ya hice el
   commit".
4. **Cada instrucción va en UN SOLO bloque de código**, una sola ventana para
   copiar, con cerca exterior de 4 backticks para que los bloques internos
   no la corten. Contiene:
   - contexto y razonamiento;
   - reglas;
   - PASO 0 de verificación, sin modificar nada;
   - pasos con BUSCAR/REEMPLAZAR exactos (archivos nuevos completos,
     marcados NUEVO);
   - verificación y pruebas manuales en demo;
   - mensaje de commit.

   Arriba lleva la nota "Si no ves la línea FIN DE LA INSTRUCCIÓN <bloque>
   al final, el texto llegó cortado: leé el archivo completo", y termina con
   esa línea.

   **Entrega de cada instrucción:**
   - guardala en el Project: `claude/instruccion-<bloque>-lazy-fechas.md`;
   - guardala en `C:\Users\anico\Desktop\Proyectos\Vantruck\ApLog\Claude outputs\`;
   - mandámela como archivo;
   - registrala en el "Avance" del diseño.
5. **Reglas que van dentro de cada instrucción:**
   - "Hacé SOLO lo indicado. NO deploy. NO commit."
   - Si un texto a BUSCAR no está o aparece más de una vez: detenerse y
     reportar.
   - Aplicar los cambios de cada archivo EN ORDEN.
   - "Editá el archivo en el lugar (leer, reemplazar, escribir); nunca abras
     un archivo para escritura antes de haber leído su contenido."
   - Finales de línea LF (hay `.gitattributes` y `.editorconfig`).
   - Build de verificación: `npm run build:demo` (comparar advertencias y
     tamaños de bundle con el bloque anterior).
   - No tocar CLAUDE.md ni CHANGELOG hasta el cierre del frente.
   - Si se toca un tipo, interfaz, módulo o export, revisar TODOS sus usos
     en `src/`, incluidos `.spec.ts` y `.html`.
6. **Lecciones de armado** (el parser de Claude Code y lo aprendido en
   Tarifas):
   - No acepta reemplazos de archivo completo sobre archivos existentes:
     solo BUSCAR/REEMPLAZAR; los archivos nuevos van completos.
   - Los BUSCAR son LÍNEAS COMPLETAS, sin línea en blanco al principio ni
     al final, y sin líneas con espacios finales (no se distinguen en el
     texto pegado).
   - Un bloque suelto "agregá al final del archivo" lo toma como archivo
     nuevo: los agregados van anclados en contenido existente.
   - Los greps de PASO 0 no tienen que excluir carpetas "por suposición"
     (en Tarifas, TC10 frenó por un archivo que yo había excluido sin
     mirarlo). Si excluís algo, que sea porque lo leíste.
   - Los greps de verificación no tienen que matchear comentarios ni texto
     que la propia instrucción agrega; si el patrón tiene `$`, comillas
     simples.
7. **Verificar antes de entregar:** aplicá la instrucción completa sobre
   copias frescas del repo con un script (parsear el .md generado y
   reaplicarlo: cada BUSCAR exactamente una vez) y corré los greps de
   verificación sobre el resultado. Si podés, chequeo de tipos con tsc
   estricto y prueba en Node de las funciones puras (para fechas es clave:
   probar con TZ=America/Argentina/Buenos_Aires y con horas límite, ej.
   21:30 local y el 1/1).
8. **Respuestas:** en castellano, sin relleno, con el razonamiento
   explicado y el código listo para usar. Estoy abierto a todo lo que
   mejore el diseño.
9. **Al cerrar el frente**, dos bloques separados: uno de código, con el
   retiro de lo que quede sin uso; uno solo de documentación: CLAUDE.md
   (sección del frente, deudas resueltas y nuevas), CHANGELOG y la lista
   "Pendiente".

## 6. Estrategias de arquitectura establecidas (cómo aplican acá)

Aplican de forma acotada: este frente no crea acciones de negocio nuevas,
pero sí toca código que las ejecuta. Lo que importa:

**Encapsulación (ownership) — para no romperla al tocar fechas:**
- Cada acción de negocio vive en el servicio DUEÑO de la entidad principal
  del gesto (ej. el cierre de una operación está en
  `OperacionService.cerrarOperacion`, aunque escriba InformeOp, resúmenes y
  comisiones). Los componentes no escriben en Firestore: llaman a
  orquestadores y muestran `Resultado<T>`.
- Escritura atómica con `EscrituraBatch[]` + `commitBatch` o
  `commitEnTransaccion(armar)` (lecturas primero, `armar` puro y
  re-ejecutable), log y papelera en el mismo batch.
- Factories puras y utils puros en `shared/utils/` (sin Angular,
  testeables en Node). **Un util de fechas único encaja acá.**
- Al corregir una fecha dentro de un orquestador o factory, el cambio va
  en ESE lugar (o en el util), no en el componente que lo llama.

**Camino nuevo en paralelo al viejo — aplica a nivel MÉTODO:**
- Nunca se reescribe un método existente en el lugar: se crea el nuevo
  (ej. el util de fechas), se pasan los callers de a poco y se borra el
  viejo cuando no lo usa nadie.
- Para lazy loading, el equivalente es ir de a un módulo por vez, con build
  y prueba en demo entre cada uno, sin "big bang".
- Lo que pertenece al camino viejo de Liquidación/Facturación se retira con
  la migración de Vantruck: no invertir en arreglarlo salvo que lo decidamos.

**Otros patrones vigentes:** ConId (el id del documento no va en el body;
ids string), snapshot + id en la operación, fechas de negocio
'YYYY-MM-DD' como string.

## 7. Producción (Vantruck)

Vantruck corre el código del camino VIEJO (rama `main`, más ramas de fixes
de producción como `errorProveedores`). Nada de este frente va a
producción hasta la migración. Si un bug de fechas también afecta a
producción, lo anotamos aparte; no se toca `main` desde este frente.

## 8. Herramientas de desarrollo disponibles

`/migracion` (rol dev): Limpieza de demo, generadores (operaciones,
circuito, cobros), recálculos de resúmenes y comisiones, auditorías y
migraciones. Sirven para generar datos con fechas límite (fin de mes, 1/1)
y verificar Reportes después de corregir fechas.

## 9. Qué te pido en este primer paso

Relevamiento y diagnóstico, SIN instrucciones todavía:

1. **Lazy loading:**
   - Leé `app.module`, `raiz.module`, `raiz-routing.module`, todos los
     módulos de feature (`*.module.ts` y `*-routing.module.ts` de `raiz/`)
     y los componentes declarados en RaizModule.
   - Armá el mapa: qué importa RaizModule, qué usa realmente cada
     componente de Raiz de cada módulo de feature (selectores en templates,
     pipes, directivas, componentes abiertos con NgbModal), qué exporta
     cada feature y quién lo consume, y providers a nivel módulo.
   - Medí el bundle actual (pedime que corra `npm run build:demo` y te
     pegue la tabla de tamaños si no podés ejecutarlo vos).
   - Propuesta: orden de retiro de imports eager, qué mover a un
     `SharedModule`, riesgos.
2. **Fechas:**
   - Relevá TODO `src/` (y `functions/`) por patrón: `new Date(` con
     string, `toISOString()`, `getFullYear/getMonth/getDate` sobre fechas
     de negocio, pipe `date`, `Date.parse`, comparaciones de strings de
     fecha, construcción de rangos para consultas.
   - Clasificá cada caso (bug visible / latente / correcto / camino
     viejo), con archivo y línea.
   - Propuesta: util único (API, dónde vive), criterio de uso, orden de
     corrección por riesgo.
3. **Comparalo con lo registrado** (§4) y decime qué está desactualizado.
4. **Plan tentativo de bloques** (LZ…, FE…) y preguntas numeradas (L1…,
   D1…) para que yo decida. Decime también si conviene hacer primero lazy o
   fechas, o intercalar.
5. Guardá el relevamiento en `claude/diseno-lazy-fechas.md`.

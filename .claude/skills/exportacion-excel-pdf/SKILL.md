---
name: exportacion-excel-pdf
description: Exportación a Excel y PDF de ApLog — DocumentoTabular y LibroTabular, los renderers de servicios/exportacion/ (ExcelTabularService con exceljs, PdfTabularService con jsPDF) y las fachadas por dominio (LiquidacionExportService, OperacionesExportService, EntidadesExportService, AsignacionesExportService) con sus informes, vistas previas e import dinámico. Leer antes de trabajar sobre cualquier informe, descarga, Excel, PDF o vista previa.
---

## Frente Excel/PDF — InformeLiqNuevo (Septiembre 2026)

Documentos Excel y PDF de las liquidaciones del camino nuevo. Servicio
NUEVO, no un adaptador de los viejos (`ExcelService`/`PdfService` seguían
sirviendo al camino viejo y a los demás informes de la app, sin tocar; se
retiraron en el frente Informes, Octubre 2026).
Todo se hizo y probó en demo. Diseño y decisiones E1–E8: doc de proyecto
`claude/diseno-export-liquidacion.md`; instrucciones
`claude/instruccion-x0…x4-*.md`.

### Arquitectura: QUÉ dice el documento ≠ CÓMO se ve

    InformeLiqNuevo + InformeOp[]
            │
            ▼
    armarDocumentoLiq()  (shared/utils/documento-liq.util.ts, PURA)
            │  DocumentoTabular (interfaces/documento-tabular.ts, neutro)
            ├──▶ ExcelTabularService.generar(doc) → Blob   (exportacion/, exceljs)
            └──▶ PdfTabularService.generar(doc)   → Blob   (exportacion/, jsPDF + autotable)

    LiquidacionExportService (servicios/informes-liq/) — única puerta de los componentes

- El camino viejo tenía el QUÉ (textos, valores, subtotal) duplicado en cada
  servicio de librería, y ya había divergido. Acá lo decide UNA función pura;
  los renderers solo dibujan y no saben de InformeLiq (reutilizables para
  otros informes "tabla con encabezado y pie").
- `DocumentoTabular`: título, subtítulos, identificador, marca + leyenda,
  columnas tipadas (`tipo`, `ancho` para el Excel, `alineacion` opcional),
  filas con valores CRUDOS, `columnaTotal` (para las fórmulas del Excel), pie
  (subtotal / ajuste / total) y notas.
- Librerías con `await import(...)`. El chunk aparte recién se concretó al
  retirar los servicios viejos (frente Informes): hasta entonces los
  importaban en forma estática y el bundle no cambiaba.

### Variantes (se derivan del informe; el caller no pasa un "modo")

| Situación | Título | Identificador | Marca |
|---|---|---|---|
| `{ vistaPrevia: true }` (LiquidacionNueva, antes de guardar) | Liquidación de Servicios {entidad} | — | VISTA PREVIA |
| 'borrador' | Proforma {entidad} | — | PROFORMA |
| 'emitido' / 'facturado' | Liquidación de Servicios {entidad} | N° interno (+ línea del comprobante si está facturado) | — |
| 'revertido' | Liquidación de Servicios {entidad} | N° interno | REVERTIDO + leyenda (fecha y motivo) |

- Encabezado = el del camino viejo (E4: sin datos del emisor; el documento
  acompaña a la factura electrónica): logo, título, "Año / Mes / Período
  liquidado". Pie = Subtotal + ajustes (solo si hay ajustes) + Total, de
  `liq.valores`. Observaciones como nota. Filas por fecha y chofer.
  'A Pagar' en chofer/proveedor (`etiquetaColumna`).
- La vista previa del Detalle NO usa la marca VISTA PREVIA: es la proforma o
  el emitido real, con lo que está en pantalla.
- Nombres de archivo saneados: `Liquidacion_LQCL-0001_Entidad_2026-08-1q`,
  `Proforma_…`, `VistaPrevia_…`, `…_REVERTIDO`.

### Formato
- PDF (presentación): encabezado de tabla repetido en cada página; ancho de
  columna POR CONTENIDO (fecha, números y montos con `cellWidth: 'wrap'`,
  nunca se parten; texto `'auto'` con salto de línea); horizontal si la suma
  de anchos supera 140; márgenes 10 mm; pie como bloque propio a la derecha;
  marca de agua diagonal translúcida, "Generado el …" y "Página X de Y" en
  todas las páginas; Quincena centrada.
- Excel (para corregir a mano): montos como números con formato moneda,
  fechas como fechas (Date UTC); pie con FÓRMULAS (Subtotal = SUMA de la
  columna de monto; Total = Subtotal + ajustes) con el resultado
  precalculado; total por fila como VALOR (no siempre es la suma visible);
  sin "Tabla de Excel"; encabezado inmovilizado; A4 ajustado al ancho con el
  encabezado repetido al imprimir.
- Fechas 'YYYY-MM-DD' formateadas sin pasar por `Date` (huso horario).

### Fachada `LiquidacionExportService`
- `obtenerInformesOp(liq)`: vivos, o la copia congelada si está revertido.
- `descargar(liq, formato, informesOp?)` / `descargarPorId(id, formato)`:
  genera y descarga; log REIMPRIMIR (escritura suelta) SOLO si el documento
  tiene número (E5): nada para proforma ni vista previa.
- `vistaPrevia(liq, informesOp, opciones?)`: PDF en pestaña nueva, sin
  descargar (E2). La pestaña se abre ANTES de generar (`abrirUrlEnPestana`):
  llamar sincrónicamente desde el click. La URL del Blob no se revoca (el
  visor la necesita para descargar/imprimir).
- `preguntarFormatoDescarga(titulo)` (`shared/utils/preguntar-descarga.util.ts`):
  Swal Excel / PDF / No descargar en un solo lugar.

### Dónde se usa
| Lugar | Gesto | Comportamiento |
|---|---|---|
| LiquidacionNueva | "Vista previa" | PDF en pestaña (informe armado con `factory.crear`), marca VISTA PREVIA |
| InformeOpListado | Emitir / Guardar borrador OK | pregunta Excel / PDF / No descargar |
| Borradores | Emitir OK | pregunta |
| Borradores | acciones PDF / Excel | descarga directa de la proforma |
| Detalle | "Vista previa" | PDF con lo que está en pantalla, aunque no esté guardado |
| Emitidos / Facturados / Revertidos | acciones PDF / Excel | descarga directa (sin la confirmación redundante del camino viejo) |
Permiso de las descargas: `<modulo>.reimprimir` (E8). La pregunta se hace
después de apagar el spinner (el overlay tapaba el Swal).

## Frente Informes Excel/PDF (Octubre 2026)

Retiro de `ExcelService` y `PdfService` (`servicios/informes/`), los dos últimos
servicios que generaban documentos sabiendo de qué informe se trataba. Con ellos sale
`pdfmake`. Desde este frente, TODOS los informes tabulares de la app salen del mismo
mecanismo: una función pura por informe + los renderers genéricos de
`servicios/exportacion/`. Bloques IE0–IE5 e IEDOC. Diseño, decisiones D1–D9, inventario,
re-plan de la Tabla de Excel y avance: `claude/diseno-informes-excel-pdf.md` (Project).
Todo se probó en demo; nada se deployó a Vantruck.

### Las tres capas (regla del frente)

| Capa | Quién | Qué sabe |
|---|---|---|
| **QUÉ** | una función pura por informe, en `shared/utils/documento-<x>.util.ts` | el informe: columnas, etiquetas, valores crudos, totales |
| **CÓMO** | `ExcelTabularService` / `PdfTabularService` (`servicios/exportacion/`) | dibujar un `DocumentoTabular` / `LibroTabular`; nada del dominio |
| **QUIÉN** | una fachada por dominio | resolver los datos, llamar al renderer y descargar |

Las 7 fachadas de hoy: `LiquidacionExportService` (`informes-liq/`),
`ResumenOpExportService` (`reportes/resumenes-op/`), `ComisionesExportService`
(`vendedores/`), `FinanzasExportService` (`finanzas-nueva/`), `OperacionesExportService`
(`operaciones/`), `EntidadesExportService` (`entidades/`) y `AsignacionesExportService`
(`operaciones/`) — `OperacionesExportService` y `EntidadesExportService` son de este
frente; `AsignacionesExportService`, de AS1, posterior al cierre. El componente llama SOLO
a la fachada de su dominio; nunca al renderer ni a la función pura. De las 7, la única que
loguea es `LiquidacionExportService` (REIMPRIMIR, y solo si el documento tiene número:
decisión E5 del frente Excel/PDF); un listado o un informe del mes no deja registro.
(`ReciboPdfService` queda fuera del esquema: el Recibo / Orden de pago no es una tabla,
dibuja con jsPDF directo — y sí loguea REIMPRIMIR.)

### Tabla de Excel real (IE2)

Extensión ADITIVA del renderer de Excel: `TablaExcelDoc` + `TablaDoc.excel?`
(`interfaces/documento-tabular.ts`). Sin ese campo, el renderer dibuja la tabla como
antes y los 4 consumidores previos no cambian (verificado: el XML del .xlsx de
liquidación y del libro de resumen sale idéntico byte a byte al de antes). Con el campo,
`dibujarTablaExcel` usa `addTable` (ListObject de Excel): filtro por columna,
ordenamiento, bandas del tema, encabezado inmovilizado y fila de totales por
`SUBTOTAL(109, Tabla[Columna])` — el total SIGUE AL FILTRO, que es lo que una `SUM` fija
no hace. La celda del total se reescribe como `{ formula, result }` para que el valor
quede cacheado y Excel lo muestre sin recalcular.

Reglas de `addTable` que hay que respetar (son de exceljs / Excel, no del proyecto):
- el nombre de la tabla es único por libro;
- las etiquetas de columna son únicas y sin `[ ] # '` (las usa la referencia estructurada
  `Tabla[Columna]`); los espacios sí se admiten;
- una celda sin valor va VACÍA, no `—`: un guión en una columna de monto la vuelve de
  texto y arruina el filtro y el SUBTOTAL (`valorParaTabla`).

### Informe de operaciones (IE1, IE1b, IE2b)

`shared/utils/documento-operaciones.util.ts` (puro) + `OperacionesExportService`; el
botón "Descargar Op" de `tablero-op` exporta LO FILTRADO en pantalla
(`operacionesVista`), async, con aviso si el listado quedó vacío. 24 columnas, Tabla de
Excel con totales por SUBTOTAL en Km y en las 10 de monto. `INDICES_TOTAL` se DERIVA de
`COLUMNAS`: con índices fijos, insertar una columna en el medio habría sumado las
columnas equivocadas sin que `tsc` avise.

Dos columnas nuevas, una por operación: **Nivel** y **Tarifa**. Una operación tiene un
nivel por LADO (cliente y chofer pueden resolver por tarifas distintas), así que para una
sola columna hace falta una jerarquía: `shared/utils/nivel-tarifa-op.util.ts` usa el
`ORDEN_NIVELES` que el proyecto ya tenía (`interfaces/tarifa-habilitada.ts`, ahora
exportado y `readonly`), del más específico al más genérico; `null` pierde, los dos
`null` dan "Sin resolver", y un empate lo gana el lado cliente. **Tarifa** es el
`nombreTarifa` del lado ganador, vacía en eventual (no hay documento de tarifa). El util
concentra `nivelLadoOp` (movido tal cual desde `TableroOpComponent`, que ahora delega),
`nivelTarifaOp`, `refTarifaOp` y `etiquetaNivelTarifa` (el pipe delega).
`claseNivelTarifa` NO se movió: una clase CSS es presentación, no dominio.

### Listados de Clientes, Choferes y Proveedores (IE3, IE3b)

`shared/utils/documento-entidades.util.ts` (puro: `armarLibroClientes` /
`armarLibroChoferes` / `armarLibroProveedores`, con `COLUMNAS_EMPRESA` compartido entre
Cliente y Proveedor) + `EntidadesExportService`. Los tres son Tabla de Excel sin fila de
totales. Cambios de contenido respecto del informe viejo:
- **Vehículos de Choferes, ARREGLADA:** salía vacía siempre porque el informe viejo leía
  `(chofer as any).vehiculo`, campo del modelo viejo. Ahora se resuelve por
  `Vehiculo.asignadoA` (`agruparVehiculosPorDuenio`, pura y por eso testeable); un chofer
  de proveedor no tiene vehículos propios — están en el listado de Proveedores.
- **Clientes** gana "Vendedores asignados" (`Apellido, Nombre (35%)`, o
  `Sin resolver (10%)` si el vendedor ya no está), con
  `VendedorService.obtenerTodosUnaVez()` cuando el listener no está abierto.
- **Proveedores** gana "Choferes" y "Vehículos".
- **Fecha de Nacimiento** pasa a celda de fecha real vía `normalizarFechaNacimiento`:
  convierte los Timestamp legacy y deja la celda vacía si no es una fecha de negocio. El
  CUIT sigue siendo texto a propósito (no es un número con el que se calcule).

### Permisos de las descargas

`AccionPermiso` gana `descargarListado` → `leer` (`descargarTablero` ya existía). Las
cuatro descargas quedan en **dev/admin**, con overrides puntuales en `PermisosService`:
`operaciones.descargarTablero` pasa a `{ demo: false, user: false }` (IE2c) y los tres
listados suman `{ demo: false, user: false }` (IE3b). Dos razones: bajar el padrón
completo o el informe del mes es una tarea de administración, no del empleado que carga
operaciones (confirmado con el negocio el 19/10/2026); y la columna "Vendedores
asignados" lee la colección `vendedores`, que `user` no puede leer — dejarlo descargar le
rompería la descarga con `permission-denied`. Van tres entradas de override y no una
porque la clave es el `ModuloPermiso` del caller: `clientes`/`choferes`/`proveedores`
comparten el módulo `entidades` de las reglas, no la clave del override. El botón de los
listados no tenía ningún gating antes, así que `user`, `demo` y `manager` pierden un
botón que veían.

### Lo que se borró

- **IE4, los dos botones muertos:** la columna "Reimpresión" de `objeto-papelera`
  (Papelera legado) con su `reimprimirFac` — estaba roto, leía `clientes$`/`choferes$` de
  `StorageService`, que siempre emiten `[]` (D1) — y el botón inerte "⬇ Descargar" de
  `tablero-asignaciones`, que solo mostraba un aviso desde el switch de Asignaciones
  (D6). Con ellos se fueron tres inyecciones sin uso: `ExcelService`, `PdfService` y
  `LogService` (su único uso era el último `REIMPRESION` del log viejo).
- **IE5, los servicios:** `ExcelService` (890 líneas), `PdfService` (354) y sus dos
  `.spec.ts` — 4 archivos, 1.276 líneas; la carpeta `servicios/informes/` desaparece (no
  confundir con `servicios/informes-liq/` ni `servicios/informes-op/`). Y
  `npm uninstall pdfmake @types/pdfmake --legacy-peer-deps`.
- `sanearNombreArchivo` queda en una sola copia (`shared/utils/nombre-archivo.util.ts`),
  igual que `etiquetaEstadoOp` (`estado-op.util.ts`) y el logo
  (`exportacion/logo-empresa.ts`).

### Bundle (medido con builds antes/después en cada bloque)

| Bloque | Qué dejó de descargarse |
|---|---|
| IE0 | el chunk de `pdfmake` (**2,51 MB**) desaparece del build entero (eran 7 líneas muertas de `PdfService`: 2 imports, la asignación de `vfs` y el bloque comentado equivalente) |
| IE1b | `exceljs` sale de `/op` (945,76 kB / 217,91 kB transferidos) |
| IE3b | `exceljs` sale de `clientes`, `choferes` y `proveedores` |
| IE4 | `exceljs` + `jspdf` + autotable salen de `ajustes` (1.331,88 kB / 324,46 kB) |
| IE5 | nada: el bundle ya no los tenía. Se van el código y la dependencia |

**Resultado: ninguna ruta de la app descarga una librería de exportación al entrar.**
`exceljs`, `jspdf` y `jspdf-autotable` quedan en sus chunks y los carga el renderer con
`import()` recién al exportar. El inicial no se movió (1,53 MB): esas librerías nunca
estuvieron ahí, estaban en los chunks de las rutas.

### Verificación de cada bloque

Lo del frente anterior, más dos cosas propias: el .xlsx se GENERA DE VERDAD con las
funciones puras y el renderer reales (arnés en Node que compila los archivos del proyecto
a CommonJS con un shim de `@angular/core`) y se relee para chequear columnas, tipos,
fórmulas, totales y celdas vacías; y el round-trip aplica la instrucción RENDERIZADA
sobre una copia limpia en el commit de partida y compara hashes de git.

Dos deslices quedaron registrados, los dos en el BLOQUE PEGADO EN EL CHAT (el archivo
entregado estaba bien las dos veces): en IE2b y en IE3b los hashes se transcribieron
completando a mano los 32 caracteres que no estaban impresos. En IE2b el PASO 0 lo frenó:
tres hashes no coincidían. **En IE3b no frenó**, y por una razón que vale registrar: el
único que no cerraba era de un archivo sin cambios desde un commit anterior al frente, así
que el criterio correcto era seguir —la instrucción es el sospechoso, no el repo— y se
siguió, avisando. Un PASO 0 detecta el desvío cuando es grande; con un solo valor mal, lo
que decide es el criterio. **Desde IE4** el bloque del chat ya no lleva hashes: van solo
en el archivo de la instrucción, generados con `git rev-parse` / `git hash-object` y nunca
tipeados.

### Informe del tablero de asignaciones (AS1, posterior al cierre)

El informe que IE4 había retirado, reescrito sobre el mecanismo de este frente. NO es el
viejo: ese era un LAYOUT —matriz de clientes con celdas pintadas por categoría, notas de
celda, bloques laterales y una hoja oculta para un ida y vuelta por Excel que nunca se
cableó— y `LibroTabular` no tiene relleno por celda, ni notas, ni celdas combinadas. El
viejo quedó registrado en `claude/diseno-informes-excel-pdf.md` §7, por si alguna vez se
quiere la réplica visual; haría falta extender el renderer compartido.

`shared/utils/documento-asignaciones.util.ts` (puro) + `AsignacionesExportService`
(`servicios/operaciones/`), **Excel y PDF**: con 9 y 6 columnas entra legible en PDF, a
diferencia del informe de operaciones (22 columnas, D5). Dos hojas, las dos Tabla de Excel
y sin fila de totales:
- **Asignaciones** — una fila por asignación: Cliente · Categoría · Dominio · Chofer ·
  Proveedor · Observación · Hoja de ruta · Estado · Motivo anulación. Exporta lo que está
  EN PANTALLA (el borrador en modo edición, el tablero confirmado en visor) y el subtítulo
  dice cuál de los dos. Un item cuyo cliente ya no resuelve no tiene columna en la grilla,
  pero sí fila en el informe: va al final, con Cliente "Sin resolver" — un informe no puede
  perder items.
- **No disponibles** — una fila por chofer no disponible Y VEHÍCULO: Chofer · Dominio ·
  Categoría · Desde · Hasta · Motivo. Solo las vigentes en la fecha del tablero, no todas
  las cargadas.

Decisiones que conviene no reabrir:
- **Chofer y Proveedor en columnas separadas**, y **Estado** separado de **Motivo
  anulación**: es la lección de IE2b. Un "Anulada: el cliente canceló" sería un valor
  distinto de "Anulada" para el filtro de la Tabla, y la columna dejaría de servir.
- **No hay columna de operación.** `AsignacionItem.idOperacion` guarda el document id de
  Firestore (`altaDesdeAsignacion` le asigna `db.generarId('operaciones')`), no el número
  visible, que es `Operacion.numeroOperacion`.
- **Una fila por chofer Y vehículo** en la hoja 2: es lo que permite filtrar por categoría.
  Un chofer sin vehículos propios aparece igual, con esas dos celdas vacías.
- **`Hasta` sin valor va VACÍO** en el Excel ("—" en el PDF): un guión en una columna de
  fecha la vuelve de texto y rompe el filtro y el orden (regla de `valorParaTabla`, IE2).

**Permiso `descargarAsignaciones`** → `leer`, con override `{ demo: false }`:
dev/admin/user sí, demo y manager no. NO reusa `descargarTablero`, que desde IE1b gobierna
el tablero de OPERACIONES y quedó en dev/admin (IE2c) — este tablero es la pantalla
principal del único empleado activo y el informe es de su propio trabajo del día. No
necesita `user: true`: `leer` en `operaciones` ya lo da, y lo único de lo que hay que
apartarse en la matriz es `demo`.

**`shared/utils/no-disponibilidad.util.ts`:** la regla "¿está no operativo en esta fecha?"
estaba escrita CUATRO veces —el par `calcularChoferesNoOperativosPorFecha` +
`getMotivoNoDisponibilidad`, duplicado en `tablero-asignaciones` y en `carga-asignacion`, y
en cada par con dos implementaciones distintas: `new Date(f + 'T00:00:00')` contra
comparación de strings—. Queda UNA sola, por string (la convención del proyecto), y los dos
componentes delegan conservando sus fallbacks en el caller. `carga-asignacion` entró al
bloque solo por esto: dejar ahí la cuarta copia habría dejado el JSDoc del util afirmando
"única definición" en falso.

El bundle no se movió donde importa: **ninguna ruta pide `exceljs` ni `jspdf`**, pese a que
la fachada inyecta los DOS renderers, porque los cargan con `import()`. El chunk de
`operaciones` sube de 200,00 a 214,17 kB (el código nuevo) y el inicial sigue en 1,53 MB.

## Deuda abierta — tras el frente Informes Excel/PDF
- ~~**Etiqueta "Municipio Operativa"** en los listados de Clientes y Proveedores~~ —
  CORREGIDA a "Municipio Operativo" en un fix posterior al cierre del frente. Las otras
  tres etiquetas del par Operativa (Dirección, Localidad, Provincia) ya concordaban, y
  las cuatro Fiscal no tienen género.
- **Badge de nivel de tarifa del tablero de operaciones: se queda con uno por lado**
  (cliente y chofer) — decisión tomada al cierre del frente, viéndolo en pantalla: los
  dos niveles juntos informan y no estorban. Si el usuario pide uno solo,
  `nivelTarifaOp` ya resuelve la jerarquía y el cambio es de template. En el informe de
  Excel sí va uno solo, y por un motivo que NO aplica a la pantalla: con los dos lados
  en la celda, el filtro de la Tabla trataría "Especial - General" como un valor
  distinto de "Especial" y la columna dejaría de servir para filtrar u ordenar;
  separarlos pediría una columna por lado y filtros compuestos, que no se justifica para
  este dato. La pantalla no filtra por el badge, así que ahí el doble dato no cuesta
  nada.
- **`arrayFacOp` y `$choferes` de `objeto-papelera`** se siguen cargando sin ningún
  consumidor desde que se fue la columna "Reimpresión" (IE4). Se van con la Papelera
  legado (frente Ajustes).
- ~~El informe del tablero de asignaciones quedó sin botón (IE4)~~ — REPUESTO en AS1
  (20/10), reescrito de cero sobre `LibroTabular`, con Excel y PDF: ver "Informe del
  tablero de asignaciones".

Si no ves la línea FIN DE LA INSTRUCCIÓN IEDOC al final, el texto llegó cortado: leé el archivo completo.

# IEDOC — CLAUDE.md y CHANGELOG del frente Informes Excel/PDF

## Contexto y razonamiento

Último bloque del frente. No toca una línea de código: solo `CLAUDE.md` y `CHANGELOG.md`.

Lo que se escribe es una sección nueva del frente y, sobre todo, lo que ahora quedó
FALSO en el archivo. `CLAUDE.md` es el documento que lee Claude Code al arrancar cada
sesión: una línea que dice que `ExcelService` sigue sirviendo a los listados hace más
daño que una línea que falta, porque se va a creer.

Lo que queda desactualizado y se corrige:

| Dónde | Qué decía | Por qué es falso |
|---|---|---|
| Stack técnico | "PDFMake (solo la Papelera legado)" | `pdfmake` salió del `package.json` en IE5 |
| Servicios clave | la fila `informes/` entera | esa carpeta no existe más |
| Servicios clave | la fila `exportacion/` | ahora es el único camino de exportación, no uno de dos |
| Frente Excel/PDF — InformeLiqNuevo | "los servicios viejos siguen sirviendo…" y "chunk aparte cuando se retiren" | ya se retiraron; el chunk aparte se concretó |
| Frente Lazy loading + fechas | `exportToExcelInforme` / `exportToPdfInforme` en la lista de "Se quedan" | se fueron en IE4 e IE5, antes que la Papelera legado |
| Deuda menor — tablero-asignaciones | el informe Excel inerte, "diferido a cierre de módulo" | el botón se borró en IE4 (D6) |
| Deuda — Excel/PDF | la entrada completa | es exactamente lo que este frente vino a hacer |
| Deuda — tras Lazy loading | `pdfmake` en el chunk de Ajustes; `exceljs` en `/op` | los dos resueltos |

Y se agregan dos secciones nuevas: **"Frente Informes Excel/PDF (Octubre 2026)"** (antes
de "Deuda conocida", donde van todos los frentes) y **"Deuda — tras el frente Informes
Excel/PDF"** (al final de las deudas, después de la del frente Ficha de entidad, que es
el frente anterior).

En la deuda nueva van las dos ofertas que quedaron abiertas, para que no se pierdan:
colapsar el badge de nivel de tarifa del tablero a uno solo con la jerarquía de IE2b, y
la etiqueta "Municipio Operativa" de los listados. Sobre esa segunda: revisándola para
escribirla, la única que no concuerda en género es "Municipio Operativa" (sería
"Municipio Operativo"); **"Provincia Operativa" está bien** y no hay nada que corregir
ahí. Las dos quedan como oferta, no como deuda a saldar: cambiar un encabezado que el
usuario ya conoce es decisión de producto, no de refactor.

El `CHANGELOG` lleva la sección del frente antes del cierre "### Pendiente", y dos
correcciones ahí: Ajustes ya no arrastra la exportación ni PDFMake, y el punto
transversal "Excel/PDF de los demás informes sobre `DocumentoTabular`" queda tachado.

**Lo que NO se toca, a propósito:** las menciones a `ExcelService` / `PdfService` en las
secciones "Retiro del camino viejo" de los frentes Reportes, Vendedores, Finanzas y
Tarifas, y en el método de búsqueda de código sin uso del frente Lazy. Son registro
histórico de qué borró cada frente: decían la verdad cuando se escribieron y la siguen
diciendo. Tampoco los JSDoc de `documento-entidades.util.ts` y
`documento-operaciones.util.ts`, que citan de dónde salió cada columna.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- **Validá TODOS los BUSCAR antes de escribir el primero.** Son 13 (10 en `CLAUDE.md`,
  3 en `CHANGELOG.md`) y cada uno aparece exactamente UNA vez. Si alguno no está o está
  repetido, detenete y avisá sin escribir nada.
- Aplicá los pasos EN ORDEN. Editá los archivos en el lugar; no los recrees.
- LF en los finales de línea.
- Son archivos Markdown: respetá el ancho de línea y el sangrado de los bloques tal como
  vienen escritos. Ninguna línea nueva lleva espacios al final.
- Los dos archivos están FUERA de la compilación de Angular: no hace falta `tsc` ni
  `build:demo` en este bloque, y no los pido. Si querés correr el build igual, tiene que
  dar lo mismo que en IE5 (9 advertencias, inicial 1,53 MB).

## PASO 0 — verificación, sin modificar nada

Los hashes están en el Anexo del archivo de la instrucción
(`instruccion-iedoc-informes.md`), generados con `git`. Usá esa lista.

1. `git rev-parse --abbrev-ref HEAD` → `refactor`; `git log --oneline -1` → el commit de
   IE5.
2. `git status --short` → vacío (sin cambios locales pendientes).
3. `git hash-object CLAUDE.md` y `git hash-object CHANGELOG.md` → los dos hashes de
   partida del Anexo.
4. `wc -l CLAUDE.md CHANGELOG.md` → 4694 (CLAUDE.md) y 2327 (CHANGELOG.md).
5. Que los servicios ya no estén, para confirmar que IEDOC va después de IE5:
   `ls src/app/servicios/informes` → error de "no such file or directory";
   `grep -c pdfmake package.json` → `0`.

## PASO 1 — CLAUDE.md (10 bloques)

### Bloque 1 de 10

BUSCAR (6 líneas):

```
  `bootstrap-icons` locales. Tablas de datos: `TablaGenericaComponent` propio (AG Grid,
  jquery y DataTables se retiraron en el frente Lazy loading + fechas)
- **Backend/DB:** Firebase (Firestore + Auth + Hosting + Storage + Cloud Functions)
- **Exports:** ExcelJS, jsPDF (+ autotable), PDFMake (solo la Papelera legado)
- **Fechas:** `shared/utils/fecha.util.ts`, sin librerías (ver "Convenciones")
- **Editor:** VSCode
```

REEMPLAZAR por (7 líneas):

```
  `bootstrap-icons` locales. Tablas de datos: `TablaGenericaComponent` propio (AG Grid,
  jquery y DataTables se retiraron en el frente Lazy loading + fechas)
- **Backend/DB:** Firebase (Firestore + Auth + Hosting + Storage + Cloud Functions)
- **Exports:** ExcelJS y jsPDF (+ autotable), los dos con `import()` dinámico desde los
  renderers de `servicios/exportacion/` (PDFMake se retiró en el frente Informes)
- **Fechas:** `shared/utils/fecha.util.ts`, sin librerías (ver "Convenciones")
- **Editor:** VSCode
```

### Bloque 2 de 10

BUSCAR (8 líneas):

```
| `tarifario/` | Tarifario nuevo: `TarifarioService` (estado y escritura de `tarifas` / `tarifasEspeciales` / `registrosOpEventuales`), factories, `TarifaGuardadoService`, motor `ValoresTarifaService` y `ResolucionTarifaOpService` — ver "Frente Tarifas — tarifario nuevo" |
| `informes-op/` | `InformeOpService` (+ Factory) — `InformeOpNuevo` en la colección única `informesOp` (un doc por lado de cada operación, con `contraParte`). `armarEscriturasEdicion` (armado sin commit) + `editar` (armado + commit) |
| `informes-liq/` | `InformeLiqService` + `InformeLiqFactoryService` — `InformeLiqNuevo` en `informesLiq`: borradores, emisión, edición. Ver "Frente Liquidación — InformeLiqNuevo" |
| `informes/` | Generación de reportes Excel y PDF — camino VIEJO (`ExcelService`/`PdfService`): hoy solo los listados (operaciones, clientes, choferes, proveedores) y la Papelera legado; los documentos de InformeLiqNuevo salen de `exportacion/` + `LiquidacionExportService` |
| `exportacion/` | Renderers GENÉRICOS de `DocumentoTabular` (`generar`) y `LibroTabular` (`generarLibro`, varias hojas con varias tablas) — no saben de qué informe se trata: `PdfTabularService` (jsPDF + autotable), `ExcelTabularService` (exceljs), formatos y logo compartidos. Librerías con import dinámico — ver "Frente Excel/PDF — InformeLiqNuevo" y "Frente Reportes" |
| `reportes/resumenes-op/` | Resúmenes mensuales de operaciones (`resumenesOp`): `ResumenOpFactoryService` (pura: aporte de una op, claves, escrituras de cierre/edición/baja, agregados del Recálculo), `ResumenOpConsultaService` (solo lectura, pantallas), `TablaResumenConfigService` (columnas y fórmulas por modo), `ResumenOpExportService` (Excel/PDF) — ver "Frente Reportes" |
| `vendedores/` | Vendedores y comisiones de venta: `VendedorService` (listener en memoria; alta/edición/asignación, desactivar/reactivar), `ComisionVentaFactoryService` (pura: escrituras de cierre/edición/baja sobre `comisionesVenta`), `ComisionVentaConsultaService` (solo lectura: mes, pendientes, tablero), `LiquidacionVentaService` (emitir/pagar/revertir/anular en transacción), `ComisionesExportService` (Excel/PDF) — ver "Frente Vendedores" |
| `finanzas-nueva/` | Finanzas: `MovimientoFinService` (registrar, anular, imputar saldo, ajustes, cerrar saldo, devolución; cada gesto en transacción con log), `FinanzasConsultaService` (solo lectura, en vivo), `FinanzasExportService` (Excel/PDF de listados y cuenta), `ReciboPdfService` (Recibo / Orden de pago) — ver "Frente Finanzas" |
```

REEMPLAZAR por (7 líneas):

```
| `tarifario/` | Tarifario nuevo: `TarifarioService` (estado y escritura de `tarifas` / `tarifasEspeciales` / `registrosOpEventuales`), factories, `TarifaGuardadoService`, motor `ValoresTarifaService` y `ResolucionTarifaOpService` — ver "Frente Tarifas — tarifario nuevo" |
| `informes-op/` | `InformeOpService` (+ Factory) — `InformeOpNuevo` en la colección única `informesOp` (un doc por lado de cada operación, con `contraParte`). `armarEscriturasEdicion` (armado sin commit) + `editar` (armado + commit) |
| `informes-liq/` | `InformeLiqService` + `InformeLiqFactoryService` — `InformeLiqNuevo` en `informesLiq`: borradores, emisión, edición. Ver "Frente Liquidación — InformeLiqNuevo" |
| `exportacion/` | Renderers GENÉRICOS de `DocumentoTabular` (`generar`) y `LibroTabular` (`generarLibro`, varias hojas con varias tablas) — no saben de qué informe se trata: `PdfTabularService` (jsPDF + autotable), `ExcelTabularService` (exceljs, con Tabla de Excel real cuando la tabla trae `excel`), formatos y logo compartidos. Librerías con import dinámico. Desde el frente Informes, TODO informe tabular de la app sale de acá, por la fachada de su dominio (la única excepción es el Recibo / Orden de pago, que no es una tabla) — ver "Frente Informes Excel/PDF" |
| `reportes/resumenes-op/` | Resúmenes mensuales de operaciones (`resumenesOp`): `ResumenOpFactoryService` (pura: aporte de una op, claves, escrituras de cierre/edición/baja, agregados del Recálculo), `ResumenOpConsultaService` (solo lectura, pantallas), `TablaResumenConfigService` (columnas y fórmulas por modo), `ResumenOpExportService` (Excel/PDF) — ver "Frente Reportes" |
| `vendedores/` | Vendedores y comisiones de venta: `VendedorService` (listener en memoria; alta/edición/asignación, desactivar/reactivar), `ComisionVentaFactoryService` (pura: escrituras de cierre/edición/baja sobre `comisionesVenta`), `ComisionVentaConsultaService` (solo lectura: mes, pendientes, tablero), `LiquidacionVentaService` (emitir/pagar/revertir/anular en transacción), `ComisionesExportService` (Excel/PDF) — ver "Frente Vendedores" |
| `finanzas-nueva/` | Finanzas: `MovimientoFinService` (registrar, anular, imputar saldo, ajustes, cerrar saldo, devolución; cada gesto en transacción con log), `FinanzasConsultaService` (solo lectura, en vivo), `FinanzasExportService` (Excel/PDF de listados y cuenta), `ReciboPdfService` (Recibo / Orden de pago) — ver "Frente Finanzas" |
```

### Bloque 3 de 10

BUSCAR (8 líneas):

```
## Frente Excel/PDF — InformeLiqNuevo (Septiembre 2026)

Documentos Excel y PDF de las liquidaciones del camino nuevo. Servicio
NUEVO, no un adaptador de los viejos (`ExcelService`/`PdfService` siguen
sirviendo al camino viejo y a los demás informes de la app, sin tocar).
Todo se hizo y probó en demo. Diseño y decisiones E1–E8: doc de proyecto
`claude/diseno-export-liquidacion.md`; instrucciones
`claude/instruccion-x0…x4-*.md`.
```

REEMPLAZAR por (9 líneas):

```
## Frente Excel/PDF — InformeLiqNuevo (Septiembre 2026)

Documentos Excel y PDF de las liquidaciones del camino nuevo. Servicio
NUEVO, no un adaptador de los viejos (`ExcelService`/`PdfService` seguían
sirviendo al camino viejo y a los demás informes de la app, sin tocar; se
retiraron en el frente Informes, Octubre 2026).
Todo se hizo y probó en demo. Diseño y decisiones E1–E8: doc de proyecto
`claude/diseno-export-liquidacion.md`; instrucciones
`claude/instruccion-x0…x4-*.md`.
```

### Bloque 4 de 10

BUSCAR (8 líneas):

```
  columnas tipadas (`tipo`, `ancho` para el Excel, `alineacion` opcional),
  filas con valores CRUDOS, `columnaTotal` (para las fórmulas del Excel), pie
  (subtotal / ajuste / total) y notas.
- Librerías con `await import(...)`: chunk aparte cuando se retiren los
  servicios viejos (hoy las importan en forma estática, así que el bundle
  no cambia todavía).

### Variantes (se derivan del informe; el caller no pasa un "modo")
```

REEMPLAZAR por (8 líneas):

```
  columnas tipadas (`tipo`, `ancho` para el Excel, `alineacion` opcional),
  filas con valores CRUDOS, `columnaTotal` (para las fórmulas del Excel), pie
  (subtotal / ajuste / total) y notas.
- Librerías con `await import(...)`. El chunk aparte recién se concretó al
  retirar los servicios viejos (frente Informes): hasta entonces los
  importaban en forma estática y el bundle no cambiaba.

### Variantes (se derivan del informe; el caller no pasa un "modo")
```

### Bloque 5 de 10

BUSCAR (7 líneas):

```
- **Se quedan** (decisión D5; retirarlos es decisión de producto del frente Ajustes):
  - Registro viejo (`logs`) y `LogService`;
  - Papelera legado + `ObjetoPapelera`;
  - `exportToExcelInforme` / `exportToPdfInforme`.
- **Excepción a no borrar:** el import de `appVersion` en `app.component.ts`. Parece sin
  uso, pero mete `version.ts` en la compilación: los `require()` de versión (app, home,
  sidebar) no los ve tsc, y sin ese import el build falla.
```

REEMPLAZAR por (8 líneas):

```
- **Se quedan** (decisión D5; retirarlos es decisión de producto del frente Ajustes):
  - Registro viejo (`logs`) y `LogService`;
  - Papelera legado + `ObjetoPapelera`;
  - ~~`exportToExcelInforme` / `exportToPdfInforme`~~ — se fueron antes que la Papelera,
    con su botón y sus servicios (frente Informes, IE4 e IE5).
- **Excepción a no borrar:** el import de `appVersion` en `app.component.ts`. Parece sin
  uso, pero mete `version.ts` en la compilación: los `require()` de versión (app, home,
  sidebar) no los ve tsc, y sin ese import el build falla.
```

### Bloque 6 de 10

BUSCAR (5 líneas):

```
`npm test`) y `build:demo` (mismas 9 advertencias). La prueba de render se sumó en FI1b:
FI1 compilaba pero fallaba al abrir (NG0309, ver "Deuda — tras el frente Ficha de
entidad").

## Deuda conocida
```

REEMPLAZAR por (148 líneas):

```
`npm test`) y `build:demo` (mismas 9 advertencias). La prueba de render se sumó en FI1b:
FI1 compilaba pero fallaba al abrir (NG0309, ver "Deuda — tras el frente Ficha de
entidad").

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

Las 6 fachadas de hoy: `LiquidacionExportService` (`informes-liq/`),
`ResumenOpExportService` (`reportes/resumenes-op/`), `ComisionesExportService`
(`vendedores/`), `FinanzasExportService` (`finanzas-nueva/`), `OperacionesExportService`
(`operaciones/`) y `EntidadesExportService` (`entidades/`) — las dos últimas, de este
frente. El componente llama SOLO a la fachada de su dominio; nunca al renderer ni a la
función pura. De las 6, la única que loguea es `LiquidacionExportService` (REIMPRIMIR, y
solo si el documento tiene número: decisión E5 del frente Excel/PDF); un listado o un
informe del mes no deja registro. (`ReciboPdfService` queda fuera del esquema: el Recibo /
Orden de pago no es una tabla, dibuja con jsPDF directo — y sí loguea REIMPRIMIR.)

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
| IE0 | el chunk de `pdfmake` (**2,51 MB**) desaparece del build entero (eran 3 imports muertos) |
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
sobre una copia limpia en el commit de partida y compara hashes de git. Dos deslices
quedaron registrados: en IE2b y en IE3b el bloque pegado en el chat traía hashes
completados a mano (estaban impresos solo los primeros 8 caracteres) y el PASO 0 los
frenó las dos veces. Desde IE3b las tablas de hashes van SOLO en el archivo de la
instrucción, generadas con `git rev-parse` / `git hash-object`.

## Deuda conocida
```

### Bloque 7 de 10

BUSCAR (7 líneas):

```
### Deuda menor — tablero-asignaciones

**Informe Excel (`descargar`):** inerte, muestra aviso. `generarInformeAsignaciones` recibía
estructuras del modelo viejo; reescribir para `AsignacionItem[]`. Diferido a cierre de módulo.

**No-disponibilidad sin probar end-to-end:** la atenuación de vehículos de proveedor está
correctamente ausente en el tablero (diferida a operaciones-editor), pero verificar la
```

REEMPLAZAR por (9 líneas):

```
### Deuda menor — tablero-asignaciones

~~**Informe Excel (`descargar`):** inerte, muestra aviso.~~ — RESUELTO en el frente
Informes (IE4): el botón y su método se borraron (D6). Si el informe se quiere de vuelta,
se escribe de cero sobre `LibroTabular` desde `AsignacionItem[]`; el viejo quedó
registrado en `claude/diseno-informes-excel-pdf.md` §7.

**No-disponibilidad sin probar end-to-end:** la atenuación de vehículos de proveedor está
correctamente ausente en el tablero (diferida a operaciones-editor), pero verificar la
```

### Bloque 8 de 10

BUSCAR (33 líneas):

```
demo se limpiaron con la herramienta de `/migracion`; las de Vantruck se traducen con el
método de migración (ver "Checklist — migración de Tarifas a Vantruck").

### Deuda — Excel/PDF
- Servicios viejos `ExcelService` / `PdfService`: siguen en uso por el
  camino viejo de liquidación y facturación (`exportToExcelInforme` /
  `exportToPdfInforme` en LiquidacionesOp, Proforma y objeto-papelera;
  FacturacionListado / FacturacionHistorico se borraron en el Frente
  Finanzas) y por los demás informes de la app (operaciones, asignaciones,
  clientes, choferes; el resumen de Reportes ya sale de `generarLibro`, ver
  "Frente Reportes", las comisiones de venta de `ComisionesExportService`,
  ver "Frente Vendedores", y Finanzas de `FinanzasExportService` /
  `ReciboPdfService`, ver "Frente Finanzas"). Se retiran los de liquidación con el camino viejo
  (migración de Vantruck); los demás, en sus frentes, idealmente sobre
  `DocumentoTabular` + los renderers de `exportacion/`.
- Mientras los servicios viejos importen exceljs/jspdf en forma estática, el
  import dinámico de los renderers nuevos no saca esas librerías del bundle
  inicial (ver también "Deuda — RaizModule").
- Logo: la copia única está en `exportacion/logo-empresa.ts`; los servicios
  viejos conservan la suya hasta que se retiren.
- ~~Los servicios viejos usan `new Date('YYYY-MM-DD').getFullYear()`~~ — RESUELTO
  en el frente Lazy loading + fechas (`anioDe`).
- ~~Excel de choferes (decisión D6 del frente Lazy loading + fechas):
  `ExcelService.formatearFecha` muestra `fechaNac` un día antes, y
  `Chofer.datosPersonales.fechaNac` está tipado `Date`~~ — RESUELTO en el frente Ficha
  de entidad (F10 + FI1c): `fechaNac: string` y `fechaLegible`. La reescritura sobre
  `DocumentoTabular` sigue pendiente por `exceljs` (punto siguiente).
- `exceljs` (~0,95 MB) se descarga al entrar a `/op` porque `tablero-op` inyecta
  `ExcelService` (import estático). Se resuelve con la misma reescritura
  (`ExcelTabularService` ya lo carga con `import()`).

### Deuda — tras el frente Lazy loading + fechas
- **UX:** el `<h1>` sin cerrar de `src/index.html` envuelve TODA la app
```

REEMPLAZAR por (14 líneas):

```
demo se limpiaron con la herramienta de `/migracion`; las de Vantruck se traducen con el
método de migración (ver "Checklist — migración de Tarifas a Vantruck").

### ~~Deuda — Excel/PDF~~ — SALDADA (frente Informes, Octubre 2026)
`ExcelService` y `PdfService` se retiraron, con `pdfmake`; todos los informes de la app
salen de `DocumentoTabular` / `LibroTabular` + los renderers de `exportacion/`, por una
fachada por dominio. Con eso quedaron hechos los cuatro puntos que esta entrada pedía: el
logo en una sola copia, el import dinámico sacando de verdad las librerías del bundle
(ninguna ruta las descarga al entrar), el Excel de choferes reescrito y `exceljs` fuera
de `/op`. Ver "Frente Informes Excel/PDF" y, para lo que quedó abierto, "Deuda — tras el
frente Informes Excel/PDF".

### Deuda — tras el frente Lazy loading + fechas
- **UX:** el `<h1>` sin cerrar de `src/index.html` envuelve TODA la app
```

### Bloque 9 de 10

BUSCAR (13 líneas):

```
  revisión visual pantalla por pantalla.
- **Ajustes / Papelera legado:** `clientes$`, `choferes$` y `proveedores$` de
  `StorageService` siempre emiten `[]`: nadie escribe esas claves de `localStorage` y
  `clearAllLocalStorage()` las borra en cada login. Afecta al Excel/PDF de documentos
  viejos en `objeto-papelera` (listas vacías). `modal-vehiculo` asigna `$proveedores`
  sin usarlo. Se va con la Papelera legado.
- **Bundle:**
  - `pdfmake` (~2,5 MB) queda en el chunk de Ajustes, solo por `papelera-legado`; se va
    con la Papelera legado;
  - `exceljs` en `/op`: ver "Deuda — Excel/PDF".
- **Specs de Karma:** 7 no compilan (`npm test` no corre). Son nombres de clase que ya
  no existen (`clientes-control`, `valores-op`) y directivas instanciadas sin
  argumentos (5 specs). Preexistente.
```

REEMPLAZAR por (12 líneas):

```
  revisión visual pantalla por pantalla.
- **Ajustes / Papelera legado:** `clientes$`, `choferes$` y `proveedores$` de
  `StorageService` siempre emiten `[]`: nadie escribe esas claves de `localStorage` y
  `clearAllLocalStorage()` las borra en cada login. Era lo que vaciaba las listas del
  Excel/PDF de documentos viejos de `objeto-papelera`, retirado en el frente Informes
  (IE4). `modal-vehiculo` asigna `$proveedores` sin usarlo. Se va con la Papelera legado.
- **Bundle:** ~~`pdfmake` (~2,5 MB) en el chunk de Ajustes~~ y ~~`exceljs` en `/op`~~ —
  RESUELTOS en el frente Informes: `pdfmake` salió del proyecto y ninguna ruta descarga
  una librería de exportación al entrar.
- **Specs de Karma:** 7 no compilan (`npm test` no corre). Son nombres de clase que ya
  no existen (`clientes-control`, `valores-op`) y directivas instanciadas sin
  argumentos (5 specs). Preexistente.
```

### Bloque 10 de 10

BUSCAR (6 líneas):

```
1. `/migracion` → "Fecha de nacimiento de choferes": simular, ejecutar (id
   `pf-logistics`) y corregir a mano los que queden en "revisar" (editando el chofer).
2. Sin reglas ni índices nuevos: la ficha solo lee colecciones que ya están mapeadas.

### Frente futuro — nombre de la entidad como enlace a la ficha en toda la app
Análisis hecho al cierre del frente Ficha de entidad (18/10/2026); se encara como FRENTE
```

REEMPLAZAR por (21 líneas):

```
1. `/migracion` → "Fecha de nacimiento de choferes": simular, ejecutar (id
   `pf-logistics`) y corregir a mano los que queden en "revisar" (editando el chofer).
2. Sin reglas ni índices nuevos: la ficha solo lee colecciones que ya están mapeadas.

### Deuda — tras el frente Informes Excel/PDF
- **Etiqueta "Municipio Operativa"** en los listados de Clientes y Proveedores: no
  concuerda en género ("Municipio Operativo"). Se dejó tal cual la del informe viejo a
  propósito — es la que el usuario conoce y cambiar un encabezado es decisión de
  producto. ("Provincia Operativa" sí está bien.)
- **Badge de nivel de tarifa del tablero de operaciones:** sigue mostrando un badge por
  lado (cliente y chofer). Con `nivelTarifaOp` ya se puede colapsar a uno solo con la
  misma jerarquía que usa el informe; es un cambio visible, queda como oferta.
- **`arrayFacOp` y `$choferes` de `objeto-papelera`** se siguen cargando sin ningún
  consumidor desde que se fue la columna "Reimpresión" (IE4). Se van con la Papelera
  legado (frente Ajustes).
- El informe del tablero de asignaciones quedó sin botón (IE4). Si se quiere de vuelta,
  se escribe de cero sobre `LibroTabular` desde `AsignacionItem[]`; el viejo quedó
  registrado en `claude/diseno-informes-excel-pdf.md` §7.

### Frente futuro — nombre de la entidad como enlace a la ficha en toda la app
Análisis hecho al cierre del frente Ficha de entidad (18/10/2026); se encara como FRENTE
```

## PASO 2 — CHANGELOG.md (3 bloques)

### Bloque 1 de 3

BUSCAR (6 líneas):

```
inicial 1,53 MB) y pruebas manuales en demo. Diseño y avance:
`claude/diseno-ficha-entidad.md` (Project).

---

### Pendiente
```

REEMPLAZAR por (45 líneas):

```
inicial 1,53 MB) y pruebas manuales en demo. Diseño y avance:
`claude/diseno-ficha-entidad.md` (Project).

## Frente Informes Excel/PDF (Octubre 2026)

- **Retirados `ExcelService` y `PdfService`** (`servicios/informes/`: 4 archivos y
  1.276 líneas con sus `.spec.ts`) y **`pdfmake` sale del proyecto**. Todos los informes
  tabulares de la app salen ahora de una función pura por informe + los renderers
  genéricos (`ExcelTabularService` / `PdfTabularService`), a través de una fachada por
  dominio.
- **Tabla de Excel real** (`TablaDoc.excel?`, extensión aditiva del renderer): filtro y
  ordenamiento por columna, bandas, encabezado inmovilizado y fila de totales por
  `SUBTOTAL`, que sigue al filtro. Los 4 consumidores previos no cambian (XML idéntico
  byte a byte).
- **Informe de operaciones** por el camino nuevo (`documento-operaciones.util.ts` +
  `OperacionesExportService`): exporta lo filtrado en pantalla y suma las columnas
  **Nivel** y **Tarifa**, una por operación, resolviendo entre los dos lados con la
  jerarquía de `ORDEN_NIVELES` (`nivel-tarifa-op.util.ts`).
- **Listados de Clientes, Choferes y Proveedores** por el camino nuevo
  (`documento-entidades.util.ts` + `EntidadesExportService`): Vehículos de Choferes
  ARREGLADA (salía siempre vacía: leía un campo del modelo viejo), "Vendedores asignados"
  en Clientes, "Choferes" y "Vehículos" en Proveedores, y Fecha de Nacimiento como fecha
  real.
- **Descargas en dev/admin:** `AccionPermiso` suma `descargarListado`, con overrides para
  el tablero de operaciones y para los tres listados. El botón de los listados no tenía
  gating: `user`, `demo` y `manager` dejan de verlo.
- **Borrados dos botones muertos:** la columna "Reimpresión" de la Papelera legado
  (estaba rota) y el "⬇ Descargar" inerte del tablero de asignaciones.
- **Bundle: ninguna ruta descarga una librería de exportación al entrar.** IE0 saca el
  chunk de `pdfmake` (2,51 MB) del build entero; `exceljs` sale de `/op`, de
  `clientes` / `choferes` / `proveedores` y, junto con `jspdf`, de `ajustes`
  (1.331,88 kB / 324,46 kB). El inicial sigue en 1,53 MB.

Detalle en `CLAUDE.md` → "Frente Informes Excel/PDF"; deudas y ofertas abiertas en
"Deuda — tras el frente Informes Excel/PDF".

**Verificación:** por bloque, aplicación por script sobre una copia limpia comparando
hashes de git, `tsc` (+ `--noUnusedLocals`), `build:demo` (mismas 9 advertencias,
inicial 1,53 MB), medición de chunks antes y después, y el .xlsx generado de verdad con
el código real y releído. Diseño y avance: `claude/diseno-informes-excel-pdf.md`
(Project).

---

### Pendiente
```

### Bloque 2 de 3

BUSCAR (8 líneas):

```
- Finanzas (frentes aparte): cartera de cheques, pago de liquidaciones de
  vendedores como movimiento, plazo de pago por entidad.
- Ajustes: retirar el `LogService` viejo (colección `logs`) y la Papelera
  legado (con `objeto-papelera`, `exportToExcelInforme` / `exportToPdfInforme`
  y PDFMake).
- UX: el `<h1>` sin cerrar de `index.html` envuelve toda la app (ver "Deuda —
  tras el frente Lazy loading + fechas").
- Frente futuro: el nombre de la entidad como enlace a su ficha en toda la
```

REEMPLAZAR por (8 líneas):

```
- Finanzas (frentes aparte): cartera de cheques, pago de liquidaciones de
  vendedores como movimiento, plazo de pago por entidad.
- Ajustes: retirar el `LogService` viejo (colección `logs`) y la Papelera
  legado (con `objeto-papelera`; la exportación y PDFMake ya se fueron en el
  frente Informes).
- UX: el `<h1>` sin cerrar de `index.html` envuelve toda la app (ver "Deuda —
  tras el frente Lazy loading + fechas").
- Frente futuro: el nombre de la entidad como enlace a su ficha en toda la
```

### Bloque 3 de 3

BUSCAR (9 líneas):

```
  como enlace a la ficha en toda la app").

**Transversales**
- Excel/PDF de los demás informes sobre `DocumentoTabular` + los renderers
  de `servicios/exportacion/` (saca `exceljs` del chunk de `/op`; la fecha
  del Excel de choferes, D6, ya se corrigió en el frente Ficha de entidad).
- ng-bootstrap 15 sobre Angular 20 (NG0309 en componentes con
  `hostDirectives`): actualizar a la versión de Angular 20.
- Specs de Karma: 7 no compilan (`npm test` no corre).
```

REEMPLAZAR por (10 líneas):

```
  como enlace a la ficha en toda la app").

**Transversales**
- ~~Excel/PDF de los demás informes sobre `DocumentoTabular` + los renderers
  de `servicios/exportacion/`~~ — RESUELTO en el frente Informes: se retiraron
  `ExcelService` / `PdfService` y `pdfmake`, y ninguna ruta descarga una
  librería de exportación al entrar.
- ng-bootstrap 15 sobre Angular 20 (NG0309 en componentes con
  `hostDirectives`): actualizar a la versión de Angular 20.
- Specs de Karma: 7 no compilan (`npm test` no corre).
```

## Verificación

1. `git status --short` → exactamente dos líneas, `M CLAUDE.md` y `M CHANGELOG.md`.
   Ningún otro archivo.
2. `git diff --numstat` → `187 45 CLAUDE.md` y `45 5 CHANGELOG.md`.
3. `git hash-object CLAUDE.md` y `git hash-object CHANGELOG.md` → los dos hashes de
   resultado del Anexo.
4. `wc -l CLAUDE.md CHANGELOG.md` → 4836 (CLAUDE.md) y 2367 (CHANGELOG.md).
5. Las secciones nuevas están una sola vez cada una:
   - `grep -c "^## Frente Informes Excel/PDF (Octubre 2026)$" CLAUDE.md` → `1`
   - `grep -c "^## Frente Informes Excel/PDF (Octubre 2026)$" CHANGELOG.md` → `1`
   - `grep -c "^### Deuda — tras el frente Informes Excel/PDF$" CLAUDE.md` → `1`
6. Las secciones nuevas quedaron en su lugar:
   - `grep -n "^## " CLAUDE.md | tail -2` → "Frente Informes Excel/PDF" y, después,
     "Deuda conocida"
   - `grep -n "^### Deuda — tras el frente\|^### Frente futuro — nombre" CLAUDE.md` → en
     este orden: Lazy loading + fechas, Ficha de entidad, Informes Excel/PDF, y al final
     "Frente futuro — nombre de la entidad…"
7. Lo falso ya no está:
   - `grep -c "PDFMake (solo la Papelera legado)" CLAUDE.md` → `0`
   - `grep -c "^| \`informes/\` |" CLAUDE.md` → `0`
   - `grep -n "exportToExcelInforme" CLAUDE.md CHANGELOG.md` → UNA sola línea, la
     tachada con `~~` de `CLAUDE.md` (en el `CHANGELOG` el punto se reescribió sin
     nombrar los métodos)
8. Ninguna línea NUEVA quedó con espacios al final, y nada con CRLF:
   - `git diff -U0 | grep "^+" | grep -c " $"` → `0`
   - `git diff | grep -c $'\\r'` → `0`
   ⚠️ `git diff | grep -c " $"` a secas da `15`, y está bien: son líneas de CONTEXTO
   preexistentes de `CLAUDE.md` que ya tenían un espacio al final. No las toques.
9. Las menciones históricas siguen intactas:
   `grep -c "ExcelService" CLAUDE.md` → `8` (las de los "Retiro del camino viejo" de
   otros frentes, más las de la sección nueva).

## Lectura (en vez de pruebas manuales)

No hay nada que probar en la app: este bloque no toca código. Lo que sí vale la pena es
que leas las dos secciones nuevas antes de commitear, sobre todo la tabla de bundle y la
de las tres capas, y me digas si algo no coincide con lo que viste al aplicar los
bloques. La sección de `CLAUDE.md` es lo que va a leer Claude Code en cada sesión futura
del proyecto, así que un dato mío mal copiado ahí se propaga.

## Mensaje de commit

```
IEDOC (informes): CLAUDE.md y CHANGELOG del frente Informes Excel/PDF

- CLAUDE.md: seccion nueva "Frente Informes Excel/PDF (Octubre 2026)" (las
  tres capas QUE/COMO/QUIEN, la Tabla de Excel real, el informe de
  operaciones con Nivel y Tarifa, los tres listados, los permisos de
  descarga, lo que se borro, la tabla de bundle y la verificacion por
  bloque) y "Deuda - tras el frente Informes Excel/PDF" con las ofertas
  abiertas.
- Corregido lo que quedo falso: PDFMake en el stack, la fila informes/ de la
  tabla de servicios (esa carpeta no existe mas), la fila exportacion/ (hoy
  es el unico camino de exportacion), el "siguen sirviendo" y el "chunk
  aparte cuando se retiren" del frente Excel/PDF de liquidacion,
  exportToExcelInforme/exportToPdfInforme en la lista de "Se quedan" del
  frente Lazy, el informe inerte del tablero de asignaciones, la entrada
  entera de "Deuda - Excel/PDF" (saldada) y los dos puntos de bundle
  (pdfmake en Ajustes, exceljs en /op).
- CHANGELOG: seccion del frente antes de "Pendiente"; Ajustes ya no arrastra
  la exportacion ni PDFMake, y el punto transversal de Excel/PDF sobre
  DocumentoTabular queda tachado.
- Sin cambios de codigo: los dos archivos estan fuera de la compilacion.
```

## Anexo — hashes

| Archivo | Hash de partida (HEAD) | Hash de resultado |
|---|---|---|
| `CLAUDE.md` | `31884d0583ecd25bde696f3d2c2914edcdbcb167` | `e1e4eaecee60ac556053f551e5a801235062a294` |
| `CHANGELOG.md` | `cd3770d4b108d275a9fc8189cb1b400b07b7023e` | `5ff49d60e49feb9bf679c7a50a7d06fdf532c01c` |

FIN DE LA INSTRUCCIÓN IEDOC

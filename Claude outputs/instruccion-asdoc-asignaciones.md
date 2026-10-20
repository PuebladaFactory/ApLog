Si no ves la línea FIN DE LA INSTRUCCIÓN ASDOC al final, el texto llegó cortado: leé el archivo completo.

# ASDOC — CLAUDE.md y CHANGELOG del informe del tablero de asignaciones

## Contexto y razonamiento

Cierre de AS1. No toca una línea de código: solo `CLAUDE.md` y `CHANGELOG.md`.

La sección nueva va **dentro del frente Informes Excel/PDF**, no como frente propio: AS1
es un informe más sobre el mismo mecanismo (función pura + renderers genéricos + fachada),
y quien lea el archivo buscando "cómo se exporta algo en esta app" tiene que encontrar todo
junto. Que haya llegado después del cierre del frente queda dicho en el título de la
subsección.

Lo que además quedó FALSO con AS1 y se corrige:

| Dónde | Qué decía | Por qué es falso |
|---|---|---|
| Frente Informes, las fachadas | "Las 6 fachadas de hoy" | son 7: entró `AsignacionesExportService` |
| Deuda menor — tablero-asignaciones | el informe Excel "se escribe de cero… si se quiere de vuelta" | ya se escribió |
| Deuda — tras el frente Informes | "quedó sin botón (IE4)" como pendiente | repuesto en AS1 |
| Deuda — no-disponibilidad y tablero | nada decía dónde vive la regla | el rediseño tiene que tocar el util, no los componentes |

Esa última entrada es la que más importa a futuro. El rediseño de no-disponibilidad está
anotado como frente propio y arranca rehaciendo la interfaz y el consumo del tablero; si no
dice que la regla ahora está en `shared/utils/no-disponibilidad.util.ts`, lo más probable
es que ese frente la vuelva a escribir en los componentes y deshaga lo que AS1 unificó.
Queda anotado también que, al levantar el límite de "solo choferes", hay que actualizar la
nota de la hoja 2 del informe, que hoy lo declara.

**Lo que NO se toca:** la tabla de "Servicios clave" no gana una fila. Ninguna de las otras
seis fachadas de exportación tiene una, porque la fila que corresponde es la de
`exportacion/`, que ya dice que todo informe tabular sale de ahí por la fachada de su
dominio.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- **Validá los 6 BUSCAR antes de escribir el primero** (5 en `CLAUDE.md`, 1 en
  `CHANGELOG.md`). Cada uno aparece exactamente UNA vez. Si alguno no está o está
  repetido, detenete y avisá sin escribir nada.
- Aplicá los pasos EN ORDEN. Editá los archivos en el lugar; no los recrees.
- LF. Ninguna línea nueva lleva espacios al final.
- Los dos archivos están FUERA de la compilación de Angular: no hace falta `tsc` ni
  `build:demo`, y no los pido.

## PASO 0 — verificación, sin modificar nada

Los hashes están en el Anexo del archivo de la instrucción
(`instruccion-asdoc-asignaciones.md`), generados con `git`.

1. `git rev-parse --abbrev-ref HEAD` → `refactor`; `git log --oneline -1` → el commit de
   AS1 (`72e7d2dc`).
2. `git status --short` → vacío.
3. `git hash-object CLAUDE.md` y `git hash-object CHANGELOG.md` → los dos hashes de
   partida del Anexo.
4. `wc -l CLAUDE.md CHANGELOG.md` → 4850 (CLAUDE.md) y 2367 (CHANGELOG.md).
5. Que AS1 esté aplicado, para confirmar que ASDOC va después:
   `ls src/app/shared/utils/documento-asignaciones.util.ts` → existe.

## PASO 1 — CLAUDE.md (5 bloques)

### Bloque 1 de 5

BUSCAR (11 líneas):

```
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
```

REEMPLAZAR por (12 líneas):

```
| **CÓMO** | `ExcelTabularService` / `PdfTabularService` (`servicios/exportacion/`) | dibujar un `DocumentoTabular` / `LibroTabular`; nada del dominio |
| **QUIÉN** | una fachada por dominio | resolver los datos, llamar al renderer y descargar |

Las 7 fachadas de hoy: `LiquidacionExportService` (`informes-liq/`),
`ResumenOpExportService` (`reportes/resumenes-op/`), `ComisionesExportService`
(`vendedores/`), `FinanzasExportService` (`finanzas-nueva/`), `OperacionesExportService`
(`operaciones/`), `EntidadesExportService` (`entidades/`) y `AsignacionesExportService`
(`operaciones/`) — las dos del medio, de este frente; la última, de AS1, posterior al
cierre. El componente llama SOLO a la fachada de su dominio; nunca al renderer ni a la
función pura. De las 6, la única que loguea es `LiquidacionExportService` (REIMPRIMIR, y
solo si el documento tiene número: decisión E5 del frente Excel/PDF); un listado o un
informe del mes no deja registro. (`ReciboPdfService` queda fuera del esquema: el Recibo /
```

### Bloque 2 de 5

BUSCAR (5 líneas):

```
que decide es el criterio. **Desde IE4** el bloque del chat ya no lleva hashes: van solo
en el archivo de la instrucción, generados con `git rev-parse` / `git hash-object` y nunca
tipeados.

## Deuda conocida
```

REEMPLAZAR por (60 líneas):

```
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

## Deuda conocida
```

### Bloque 3 de 5

BUSCAR (9 líneas):

```
### Deuda menor — tablero-asignaciones

~~**Informe Excel (`descargar`):** inerte, muestra aviso.~~ — RESUELTO en el frente
Informes (IE4): el botón y su método se borraron (D6). Si el informe se quiere de vuelta,
se escribe de cero sobre `LibroTabular` desde `AsignacionItem[]`; el viejo quedó
registrado en `claude/diseno-informes-excel-pdf.md` §7.

**No-disponibilidad sin probar end-to-end:** la atenuación de vehículos de proveedor está
correctamente ausente en el tablero (diferida a operaciones-editor), pero verificar la
```

REEMPLAZAR por (10 líneas):

```
### Deuda menor — tablero-asignaciones

~~**Informe Excel (`descargar`):** inerte, muestra aviso.~~ — el botón y su método se
borraron en el frente Informes (IE4, D6), y el informe VOLVIÓ en AS1, reescrito de cero
sobre `LibroTabular`, con Excel y PDF y una hoja de choferes no disponibles — ver "Informe
del tablero de asignaciones". El viejo quedó registrado en
`claude/diseno-informes-excel-pdf.md` §7.

**No-disponibilidad sin probar end-to-end:** la atenuación de vehículos de proveedor está
correctamente ausente en el tablero (diferida a operaciones-editor), pero verificar la
```

### Bloque 4 de 5

BUSCAR (6 líneas):

```
no está". Rehace la interfaz `NoDisponibilidadChofer`, el modal completo y el consumo del
tablero; toca `operaciones-editor` (no-disp de choferes de proveedor se resuelve allá).
El modal actual quedó con arreglo mínimo hasta entonces.

**`clientesVisibles` getter "con trabajo"** (arma Map + ordena en cada acceso): candidato
a cachear si hubiera cientos de clientes. Hoy trivial.
```

REEMPLAZAR por (13 líneas):

```
no está". Rehace la interfaz `NoDisponibilidadChofer`, el modal completo y el consumo del
tablero; toca `operaciones-editor` (no-disp de choferes de proveedor se resuelve allá).
El modal actual quedó con arreglo mínimo hasta entonces.

⚠️ **Desde AS1 la regla "¿está no operativo en esta fecha?" vive en
`shared/utils/no-disponibilidad.util.ts`**, no en los componentes (antes estaba escrita
cuatro veces entre `tablero-asignaciones` y `carga-asignacion`): el rediseño la cambia
ahí. Y el informe del tablero deja dicho en una nota el límite del modelo actual —la
no-disponibilidad es solo de choferes, no de proveedores ni de vehículos sueltos—, que es
justo lo que este rediseño viene a levantar: al hacerlo hay que actualizar esa nota.

**`clientesVisibles` getter "con trabajo"** (arma Map + ordena en cada acceso): candidato
a cachear si hubiera cientos de clientes. Hoy trivial.
```

### Bloque 5 de 5

BUSCAR (9 líneas):

```
- **`arrayFacOp` y `$choferes` de `objeto-papelera`** se siguen cargando sin ningún
  consumidor desde que se fue la columna "Reimpresión" (IE4). Se van con la Papelera
  legado (frente Ajustes).
- El informe del tablero de asignaciones quedó sin botón (IE4). Si se quiere de vuelta,
  se escribe de cero sobre `LibroTabular` desde `AsignacionItem[]`; el viejo quedó
  registrado en `claude/diseno-informes-excel-pdf.md` §7.

### Frente futuro — nombre de la entidad como enlace a la ficha en toda la app
Análisis hecho al cierre del frente Ficha de entidad (18/10/2026); se encara como FRENTE
```

REEMPLAZAR por (9 líneas):

```
- **`arrayFacOp` y `$choferes` de `objeto-papelera`** se siguen cargando sin ningún
  consumidor desde que se fue la columna "Reimpresión" (IE4). Se van con la Papelera
  legado (frente Ajustes).
- ~~El informe del tablero de asignaciones quedó sin botón (IE4)~~ — REPUESTO en AS1
  (20/10), reescrito de cero sobre `LibroTabular`, con Excel y PDF: ver "Informe del
  tablero de asignaciones".

### Frente futuro — nombre de la entidad como enlace a la ficha en toda la app
Análisis hecho al cierre del frente Ficha de entidad (18/10/2026); se encara como FRENTE
```

## PASO 2 — CHANGELOG.md (1 bloque)

### Bloque 1 de 1

BUSCAR (6 líneas):

```
el código real y releído. Diseño y avance: `claude/diseno-informes-excel-pdf.md`
(Project).

---

### Pendiente
```

REEMPLAZAR por (36 líneas):

```
el código real y releído. Diseño y avance: `claude/diseno-informes-excel-pdf.md`
(Project).

## Informe del tablero de asignaciones (Octubre 2026)

- **Vuelve el informe del tablero de asignaciones**, que el frente Informes había retirado
  por inerte (IE4, D6). Reescrito de cero sobre `LibroTabular`: el viejo era un layout con
  celdas pintadas por categoría y notas de celda, que el renderer genérico no tiene.
- **Dos hojas, en Excel y en PDF:** "Asignaciones" (una fila por asignación: cliente,
  categoría, dominio, chofer o proveedor, observación, hoja de ruta, estado y motivo de
  anulación) y "No disponibles" (una fila por chofer no disponible y vehículo, con desde,
  hasta y motivo, solo las vigentes en la fecha del tablero). Exporta lo que está en
  pantalla: el borrador en modo edición, el tablero confirmado en modo visor.
- **Permiso propio `descargarAsignaciones`** (dev/admin/user; demo no). No reusa
  `descargarTablero`, que desde IE1b gobierna el tablero de operaciones y quedó en
  dev/admin.
- **`no-disponibilidad.util.ts`:** la regla "¿está no operativo en esta fecha?" estaba
  escrita cuatro veces entre `tablero-asignaciones` y `carga-asignacion`, con dos
  implementaciones distintas. Queda una sola y los dos componentes delegan.
- **Bundle:** ninguna ruta pide `exceljs` ni `jspdf`, pese a que la fachada inyecta los dos
  renderers. El inicial sigue en 1,53 MB.

Detalle en `CLAUDE.md` → "Frente Informes Excel/PDF" → "Informe del tablero de
asignaciones".

**Verificación:** round-trip por hash de los nueve archivos y rematerialización del bloque
desde su propia instrucción, `tsc` (+ `--noUnusedLocals`), `build:demo` (mismas 9
advertencias, inicial 1,53 MB), medición de las cinco rutas contra los chunks de las
librerías de exportación, y el .xlsx y el .pdf generados de verdad con el código real y
revisados, con casos límite (proveedor sin chofer resuelto, chofer dado de baja, anulada
sin motivo, cliente borrado, chofer sin vehículos y con dos, no-disponibilidad que no
cubre la fecha).

---

### Pendiente
```

## Verificación

1. `git status --short` → exactamente dos líneas, `M CLAUDE.md` y `M CHANGELOG.md`.
2. `git diff --numstat` → `30 0 CHANGELOG.md` y `74 10 CLAUDE.md`.
3. Los dos hashes de resultado del Anexo.
4. `wc -l CLAUDE.md CHANGELOG.md` → 4914 (CLAUDE.md) y 2397 (CHANGELOG.md).
5. La sección nueva está una sola vez y DENTRO del frente Informes:
   - `grep -c "^### Informe del tablero de asignaciones" CLAUDE.md` → `1`
   - `grep -n "^## " CLAUDE.md | tail -2` → "Frente Informes Excel/PDF" y, después,
     "Deuda conocida" (la subsección nueva va entre las dos, por eso no aparece acá)
   - `grep -c "^## Informe del tablero de asignaciones (Octubre 2026)$" CHANGELOG.md` → `1`
6. Lo falso ya no está:
   - `grep -c "Las 6 fachadas de hoy" CLAUDE.md` → `0`
   - `grep -c "Las 7 fachadas de hoy" CLAUDE.md` → `1`
   - `grep -c "quedó sin botón (IE4). Si se quiere de vuelta" CLAUDE.md` → `0`
7. El apunte para el rediseño de no-disponibilidad quedó:
   `grep -c "Desde AS1 la regla" CLAUDE.md` → `1`.
8. Ninguna línea NUEVA con espacios al final, y nada con CRLF:
   - `git diff -U0 | grep "^+" | grep -c " $"` → `0`
   - `git diff | grep -c $'\\r'` → `0`
   ⚠️ `git diff | grep -c " $"` a secas da `11`: son líneas de CONTEXTO preexistentes de
   `CLAUDE.md` que ya tenían un espacio al final. No las toques.

## Lectura (en vez de pruebas manuales)

No hay nada que probar en la app. Leé la subsección nueva antes de commitear, sobre todo
las cuatro "decisiones que conviene no reabrir" y el párrafo del util de
no-disponibilidad, y decime si algo no coincide con lo que viste al aplicar AS1.

## Mensaje de commit

```
ASDOC (asignaciones): CLAUDE.md y CHANGELOG del informe del tablero

- CLAUDE.md: subseccion nueva "Informe del tablero de asignaciones (AS1,
  posterior al cierre)" DENTRO del frente Informes Excel/PDF, porque es un
  informe mas sobre el mismo mecanismo: las dos hojas, que exporta lo que esta
  en pantalla, las cuatro decisiones que conviene no reabrir (columnas
  separadas por el filtro de la Tabla, sin columna de operacion, una fila por
  chofer y vehiculo, Hasta vacio), el permiso propio y el util de
  no-disponibilidad.
- Corregido lo que quedo falso: "Las 6 fachadas de hoy" son 7; la deuda menor
  del tablero decia que el informe "se escribe de cero si se quiere de vuelta"
  y ya se escribio; y la deuda del frente Informes lo listaba como pendiente.
- Deuda - no-disponibilidad y tablero: queda anotado que desde AS1 la regla
  vive en shared/utils/no-disponibilidad.util.ts y que el rediseno la cambia
  ahi, no en los componentes; y que al levantar el limite de "solo choferes"
  hay que actualizar la nota de la hoja 2 del informe, que hoy lo declara.
- CHANGELOG: seccion del informe antes de "Pendiente".
- Sin cambios de codigo: los dos archivos estan fuera de la compilacion.
```

## Anexo — hashes

| Archivo | Hash de partida (HEAD) | Hash de resultado |
|---|---|---|
| `CLAUDE.md` | `32b64c024ab2a5cc060c854b2ecb168a9633b0bc` | `57522d01dd30f8b9e4b5b8afa867bf51a3116717` |
| `CHANGELOG.md` | `5ff49d60e49feb9bf679c7a50a7d06fdf532c01c` | `e8f4cd42f3c59533ff47617e498ea59bb57bc684` |

FIN DE LA INSTRUCCIÓN ASDOC

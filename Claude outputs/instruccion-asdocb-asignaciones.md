Si no ves la línea FIN DE LA INSTRUCCIÓN ASDOC-B al final, el texto llegó cortado: leé el archivo completo.

# ASDOC-B — el número de fachadas que quedó a medio corregir

## Contexto y razonamiento

Corrección de ASDOC, encontrada por Nico al releer. **Se aplica sobre ASDOC ya aplicado y
sin commitear**: el punto de partida no es el commit de AS1 sino el árbol de trabajo con
los cambios de ASDOC encima, así que el PASO 0 compara `git hash-object`, no `HEAD:`.
Después va UN solo commit: el mensaje de abajo reemplaza al de ASDOC.

El bloque 1 de ASDOC cambiaba "Las 6 fachadas de hoy" por "Las 7", pero el mismo dato está
escrito **dos veces en el mismo párrafo**, y el BUSCAR solo cubría la primera: dos líneas
más abajo quedó "De las 6, la única que loguea es `LiquidacionExportService`". El hecho que
afirma sigue siendo cierto —`AsignacionesExportService` tampoco loguea— pero el número no.

Es exactamente el error que este frente ya conoce: **corregir un dato en el lugar donde lo
buscaba y dejarlo escrito en otro**. En IEDOC pasó con el mensaje de commit; acá, con la
segunda mención del mismo número, catorce palabras más abajo. Por eso el BUSCAR de este
bloque toma el párrafo entero en vez de la línea: si el número volviera a cambiar, las dos
menciones caen juntas.

De paso se arregla una frase confusa que señaló Nico, en el mismo párrafo: "las dos del
medio, de este frente" — no son las del medio, son la quinta y la sexta de siete. Se
nombran las fachadas en vez de contarlas por posición, que además aguanta que mañana
entre una octava.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit (el commit va después, con todo junto).
- **NO descartes los cambios de ASDOC**: este bloque va ENCIMA. Si `git status --short` no
  muestra `M CLAUDE.md` y `M CHANGELOG.md`, detenete y avisá.
- Es UN solo BUSCAR. Validalo antes de escribir.
- `CHANGELOG.md` NO se toca en este bloque.
- Editá en el lugar; LF; ninguna línea nueva lleva espacios al final.
- Sin `tsc` ni `build:demo`: sigue siendo Markdown fuera de la compilación.

## PASO 0 — verificación, sin modificar nada

1. `git log --oneline -1` → sigue siendo el commit de AS1 (`72e7d2dc`). **Si ya commiteaste
   ASDOC, detenete y avisame**: cambia el punto de partida y te rearmo el bloque.
2. `git status --short` → exactamente `M CLAUDE.md` y `M CHANGELOG.md`.
3. `git hash-object CLAUDE.md` → el hash de PARTIDA del Anexo (el mismo que verificaste al
   cerrar ASDOC). Ojo: `git hash-object`, no `git rev-parse HEAD:…`.
4. Las dos menciones del número, para confirmar que están desparejas:
   - `grep -c "Las 7 fachadas de hoy" CLAUDE.md` → `1`
   - `grep -c "De las 6," CLAUDE.md` → `1`

## PASO 1 — CLAUDE.md (1 bloques)

### Bloque 1 de 1

BUSCAR (11 líneas):

```
`ResumenOpExportService` (`reportes/resumenes-op/`), `ComisionesExportService`
(`vendedores/`), `FinanzasExportService` (`finanzas-nueva/`), `OperacionesExportService`
(`operaciones/`), `EntidadesExportService` (`entidades/`) y `AsignacionesExportService`
(`operaciones/`) — las dos del medio, de este frente; la última, de AS1, posterior al
cierre. El componente llama SOLO a la fachada de su dominio; nunca al renderer ni a la
función pura. De las 6, la única que loguea es `LiquidacionExportService` (REIMPRIMIR, y
solo si el documento tiene número: decisión E5 del frente Excel/PDF); un listado o un
informe del mes no deja registro. (`ReciboPdfService` queda fuera del esquema: el Recibo /
Orden de pago no es una tabla, dibuja con jsPDF directo — y sí loguea REIMPRIMIR.)

### Tabla de Excel real (IE2)
```

REEMPLAZAR por (12 líneas):

```
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
```

## Verificación

1. `git status --short` → sigue mostrando solo `M CLAUDE.md` y `M CHANGELOG.md`.
2. `git hash-object CLAUDE.md` → el hash de RESULTADO del Anexo.
3. `git diff --numstat` → `30 0 CHANGELOG.md` y `79 14 CLAUDE.md`. Respecto de ASDOC, `CLAUDE.md` queda con UNA línea
   más (el párrafo se reajusta al ancho del archivo) y `CHANGELOG.md` no se movió:
   `wc -l CLAUDE.md` → 4915.
4. Las dos menciones quedaron parejas, y la frase confusa no está:
   - `grep -c "De las 6," CLAUDE.md` → `0`
   - `grep -c "De las 7," CLAUDE.md` → `1`
   - `grep -c "Las 7 fachadas de hoy" CLAUDE.md` → `1`
   - `grep -c "las dos del medio" CLAUDE.md` → `0`
5. Ninguna línea nueva con espacios al final, y nada con CRLF:
   - `git diff -U0 | grep "^+" | grep -c " $"` → `0`
   - `git diff | grep -c $'\\r'` → `0`
   ⚠️ `git diff | grep -c " $"` a secas da `13`, no los `11` de ASDOC: el BUSCAR de este
   bloque arrastra dos líneas de contexto preexistentes más, que ya tenían un espacio al
   final. No las toques.

## Lectura

Releé el párrafo de las fachadas completo y confirmame que ahora las dos menciones dicen
siete y que se entiende cuál vino de qué bloque.

## Mensaje de commit

Este mensaje **reemplaza** al de ASDOC: commiteás los dos bloques juntos.

```
ASDOC (asignaciones): CLAUDE.md y CHANGELOG del informe del tablero

- CLAUDE.md: subseccion nueva "Informe del tablero de asignaciones (AS1,
  posterior al cierre)" DENTRO del frente Informes Excel/PDF, porque es un
  informe mas sobre el mismo mecanismo: las dos hojas, que exporta lo que esta
  en pantalla, las cuatro decisiones que conviene no reabrir (columnas
  separadas por el filtro de la Tabla, sin columna de operacion, una fila por
  chofer y vehiculo, Hasta vacio), el permiso propio y el util de
  no-disponibilidad.
- Corregido lo que quedo falso: las fachadas de exportacion son 7 y no 6 (las
  DOS menciones del parrafo, ver ASDOC-b); la deuda menor del tablero decia
  que el informe "se escribe de cero si se quiere de vuelta" y ya se escribio;
  y la deuda del frente Informes lo listaba como pendiente.
- Deuda - no-disponibilidad y tablero: queda anotado que desde AS1 la regla
  vive en shared/utils/no-disponibilidad.util.ts y que el rediseno la cambia
  ahi, no en los componentes; y que al levantar el limite de "solo choferes"
  hay que actualizar la nota de la hoja 2 del informe, que hoy lo declara.
- CHANGELOG: seccion del informe antes de "Pendiente".
- Sin cambios de codigo: los dos archivos estan fuera de la compilacion.
```

## Anexo — hashes

| Archivo | Hash de partida (con IEDOC aplicado) | Hash de resultado |
|---|---|---|
| `CLAUDE.md` | `57522d01dd30f8b9e4b5b8afa867bf51a3116717` | `d7f828f9aa189e8bc4af95b7472e7d15d56a360f` |

FIN DE LA INSTRUCCIÓN ASDOC-B

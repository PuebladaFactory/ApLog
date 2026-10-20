Si no ves la línea FIN DE LA INSTRUCCIÓN IEDOC-B al final, el texto llegó cortado: leé el archivo completo.

# IEDOC-B — dos correcciones a la sección nueva de CLAUDE.md

## Contexto y razonamiento

Corrección de IEDOC, encontrada por Nico al releer las secciones nuevas. Dos datos de la
sección "Frente Informes Excel/PDF" no coinciden con lo que pasó de verdad.

**ESTE BLOQUE SE APLICA SOBRE IEDOC YA APLICADO Y SIN COMMITEAR.** El punto de partida no
es el commit de IE5: es el árbol de trabajo con los cambios de IEDOC encima. Por eso el
PASO 0 compara `git hash-object` (árbol de trabajo), no `HEAD:`. Después de este bloque va
UN solo commit, con las dos cosas juntas: el mensaje de commit de abajo reemplaza al de
IEDOC.

### 1. "Verificación de cada bloque" decía mal qué pasó en IE3b

El texto afirmaba que en IE2b y en IE3b "el PASO 0 los frenó las dos veces" y que "desde
IE3b las tablas de hashes van SOLO en el archivo". Las tres cosas están mal:

| Lo que decía | Lo que pasó |
|---|---|
| el PASO 0 frenó en IE2b y en IE3b | en IE2b sí (tres hashes no coincidían); en **IE3b no frenó** |
| — | en IE3b el único hash que no cerraba era de `permiso.ts`, sin cambios desde `db10e3e` (F8b), anterior al frente: el criterio correcto era seguir, y se siguió avisando |
| desde IE3b las tablas van solo en el archivo | **desde IE4**: el bloque pegado de IE3b todavía traía los hashes |

Y se agrega la lección que estaba quedando afuera, que es más útil que "el PASO 0 lo
atrapó": un PASO 0 detecta el desvío cuando es grande (tres valores mal); con un solo
valor mal, lo que decide es el criterio de quién aplica. Por eso la práctica cambió a no
tipear hashes nunca, en vez de confiar en que el PASO 0 avise.

### 2. Tabla de bundle, fila IE0: "3 imports muertos" es falso

Verificado contra el commit real de IE0 (`3d3d8bad`), cuyo `numstat` es
`0 7 src/app/servicios/informes/pdf/pdf.service.ts`: eran **2 imports** (`pdfmake` y
`pdfmake/build/vfs_fonts`), la asignación de `(pdfMake as any).vfs` y el bloque comentado
equivalente de las líneas 3-4 — 7 líneas borradas, 5 de ellas nombrando `pdfmake`. El "3"
venía del plan de bloques del diseño (`claude/diseno-informes-excel-pdf.md` §5), escrito
en Fase 1 antes de leer el archivo, y se arrastró a la tabla. El doc de diseño ya quedó
corregido también.

### Lo que NO se cambia, y por qué

El tercer punto del reporte: "XML idéntico byte a byte" (en la sección Tabla de Excel y en
el CHANGELOG) es una verificación que hice yo al preparar IE2, no una prueba tuya. Tenés
razón en el dato, pero la frase se queda tal cual, por decisión: `CLAUDE.md` registra QUÉ
se verificó, no quién lo verificó —ninguna otra entrada del archivo atribuye sus
verificaciones— y lo que afirma es cierto. Donde el archivo sí distingue es cuando algo
quedó SIN verificar ("prueba manual pendiente de quien lo despliegue"), que no es el caso.

Y el commit de IE2b sin título (`74a38d5`) queda afuera de los dos documentos, como dijiste:
es historial de git.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit (el commit va después, con todo junto).
- **NO descartes los cambios de IEDOC**: este bloque se aplica ENCIMA de ellos. Si
  `git status --short` no muestra `M CLAUDE.md` y `M CHANGELOG.md`, detenete y avisá.
- Validá los 2 BUSCAR antes de escribir el primero. Cada uno aparece una sola vez.
- Editá en el lugar; LF; ninguna línea nueva lleva espacios al final.
- `CHANGELOG.md` NO se toca en este bloque.
- Sin `tsc` ni `build:demo`: sigue siendo un archivo Markdown fuera de la compilación.

## PASO 0 — verificación, sin modificar nada

1. `git log --oneline -1` → sigue siendo el commit de IE5 (`8781709`). **Si ya commiteaste
   IEDOC, detenete y avisame**: cambia el punto de partida y te rearmo el bloque.
2. `git status --short` → exactamente `M CLAUDE.md` y `M CHANGELOG.md`.
3. `git hash-object CLAUDE.md` → el hash de PARTIDA del Anexo (es el mismo que verificaste
   al cerrar IEDOC). Ojo: `git hash-object`, no `git rev-parse HEAD:…`.
4. `wc -l CLAUDE.md` → 4836.

## PASO 1 — CLAUDE.md (2 bloques)

### Bloque 1 de 2

BUSCAR (6 líneas):

```
| Bloque | Qué dejó de descargarse |
|---|---|
| IE0 | el chunk de `pdfmake` (**2,51 MB**) desaparece del build entero (eran 3 imports muertos) |
| IE1b | `exceljs` sale de `/op` (945,76 kB / 217,91 kB transferidos) |
| IE3b | `exceljs` sale de `clientes`, `choferes` y `proveedores` |
| IE4 | `exceljs` + `jspdf` + autotable salen de `ajustes` (1.331,88 kB / 324,46 kB) |
```

REEMPLAZAR por (6 líneas):

```
| Bloque | Qué dejó de descargarse |
|---|---|
| IE0 | el chunk de `pdfmake` (**2,51 MB**) desaparece del build entero (eran 7 líneas muertas de `PdfService`: 2 imports, la asignación de `vfs` y el bloque comentado equivalente) |
| IE1b | `exceljs` sale de `/op` (945,76 kB / 217,91 kB transferidos) |
| IE3b | `exceljs` sale de `clientes`, `choferes` y `proveedores` |
| IE4 | `exceljs` + `jspdf` + autotable salen de `ajustes` (1.331,88 kB / 324,46 kB) |
```

### Bloque 2 de 2

BUSCAR (10 líneas):

```
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

REEMPLAZAR por (17 líneas):

```
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

## Deuda conocida
```

## Verificación

1. `git status --short` → sigue mostrando solo `M CLAUDE.md` y `M CHANGELOG.md`.
2. `git hash-object CLAUDE.md` → el hash de RESULTADO del Anexo.
3. `wc -l CLAUDE.md` → 4843.
4. `git diff --numstat` → `194 45 CLAUDE.md` y `45 5 CHANGELOG.md` (CLAUDE.md sube 7 líneas respecto de IEDOC;
   `CHANGELOG.md` no se movió).
5. Lo falso ya no está:
   - `grep -c "3 imports muertos" CLAUDE.md` → `0`
   - `grep -c "frenó las dos veces" CLAUDE.md` → `0`
   - `grep -c "Desde IE3b las tablas de hashes" CLAUDE.md` → `0`
6. Lo nuevo está una sola vez:
   - `grep -c "En IE3b no frenó" CLAUDE.md` → `1`
   - `grep -c "7 líneas muertas de" CLAUDE.md` → `1`
   - `grep -c "Desde IE4\*\* el bloque del chat" CLAUDE.md` → `1`
7. Ninguna línea nueva con espacios al final, y nada con CRLF:
   - `git diff -U0 | grep "^+" | grep -c " $"` → `0`
   - `git diff | grep -c $'\\r'` → `0`
   (`git diff | grep -c " $"` a secas sigue dando `15`: son líneas de contexto
   preexistentes, igual que en IEDOC.)

## Lectura

Releé los dos párrafos corregidos (la fila IE0 de la tabla de bundle y "Verificación de
cada bloque") y confirmame que ahora sí dicen lo que pasó. Si algo más de las secciones
nuevas no coincide con tu recuerdo de los bloques, decímelo antes de commitear: una vez
commiteado, corregirlo cuesta otro bloque.

## Mensaje de commit

Este mensaje **reemplaza** al de IEDOC: commiteás los dos bloques juntos.

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
- Dos datos de la seccion nueva corregidos en la relectura (IEDOC-b): en IE3b
  el PASO 0 NO freno (el unico hash que no cerraba era de un archivo sin
  cambios desde antes del frente, y el criterio correcto era seguir), y las
  tablas de hashes dejaron de ir en el bloque del chat desde IE4, no desde
  IE3b; la fila IE0 de la tabla de bundle decia "3 imports muertos" y eran 7
  lineas (2 imports, la asignacion de vfs y el bloque comentado), segun el
  numstat del commit 3d3d8bad.
- Sin cambios de codigo: los dos archivos estan fuera de la compilacion.
```

## Anexo — hashes

| Archivo | Hash de partida (con IEDOC aplicado) | Hash de resultado |
|---|---|---|
| `CLAUDE.md` | `e1e4eaecee60ac556053f551e5a801235062a294` | `156461dd610d096974035974ad0d72d39dd6bab1` |

FIN DE LA INSTRUCCIÓN IEDOC-B

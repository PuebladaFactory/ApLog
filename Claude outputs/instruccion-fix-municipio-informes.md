Si no ves la línea FIN DE LA INSTRUCCIÓN FIX-MUNICIPIO al final, el texto llegó cortado: leé el archivo completo.

# FIX-MUNICIPIO — la etiqueta "Municipio Operativa" de los listados

## Contexto y razonamiento

Único punto que quedaba del frente Informes, y no amerita un frente nuevo: un bloque
chico después del cierre, igual que los `instruccion-fix-*` que ya tiene el repo.

La etiqueta `Municipio Operativa` de los listados de Clientes y Proveedores no concuerda
en género: va `Municipio Operativo`. Viene del informe viejo
(`ExcelService.exportarClientesTablaExcel`) y en IE3 se mantuvo tal cual a propósito.

**Es la única de las ocho que está mal.** Del par Operativa, "Dirección", "Localidad" y
"Provincia" son femeninas y ya concordaban; las cuatro Fiscal no tienen género. El listado
de Choferes usa "Municipio" a secas (un chofer tiene una sola dirección), así que no se
toca.

**Alcance real, verificado antes de escribir esto:** la etiqueta aparece en UN solo lugar
de todo `src/` (`documento-entidades.util.ts`, en `COLUMNAS_EMPRESA`) y ninguna lógica
depende de ese texto — los tres libros van con `filaTotal: null`, así que no hay ningún
`SUBTOTAL` con referencia estructurada que la nombre, y el renderer arma las etiquetas de
la Tabla desde `tabla.columnas`. Cambiarla es un literal y nada más.

Se corrige también el JSDoc del bloque, que hoy dice que las etiquetas se mantienen "TAL
CUAL las de hoy, incluidas «Municipio Operativa» y «Provincia Operativa»". Después de este
cambio sería falso por dos lados: una se cambió, y la otra nunca estuvo mal. En su lugar
queda asentada la regla que sí importa al tocar una etiqueta de estas: tienen que seguir
siendo únicas y sin `[ ] # '`, porque es lo que exige la referencia estructurada de la
Tabla de Excel.

### Y el badge del tablero NO se toca

La otra oferta abierta se cierra como decisión, no como trabajo: el tablero de operaciones
sigue mostrando **un badge por lado** (cliente y chofer). Visto en pantalla, los dos
niveles juntos informan y no estorban; si el usuario pide uno solo, `nivelTarifaOp` ya
resuelve la jerarquía y el cambio es de template.

Vale dejar escrito por qué el informe de Excel sí lleva uno solo, porque el motivo **no
aplica a la pantalla**: en la celda, los dos lados juntos harían que el filtro de la Tabla
trate `Especial - General` como un valor distinto de `Especial`, y la columna dejaría de
servir para filtrar u ordenar — que es para lo que existe. Separarlos bien pediría una
columna por lado y filtros compuestos, desproporcionado para este dato. La pantalla no
filtra por el badge, así que ahí el doble dato no cuesta nada. Eso queda registrado en
`CLAUDE.md` (PASO 2), para que la próxima sesión no reabra la discusión.

⚠️ **Lo que la columna `Nivel` del informe NO dice**, y conviene tener presente: muestra el
nivel del lado que GANA la jerarquía, no que los dos lados coincidan. Filtrar por
"Especial" devuelve las operaciones que resolvieron como Especial; no equivale a "las dos
puntas con tarifa Especial". Como filtro es confiable; como auditoría por entidad, no
alcanza — y ésa es justamente la columna por lado que decidimos no hacer.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Validá los 3 BUSCAR antes de escribir el primero. Cada uno aparece una sola vez.
- Aplicá los pasos EN ORDEN. Editá en el lugar; LF; ninguna línea nueva lleva espacios al
  final.
- No toques `CHANGELOG.md`: el frente ya está asentado ahí y esto es una corrección de una
  etiqueta, no una entrada nueva.
- No toques el listado de Choferes ni ninguna otra etiqueta.
- NO corras `npm run build`, `deploy:*` ni `node set-version.js`. Para compilar:
  `npm run build:demo` (línea base: 9 advertencias, inicial 1,53 MB).

## PASO 0 — verificación, sin modificar nada

Los hashes están en el Anexo del archivo de la instrucción
(`instruccion-fix-municipio-informes.md`), generados con `git`. Usá esa lista.

1. `git rev-parse --abbrev-ref HEAD` → `refactor`; `git log --oneline -1` → el commit de
   IEDOC (`0073a95a`).
2. `git status --short` → vacío.
3. `git hash-object src/app/shared/utils/documento-entidades.util.ts` y
   `git hash-object CLAUDE.md` → los dos hashes de partida del Anexo.
4. La etiqueta está en un solo lugar de todo `src/`:
   `grep -rn "Municipio Operativa" src/ | wc -l` → `1`, y es la línea de
   `documento-entidades.util.ts`.
5. `grep -c "filaTotal: null" src/app/shared/utils/documento-entidades.util.ts` → `1`
   (confirma que los tres libros van sin fila de totales: ningún `SUBTOTAL` nombra esta
   etiqueta).

## PASO 1 — src/app/shared/utils/documento-entidades.util.ts (2 bloques)

### Bloque 1 de 2

BUSCAR (8 líneas):

```
/** Las 12 columnas que Cliente y Proveedor comparten, en el orden del informe
 *  viejo (ExcelService.exportarClientesTablaExcel, que servía a los dos).
 *  Las etiquetas se mantienen TAL CUAL las de hoy, incluidas "Municipio
 *  Operativa" y "Provincia Operativa": son las que el usuario ya conoce y
 *  cambiarlas no es parte de este frente. */
const COLUMNAS_EMPRESA: ColumnaDoc[] = [
  col('Razón Social', 'texto', 28),
  col('CUIT', 'texto', 14),
```

REEMPLAZAR por (11 líneas):

```
/** Las 12 columnas que Cliente y Proveedor comparten, en el orden del informe
 *  viejo (ExcelService.exportarClientesTablaExcel, que servía a los dos).
 *  Las etiquetas son las del informe viejo —las que el usuario ya conoce—, con
 *  una sola corrección de concordancia de género en "Municipio Operativo".
 *  Las otras tres del par Operativa (Dirección, Localidad, Provincia) ya
 *  concordaban, y las cuatro Fiscal no tienen género. Al tocar una etiqueta:
 *  tienen que seguir siendo únicas y sin [ ] # ', que es lo que exige la
 *  referencia estructurada de la Tabla de Excel. */
const COLUMNAS_EMPRESA: ColumnaDoc[] = [
  col('Razón Social', 'texto', 28),
  col('CUIT', 'texto', 14),
```

### Bloque 2 de 2

BUSCAR (7 líneas):

```
  col('Provincia Fiscal', 'texto', 16),
  col('Dirección Operativa', 'texto', 26),
  col('Localidad Operativa', 'texto', 18),
  col('Municipio Operativa', 'texto', 18),
  col('Provincia Operativa', 'texto', 16),
  col('Condición Fiscal', 'texto', 18),
  col('Contactos', 'texto', 38),
```

REEMPLAZAR por (7 líneas):

```
  col('Provincia Fiscal', 'texto', 16),
  col('Dirección Operativa', 'texto', 26),
  col('Localidad Operativa', 'texto', 18),
  col('Municipio Operativo', 'texto', 18),
  col('Provincia Operativa', 'texto', 16),
  col('Condición Fiscal', 'texto', 18),
  col('Contactos', 'texto', 38),
```

## PASO 2 — CLAUDE.md (1 bloque)

### Bloque 1 de 1

BUSCAR (13 líneas):

```
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
```

REEMPLAZAR por (20 líneas):

```
2. Sin reglas ni índices nuevos: la ficha solo lee colecciones que ya están mapeadas.

### Deuda — tras el frente Informes Excel/PDF
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
```

## Verificación

1. `git status --short` → exactamente dos líneas: `M CLAUDE.md` y
   `M src/app/shared/utils/documento-entidades.util.ts`.
2. `git diff --numstat` → `14 7 CLAUDE.md` y `7 4 src/app/shared/utils/documento-entidades.util.ts`.
3. Los dos hashes de resultado del Anexo.
4. La etiqueta vieja no está en ningún lado de `src/`, ni como etiqueta ni en un
   comentario:
   - `grep -rn "Municipio Operativa" src/ | wc -l` → `0`
   - `grep -rn "Municipio Operativo" src/ | wc -l` → `2`: la etiqueta y la mención del
     JSDoc, las dos en `documento-entidades.util.ts`
   - `grep -c "col('Municipio Operativo'" src/app/shared/utils/documento-entidades.util.ts`
     → `1` (la etiqueta propiamente dicha)
5. Las otras etiquetas siguen intactas:
   `grep -c "col('Provincia Operativa'\|col('Localidad Operativa'\|col('Dirección Operativa'\|col('Municipio Fiscal'" src/app/shared/utils/documento-entidades.util.ts`
   → `4`.
6. El listado de Choferes no se tocó:
   `grep -c "col('Municipio', 'texto', 18)," src/app/shared/utils/documento-entidades.util.ts`
   → `1`.
7. `npx tsc -p tsconfig.app.json --noEmit` → sin errores.
8. `npx tsc -p tsconfig.app.json --noEmit --noUnusedLocals` → solo el error preexistente
   de `appVersion` en `app.component.ts`.
9. `npm run build:demo` → OK, 9 advertencias, inicial 1,53 MB. La tabla de chunks tiene
   que ser **idéntica** a la del build de IEDOC/IE5 (cambia un literal de texto, no una
   dependencia); si tenés el log de IE5 a mano, el `diff` no debería devolver nada.
10. Ninguna línea nueva con espacios al final, y nada con CRLF:
    - `git diff -U0 | grep "^+" | grep -c " $"` → `0`
    - `git diff | grep -c $'\\r'` → `0`
    ⚠️ `git diff | grep -c " $"` a secas da `2` (en IEDOC daban 15, pero el diff de este
    bloque toca otras partes del archivo): son dos líneas de CONTEXTO preexistentes de
    `CLAUDE.md` que ya tenían un espacio al final. No las toques.

## Pruebas manuales en demo (las hago yo)

1. **Clientes → Descargar**: abrir el .xlsx y confirmar el encabezado `Municipio
   Operativo` en la columna I, con `Provincia Operativa` al lado sin cambios.
2. **Proveedores → Descargar**: lo mismo (misma columna I; Choferes y Vehículos al final).
3. En cualquiera de los dos: usar el **filtro y el ordenamiento** de esa columna, para
   confirmar que la Tabla de Excel sigue entera después de renombrar el encabezado.
4. **Choferes → Descargar**: el encabezado sigue siendo `Municipio` a secas.

## Mensaje de commit

```
fix (informes): la etiqueta Municipio Operativa pasa a Municipio Operativo

- documento-entidades: COLUMNAS_EMPRESA (listados de Clientes y Proveedores)
  corrige la concordancia de genero de la unica etiqueta que la tenia mal.
  Las otras tres del par Operativa ya concordaban, las cuatro Fiscal no
  tienen genero y el listado de Choferes usa "Municipio" a secas. La
  etiqueta estaba en un solo lugar de src/ y ninguna logica depende del
  texto (los tres libros van con filaTotal: null, asi que no hay SUBTOTAL
  con referencia estructurada que la nombre).
- El JSDoc decia que las etiquetas se mantenian tal cual "incluidas Municipio
  Operativa y Provincia Operativa": era falso por dos lados (una cambio, la
  otra nunca estuvo mal). Queda en su lugar la regla que importa al tocar
  una etiqueta: unicas y sin [ ] # ', que es lo que exige la referencia
  estructurada de la Tabla de Excel.
- CLAUDE.md: la etiqueta queda tachada en "Deuda - tras el frente Informes
  Excel/PDF", y el badge de nivel de tarifa del tablero se asienta como
  DECISION (se queda uno por lado) con el motivo por el que el informe de
  Excel si lleva uno solo: con los dos lados en la celda, el filtro de la
  Tabla trataria "Especial - General" como un valor distinto de "Especial".
- Sin cambios de comportamiento ni de bundle: la tabla de chunks es identica.
```

## Anexo — hashes

| Archivo | Hash de partida (HEAD) | Hash de resultado |
|---|---|---|
| `src/app/shared/utils/documento-entidades.util.ts` | `be9640140970ea34c10730577d98a40c519a5b96` | `2dd9c73e9af9b895a17d7c28bb4f9c25ef71b2c7` |
| `CLAUDE.md` | `156461dd610d096974035974ad0d72d39dd6bab1` | `32b64c024ab2a5cc060c854b2ecb168a9633b0bc` |

FIN DE LA INSTRUCCIÓN FIX-MUNICIPIO

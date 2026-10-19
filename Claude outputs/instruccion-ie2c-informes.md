Si no ves la línea FIN DE LA INSTRUCCIÓN IE2c al final, el texto llegó cortado: leé el archivo completo.

# IE2c — La descarga del tablero de operaciones queda en dev/admin

## Contexto y razonamiento

Decisión tuya del 19/10, después de confirmarlo contra la operación real: **bajar el
informe del tablero de operaciones es una tarea de administración**, no del empleado que
carga operaciones. Hoy en demo la hace admin. Así que `user` sale de esa acción.

Esto corrige lo que quedó de IE0: ahí me dijiste "en principio que sean descargables por
los roles: user, admin y dev" y con eso IE1b puso
`*appPermiso="'operaciones.descargarTablero'"` en el botón. La acción ya existía con el
override `{ demo: false }` (Bloque 7 del frente Botones y Permisos), así que alcanzaba.
Ahora el requisito cambió y el override pasa a `{ demo: false, user: false }`.

Por qué el override y no la matriz: `descargarTablero` mapea a `'leer'`, y `'leer'` en
`operaciones` es `true` para `user` porque un empleado tiene que poder VER el tablero.
Tocar `matrizBase.operaciones.leer` le sacaría la pantalla entera; tocar
`mapaAccionCrud.descargarTablero` rompería `'reimprimir'`, que mapea al mismo `'leer'` en
Facturación y Liquidaciones. El override puntual por `'modulo.accion'` es exactamente el
mecanismo previsto para esto, y es su tercer caso real.

**Efecto, medido contra la matriz:** la acción queda en `dev` y `admin`. `manager` ya no la
tenía (`operaciones.leer` es `false` para él), `demo` sigue afuera por el override viejo y
`user` se va ahora. Afecta a los DOS botones que usan la acción: el real del tablero de
operaciones (IE1b) y el inerte de `tablero-asignaciones`, que se elimina en IE4 (D6) — ahí
no cambia nada en la práctica porque ese botón no hace nada desde la migración.

**Lo que NO toca:** `'operaciones.limpiarTablero': { user: true }` queda igual — `user` es
el único empleado activo y sigue necesitando limpiar su borrador en
`tablero-asignaciones`. Y `'reimprimir'` en Facturación/Liquidaciones no se entera.

Esto además destraba una colisión que apareció al diseñar IE3: la columna "Vendedores
asignados" del listado de Clientes necesita leer la colección `vendedores`, que `user` no
puede leer (`vendedores.leer`: dev/admin/demo). Si `user` pudiera descargar el listado, la
descarga se le rompería con "Missing or insufficient permissions" — el mismo patrón del bug
de `asignaciones` ya documentado en CLAUDE.md. Con la descarga en dev/admin, los dos roles
que descargan son justo los que pueden leer `vendedores`, y la columna no necesita ningún
condicional. En IE3b el permiso nuevo de los listados va a seguir el mismo criterio.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Validá el BUSCAR antes de escribir. Si no está o está repetido, detenete y avisá.
- Editá en el lugar (leé el archivo antes de escribir). LF.
- No toques `matrizBase` ni `mapaAccionCrud`: el cambio es UNA entrada de `overrides`.
- No toques `tablero-op.component.html` ni `tablero-asignaciones.component.html`: el
  `*appPermiso` ya está puesto y no cambia.
- No toques `firestore.rules`: esto es gating de UI. Las reglas reales siguen permitiéndole
  a `user` LEER operaciones, que es lo correcto (ve el tablero, no lo exporta).
- No toques CLAUDE.md ni CHANGELOG.md: van en el bloque DOC de cierre del frente.
- NO corras `npm run build`, `deploy:*` ni `node set-version.js`. Para compilar:
  `npm run build:demo` (línea base: 9 advertencias, inicial 1,53 MB).

## PASO 0 — verificación, sin modificar nada

1. `git rev-parse --abbrev-ref HEAD` → `refactor`; `git log --oneline -1` → el commit de IE2b.
2. `git hash-object src/app/servicios/permisos/permisos.service.ts` → `3929bed30f9b9527a91242237bb5244a157338f6`
3. `grep -c "descargarTablero': { demo: false }," src/app/servicios/permisos/permisos.service.ts` → `1`.
4. Los tres archivos que mencionan la acción, sin cambios:
   `grep -rln "operaciones.descargarTablero" src/` → `permisos.service.ts`,
   `tablero-op.component.html` y `tablero-asignaciones.component.html`.

## PASO 1 — src/app/servicios/permisos/permisos.service.ts

BUSCAR (14 líneas):

```
  // no alcanza para un requisito de negocio puntual — no para "arreglar"
  // la matriz en general, eso sería reinterpretar las reglas reales.
  private readonly overrides: Partial<Record<string, Partial<Record<RolUsuario, boolean>>>> = {
    // 'reimprimir' (Facturación/Liquidaciones) y 'descargarTablero'
    // (tablero-asignaciones) mapean ambos a 'leer', y 'leer' da demo=true
    // en 'operaciones' — pero el negocio pide bloquear puntualmente la
    // descarga del tablero para demo sin afectar 'reimprimir' en los
    // otros módulos. Por eso el override es específico de
    // 'operaciones.descargarTablero', no un cambio a mapaAccionCrud ni a
    // matrizBase (que romperían 'reimprimir' en Facturación).
    'operaciones.descargarTablero': { demo: false },
    // 'limpiarTablero' mapea a 'eliminar', que da user=false en
    // 'operaciones' — pero 'user' es el rol del único empleado activo en
    // producción y uso principal de tablero-asignaciones: el negocio
```

REEMPLAZAR por (19 líneas):

```
  // no alcanza para un requisito de negocio puntual — no para "arreglar"
  // la matriz en general, eso sería reinterpretar las reglas reales.
  private readonly overrides: Partial<Record<string, Partial<Record<RolUsuario, boolean>>>> = {
    // 'reimprimir' (Facturación/Liquidaciones) y 'descargarTablero' mapean
    // ambos a 'leer', y 'leer' da demo=true y user=true en 'operaciones' —
    // pero el negocio pide que la descarga quede solo en dev/admin, sin
    // afectar 'reimprimir' en los otros módulos. Por eso el override es
    // específico de 'operaciones.descargarTablero', no un cambio a
    // mapaAccionCrud ni a matrizBase (que romperían 'reimprimir' en
    // Facturación).
    // 'user' se agregó al override en el frente Informes (IE2c): desde IE1b
    // esta acción gobierna el botón real de descarga del tablero de
    // OPERACIONES (antes solo el botón inerte de tablero-asignaciones), y
    // bajar ese informe es una tarea de administración, no del empleado que
    // carga operaciones — confirmado con el negocio el 19/10/2026.
    'operaciones.descargarTablero': { demo: false, user: false },
    // 'limpiarTablero' mapea a 'eliminar', que da user=false en
    // 'operaciones' — pero 'user' es el rol del único empleado activo en
    // producción y uso principal de tablero-asignaciones: el negocio
```

## Verificación

1. `git hash-object src/app/servicios/permisos/permisos.service.ts` → `49a868d1411cf79a72ab28faa2d7d5c9fd833b2c`
2. `git diff --numstat` → una sola línea: `13	8	src/app/servicios/permisos/permisos.service.ts`
3. `grep -c "descargarTablero': { demo: false, user: false }," src/app/servicios/permisos/permisos.service.ts` → `1`
4. El resto de los overrides intacto:
   `grep -c "limpiarTablero': { user: true }," src/app/servicios/permisos/permisos.service.ts` → `1`
5. `grep -c "descargarTablero: 'leer'," src/app/servicios/permisos/permisos.service.ts` → `1` (el mapeo no se tocó)
6. `npx tsc -p tsconfig.app.json --noEmit` → sin errores.
7. `npm run build:demo` → OK, 9 advertencias, inicial 1,53 MB.

## Pruebas manuales en demo (las hago yo)

1. Con un usuario **`user`**, en Operaciones → Tablero de operaciones: el botón
   "Descargar Op" **ya no se ve**. El resto de la pantalla sigue igual (ve el tablero,
   filtra, abre el detalle, da de alta, edita y cierra según sus permisos).
2. Con **`user`**, en Operaciones → Tablero de asignaciones: los otros 7 botones siguen
   visibles, incluido **Limpiar** (ese override no se tocó). El de Descargar desaparece —
   era el botón inerte que avisa "Próximamente", se elimina en IE4.
3. Con **`admin`** (y con `dev`): "Descargar Op" sigue visible y el informe baja igual que
   en IE2b, con la Tabla, Nivel y Tarifa.
4. Con **`demo`**: sigue sin verlo, como antes.

## Mensaje de commit

```
IE2c (informes): la descarga del tablero de operaciones queda en dev/admin

- permisos: 'operaciones.descargarTablero' pasa de { demo: false } a
  { demo: false, user: false }. Bajar el informe del tablero es una tarea de
  administracion, no del empleado que carga operaciones (confirmado contra la
  operacion real: hoy la hace admin). Corrige el criterio provisorio de IE0
  ("user, admin y dev").
- Override y no matriz: descargarTablero mapea a 'leer', y 'leer' en
  operaciones tiene que seguir en true para user (ve el tablero). Tocar
  matrizBase le sacaria la pantalla entera; tocar mapaAccionCrud romperia
  'reimprimir', que mapea al mismo 'leer' en Facturacion y Liquidaciones.
- Afecta los dos botones de la accion: el real de tablero-op (IE1b) y el
  inerte de tablero-asignaciones, que se elimina en IE4.
- 'operaciones.limpiarTablero': { user: true } no se toca.
- Destraba IE3: los unicos roles que descargan (dev/admin) son los que pueden
  leer la coleccion 'vendedores', asi que la columna "Vendedores asignados"
  del listado de Clientes no necesita ningun condicional por rol.
```

FIN DE LA INSTRUCCIÓN IE2c

# Auditoría — Matriz de permisos: `permitido()` de `firestore.rules` contra `matrizBase` de `PermisosService`

Fecha: 2026-11-10 · Rama: `refactor` · Commit base: `2d68ca8`

## Alcance

Relevamiento del frente diferido de reglas y matriz. Solo lectura de código; sin propuesta.
Todos los números de este documento salen de contar en el código del commit base, no de la
documentación.

Relevado: `firestore.rules` (`moduloDe`, `permitido`, `esBackup`, los dos `match`);
`servicios/permisos/permisos.service.ts` (`ModuloReglas`, `matrizBase`, `mapaModuloReglas`,
`mapaAccionCrud`, `overrides`, `puede`); `interfaces/permiso.ts`; las colecciones que arma el
código de `src/app` (todo `DbFirestoreService` y los servicios que construyen paths propios);
los scripts `functions/test-*.mjs` que ejercen reglas como cliente.

Fuera de alcance: las cinco capas de acceso por ruta, el sidebar y los `esRol()` sueltos
(auditoría hermana); el mapeo de `noOperativo`; el CHANGELOG. No se tocó `firestore.rules` ni
`PermisosService`.

Método de la tabla central (§4): `permitido()` y `matrizBase` se transcribieron a un script
(una función que replica `permitido()` rama por rama y un objeto con `matrizBase` celda por
celda) y la tabla se generó por cómputo. Los valores esperados de cada caso de test se
validaron contra esa misma función: todos los casos de los tests de reglas, y los 2 de
`test-emulator.mjs`, esperan lo que `permitido()` da (ninguno espera algo distinto).

---

## 0. Contradicciones encontradas

Lo que el código o la documentación afirma y no se cumple.

1. **"Transcripción LITERAL" que no lo es.** El comentario de `PermisosService.matrizBase`
   dice: *"Transcripción LITERAL de la función permitido() de firestore.rules — no
   reinterpretada"*. Tres celdas de `matrizBase.papelera` difieren de la rama `papelera` de
   `permitido()`: `leer·user`, `leer·demo` y `editar·admin` (las reglas dicen sí, la matriz
   dice no). Ya registrado como deuda en la skill `botones-y-permisos` ("`matrizBase.papelera`
   desactualizada contra `firestore.rules`"), pero el comentario del código sigue afirmando lo
   contrario.
2. **"Nombres de módulo reales de firestore.rules" incompleto.** El comentario sobre
   `ModuloReglas` dice *"Nombres de módulo reales de firestore.rules (función moduloDe())"*.
   Faltan tres de los 19 módulos de `permitido()`: `desarrollo`, `vencimientos`,
   `historicoSoloLectura`. También registrado como deuda en la skill; el comentario no lo dice.
3. **La deuda de `papelera` describe un efecto que no puede ocurrir.** La skill dice: *"el
   efecto posible es una acción oculta o deshabilitada que la regla dejaría hacer (clic
   perdido)"*. `puede()` sólo llega a `matrizBase` a través de `mapaModuloReglas`, y ningún
   `ModuloPermiso` mapea a `'papelera'`: las tres celdas divergentes son inalcanzables desde
   la UI. No producen ni un clic perdido ni nada (ver §5, "Entradas de `matrizBase`
   inalcanzables").
4. **`reportes` → `'finanzas'` con una justificación que ya no vale.** El comentario de
   `mapaModuloReglas` dice que `liquidaciones`/`facturacion`/`reportes` comparten
   `'finanzas'` porque *"sus colecciones no están separadas en moduloDe() hoy"*, e
   *"incluye resumenOpMensual→'finanzas' para Reportes"*. La skill repite: *"sus colecciones
   reales no tienen módulo propio en `moduloDe()`"*. Desde el frente Reportes la colección de
   Reportes es `resumenesOp`, mapeada a `'resumenes'`, no a `'finanzas'`. Hoy `leer` da lo
   mismo en los dos módulos (dev/admin/demo); `crear` y `editar` no (`resumenes` da `user` sí,
   `finanzas` no).
5. **`legacySoloLectura` "con escritura real confirmada en código vivo".** CLAUDE.md
   ("Security Rules", categorías especiales) dice que esas colecciones tienen *"escritura real
   confirmada en código vivo"*. En `src/app` no queda ninguna referencia a las 16 colecciones
   de ese bucket fuera de comentarios y un título de columna (`liq-gral.component.ts`,
   `tituloFacOpCliente = "facturaOpCliente"`, que no es un path). Ver §6.
6. **CLAUDE.md, "Capa de datos", lista `liquidaciones` como colección principal.** No está
   en `moduloDe()` (quedaría denegada a todos) y ningún código la usa como colección: el
   literal `'liquidaciones'` sólo aparece como `ModuloPermiso` y como modo de un modal.
7. **La skill cita un método retirado.** En "Corrección — granularidad de `matrizBase` por
   acción", el mapeo de `anular` remite a *"`LiquidacionService.anularLiquidacion`"*.
   `LiquidacionService` se retiró en el frente Lazy loading + fechas (LR1, según CLAUDE.md) y
   `anularLiquidacion` no existe en `src/app`.
8. **"`demo` sin ningún acceso" a `asignaciones`, verificado a medias.** CLAUDE.md describe
   `test-asignaciones-rules.mjs` como verificación de *"`demo` sin ningún acceso"*. El script
   afirma `leer` y `crear` de `demo`; `editar` y `eliminar` de `demo` no se prueban.

Sin contradicción (se verificó y coincide): los conteos que dan la skill y CLAUDE.md de
módulos (19 en `permitido()`, 16 + `usuarios` en `ModuloReglas`), `ModuloPermiso` (12), y
los totales de casos que CLAUDE.md atribuye a `test-historico-rules` (100),
`test-cierre-rules` (16) y `test-vendedores-rules` (17). Las descripciones por módulo de
CLAUDE.md ("Security Rules") coinciden con `permitido()` en todos los módulos que describen.

---

## 1. `permitido()` transcripta

`permitido(modulo, accion)` con `let r = rol()` (`request.auth.token.role`). Es una
disyunción de 19 ramas, una por módulo. **19 módulos.**

Valores: ✔ permitido, · denegado. Columnas: d=dev, a=admin, m=manager, u=user, x=demo.
Cada celda lista los roles con acceso para esa acción.

| # | Módulo | Forma de la condición | leer | crear | editar | eliminar |
|---|---|---|---|---|---|---|
| 1 | `desarrollo` | Sólo rol; **no distingue acción** (`r == 'dev'`) | d | d | d | d |
| 2 | `configuracion` | Rol × acción | d a u x | d a | d a | d |
| 3 | `entidades` | Rol × acción | d a u x | d a u | d a u | d a |
| 4 | `legajos` | Rol × acción | d a u x | d a u | d a u | d a |
| 5 | `vencimientos` | Rol × acción (sólo `leer`) | d a u x | — | — | — |
| 6 | `vendedores` | Rol × acción | d a x | d a | d a | d a |
| 7 | `operaciones` | Rol × acción | d a u x | d a u | d a u | d a |
| 8 | `asignaciones` | Sólo rol; **no distingue acción** (`r in ['dev','admin','user']`) | d a u | d a u | d a u | d a u |
| 9 | `tarifas` | Rol × acción | d a u x | d a | d a | d a |
| 10 | `tarifasHistorial` | Rol × acción | d a u x | d a | — | — |
| 11 | `finanzas` | Rol × acción | d a x | d a | d a | d a |
| 12 | `informesOp` | Rol × acción | d a u x | d a u | d a | d a |
| 13 | `resumenes` | Rol × acción | d a x | d a u | d a u | d a |
| 14 | `comisiones` | Rol × acción | d a x | d a u | d a u | d a |
| 15 | `legacySoloLectura` | Sólo acción; **no depende del rol** (`accion == 'leer'`) | cualquier autenticado (d a m u x) | — | — | — |
| 16 | `historicoSoloLectura` | Rol × acción (sólo `leer`) | d a u x | — | — | — |
| 17 | `numeradores` | Rol × acción | d a u | d a u | d a u | — |
| 18 | `logs` | Rol × acción | d a u x | d a u | d | d |
| 19 | `papelera` | Rol × acción | d a u x | d a u | d a | d a |

Notas de forma:

- `manager` no aparece por nombre en ninguna rama. Su único acceso es `leer` en
  `legacySoloLectura`, que no consulta el rol.
- Tres módulos no cubren las cuatro acciones para nadie: `vencimientos` y
  `historicoSoloLectura` (sólo `leer`), `tarifasHistorial` (sin `editar`/`eliminar`, ni
  siquiera `dev`), `numeradores` (sin `eliminar`). `legacySoloLectura` tampoco tiene
  escritura para nadie.
- Fuera de `permitido()`, en los `match`: colecciones con prefijo `_backup_` (`esBackup`):
  las 4 acciones sólo para `dev`, sin pasar por `permitido()`. `/users/{uid}` (fuera de
  `/Vantruck/datos`): `read` para `dev`/`admin` o el propio uid; `write` sólo `dev`.
- Comportamiento de un rol ausente en el token (`token.role` inexistente) dentro de
  `legacySoloLectura`: no verificado; el `let r = rol()` podría fallar antes de evaluar la
  rama. No hay test que lo ejerza.

## 2. `moduloDe()`: colección → módulo

**75 colecciones**, sin claves repetidas, que apuntan a **19 módulos distintos**: los mismos
19 de `permitido()`. Ninguna entrada mapea a un módulo inexistente en `permitido()` y ningún
módulo de `permitido()` queda sin colección.

`moduloDe()` es un literal de mapa indexado (`{…}[coleccion]`): no tiene entradas con
prefijo dinámico. El único prefijo dinámico de las reglas es `_backup_.*`, que no pasa por
`moduloDe()` (lo resuelve `esBackup` en el `match`). Una colección que no está en el mapa
no tiene módulo y queda denegada para todas las acciones.

| Módulo | # | Colecciones |
|---|---|---|
| `entidades` | 4 | `clientes`, `choferes`, `proveedores`, `vehiculos` |
| `legajos` | 3 | `legajos`, `categoriasDocumentacion`, `documentacionHistorial` |
| `vencimientos` | 1 | `vencimientos` |
| `vendedores` | 2 | `vendedores`, `liquidacionesVenta` |
| `operaciones` | 4 | `operaciones`, `informesVenta`, `noOperativo` (en desuso), `noDisponibilidades` |
| `desarrollo` | 1 | `generacionesPrueba` |
| `asignaciones` | 1 | `asignaciones` |
| `tarifas` | 10 | `tarifasGralCliente`, `tarifasEspCliente`, `tarifasPersCliente`, `tarifasGralChofer`, `tarifasEspChofer`, `tarifasGralProveedor`, `tarifasEspProveedor`, `tarifasEventuales`, `tarifas`, `tarifasEspeciales` |
| `informesOp` | 2 | `informesOp`, `registrosOpEventuales` |
| `tarifasHistorial` | 7 | `historialTarifasGralCliente`, `historialTarifasEspCliente`, `historialTarifasPersCliente`, `historialTarifasGralChofer`, `historialTarifasEspChofer`, `historialTarifasGralProveedor`, `historialTarifasEspProveedor` |
| `finanzas` | 15 | `resumenLiq`, `proforma`, `informesOpClientes`, `informesOpChoferes`, `informesOpProveedores`, `infOpLiqClientes`, `infOpLiqChoferes`, `infOpLiqProveedores`, `informesLiq`, `informesLiqSnapshots`, `facturasVinculadas`, `resumenOpMensual`, `resumenFinanzas`, `movimientos`, `movimientosFin` |
| `resumenes` | 1 | `resumenesOp` |
| `comisiones` | 1 | `comisionesVenta` |
| `legacySoloLectura` | 16 | `facturaCliente`, `facturaChofer`, `facturaProveedor`, `facturaOpCliente`, `facturaOpChofer`, `facturaOpProveedor`, `facOpLiqCliente`, `facOpLiqChofer`, `facOpLiqProveedor`, `resumenLiqClientes`, `resumenLiqChoferes`, `resumenLiqProveedores`, `tableroDiario`, `tarifasChofer`, `tarifasCliente`, `tarifasProveedor` |
| `numeradores` | 1 | `numeradores` |
| `configuracion` | 1 | `configuracion` |
| `historicoSoloLectura` | 2 | `logs`, `papelera` |
| `logs` | 1 | `registroLog` |
| `papelera` | 2 | `papeleraEventos`, `objetosEliminados` |
| **Total** | **75** | |

## 3. `PermisosService` e `interfaces/permiso.ts`

### Tipos

| Tipo | Dónde | Cardinalidad | Valores |
|---|---|---|---|
| `ModuloPermiso` | `interfaces/permiso.ts` | 12 | `operaciones`, `clientes`, `choferes`, `proveedores`, `liquidaciones`, `legajos`, `vendedores`, `facturacion`, `finanzas`, `reportes`, `configuracion`, `usuarios` |
| `AccionPermiso` | `interfaces/permiso.ts` | 18 | `ver`, `editar`, `eliminar`, `agregar`, `anular`, `vincularFactura`, `verFactura`, `reimprimir`, `vehiculos`, `cerrar`, `liquidar`, `descargarTablero`, `descargarAsignaciones`, `descargarListado`, `limpiarTablero`, `revertir`, `desvincular`, `noDisponibilidad` |
| `AccionCrud` | `interfaces/permiso.ts` | 4 | `leer`, `crear`, `editar`, `eliminar` |
| `ModuloReglas` | `permisos.service.ts` (no exportado) | 17 | los 16 módulos de `permitido()` que transcribe (`entidades`, `legajos`, `vendedores`, `operaciones`, `asignaciones`, `tarifas`, `tarifasHistorial`, `finanzas`, `informesOp`, `resumenes`, `comisiones`, `legacySoloLectura`, `numeradores`, `logs`, `papelera`, `configuracion`) + `usuarios` |

`AccionPermiso` lleva el comentario "unión abierta", pero en TypeScript es una unión cerrada
de 18 literales como cualquier otra; lo "abierto" es la intención de ir sumando valores.

### `matrizBase`

`Record<ModuloReglas, Record<AccionCrud, Record<RolUsuario, boolean>>>`: **17 módulos × 4
acciones × 5 roles = 340 booleanos.** Los 16 módulos compartidos con `permitido()` están
celda por celda en la tabla de §4 (columna "matrizBase"). La entrada fuera de `permitido()`:

| `usuarios` | dev | admin | manager | user | demo |
|---|---|---|---|---|---|
| leer | sí | sí | no | no | no |
| crear | sí | sí | no | no | no |
| editar | sí | sí | no | no | no |
| eliminar | sí | sí | no | no | no |

Contra la regla real de `/users/{uid}` (`write` sólo `dev`): `admin` en `crear`/`editar`/
`eliminar` dice sí en la matriz y no en las reglas. El comentario de la matriz lo explica
(admin opera por Cloud Functions con Admin SDK, no por escritura directa); no hay escritura
directa de `admin` a `/users` en el código (`GestionUsuariosService` sólo lee).

### `mapaModuloReglas`

`Record<Exclude<ModuloPermiso,'usuarios'>, ModuloReglas>`: **11 entradas**, apuntan a **6
`ModuloReglas` distintos**.

| `ModuloPermiso` | → `ModuloReglas` |
|---|---|
| `clientes`, `choferes`, `proveedores` | `entidades` |
| `legajos` | `legajos` |
| `vendedores` | `vendedores` |
| `operaciones` | `operaciones` |
| `facturacion`, `liquidaciones`, `finanzas`, `reportes` | `finanzas` |
| `configuracion` | `configuracion` |

`usuarios` no pasa por el mapa: `puede()` lo resuelve con una rama propia contra
`matrizBase.usuarios`.

### `mapaAccionCrud`

`Record<AccionPermiso, AccionCrud>`: **18 entradas**.

| → `AccionCrud` | # | `AccionPermiso` |
|---|---|---|
| `leer` | 7 | `ver`, `vehiculos`, `verFactura`, `reimprimir`, `descargarTablero`, `descargarAsignaciones`, `descargarListado` |
| `crear` | 2 | `agregar`, `liquidar` |
| `editar` | 7 | `editar`, `anular`, `vincularFactura`, `cerrar`, `revertir`, `desvincular`, `noDisponibilidad` |
| `eliminar` | 2 | `eliminar`, `limpiarTablero` |

### `overrides`

Clave `'ModuloPermiso.AccionPermiso'`. **6 claves, 10 valores por rol.** Se evalúan en
`puede()` antes que la matriz y ganan si definen el rol.

| Clave | Valores | Celda de reglas que consulta sin override |
|---|---|---|
| `operaciones.descargarTablero` | demo → false, user → false | `operaciones · leer` |
| `operaciones.limpiarTablero` | user → **true** | `operaciones · eliminar` |
| `operaciones.descargarAsignaciones` | demo → false | `operaciones · leer` |
| `clientes.descargarListado` | demo → false, user → false | `entidades · leer` |
| `choferes.descargarListado` | demo → false, user → false | `entidades · leer` |
| `proveedores.descargarListado` | demo → false, user → false | `entidades · leer` |

Nueve de los diez valores restringen (la UI muestra menos que la regla). El único que amplía
es `operaciones.limpiarTablero → user: true`, sobre una celda que `permitido()` niega
(`operaciones · eliminar · user`). La escritura real de ese botón
(`TableroAsignacionesComponent.limpiar` → `AsignacionService.descartarBorrador`) borra en
`asignaciones` y agrega el log en `registroLog`: módulos `asignaciones` (`eliminar·user`: sí)
y `logs` (`crear·user`: sí). El override existe porque ningún `ModuloPermiso` llega a
`matrizBase.asignaciones`.

### `puede(modulo, accion?)`

Orden: sin rol → `false`; override del rol para `'modulo.accion'` → gana; sin `accion` →
`'leer'`; `usuarios` → `matrizBase.usuarios`; resto → `matrizBase[mapaModuloReglas[modulo]]`
con `?? false`.

## 4. Tabla central

Una fila por (módulo de `permitido()`, acción, rol): **19 × 4 × 5 = 380 filas.**

Columnas:
- **permitido()** y **matrizBase**: `sí`/`no`; `—` = el módulo no tiene entrada en
  `matrizBase`.
- **Coinciden**: `sí`, `**NO**`, o `sin entrada`.
- **Override**: override de `PermisosService` que cambia lo que `puede()` devuelve para esa
  celda en alguna `AccionPermiso`.
- **Tests**: scripts `functions/test-*-rules.mjs` que afirman la celda (nombre sin prefijo
  ni sufijo); `(test-emulator)` = `functions/test-emulator.mjs`, que no es un test de reglas
  y se cuenta aparte en §7.
- **⁰** junto al módulo: tiene entrada en `matrizBase` pero ningún `ModuloPermiso` llega a
  ella; `puede()` no la consulta nunca (§5).

### Conteo

| | Celdas |
|---|---|
| Total | 380 |
| Sin entrada en `matrizBase` (`desarrollo`, `vencimientos`, `historicoSoloLectura`) | 60 |
| Comparables | 320 |
| Coinciden | 317 |
| **No coinciden** | **3** |
| — las reglas permiten más que la UI | 3 |
| — la UI muestra más de lo que las reglas permiten | 0 |

### Filas que no coinciden

**Las reglas permiten más que la UI** (3):

| Módulo | Acción | Rol | permitido() | matrizBase | Alcanzable por `puede()` |
|---|---|---|---|---|---|
| `papelera` | leer | user | sí | no | no |
| `papelera` | leer | demo | sí | no | no |
| `papelera` | editar | admin | sí | no | no |

**La UI muestra más de lo que las reglas permiten** (0 celdas de `matrizBase`).

Por override, una celda: `operaciones · eliminar · user` (reglas no;
`operaciones.limpiarTablero` → sí). Como se dijo en §3, el gesto que habilita escribe en
`asignaciones` y `registroLog`, que `user` sí puede escribir: no produce `permission-denied`.
Es una diferencia entre el módulo que consulta la UI y el que escribe el gesto, no entre la
UI y la regla de la colección escrita.

### Tabla completa

| Módulo | Acción | Rol | permitido() | matrizBase | Coinciden | Override | Tests |
|---|---|---|---|---|---|---|---|
| desarrollo | leer | dev | sí | — | sin entrada |  |  |
| desarrollo | leer | admin | no | — | sin entrada |  |  |
| desarrollo | leer | manager | no | — | sin entrada |  |  |
| desarrollo | leer | user | no | — | sin entrada |  |  |
| desarrollo | leer | demo | no | — | sin entrada |  |  |
| desarrollo | crear | dev | sí | — | sin entrada |  |  |
| desarrollo | crear | admin | no | — | sin entrada |  |  |
| desarrollo | crear | manager | no | — | sin entrada |  |  |
| desarrollo | crear | user | no | — | sin entrada |  |  |
| desarrollo | crear | demo | no | — | sin entrada |  |  |
| desarrollo | editar | dev | sí | — | sin entrada |  |  |
| desarrollo | editar | admin | no | — | sin entrada |  |  |
| desarrollo | editar | manager | no | — | sin entrada |  |  |
| desarrollo | editar | user | no | — | sin entrada |  |  |
| desarrollo | editar | demo | no | — | sin entrada |  |  |
| desarrollo | eliminar | dev | sí | — | sin entrada |  |  |
| desarrollo | eliminar | admin | no | — | sin entrada |  |  |
| desarrollo | eliminar | manager | no | — | sin entrada |  |  |
| desarrollo | eliminar | user | no | — | sin entrada |  |  |
| desarrollo | eliminar | demo | no | — | sin entrada |  |  |
| configuracion | leer | dev | sí | sí | sí |  |  |
| configuracion | leer | admin | sí | sí | sí |  |  |
| configuracion | leer | manager | no | no | sí |  |  |
| configuracion | leer | user | sí | sí | sí |  |  |
| configuracion | leer | demo | sí | sí | sí |  |  |
| configuracion | crear | dev | sí | sí | sí |  |  |
| configuracion | crear | admin | sí | sí | sí |  |  |
| configuracion | crear | manager | no | no | sí |  |  |
| configuracion | crear | user | no | no | sí |  |  |
| configuracion | crear | demo | no | no | sí |  |  |
| configuracion | editar | dev | sí | sí | sí |  |  |
| configuracion | editar | admin | sí | sí | sí |  |  |
| configuracion | editar | manager | no | no | sí |  |  |
| configuracion | editar | user | no | no | sí |  |  |
| configuracion | editar | demo | no | no | sí |  |  |
| configuracion | eliminar | dev | sí | sí | sí |  |  |
| configuracion | eliminar | admin | no | no | sí |  |  |
| configuracion | eliminar | manager | no | no | sí |  |  |
| configuracion | eliminar | user | no | no | sí |  |  |
| configuracion | eliminar | demo | no | no | sí |  |  |
| entidades | leer | dev | sí | sí | sí |  |  |
| entidades | leer | admin | sí | sí | sí |  |  |
| entidades | leer | manager | no | no | sí |  |  |
| entidades | leer | user | sí | sí | sí | clientes/choferes/proveedores.descargarListado → false |  |
| entidades | leer | demo | sí | sí | sí | clientes/choferes/proveedores.descargarListado → false |  |
| entidades | crear | dev | sí | sí | sí |  |  |
| entidades | crear | admin | sí | sí | sí |  |  |
| entidades | crear | manager | no | no | sí |  |  |
| entidades | crear | user | sí | sí | sí |  |  |
| entidades | crear | demo | no | no | sí |  |  |
| entidades | editar | dev | sí | sí | sí |  |  |
| entidades | editar | admin | sí | sí | sí |  |  |
| entidades | editar | manager | no | no | sí |  |  |
| entidades | editar | user | sí | sí | sí |  |  |
| entidades | editar | demo | no | no | sí |  |  |
| entidades | eliminar | dev | sí | sí | sí |  |  |
| entidades | eliminar | admin | sí | sí | sí |  |  |
| entidades | eliminar | manager | no | no | sí |  |  |
| entidades | eliminar | user | no | no | sí |  |  |
| entidades | eliminar | demo | no | no | sí |  |  |
| legajos | leer | dev | sí | sí | sí |  |  |
| legajos | leer | admin | sí | sí | sí |  |  |
| legajos | leer | manager | no | no | sí |  |  |
| legajos | leer | user | sí | sí | sí |  | legajos |
| legajos | leer | demo | sí | sí | sí |  | legajos |
| legajos | crear | dev | sí | sí | sí |  | legajos |
| legajos | crear | admin | sí | sí | sí |  | legajos |
| legajos | crear | manager | no | no | sí |  |  |
| legajos | crear | user | sí | sí | sí |  | legajos |
| legajos | crear | demo | no | no | sí |  | legajos |
| legajos | editar | dev | sí | sí | sí |  |  |
| legajos | editar | admin | sí | sí | sí |  |  |
| legajos | editar | manager | no | no | sí |  |  |
| legajos | editar | user | sí | sí | sí |  | legajos |
| legajos | editar | demo | no | no | sí |  |  |
| legajos | eliminar | dev | sí | sí | sí |  |  |
| legajos | eliminar | admin | sí | sí | sí |  | legajos |
| legajos | eliminar | manager | no | no | sí |  |  |
| legajos | eliminar | user | no | no | sí |  | legajos |
| legajos | eliminar | demo | no | no | sí |  |  |
| vencimientos | leer | dev | sí | — | sin entrada |  | vencimientos |
| vencimientos | leer | admin | sí | — | sin entrada |  | vencimientos |
| vencimientos | leer | manager | no | — | sin entrada |  |  |
| vencimientos | leer | user | sí | — | sin entrada |  | vencimientos |
| vencimientos | leer | demo | sí | — | sin entrada |  | vencimientos |
| vencimientos | crear | dev | no | — | sin entrada |  | vencimientos |
| vencimientos | crear | admin | no | — | sin entrada |  | vencimientos |
| vencimientos | crear | manager | no | — | sin entrada |  |  |
| vencimientos | crear | user | no | — | sin entrada |  | vencimientos |
| vencimientos | crear | demo | no | — | sin entrada |  | vencimientos |
| vencimientos | editar | dev | no | — | sin entrada |  |  |
| vencimientos | editar | admin | no | — | sin entrada |  |  |
| vencimientos | editar | manager | no | — | sin entrada |  |  |
| vencimientos | editar | user | no | — | sin entrada |  |  |
| vencimientos | editar | demo | no | — | sin entrada |  |  |
| vencimientos | eliminar | dev | no | — | sin entrada |  |  |
| vencimientos | eliminar | admin | no | — | sin entrada |  |  |
| vencimientos | eliminar | manager | no | — | sin entrada |  |  |
| vencimientos | eliminar | user | no | — | sin entrada |  |  |
| vencimientos | eliminar | demo | no | — | sin entrada |  |  |
| vendedores | leer | dev | sí | sí | sí |  |  |
| vendedores | leer | admin | sí | sí | sí |  |  |
| vendedores | leer | manager | no | no | sí |  |  |
| vendedores | leer | user | no | no | sí |  | vendedores |
| vendedores | leer | demo | sí | sí | sí |  | vendedores |
| vendedores | crear | dev | sí | sí | sí |  |  |
| vendedores | crear | admin | sí | sí | sí |  | vendedores, (test-emulator) |
| vendedores | crear | manager | no | no | sí |  |  |
| vendedores | crear | user | no | no | sí |  | vendedores, (test-emulator) |
| vendedores | crear | demo | no | no | sí |  |  |
| vendedores | editar | dev | sí | sí | sí |  |  |
| vendedores | editar | admin | sí | sí | sí |  | vendedores |
| vendedores | editar | manager | no | no | sí |  |  |
| vendedores | editar | user | no | no | sí |  |  |
| vendedores | editar | demo | no | no | sí |  | vendedores |
| vendedores | eliminar | dev | sí | sí | sí |  |  |
| vendedores | eliminar | admin | sí | sí | sí |  | vendedores |
| vendedores | eliminar | manager | no | no | sí |  |  |
| vendedores | eliminar | user | no | no | sí |  |  |
| vendedores | eliminar | demo | no | no | sí |  |  |
| operaciones | leer | dev | sí | sí | sí |  |  |
| operaciones | leer | admin | sí | sí | sí |  |  |
| operaciones | leer | manager | no | no | sí |  |  |
| operaciones | leer | user | sí | sí | sí | operaciones.descargarTablero → false |  |
| operaciones | leer | demo | sí | sí | sí | operaciones.descargarTablero → false; operaciones.descargarAsignaciones → false |  |
| operaciones | crear | dev | sí | sí | sí |  |  |
| operaciones | crear | admin | sí | sí | sí |  |  |
| operaciones | crear | manager | no | no | sí |  |  |
| operaciones | crear | user | sí | sí | sí |  |  |
| operaciones | crear | demo | no | no | sí |  |  |
| operaciones | editar | dev | sí | sí | sí |  |  |
| operaciones | editar | admin | sí | sí | sí |  |  |
| operaciones | editar | manager | no | no | sí |  |  |
| operaciones | editar | user | sí | sí | sí |  |  |
| operaciones | editar | demo | no | no | sí |  |  |
| operaciones | eliminar | dev | sí | sí | sí |  |  |
| operaciones | eliminar | admin | sí | sí | sí |  |  |
| operaciones | eliminar | manager | no | no | sí |  |  |
| operaciones | eliminar | user | no | no | sí | operaciones.limpiarTablero → **true** |  |
| operaciones | eliminar | demo | no | no | sí |  |  |
| asignaciones ⁰ | leer | dev | sí | sí | sí |  |  |
| asignaciones ⁰ | leer | admin | sí | sí | sí |  |  |
| asignaciones ⁰ | leer | manager | no | no | sí |  |  |
| asignaciones ⁰ | leer | user | sí | sí | sí |  | asignaciones |
| asignaciones ⁰ | leer | demo | no | no | sí |  | asignaciones |
| asignaciones ⁰ | crear | dev | sí | sí | sí |  |  |
| asignaciones ⁰ | crear | admin | sí | sí | sí |  | asignaciones |
| asignaciones ⁰ | crear | manager | no | no | sí |  |  |
| asignaciones ⁰ | crear | user | sí | sí | sí |  | asignaciones |
| asignaciones ⁰ | crear | demo | no | no | sí |  | asignaciones |
| asignaciones ⁰ | editar | dev | sí | sí | sí |  |  |
| asignaciones ⁰ | editar | admin | sí | sí | sí |  |  |
| asignaciones ⁰ | editar | manager | no | no | sí |  |  |
| asignaciones ⁰ | editar | user | sí | sí | sí |  |  |
| asignaciones ⁰ | editar | demo | no | no | sí |  |  |
| asignaciones ⁰ | eliminar | dev | sí | sí | sí |  |  |
| asignaciones ⁰ | eliminar | admin | sí | sí | sí |  | asignaciones |
| asignaciones ⁰ | eliminar | manager | no | no | sí |  |  |
| asignaciones ⁰ | eliminar | user | sí | sí | sí |  | asignaciones |
| asignaciones ⁰ | eliminar | demo | no | no | sí |  |  |
| tarifas ⁰ | leer | dev | sí | sí | sí |  |  |
| tarifas ⁰ | leer | admin | sí | sí | sí |  |  |
| tarifas ⁰ | leer | manager | no | no | sí |  |  |
| tarifas ⁰ | leer | user | sí | sí | sí |  |  |
| tarifas ⁰ | leer | demo | sí | sí | sí |  |  |
| tarifas ⁰ | crear | dev | sí | sí | sí |  |  |
| tarifas ⁰ | crear | admin | sí | sí | sí |  |  |
| tarifas ⁰ | crear | manager | no | no | sí |  |  |
| tarifas ⁰ | crear | user | no | no | sí |  |  |
| tarifas ⁰ | crear | demo | no | no | sí |  |  |
| tarifas ⁰ | editar | dev | sí | sí | sí |  |  |
| tarifas ⁰ | editar | admin | sí | sí | sí |  |  |
| tarifas ⁰ | editar | manager | no | no | sí |  |  |
| tarifas ⁰ | editar | user | no | no | sí |  |  |
| tarifas ⁰ | editar | demo | no | no | sí |  |  |
| tarifas ⁰ | eliminar | dev | sí | sí | sí |  |  |
| tarifas ⁰ | eliminar | admin | sí | sí | sí |  |  |
| tarifas ⁰ | eliminar | manager | no | no | sí |  |  |
| tarifas ⁰ | eliminar | user | no | no | sí |  |  |
| tarifas ⁰ | eliminar | demo | no | no | sí |  |  |
| tarifasHistorial ⁰ | leer | dev | sí | sí | sí |  |  |
| tarifasHistorial ⁰ | leer | admin | sí | sí | sí |  |  |
| tarifasHistorial ⁰ | leer | manager | no | no | sí |  |  |
| tarifasHistorial ⁰ | leer | user | sí | sí | sí |  |  |
| tarifasHistorial ⁰ | leer | demo | sí | sí | sí |  |  |
| tarifasHistorial ⁰ | crear | dev | sí | sí | sí |  |  |
| tarifasHistorial ⁰ | crear | admin | sí | sí | sí |  |  |
| tarifasHistorial ⁰ | crear | manager | no | no | sí |  |  |
| tarifasHistorial ⁰ | crear | user | no | no | sí |  |  |
| tarifasHistorial ⁰ | crear | demo | no | no | sí |  |  |
| tarifasHistorial ⁰ | editar | dev | no | no | sí |  |  |
| tarifasHistorial ⁰ | editar | admin | no | no | sí |  |  |
| tarifasHistorial ⁰ | editar | manager | no | no | sí |  |  |
| tarifasHistorial ⁰ | editar | user | no | no | sí |  |  |
| tarifasHistorial ⁰ | editar | demo | no | no | sí |  |  |
| tarifasHistorial ⁰ | eliminar | dev | no | no | sí |  |  |
| tarifasHistorial ⁰ | eliminar | admin | no | no | sí |  |  |
| tarifasHistorial ⁰ | eliminar | manager | no | no | sí |  |  |
| tarifasHistorial ⁰ | eliminar | user | no | no | sí |  |  |
| tarifasHistorial ⁰ | eliminar | demo | no | no | sí |  |  |
| finanzas | leer | dev | sí | sí | sí |  |  |
| finanzas | leer | admin | sí | sí | sí |  |  |
| finanzas | leer | manager | no | no | sí |  |  |
| finanzas | leer | user | no | no | sí |  |  |
| finanzas | leer | demo | sí | sí | sí |  |  |
| finanzas | crear | dev | sí | sí | sí |  |  |
| finanzas | crear | admin | sí | sí | sí |  |  |
| finanzas | crear | manager | no | no | sí |  |  |
| finanzas | crear | user | no | no | sí |  |  |
| finanzas | crear | demo | no | no | sí |  |  |
| finanzas | editar | dev | sí | sí | sí |  |  |
| finanzas | editar | admin | sí | sí | sí |  |  |
| finanzas | editar | manager | no | no | sí |  |  |
| finanzas | editar | user | no | no | sí |  |  |
| finanzas | editar | demo | no | no | sí |  |  |
| finanzas | eliminar | dev | sí | sí | sí |  |  |
| finanzas | eliminar | admin | sí | sí | sí |  |  |
| finanzas | eliminar | manager | no | no | sí |  |  |
| finanzas | eliminar | user | no | no | sí |  |  |
| finanzas | eliminar | demo | no | no | sí |  |  |
| informesOp ⁰ | leer | dev | sí | sí | sí |  |  |
| informesOp ⁰ | leer | admin | sí | sí | sí |  |  |
| informesOp ⁰ | leer | manager | no | no | sí |  |  |
| informesOp ⁰ | leer | user | sí | sí | sí |  | cierre |
| informesOp ⁰ | leer | demo | sí | sí | sí |  | cierre |
| informesOp ⁰ | crear | dev | sí | sí | sí |  |  |
| informesOp ⁰ | crear | admin | sí | sí | sí |  |  |
| informesOp ⁰ | crear | manager | no | no | sí |  |  |
| informesOp ⁰ | crear | user | sí | sí | sí |  | cierre |
| informesOp ⁰ | crear | demo | no | no | sí |  | cierre |
| informesOp ⁰ | editar | dev | sí | sí | sí |  |  |
| informesOp ⁰ | editar | admin | sí | sí | sí |  | cierre |
| informesOp ⁰ | editar | manager | no | no | sí |  |  |
| informesOp ⁰ | editar | user | no | no | sí |  | cierre |
| informesOp ⁰ | editar | demo | no | no | sí |  |  |
| informesOp ⁰ | eliminar | dev | sí | sí | sí |  |  |
| informesOp ⁰ | eliminar | admin | sí | sí | sí |  | cierre |
| informesOp ⁰ | eliminar | manager | no | no | sí |  |  |
| informesOp ⁰ | eliminar | user | no | no | sí |  | cierre |
| informesOp ⁰ | eliminar | demo | no | no | sí |  |  |
| resumenes ⁰ | leer | dev | sí | sí | sí |  |  |
| resumenes ⁰ | leer | admin | sí | sí | sí |  | cierre |
| resumenes ⁰ | leer | manager | no | no | sí |  |  |
| resumenes ⁰ | leer | user | no | no | sí |  | cierre |
| resumenes ⁰ | leer | demo | sí | sí | sí |  | cierre |
| resumenes ⁰ | crear | dev | sí | sí | sí |  |  |
| resumenes ⁰ | crear | admin | sí | sí | sí |  |  |
| resumenes ⁰ | crear | manager | no | no | sí |  |  |
| resumenes ⁰ | crear | user | sí | sí | sí |  | cierre |
| resumenes ⁰ | crear | demo | no | no | sí |  |  |
| resumenes ⁰ | editar | dev | sí | sí | sí |  |  |
| resumenes ⁰ | editar | admin | sí | sí | sí |  |  |
| resumenes ⁰ | editar | manager | no | no | sí |  |  |
| resumenes ⁰ | editar | user | sí | sí | sí |  | cierre |
| resumenes ⁰ | editar | demo | no | no | sí |  | cierre |
| resumenes ⁰ | eliminar | dev | sí | sí | sí |  |  |
| resumenes ⁰ | eliminar | admin | sí | sí | sí |  | cierre |
| resumenes ⁰ | eliminar | manager | no | no | sí |  |  |
| resumenes ⁰ | eliminar | user | no | no | sí |  | cierre |
| resumenes ⁰ | eliminar | demo | no | no | sí |  |  |
| comisiones ⁰ | leer | dev | sí | sí | sí |  |  |
| comisiones ⁰ | leer | admin | sí | sí | sí |  | vendedores |
| comisiones ⁰ | leer | manager | no | no | sí |  |  |
| comisiones ⁰ | leer | user | no | no | sí |  | vendedores |
| comisiones ⁰ | leer | demo | sí | sí | sí |  | vendedores |
| comisiones ⁰ | crear | dev | sí | sí | sí |  |  |
| comisiones ⁰ | crear | admin | sí | sí | sí |  |  |
| comisiones ⁰ | crear | manager | no | no | sí |  |  |
| comisiones ⁰ | crear | user | sí | sí | sí |  | vendedores |
| comisiones ⁰ | crear | demo | no | no | sí |  |  |
| comisiones ⁰ | editar | dev | sí | sí | sí |  |  |
| comisiones ⁰ | editar | admin | sí | sí | sí |  | vendedores |
| comisiones ⁰ | editar | manager | no | no | sí |  |  |
| comisiones ⁰ | editar | user | sí | sí | sí |  | vendedores |
| comisiones ⁰ | editar | demo | no | no | sí |  | vendedores |
| comisiones ⁰ | eliminar | dev | sí | sí | sí |  |  |
| comisiones ⁰ | eliminar | admin | sí | sí | sí |  | vendedores |
| comisiones ⁰ | eliminar | manager | no | no | sí |  |  |
| comisiones ⁰ | eliminar | user | no | no | sí |  | vendedores |
| comisiones ⁰ | eliminar | demo | no | no | sí |  |  |
| legacySoloLectura ⁰ | leer | dev | sí | sí | sí |  |  |
| legacySoloLectura ⁰ | leer | admin | sí | sí | sí |  |  |
| legacySoloLectura ⁰ | leer | manager | sí | sí | sí |  |  |
| legacySoloLectura ⁰ | leer | user | sí | sí | sí |  |  |
| legacySoloLectura ⁰ | leer | demo | sí | sí | sí |  |  |
| legacySoloLectura ⁰ | crear | dev | no | no | sí |  |  |
| legacySoloLectura ⁰ | crear | admin | no | no | sí |  |  |
| legacySoloLectura ⁰ | crear | manager | no | no | sí |  |  |
| legacySoloLectura ⁰ | crear | user | no | no | sí |  |  |
| legacySoloLectura ⁰ | crear | demo | no | no | sí |  |  |
| legacySoloLectura ⁰ | editar | dev | no | no | sí |  |  |
| legacySoloLectura ⁰ | editar | admin | no | no | sí |  |  |
| legacySoloLectura ⁰ | editar | manager | no | no | sí |  |  |
| legacySoloLectura ⁰ | editar | user | no | no | sí |  |  |
| legacySoloLectura ⁰ | editar | demo | no | no | sí |  |  |
| legacySoloLectura ⁰ | eliminar | dev | no | no | sí |  |  |
| legacySoloLectura ⁰ | eliminar | admin | no | no | sí |  |  |
| legacySoloLectura ⁰ | eliminar | manager | no | no | sí |  |  |
| legacySoloLectura ⁰ | eliminar | user | no | no | sí |  |  |
| legacySoloLectura ⁰ | eliminar | demo | no | no | sí |  |  |
| historicoSoloLectura | leer | dev | sí | — | sin entrada |  | historico |
| historicoSoloLectura | leer | admin | sí | — | sin entrada |  | historico |
| historicoSoloLectura | leer | manager | no | — | sin entrada |  | historico |
| historicoSoloLectura | leer | user | sí | — | sin entrada |  | historico |
| historicoSoloLectura | leer | demo | sí | — | sin entrada |  | historico |
| historicoSoloLectura | crear | dev | no | — | sin entrada |  | historico |
| historicoSoloLectura | crear | admin | no | — | sin entrada |  | historico |
| historicoSoloLectura | crear | manager | no | — | sin entrada |  | historico |
| historicoSoloLectura | crear | user | no | — | sin entrada |  | historico |
| historicoSoloLectura | crear | demo | no | — | sin entrada |  | historico |
| historicoSoloLectura | editar | dev | no | — | sin entrada |  | historico |
| historicoSoloLectura | editar | admin | no | — | sin entrada |  | historico |
| historicoSoloLectura | editar | manager | no | — | sin entrada |  | historico |
| historicoSoloLectura | editar | user | no | — | sin entrada |  | historico |
| historicoSoloLectura | editar | demo | no | — | sin entrada |  | historico |
| historicoSoloLectura | eliminar | dev | no | — | sin entrada |  | historico |
| historicoSoloLectura | eliminar | admin | no | — | sin entrada |  | historico |
| historicoSoloLectura | eliminar | manager | no | — | sin entrada |  | historico |
| historicoSoloLectura | eliminar | user | no | — | sin entrada |  | historico |
| historicoSoloLectura | eliminar | demo | no | — | sin entrada |  | historico |
| numeradores ⁰ | leer | dev | sí | sí | sí |  |  |
| numeradores ⁰ | leer | admin | sí | sí | sí |  |  |
| numeradores ⁰ | leer | manager | no | no | sí |  |  |
| numeradores ⁰ | leer | user | sí | sí | sí |  |  |
| numeradores ⁰ | leer | demo | no | no | sí |  |  |
| numeradores ⁰ | crear | dev | sí | sí | sí |  |  |
| numeradores ⁰ | crear | admin | sí | sí | sí |  |  |
| numeradores ⁰ | crear | manager | no | no | sí |  |  |
| numeradores ⁰ | crear | user | sí | sí | sí |  |  |
| numeradores ⁰ | crear | demo | no | no | sí |  |  |
| numeradores ⁰ | editar | dev | sí | sí | sí |  |  |
| numeradores ⁰ | editar | admin | sí | sí | sí |  |  |
| numeradores ⁰ | editar | manager | no | no | sí |  |  |
| numeradores ⁰ | editar | user | sí | sí | sí |  |  |
| numeradores ⁰ | editar | demo | no | no | sí |  |  |
| numeradores ⁰ | eliminar | dev | no | no | sí |  |  |
| numeradores ⁰ | eliminar | admin | no | no | sí |  |  |
| numeradores ⁰ | eliminar | manager | no | no | sí |  |  |
| numeradores ⁰ | eliminar | user | no | no | sí |  |  |
| numeradores ⁰ | eliminar | demo | no | no | sí |  |  |
| logs ⁰ | leer | dev | sí | sí | sí |  | historico, registro-log |
| logs ⁰ | leer | admin | sí | sí | sí |  | historico, registro-log |
| logs ⁰ | leer | manager | no | no | sí |  | historico |
| logs ⁰ | leer | user | sí | sí | sí |  | historico, registro-log |
| logs ⁰ | leer | demo | sí | sí | sí |  | historico, registro-log |
| logs ⁰ | crear | dev | sí | sí | sí |  | historico, registro-log |
| logs ⁰ | crear | admin | sí | sí | sí |  | historico, registro-log |
| logs ⁰ | crear | manager | no | no | sí |  | historico |
| logs ⁰ | crear | user | sí | sí | sí |  | historico, registro-log |
| logs ⁰ | crear | demo | no | no | sí |  | historico, registro-log |
| logs ⁰ | editar | dev | sí | sí | sí |  | historico, registro-log |
| logs ⁰ | editar | admin | no | no | sí |  | historico, registro-log |
| logs ⁰ | editar | manager | no | no | sí |  | historico |
| logs ⁰ | editar | user | no | no | sí |  | historico, registro-log |
| logs ⁰ | editar | demo | no | no | sí |  | historico |
| logs ⁰ | eliminar | dev | sí | sí | sí |  | historico, registro-log |
| logs ⁰ | eliminar | admin | no | no | sí |  | historico, registro-log |
| logs ⁰ | eliminar | manager | no | no | sí |  | historico |
| logs ⁰ | eliminar | user | no | no | sí |  | historico, registro-log |
| logs ⁰ | eliminar | demo | no | no | sí |  | historico |
| papelera ⁰ | leer | dev | sí | sí | sí |  | historico, papelera |
| papelera ⁰ | leer | admin | sí | sí | sí |  | historico, papelera |
| papelera ⁰ | leer | manager | no | no | sí |  | historico |
| papelera ⁰ | leer | user | sí | no | **NO** |  | historico, papelera |
| papelera ⁰ | leer | demo | sí | no | **NO** |  | historico, papelera |
| papelera ⁰ | crear | dev | sí | sí | sí |  | historico, papelera |
| papelera ⁰ | crear | admin | sí | sí | sí |  | historico, papelera |
| papelera ⁰ | crear | manager | no | no | sí |  | historico |
| papelera ⁰ | crear | user | sí | sí | sí |  | historico, papelera |
| papelera ⁰ | crear | demo | no | no | sí |  | historico, papelera |
| papelera ⁰ | editar | dev | sí | sí | sí |  | historico, papelera |
| papelera ⁰ | editar | admin | sí | no | **NO** |  | historico, papelera |
| papelera ⁰ | editar | manager | no | no | sí |  | historico |
| papelera ⁰ | editar | user | no | no | sí |  | historico, papelera |
| papelera ⁰ | editar | demo | no | no | sí |  | historico, papelera |
| papelera ⁰ | eliminar | dev | sí | sí | sí |  | historico, papelera |
| papelera ⁰ | eliminar | admin | sí | sí | sí |  | historico, papelera |
| papelera ⁰ | eliminar | manager | no | no | sí |  | historico |
| papelera ⁰ | eliminar | user | no | no | sí |  | historico, papelera |
| papelera ⁰ | eliminar | demo | no | no | sí |  | historico, papelera |

## 5. Desajustes de conjunto

**Módulos de `permitido()` sin entrada en `ModuloReglas`** (3): `desarrollo`,
`vencimientos`, `historicoSoloLectura`.

**Entradas de `ModuloReglas` que no existen en `permitido()`** (1): `usuarios` (deliberada;
su regla real es el `match /users/{uid}`).

**`AccionPermiso` sin entrada en `mapaAccionCrud`**: ninguna. **Entradas de
`mapaAccionCrud` que no son `AccionPermiso`**: ninguna. El tipo
`Record<AccionPermiso, AccionCrud>` hace que las dos cosas sean error de compilación.

**`ModuloPermiso` sin entrada en `mapaModuloReglas`** (1): `usuarios`, excluido por tipo
(`Exclude<ModuloPermiso,'usuarios'>`) y resuelto por la rama propia de `puede()`.
**Entradas de `mapaModuloReglas` que no son `ModuloPermiso`**: ninguna (también por tipo).

**Entradas de `matrizBase` inalcanzables** (no pedido, pero sale del cruce anterior): de los
17 `ModuloReglas`, `puede()` sólo llega a 7 (`entidades`, `legajos`, `vendedores`,
`operaciones`, `finanzas`, `configuracion` por el mapa; `usuarios` por su rama). Los otros
**10** no tienen ningún `ModuloPermiso` que los apunte: `asignaciones`, `tarifas`,
`tarifasHistorial`, `informesOp`, `resumenes`, `comisiones`, `legacySoloLectura`,
`numeradores`, `logs`, `papelera`. Son **200 de los 340 booleanos** de `matrizBase`. Las 3
celdas que no coinciden con `permitido()` están todas en esa parte.

**`ModuloPermiso` que consultan un módulo distinto del que escriben sus gestos** (no
pedido; dos casos vistos al trazar los overrides, no es un barrido):
- `reportes` → `finanzas`, mientras la colección de Reportes (`resumenesOp`) es del módulo
  `resumenes`.
- `operaciones.limpiarTablero` → `operaciones · eliminar`, mientras el gesto borra en
  `asignaciones` (de ahí el override).

## 6. Colecciones usadas por el código y ausentes de `moduloDe()`

**Ninguna.** Todo path que el código de `src/app` arma bajo `/Vantruck/datos/` resuelve a
una colección mapeada o a `_backup_*`. Fuera de ese árbol, el código usa sólo `users`
(`GestionUsuariosService.obtenerUsuarios`, `UsuarioSesionService` en la reconciliación), que
tiene su propio `match`.

Cómo se barrió:
- Los métodos de `DbFirestoreService` reciben la colección como string y la anteponen con
  `/Vantruck/datos/`; se extrajeron los literales pasados como primer argumento a cada
  método, los asignados a constantes (`COLECCION`, `COL_*`, `COLECCION_*`, `static readonly
  COLECCION`) y los campos `coleccion:` de las `EscrituraBatch`.
- Paths armados fuera de `DbFirestoreService`: `LogRegistroService` (`registroLog`),
  `NumeradorService` (`numeradores`), `GestionUsuariosService` y `UsuarioSesionService`
  (`users`), los servicios de `servicios/migracion/` (`choferes`, `vehiculos`, `legajos`,
  `clientes`, `proveedores`, `operaciones`, `categoriasDocumentacion`, las tarifas viejas,
  `_backup_*`) y la lista de `LimpiezaDemoService`.
- Control: se tomaron todos los literales camelCase de las líneas que mencionan
  colección/Firestore/`db` y se restaron las 75 claves de `moduloDe()`. Lo que queda son
  nombres de campo, acciones y modos (`idChofer`, `reemplazar`, `vigente`, …), más `users`.

Colecciones usadas, por origen:

| Uso | Colecciones |
|---|---|
| Código de la app | `clientes`, `choferes`, `proveedores`, `vehiculos`, `legajos`, `categoriasDocumentacion`, `documentacionHistorial`, `vencimientos`, `vendedores`, `liquidacionesVenta`, `comisionesVenta`, `operaciones`, `asignaciones`, `noDisponibilidades`, `tarifas`, `tarifasEspeciales`, `registrosOpEventuales`, `informesOp`, `informesLiq`, `informesLiqSnapshots`, `facturasVinculadas`, `movimientosFin`, `resumenesOp`, `numeradores`, `configuracion`, `registroLog`, `logs`, `papeleraEventos`, `objetosEliminados` |
| Sólo herramientas de `/migracion` (`servicios/desarrollo/`, `servicios/migracion/`) | `generacionesPrueba`, `informesVenta`, `resumenOpMensual`, `movimientos`, `resumenFinanzas`, `tarifasGralCliente`, `tarifasEspCliente`, `tarifasPersCliente`, `tarifasGralChofer`, `tarifasEspChofer`, `tarifasGralProveedor`, `tarifasEspProveedor`, `tarifasEventuales`, las 7 `historialTarifas*`, `_backup_*` |

Al revés (no pedido, para el mapa completo): colecciones de `moduloDe()` que **ningún**
código de `src/app` lee ni escribe: las 16 de `legacySoloLectura`, las 8 heredadas de
`finanzas` (`resumenLiq`, `proforma`, `informesOpClientes`, `informesOpChoferes`,
`informesOpProveedores`, `infOpLiqClientes`, `infOpLiqChoferes`, `infOpLiqProveedores`) y
`noOperativo`. Las Cloud Functions usan Admin SDK y no pasan por estas reglas.

## 7. Cobertura de los tests de emulador

Los tests son scripts manuales (`node functions/test-*.mjs` con el emulador levantado), no
corren en CI. Todos crean usuarios con `setCustomUserClaims({ role })` y operan con el SDK
cliente, que sí evalúa las reglas.

### Por script

| Script | Módulo (colecciones) | Roles × acciones afirmados | Aserciones | de ellas, rechazo | Celdas de §4 |
|---|---|---|---|---|---|
| `test-asignaciones-rules.mjs` | `asignaciones` | user: crear, leer, eliminar · admin: crear, eliminar · demo: leer✗, crear✗ | 6 | 2 | 7 |
| `test-cierre-rules.mjs` | `informesOp` | user: crear, leer, editar✗, eliminar✗ · demo: leer, crear✗ · admin: editar, eliminar | 8 | 3 | 8 |
| | `resumenes` (`resumenesOp`) | user: crear, editar, leer✗, eliminar✗ · demo: leer, editar✗ · admin: leer, eliminar | 8 | 3 | 8 |
| `test-historico-rules.mjs` | `historicoSoloLectura` (`logs`, `papelera`) | 5 roles × 4 acciones, en las dos colecciones | 40 | 32 | 20 |
| | `logs` (`registroLog`) | 5 roles × 4 acciones | 20 | 11 | 20 |
| | `papelera` (`papeleraEventos`, `objetosEliminados`) | 5 roles × 4 acciones, en las dos colecciones | 40 | 18 | 20 |
| `test-papelera-rules.mjs` | `papelera` (`papeleraEventos`, `objetosEliminados`) | dev/admin/user/demo × 4 (sin manager), en las dos | 32 | 10 | 16 |
| `test-registro-log-rules.mjs` | `logs` (`registroLog`) | dev/admin/user × 4 · demo: leer, crear✗ | 14 | 5 | 14 |
| `test-legajos-rules.mjs` | `legajos` (`legajos`, `categoriasDocumentacion`, `documentacionHistorial`) | user: crear, leer, editar, eliminar✗ · demo: leer, crear✗ · admin: crear, eliminar · dev: crear | 17 | 4 | 9 |
| `test-vencimientos-rules.mjs` | `vencimientos` | dev/admin/user/demo: leer, crear✗ | 8 | 4 | 8 |
| `test-vendedores-rules.mjs` | `comisiones` (`comisionesVenta`) | user: crear, editar, leer✗, eliminar✗ · admin: leer, editar, eliminar · demo: leer, editar✗ | 9 | 3 | 9 |
| | `vendedores` (`liquidacionesVenta`, `vendedores`) | user: crear✗, leer✗ (leer en las dos colecciones) · admin: crear, editar, eliminar · demo: leer, editar✗ | 8 | 4 | 7 |

(✗ = el caso espera rechazo. "Aserciones" cuenta llamadas a `reportar`. Una aserción de
admin en `asignaciones` y una en `legajos` prueban crear y eliminar juntas: una aserción, dos
celdas. Varias celdas se afirman en más de una colección o en más de un script; la última
columna cuenta celdas distintas por fila, y el total sin repetir está abajo.)

Otros scripts que tocan reglas sin ser de reglas: `test-emulator.mjs` (vendedores: crear de
user ✗ y de admin; más el sync de claims), `test-logout-orden.mjs` (`registroLog`: crear de
user y admin, y el rechazo sin autenticar), `test-auth-log-registro.mjs` y
`test-gestion-usuarios-log.mjs` (escriben y consultan `registroLog` como paso intermedio, no
lo afirman como permiso). `test-gestion-usuarios.mjs`, `test-functions-region.mjs`,
`test-registro-log-paginacion.mjs` y `test-vencimientos-scheduler.mjs` usan Admin SDK o
Functions y no ejercen `permitido()`. Ninguna celda que afirman estos scripts queda fuera de
las que ya afirman los de reglas.

### Celdas cubiertas

Celdas de la tabla de §4 afirmadas por al menos un test de reglas:

| Módulo | Cubiertas / 20 |
|---|---|
| `historicoSoloLectura`, `logs`, `papelera` | 20 cada uno |
| `legajos`, `comisiones` | 9 cada uno |
| `vencimientos`, `informesOp`, `resumenes` | 8 cada uno |
| `vendedores`, `asignaciones` | 7 cada uno |
| `desarrollo`, `configuracion`, `entidades`, `operaciones`, `tarifas`, `tarifasHistorial`, `finanzas`, `legacySoloLectura`, `numeradores` | **0** |

- **116 de 380 celdas (30,5 %)**. De ellas, 60 afirman un permiso y 56 un rechazo.
- Sobre las 320 celdas comparables con `matrizBase`: **88 (27,5 %)**.
- Nueve módulos no tienen ninguna celda afirmada, entre ellos `entidades`, `operaciones` y
  `finanzas`, que son los que `puede()` más consulta.
- `manager`: 12 celdas afirmadas, todas rechazos (en `historicoSoloLectura`, `logs` y
  `papelera`). Su único permiso real (`legacySoloLectura · leer`) no se prueba.

### Los casos que esperan rechazo

**Sí distinguen "denegó" de "falló por otra cosa":** todos los scripts de reglas cuentan un
rechazo como PASS sólo si `err.code === "permission-denied"`; cualquier otro error (red,
`not-found`, excepción del script) es FAIL. Si la operación se ejecuta sin error, también es
FAIL ("se permitió y no debía").

**No distinguen por qué denegó.** `permission-denied` sale igual cuando la celda de la
matriz dice no que cuando:
- el token no trae el claim `role` (`setCustomUserClaims` no llegó o el refresh del token no
  lo tomó): `rol()` falla o no coincide con ninguna rama, y toda la evaluación da no;
- la colección no está en `moduloDe()`.

En los dos casos todos los rechazos pasarían. Lo que lo controla en la práctica es que el
mismo rol, en la misma corrida, tenga algún caso positivo: si el claim faltara, ese positivo
fallaría. Ningún script de reglas afirma el claim del token (algunos lo imprimen;
`test-emulator.mjs` es el único que lo afirma). Rechazos sin ningún positivo del mismo rol
en la misma corrida:
- **`manager`**, en `test-historico-rules.mjs`: sus 12 celdas son todas rechazos y no tiene
  ningún positivo en ningún script.
- **`demo`**, en `test-asignaciones-rules.mjs`: sus 2 celdas (`leer`, `crear`) son rechazos y
  el script no le prueba nada permitido. Ningún otro script toca `asignaciones`.

Esas **14 celdas** pasarían igual si el claim del rol no llegara al token. En el resto de los
scripts, cada rol con rechazos tiene también al menos un positivo en la misma corrida.

**Dependencia del estado del emulador** (create contra update). Firestore evalúa un `setDoc`
como `create` si el documento no existe y como `update` si existe. Varios scripts usan ids
fijos y no borran todo lo que crean:
- `test-emulator.mjs`: `vendedores/testDoc` no se borra nunca.
- `test-legajos-rules.mjs`: `legajos/testLegajoUser` sobrevive (el borrado de `user` es el
  caso que espera rechazo), igual que los docs de `categoriasDocumentacion` y
  `documentacionHistorial`.
- `test-asignaciones-rules.mjs`: `asignaciones/testBorradorParaDemo` no se borra.

Si el emulador no se reinicia entre corridas (o arranca con `--import`), la segunda corrida
prueba `editar` donde el nombre del caso dice `crear` (incluido el "CASO DEL FIX" de
`legajos · crear · user`). `test-historico-rules`, `test-papelera-rules` y
`test-registro-log-rules` usan un `runId` por corrida y no tienen este problema;
`test-cierre-rules` y `test-vendedores-rules` borran lo suyo al final, salvo que la corrida
se corte antes.

**Sin verificación de cantidad de casos.** Ningún script compara cuántos casos corrió
contra cuántos esperaba: un bucle que no itera termina en "0 PASS / 0 FAIL" con código 0.

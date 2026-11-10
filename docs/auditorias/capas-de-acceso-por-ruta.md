# Auditoría — capas de acceso por ruta, listeners del arranque y esRol() sueltos

Fecha: 2026-11-10 · Rama: refactor (`2d68ca8`)

## Alcance

Se relevó:

1. Todas las declaraciones de ruta: `app-routing`, `raiz-routing`, `desarrollo-routing` y los
   doce `*-routing` de feature.
2. Por ruta, cinco capas: `canMatch`, `canActivate`, `redirectTo`, sidebar y reglas (qué
   colecciones lee la pantalla al abrirse y a qué módulo de `moduloDe()` mapean).
3. Todo lo que dispara `HomeComponent.ngOnInit`, y cuáles listeners pasan por
   `SesionInvalidaService.vigilar()`.
4. Tres barridos de gating de UI por símbolo: `esRol(`, `*appPermiso` y los inputs
   `modulo=`/`accion=`. Se agregó un cuarto, de comparaciones de rol crudas (`.role ===`,
   `['dev','admin'].includes(usuario.role)`, `getRol() !==`), porque el barrido de `esRol(`
   solo no muestra todo el gating por rol.
5. Los `ngClass` y `disabled` que dependen del rol.

**Cómo se usó `permitido()`.** Para saber si la capa de reglas admite un rol solo se miró la
acción `leer` de cada módulo (tabla "Referencia — `leer` por módulo"). No se resolvió
rol × acción celda por celda: eso es de la auditoría hermana de la matriz.

**Fuera de alcance** (por instrucción): `permitido()` y `matrizBase` celda por celda, la
cobertura de los tests de emulador, el frente de UX (`/carga`, preferencias por uid) y el
CHANGELOG. No se tocó código.

**Método.** El relevamiento de las colecciones por pantalla y la cascada del arranque lo
hicieron subagentes `Explore`. Después se verificaron contra el código el `ngOnInit` de
`HomeComponent`, los 11 llamadores de `vigilar()`, los `NgbActiveModal` de las rutas `alta`
y las pestañas de `AjustesControlComponent`. Los barridos de símbolo, el routing, el
sidebar, `RoleGuard`, `PermisosService` y `firestore.rules` se leyeron directo.

## Contradicciones con la documentación vigente

1. **CLAUDE.md, "Ruteo": "`RoleGuard`: `canMatch` en las rutas de `raiz-routing` […] y
   `canActivate` en las rutas internas de cada módulo."** El código no lo sostiene: hay
   **8** `canActivate` en todo el routing. Son las 5 hijas de `ajustes-routing` y las 3 rutas
   `alta` (choferes, clientes y proveedores). Las rutas internas de `finanzas-nueva`,
   `legajos`, `liquidacion`, `nueva-facturacion`, `operaciones`, `reportes`, `tarifas`,
   `vendedores` y `desarrollo` no tienen `canActivate`; tampoco `listado` en
   choferes/clientes/proveedores. Esas rutas heredan solo el `canMatch` del padre.

2. **Skill `botones-y-permisos`, "Cierre del frente": las capas Presentación y Consumidores
   siguen nombrando `AccionGenericaComponent`, `InformesTablaComponent` e
   `InformesAccionesCellComponent`.** Ninguno de los tres existe hoy. Tampoco existen los
   consumidores migrados que lista el cierre: `proforma`, `liquidaciones-op`,
   `facturacion-listado`, `facturacion-historico` y `nueva-facturacion/modal-detalle`. En
   `shared/botones/` quedan solo `btn-agregar`, `btn-editar`, `btn-eliminar` y `btn-leer`.
   Un grep de `AccionGenerica|accion-generica|InformesTabla|informes-acciones-cell` en
   `src/app` da cero resultados.
   - Por eso el barrido 4c (inputs sobre `app-accion-generica`) da **0**: el selector no
     existe.
   - Lo que hoy cumple ese papel es `TablaListadoComponent`, con el campo `permiso` de las
     acciones de `interfaces/tabla-listado.ts`. Ver el barrido 4d.

3. **Skill `botones-y-permisos`, Bloque 6 sub-bloque 4: "El resto de los `<li>` del sidebar
   (clientes, choferes, proveedores, operaciones, liquidación, legajos, vendedores,
   migración) quedan sin gating — protegidos por `RoleGuard`".** El `<li>` de Migración sí
   tiene gate: `@if ($usuario.role === 'dev')` en `sidebar.component.html`, una comparación
   de rol cruda sin `esRol` ni `PermisosService`. Además, la lista de la skill no menciona
   Tarifas, que tampoco tiene gate en el sidebar.

4. **CLAUDE.md, "Deuda abierta" → "Listeners fuera de la red de sesión inválida":
   "`VendedorService.init` y `AsignacionService.cargarFecha` no pasan por
   `SesionInvalidaService.vigilar()`".** Esos dos son ciertos, pero la lista está incompleta.
   Tampoco pasan por `vigilar()`:
   - `VencimientosComponent.ngOnInit` (`getAllStateChanges('vencimientos')`);
   - `RegistroComponent.consultarRegistro` (`logs`);
   - `AsignacionService.getTableroPorFecha`;
   - los listeners de `FinanzasConsultaService` (`observarInformesAbiertos`,
     `observarMovimientosConSaldo`, `observarMovimientosPorFecha`,
     `observarCuentaEntidad`, `observarFacturadosPorFechaFactura`);
   - `InformeLiqConsultaService.observarPorEstado`;
   - `InformeLiqService.observarBorradores`;
   - `InformeOpService.observarPorPeriodo` / `observarAnuladosPorPeriodo`;
   - `LiquidacionVentaService.observarPorPeriodos`;
   - `ComisionVentaConsultaService.observarDelMes` / `observarPendientes`;
   - `ResumenOpConsultaService.observar`.

   Los 11 usos de `vigilar()` están en 7 servicios: `ChoferService.init` (×2),
   `ProveedorService.init`, `ClienteService.init`, `TarifarioService.init` (×3),
   `CategoriaDocumentacionService.init`, `LegajoService.init`, `NoDisponibilidadService.init`
   y `OperacionService.cargarOperaciones`.

5. **Skill `botones-y-permisos`, deuda "`manager` sin lectura en lo que abre", y
   `docs/disenos/eje-de-sesion.md`: "Los nueve listeners que abre `HomeComponent.ngOnInit`".**
   Es exacto **solo para `manager`**. `HomeComponent.ngOnInit` abre 9 listeners siempre y un
   décimo (`noDisponibilidades`) bajo `PermisosService.puede('operaciones')`. Ese décimo se
   abre para `dev`/`admin`/`user`/`demo`, que tienen **10**. (La frase no está en CLAUDE.md:
   está en la skill y en el diseño.)

6. **`PermisosService.mapaModuloReglas`**, comentario "incluye resumenOpMensual→'finanzas'
   para Reportes". El código hoy no lo sostiene: `reportes` mapea a `'finanzas'`, pero las
   pantallas de Reportes leen `resumenesOp`, que en `moduloDe()` es `'resumenes'`. En `leer`
   los dos módulos dan los mismos roles (`dev`/`admin`/`demo`), así que hoy no hay efecto
   visible. El mapeo apunta a un módulo de reglas que la pantalla no lee.

7. **Premisa de la instrucción: "separá los usos legítimos (RoleGuard, …)" de `esRol(`.**
   `RoleGuard` no llama a `esRol`. `RoleGuard.chequearAcceso` compara directo:
   `rolesEsperados.includes(usuario.role)`. CLAUDE.md lo describe bien ("comparación plana
   contra `usuario.role`"); la que no se sostiene es la premisa.

8. **Skill `botones-y-permisos`, Bloque 6 sub-bloque 4: "`vendedores-listado` (único de los
   4 con layout de cards, no `TablaGenericaComponent`)"**, con Editar/Eliminar de cada card
   conectados a `modulo="vendedores"`. Hoy `vendedores-listado.component.html` usa
   `<app-tabla-generica … modulo="vendedores">`, sin cards. El gating sigue existiendo, pero
   por `TablaAccionesComponent`.

Verificadas y **sí sostenidas**:
- La deuda "Criterio de acceso de `demo` al módulo Ajustes": las cinco capas están como dice.
  Ver la fila de Ajustes; se suma un dato, el de la pestaña Registro.
- "Los catálogos que sólo inicia `HomeComponent` (Choferes, Proveedores, Clientes, Tarifario,
  CategoríaDocumentación, Legajos)": no tienen otro llamador de `init()`.
- La lista de 7 sitios `esRol()` pendientes, **como lista de llamadas a `esRol(`**. Ver
  barrido 4a: está completa para el símbolo, pero no para el gating por rol.

## Inventario de archivos

| Archivo | Tipo | Rol |
|---|---|---|
| `src/app/app-routing.module.ts` | routing | rutas sin auth, compat `/raiz`, `''` lazy a `RaizModule`, `'**'` |
| `src/app/raiz/raiz-routing.module.ts` | routing | shell `HomeComponent` + 13 `loadChildren` con `canMatch` |
| `src/app/componentes/desarrollo-routing.module.ts` | routing | `/migracion` |
| `src/app/raiz/*/*-routing.module.ts` (12) | routing | rutas internas de cada feature |
| `src/app/guards/role.guard.ts` | guard | `RoleGuard.canMatch` / `canActivate` → `chequearAcceso` |
| `src/app/raiz/sidebar/sidebar.component.html` / `.ts` | componente | puertas del menú |
| `src/app/raiz/home/home.component.ts` | componente | `ngOnInit`: arranque |
| `src/app/servicios/permisos/permisos.service.ts` | servicio | `puede`, `matrizBase`, `mapaModuloReglas`, `overrides` |
| `src/app/shared/directives/permiso.directive.ts` | directiva | `*appPermiso` |
| `src/app/shared/tabla/tabla-listado/tabla-listado.component.ts` | componente | gating por campo `permiso` de la acción |
| `src/app/servicios/usuario-sesion/sesion-invalida.service.ts` | servicio | `vigilar()` |
| `firestore.rules` | reglas | `moduloDe()`, `permitido()`, `match /users/{uid}` |

## 1. Declaraciones de ruta

**87 declaraciones** (objetos con `path:`), por archivo:

| Archivo | Rutas |
|---|---|
| `app-routing` | 9 |
| `raiz-routing` | 15 |
| `desarrollo-routing` | 1 |
| `ajustes-routing` | 7 |
| `choferes-routing` | 4 |
| `clientes-routing` | 4 |
| `finanzas-nueva-routing` | 7 |
| `legajos-routing` | 6 |
| `liquidacion-routing` | 5 |
| `nueva-facturacion-routing` | 5 |
| `operaciones-routing` | 4 |
| `proveedores-routing` | 4 |
| `reportes-routing` | 4 |
| `tarifas-routing` | 7 |
| `vendedores-routing` | 5 |

Por tipo:

| Tipo | Cantidad |
|---|---|
| Pantallas hoja de feature | 39 |
| `redirectTo` | 16 |
| Shells (`HomeComponent` + 12 `*-control`) | 13 |
| `loadChildren` | 14 |
| Rutas sueltas de `app-routing` (`carga`, `login`, `forgot-password`, `limbo`, `'**'`) | 5 |

`canMatch`: 13, todos en `raiz-routing`. `canActivate`: 8, ver la contradicción 1. El
`path: ''` de `HomeComponent` en `raiz-routing` no tiene guard propio: lo protegen los
`canMatch` de sus hijas.

### Referencia — `leer` por módulo de `permitido()`

Solo `leer`, para comparar capas. No es la resolución de la matriz.

| Módulo | `leer` |
|---|---|
| `entidades`, `legajos`, `operaciones`, `informesOp`, `tarifas`, `tarifasHistorial`, `configuracion`, `vencimientos`, `logs`, `papelera`, `historicoSoloLectura` | dev · admin · user · demo |
| `finanzas`, `vendedores`, `resumenes`, `comisiones` | dev · admin · demo |
| `asignaciones`, `numeradores` | dev · admin · user |
| `desarrollo` | dev |
| `legacySoloLectura` | todos, incluido manager |
| `/users/{uid}` (match propio, fuera de `moduloDe()`) | dev · admin, o el propio uid |

`manager` no lee ningún módulo salvo `legacySoloLectura`, y ninguna pantalla lee
colecciones de `legacySoloLectura` al abrirse.

## 2. Tabla central

Abreviaturas de rol: **d** dev · **a** admin · **m** manager · **u** user · **x** demo.

"Sidebar" es la expresión que gatea el `<li>`; para los `*appPermiso` va también el rol que
resulta de `PermisosService.puede`. "Sin puerta" significa que ningún enlace del sidebar ni
del shell lleva a la ruta. Las pestañas de los shells navegan todas con
`(click)="selectTab(...)"` → `router.navigate`, sin `routerLink`.

Para los datos que la pantalla toma de un servicio cargado al arranque, la colección va con
el sufijo "(arr.)": la pantalla no abre una lectura nueva, pero el dato salió de esa
colección.

### app-routing

| Ruta | canMatch | canActivate | redirectTo | Sidebar | Reglas (al abrir) |
|---|---|---|---|---|---|
| `''` | — | — | `/login` | — | — |
| `raiz` (full) | — | — | `/op` (admite d·a·m·u·x) | — | — |
| `raiz` (prefijo) | — | — | `''` | — | — |
| `carga` | — | — | (navega a `op` a los 3 s en código) | — | ninguna |
| `login` | — | — | — | — | ninguna propia (`/users/{uid}` lo lee `UsuarioSesionService.leerUsuario`, global) |
| `forgot-password` | — | — | — | — | ninguna |
| `limbo` | — | — | — | — | ninguna |
| `''` → `RaizModule` | — | — | — | — | (arranque, sección 3) |
| `'**'` | — | — | — | — | ninguna |

### raiz-routing (padres de feature)

| Ruta | canMatch | Sidebar | Módulos que leen sus pantallas |
|---|---|---|---|
| `''` `HomeComponent` | — | — | arranque (sección 3) |
| `''` → `op` | — | — | — |
| `clientes` | d·a·m·u·x | sin gate (todos) | entidades |
| `choferes` | d·a·m·u·x | sin gate (todos) | entidades |
| `op` | d·a·m·u·x | sin gate (todos); también el logo | operaciones, asignaciones, entidades (arr.), tarifas (arr.) |
| `proveedores` | d·a·m·u·x | sin gate (todos) | entidades |
| `liquidacion` | d·a·m·u·x | sin gate (todos) | operaciones, informesOp, finanzas |
| `legajos` | d·a·m·u·x | sin gate (todos) | legajos, entidades (arr.), vencimientos |
| `ajustes` | d·a·x | `*appPermiso="'usuarios.ver'"` → d·a | /users, logs, papelera, configuracion |
| `nuevaFacturacion` | d·a·x | `*appPermiso="'facturacion.ver'"` → finanzas.leer → d·a·x | finanzas |
| `vendedores` | d·a·x | sin gate (todos) | vendedores, comisiones, entidades (arr.) |
| `tarifas` | d·a·u·x | sin gate (todos) | tarifas (arr.), entidades (arr.) |
| `finanzas` | d·a·x | `*appPermiso="'finanzas.ver'"` → d·a·x | finanzas, entidades |
| `reportes` | d·a·x | `*appPermiso="'reportes.ver'"` → finanzas.leer → d·a·x | resumenes, entidades (arr.) |
| `migracion` | d | `@if ($usuario.role === 'dev')` → d | vendedores (ver Migración) |

### Pantallas hoja

Las columnas son las mismas de arriba. Admisión efectiva = `canMatch` del padre ∩
`canActivate` propio.

#### Ajustes (`AjustesControlComponent`)

- Pestañas: Usuarios, Registro Log, Papelera, Datos de la empresa.
- La pestaña "Registro" está comentada en el template inline. La ruta sigue en el array
  `tabs`.
- El shell no lee nada.

| Ruta | canMatch | canActivate | redirectTo | Sidebar | Reglas (al abrir) |
|---|---|---|---|---|---|
| `ajustes/''` | d·a·x | — | → `usuarios` (d·a): **demo cae en `/limbo`** | d·a | — |
| `ajustes/usuarios` | d·a·x | d·a | — | d·a | `/users` (`GestionUsuariosService.obtenerUsuarios`, getDocs) → match `/users` |
| `ajustes/registro` | d·a·x | d·a·x | — | **sin puerta** (pestaña comentada, menú solo d·a) | `/users` solo si `esRol('dev','admin')` (`UsuariosConsultaService.leer`); `logs` solo por clic (`consultarRegistro`) → historicoSoloLectura |
| `ajustes/registro-log` | d·a·x | d·a·x | — | d·a (demo sin puerta) | `registroLog` → logs (`RegistroLogConsultaService.cargarPagina` → `getPaginado`); `/users` si d·a |
| `ajustes/papelera` | d·a·x | d·a·x | — | d·a (demo sin puerta) | `papeleraEventos` → papelera (`PapeleraConsultaService.cargarPagina`; con `?evento=`, `obtenerEvento`); `/users` si d·a |
| `ajustes/empresa` | d·a·x | d·a·x | — | d·a (demo sin puerta) | `configuracion/empresa` → configuracion (`ConfiguracionEmpresaService.obtener(true)` → `getById`) |

#### Choferes, Clientes, Proveedores (`*ControlComponent`)

- Una sola pestaña, "Alta/Listado", con `route: '<x>/listado'` y `alias: ['<x>/alta']`.
- Ningún enlace navega a `alta`.

| Ruta | canMatch | canActivate | redirectTo | Sidebar | Reglas (al abrir) |
|---|---|---|---|---|---|
| `choferes/''`, `clientes/''`, `proveedores/''` | d·a·m·u·x | — | → `listado` (mismos roles) | todos | — |
| `choferes/alta`, `clientes/alta`, `proveedores/alta` | d·a·m·u·x | **d·a·m** | — | **sin puerta** | no confirmado (ver Preguntas abiertas: el componente inyecta `NgbActiveModal`) |
| `choferes/listado` | d·a·m·u·x | — | — | todos | choferes, vehiculos, proveedores (arr.) → entidades |
| `clientes/listado` | d·a·m·u·x | — | — | todos | clientes (arr.) → entidades |
| `proveedores/listado` | d·a·m·u·x | — | — | todos | choferes, proveedores (arr.) → entidades |

#### Finanzas (`FinanzasNuevaControlComponent`)

Sin gate en las pestañas.

| Ruta | canMatch | canActivate | redirectTo | Sidebar | Reglas (al abrir) |
|---|---|---|---|---|---|
| `finanzas/''` | d·a·x | — | → `resumen` | d·a·x | — |
| `finanzas/resumen` | d·a·x | — | — | d·a·x | `informesLiq` ×2, `movimientosFin` ×2, `informesLiq` por `factura.fecha` → finanzas (`FinanzasConsultaService.observarBaseCuentas`, `observarMovimientosPorFecha`, `observarFacturadosPorFechaFactura`) |
| `finanzas/cuentas` | d·a·x | — | — | d·a·x | `informesLiq`, `movimientosFin` → finanzas (`observarCuentas`) |
| `finanzas/antiguedad` | d·a·x | — | — | d·a·x | ídem → finanzas |
| `finanzas/movimientos` | d·a·x | — | — | d·a·x | `movimientosFin` → finanzas (`observarMovimientosPorFecha`) |
| `finanzas/cuenta/:tipo/:id` | d·a·x | — | — | d·a·x (vía pestaña Cuentas) | `informesLiq`, `movimientosFin` → finanzas (`observarCuentaEntidad`); sin movimientos, `clientes`/`choferes`/`proveedores/{id}` → entidades (`obtenerEntidad` → `getById`) |

#### Legajos (`ControlComponent`)

- La pestaña "Cargar Documentos" lleva `[ngClass]="{ isDisabled: usuarioSesion.esRol('demo') }"`
  (`pointer-events: none`).
- Las otras tres pestañas no tienen gate.

| Ruta | canMatch | canActivate | redirectTo | Sidebar | Reglas (al abrir) |
|---|---|---|---|---|---|
| `legajos/''` | d·a·m·u·x | — | → `tablero` | todos | — |
| `legajos/tablero` | d·a·m·u·x | — | — | todos | choferes, proveedores (arr.) → entidades; legajos, categoriasDocumentacion (arr.) → legajos |
| `legajos/consulta` | d·a·m·u·x | — | — | todos | choferes (arr.) → entidades; legajos (arr.) → legajos |
| `legajos/cargarDoc` | d·a·m·u·x | — | — | todos; **pestaña inhabilitada para demo** | choferes (arr.) → entidades; categoriasDocumentacion (arr.) → legajos |
| `legajos/vencimientos` | d·a·m·u·x | — | — | todos | `vencimientos` → vencimientos (listener propio en `VencimientosComponent.ngOnInit`) |

#### Liquidación (`LiqGralComponent`)

Sin gate en las pestañas.

| Ruta | canMatch | canActivate | redirectTo | Sidebar | Reglas (al abrir) |
|---|---|---|---|---|---|
| `liquidacion/''` | d·a·m·u·x | — | → `informes` | todos | — |
| `liquidacion/informes` | d·a·m·u·x | — | — | todos | `operaciones` → operaciones (`OperacionService.observarAbiertasPorPeriodo`); `informesOp` → informesOp (`InformeOpService.observarPorPeriodo`) |
| `liquidacion/borradores` | d·a·m·u·x | — | — | todos | `informesLiq` → **finanzas** (`InformeLiqService.observarBorradores`) |
| `liquidacion/anulados` | d·a·m·u·x | — | — | todos | `informesOp` → informesOp (`InformeOpService.observarAnuladosPorPeriodo`) |

#### Facturación (`ControlComponent` de nueva-facturacion)

Sin gate en las pestañas.

| Ruta | canMatch | canActivate | redirectTo | Sidebar | Reglas (al abrir) |
|---|---|---|---|---|---|
| `nuevaFacturacion/''` | d·a·x | — | → `emitidos` | d·a·x | — |
| `nuevaFacturacion/emitidos` | d·a·x | — | — | d·a·x | `informesLiq` → finanzas (`InformeLiqConsultaService.observarPorEstado`) |
| `nuevaFacturacion/facturados` | d·a·x | — | — | d·a·x | `informesLiq` → finanzas (`consultarPorPeriodo`) |
| `nuevaFacturacion/revertidos` | d·a·x | — | — | d·a·x | `informesLiq` → finanzas (`consultarPorPeriodo`) |

#### Operaciones (`OpControlComponent`)

Sin gate en las pestañas.

| Ruta | canMatch | canActivate | redirectTo | Sidebar | Reglas (al abrir) |
|---|---|---|---|---|---|
| `op/''` | d·a·m·u·x | — | → `tablero` | todos | — |
| `op/tablero` | d·a·m·u·x | — | — | todos | `operaciones` → operaciones (`OperacionService.cargarOperaciones` → `getAllByDateValue`, con `vigilar()`) |
| `op/asignaciones` | d·a·m·u·x | — | — | todos | tarifas, clientes, choferes, vehiculos, proveedores (arr.); `noDisponibilidades` → operaciones (`NoDisponibilidadService.init`, idempotente); `asignaciones/{fecha}` → **asignaciones**, solo si `AsignacionService.getUltimaFechaVista()` no es null (`cargarTablero` → `getTableroPorFecha`; si está asignado, `cargarFecha`) |

#### Reportes (`ReportesControlComponent`)

Sin gate en las pestañas.

| Ruta | canMatch | canActivate | redirectTo | Sidebar | Reglas (al abrir) |
|---|---|---|---|---|---|
| `reportes/''` | d·a·x | — | → `opGeneral` | d·a·x | — |
| `reportes/opGeneral` | d·a·x | — | — | d·a·x | `resumenesOp` → resumenes (`ResumenOpConsultaService.observarGeneral`) |
| `reportes/opEntidad` | d·a·x | — | — | d·a·x | clientes (arr.) → entidades; `resumenesOp` solo al elegir entidad |

#### Tarifas (`TarifasControlComponent`)

Sin gate en las pestañas.

| Ruta | canMatch | canActivate | redirectTo | Sidebar | Reglas (al abrir) |
|---|---|---|---|---|---|
| `tarifas/''` | d·a·u·x | — | → `general` | todos (incluido m) | — |
| `tarifas/general` | d·a·u·x | — | — | todos | tarifas (arr.) → tarifas |
| `tarifas/personalizada` | d·a·u·x | — | — | todos | clientes (arr.) → entidades |
| `tarifas/especial` | d·a·u·x | — | — | todos | clientes, choferes, proveedores (arr.) → entidades |
| `tarifas/eventual` | d·a·u·x | — | — | todos | ídem; `registrosOpEventuales` (arr.) → informesOp al elegir entidad |
| `tarifas/historial` | d·a·u·x | — | — | todos | ídem; tarifas (arr.) al elegir entidad |

#### Vendedores (`VendedorControlComponent`)

- El shell **sí lee**: `VendedorService.init()` en `ngOnInit`, idempotente por uid y sin
  `vigilar()`.
- Sin gate en las pestañas.

| Ruta | canMatch | canActivate | redirectTo | Sidebar | Reglas (al abrir) |
|---|---|---|---|---|---|
| `vendedores/''` | d·a·x | — | → `tableroVendedores` | **todos** (sin gate) | `vendedores` → vendedores (shell) |
| `vendedores/listado` | d·a·x | — | — | todos | vendedores; clientes (arr.) → entidades |
| `vendedores/tableroVendedores` | d·a·x | — | — | todos | `comisionesVenta` ×2 → comisiones (`ComisionVentaConsultaService.observarTablero`) |
| `vendedores/historial` | d·a·x | — | — | todos | `liquidacionesVenta` → vendedores (`LiquidacionVentaService.observarPorPeriodos`) |

#### Migración (`desarrollo-routing`)

| Ruta | canMatch | canActivate | redirectTo | Sidebar | Reglas (al abrir) |
|---|---|---|---|---|---|
| `migracion/''` `MigracionComponent` | d | — | — | `@if ($usuario.role === 'dev')` → d | el hijo `RecalculoComisionesComponent` llama `VendedorService.init()` en el constructor → vendedores; `generacionesPrueba` (→ desarrollo) no se lee al abrir |

### Entregable — rutas con capas en desacuerdo

De las **39 pantallas hoja**, **27 tienen al menos dos capas en desacuerdo**. Coinciden las
otras 12:
- `ajustes/usuarios`;
- las 5 de `finanzas`;
- las 3 de `nuevaFacturacion`;
- las 2 de `reportes`;
- `migracion`.

Si se deja de lado `manager`, que ya está registrado como deuda C1, siguen en desacuerdo
**13**.

Los padres de `raiz-routing` en desacuerdo son 9: `clientes`, `choferes`, `op`,
`proveedores`, `liquidacion`, `legajos`, `ajustes`, `vendedores` y `tarifas`. Coinciden 4:
`nuevaFacturacion`, `finanzas`, `reportes` y `migracion`.

| # | Ruta(s) | Rol | Capas que lo admiten | Capas que no |
|---|---|---|---|---|
| 1 | `ajustes` + `registro`, `registro-log`, `papelera`, `empresa` (4 hojas) | demo | `canMatch`, `canActivate` de las 4 hijas, reglas (logs, papelera, configuracion) | `redirectTo` (destino `usuarios` = d·a, cae en `/limbo`); sidebar (`usuarios.ver` = d·a) |
| 2 | `ajustes/registro` | todos | `canActivate` d·a·x | ninguna puerta: pestaña comentada en `AjustesControlComponent`; solo por URL |
| 3 | `ajustes/registro-log`, `papelera`, `empresa`, `registro` | user | reglas (logs, papelera, configuracion, historicoSoloLectura dan `leer` a user) | `canMatch`, `canActivate`, sidebar |
| 4 | `choferes/alta`, `clientes/alta`, `proveedores/alta` | user, demo | `canMatch` del padre | `canActivate` (d·a·m) |
| 5 | ídem | manager | `canMatch`, `canActivate` | reglas (entidades); además sin puerta en sidebar ni pestaña |
| 6 | `choferes/listado`, `clientes/listado`, `proveedores/listado` y sus padres | manager | `canMatch`, sidebar | reglas (entidades) |
| 7 | `legajos/tablero`, `consulta`, `cargarDoc`, `vencimientos` y su padre | manager | `canMatch`, sidebar | reglas (legajos, entidades, vencimientos) |
| 8 | `legajos/cargarDoc` | demo | `canMatch`, sidebar, reglas `leer` (legajos, entidades) | pestaña del shell (`esRol('demo')` → `isDisabled`); solo por URL |
| 9 | `liquidacion/informes`, `anulados` y su padre | manager | `canMatch`, sidebar | reglas (operaciones, informesOp) |
| 10 | `liquidacion/borradores` | user, manager | `canMatch`, sidebar | reglas (`informesLiq` → finanzas: d·a·x) |
| 11 | `op/tablero`, `op/asignaciones` y su padre | manager | `canMatch`, sidebar | reglas (operaciones) |
| 12 | `op/asignaciones` | demo | `canMatch`, sidebar, reglas de operaciones/entidades/tarifas | reglas de `asignaciones` (d·a·u), que la pantalla lee si hay fecha vista |
| 13 | `tarifas` (5 hojas) y su padre | manager | sidebar (sin gate) | `canMatch` (d·a·u·x), reglas |
| 14 | `vendedores` (3 hojas) y su padre | user, manager | sidebar (sin gate) | `canMatch` (d·a·x), reglas (vendedores, comisiones) |
| 15 | `migracion` | — | coinciden las cinco capas en d; la puerta del sidebar es `$usuario.role === 'dev'`, no `PermisosService` | — |

La fila 15 no es un desacuerdo: queda como dato del mecanismo.

Las 13 que siguen en desacuerdo sin `manager`:
- 4 hojas de Ajustes (filas 1-3);
- 3 rutas `alta` (fila 4);
- `legajos/cargarDoc` (fila 8);
- `liquidacion/borradores` (fila 10);
- `op/asignaciones` (fila 12);
- 3 hojas de Vendedores (fila 14).

Las tarifas para `manager` (fila 13) salen de la cuenta porque el único desacuerdo ahí es de
`manager`.

**Una sexta capa.** Las pestañas de los shells deciden acceso por su cuenta en dos casos: la
de `cargarDoc` en Legajos y la de Registro en Ajustes. Ninguno de los dos coincide con su
ruta.

## 3. Listeners del arranque

`HomeComponent.ngOnInit`, en orden:
1. `inactividad.iniciar()`: no lee Firestore.
2. `choferService.init()`
3. `proveedorService.init()`
4. `clienteService.init()`
5. `tarifarioService.init()`
6. `categoriaDocumentacionService.init()`
7. `legajoService.init()`
8. `if (this.permisosService.puede('operaciones')) this.noDisponibilidadService.init()`
9. `router.events`, solo para cerrar el sidebar.

Ningún `init()` llama al `init()` de otro servicio. Todos los listeners de la tabla usan
`DbFirestoreService.getAllStateChanges`: `onSnapshot` sobre la colección entera, sin filtro
ni rango.

| # | Servicio.método | Colección | Módulo (`moduloDe()`) | Condición | `vigilar()` |
|---|---|---|---|---|---|
| 1 | `ChoferService.init` | choferes | entidades | siempre | sí |
| 2 | `ChoferService.init` | vehiculos | entidades | siempre | sí |
| 3 | `ProveedorService.init` | proveedores | entidades | siempre | sí |
| 4 | `ClienteService.init` | clientes | entidades | siempre | sí |
| 5 | `TarifarioService.init` | tarifas | tarifas | siempre | sí |
| 6 | `TarifarioService.init` | tarifasEspeciales | tarifas | siempre | sí |
| 7 | `TarifarioService.init` | registrosOpEventuales | informesOp | siempre | sí |
| 8 | `CategoriaDocumentacionService.init` | categoriasDocumentacion | legajos | siempre | sí |
| 9 | `LegajoService.init` | legajos | legajos | siempre | sí |
| 10 | `NoDisponibilidadService.init` | noDisponibilidades | operaciones | `puede('operaciones')` → d·a·u·x (no m) | sí |

**10 listeners abre el arranque: 9 incondicionales y 1 condicionado.** Los 10 pasan por
`vigilar()`.

Para `manager` los 9 incondicionales caen en módulos sin `leer`:
- entidades: 4;
- tarifas: 2;
- informesOp: 1;
- legajos: 2.

Lo que corre en el arranque sin ser de `HomeComponent.ngOnInit`:
- **`UsuarioSesionService`** (constructor → `onAuthStateChanged` → `reconciliarAhora` →
  `leerUsuario`): `getDoc` de `/users/{uid}`. Es lectura puntual, sin `vigilar()`, con
  timeout.
- **`SidebarComponent.ngOnInit`**: se suscribe a `legajoService.legajos$`. Usa la memoria del
  listener 9 y no abre lectura.
- **La ruta por defecto** (`''` → `op` → `tablero`): `TableroOpComponent.ngOnInit` →
  `OperacionService.cargarOperaciones` abre un listener sobre `operaciones` por rango de
  fecha, con `vigilar()`. Se abre al llegar a la pantalla por defecto, no lo dispara
  `HomeComponent`.

## 4. Barridos de gating de UI

### 4a. `esRol(` (en `.ts` y `.html`, sin specs)

Hay **10 ocurrencias**: la declaración (`UsuarioSesionService.esRol`) y **9 llamadas**.
`RoleGuard` no llama a `esRol` (contradicción 7).

**Rol como dato, no como permiso: 2**

| Archivo | Método | Uso |
|---|---|---|
| `servicios/log-registro/log-registro.service.ts` | `LogRegistroService` (armado de la entrada de log, el método con `accion, coleccion, idObjet, details, status, cambios?`) | `esRol('dev')` → `null`: `dev` excluido del log (regla de CLAUDE.md) |
| `servicios/gestion-usuarios/usuarios-consulta.service.ts` | `UsuariosConsultaService.leer` | `esRol('dev','admin')`: solo esos roles leen `/users` (espeja el match `/users/{uid}`); el resto degrada a email |

**Gating de UI sin pasar por `PermisosService`: 7**

| Archivo | Método / sección | Expresión |
|---|---|---|
| `raiz/choferes/choferes-listado/choferes-listado.component.html` | botón "Choferes Visibles" (`visibilidadChoferes()`) | `[ngClass]="{'isDisabled': usuarioSesion.esRol('demo')}"` |
| `raiz/clientes/clientes-listado/clientes-listado.component.html` | botón "Clientes Visibles" (`visibilidadClientes()`) | ídem |
| `raiz/proveedores/proveedores-listado/proveedores-listado.component.html` | botón "Proveedores Visibles" (`visibilidadProveedores()`) | ídem |
| `raiz/legajos/tablero-legajos/tablero-legajos.component.html` | `div.btn-group.dropup` del filtro de proveedores | `[ngClass]="{'isDisabled':usuarioSesion.esRol('demo')}"` |
| `raiz/legajos/control/control.component.ts` (template inline) | pestaña "Cargar Documentos" | `[ngClass]="{ isDisabled: usuarioSesion.esRol('demo') }"` |
| `raiz/ajustes/papelera/papelera.component.ts` | `PapeleraComponent.puedeRestaurar` (consumido por el `svg` de restaurar y por `restaurar()`) | `evento.estado === 'activo' && !this.usuarioSesion.esRol('demo')` |
| `raiz/liquidacion/informe-op-anulados/informe-op-anulados.component.ts` | getter `InformeOpAnuladosComponent.puedeVerPapelera` (`@if` de la columna de papelera) | `esRol('dev', 'admin', 'demo')` |

**Contra los siete registrados** (CLAUDE.md, "Permisos de UI dispersos", y la skill): los 7
son exactamente estos. **La lista está completa para el símbolo `esRol(`.**

**No lo está para el gating por rol.** El barrido de comparaciones crudas encuentra otros
sitios que gatean UI por rol sin `esRol` ni `PermisosService`:

| Archivo | Método / sección | Expresión | Qué gatea |
|---|---|---|---|
| `raiz/sidebar/sidebar.component.html` | `<li>` de Migración | `@if ($usuario.role === 'dev')` | puerta a `/migracion` |
| `raiz/tarifas/tarifas-general/tarifas-general.component.ts` | `ngOnInit` → `puedeEditar` | `['dev', 'admin'].includes(usuario.role)` | `@if (puedeEditar …)`: crear / editar / aumentar la General |
| `raiz/tarifas/tarifas-personalizada/tarifas-personalizada.component.ts` | `ngOnInit` → `puedeEditar` | ídem | `@if (puedeEditar)`: nueva / editar / etc. |
| `raiz/tarifas/tarifas-especial/tarifas-especial.component.ts` | `ngOnInit` → `puedeEditar` | ídem | `@if (puedeEditar)` |
| `raiz/tarifas/tarifa-form/tarifa-form.component.ts` | `ngOnInit` → `puedeEditar`, `esDev` | ídem + `usuario?.role === 'dev'` | guarda del guardado; `@if (esDev)`: campo "Vigencia desde (solo dev — migración de datos)" |
| `raiz/tarifas/tarifa-especial-form/tarifa-especial-form.component.ts` | ídem | ídem | ídem |
| `raiz/tarifas/tarifa-aumento/tarifa-aumento.component.ts` | ídem | ídem | ídem |
| `raiz/tarifas/tarifa-especial-aumento/tarifa-especial-aumento.component.ts` | ídem | ídem | ídem |

Son **8 sitios más** (1 en el sidebar y 7 componentes de Tarifas). `ModuloPermiso` no tiene
`'tarifas'` (`mapaModuloReglas` no lo lista), así que hoy estos componentes no podrían pasar
por `PermisosService.puede` sin extender el tipo.

Comparaciones de rol crudas que **no** son gating de UI:
- `RoleGuard.chequearAcceso`.
- `GestionUsuariosComponent.cargarUsuarios`: filtro `role !== 'dev'`, decidido en CLAUDE.md.
- `GestionUsuariosComponent.editarDeshabilitado`: jerarquía por fila.
- `ModalUsuarioComponent`: compara el rol del payload.
- Los 7 servicios de `servicios/desarrollo/` (`getRol() !== 'dev'` como guarda de
  ejecución).
- `PermisosService.puede`.

### 4b. `*appPermiso` (35 usos en templates)

| Archivo | Sección | Expresión |
|---|---|---|
| `raiz/sidebar/sidebar.component.html` | `<li>` Facturación / Finanzas / Reportes / Ajustes | `'facturacion.ver'`, `'finanzas.ver'`, `'reportes.ver'`, `'usuarios.ver'` |
| `raiz/choferes/choferes-listado/choferes-listado.component.html` | botón Descargar | `'choferes.descargarListado'` |
| `raiz/clientes/clientes-listado/clientes-listado.component.html` | botón Descargar | `'clientes.descargarListado'` |
| `raiz/proveedores/proveedores-listado/proveedores-listado.component.html` | botón Descargar | `'proveedores.descargarListado'` |
| `raiz/finanzas-nueva/cuenta-entidad/cuenta-entidad.component.html` | 2 botones de alta | `'finanzas.agregar'` ×2 |
| `raiz/finanzas-nueva/cuentas/finanzas-cuentas.component.html` | botón de alta | `'finanzas.agregar'` |
| `raiz/finanzas-nueva/modales/detalle-movimiento/detalle-movimiento.component.html` | Anular / Imputar saldo / Cerrar o devolver / reimprimir | `'finanzas.anular'`, `'finanzas.editar'`, `'finanzas.agregar'`, `'finanzas.reimprimir'` |
| `raiz/legajos/cargar-documentos/cargar-documentos.component.html` | bloque de carga | `'legajos.editar'` |
| `raiz/legajos/gestion-categorias-documentacion/gestion-categorias-documentacion.component.html` | alta de categoría | `'legajos.editar'` |
| `raiz/legajos/tablero-legajos/tablero-legajos.component.html` | "Legajos visibles", "Gestionar Categorías" | `'legajos.editar'` ×2 |
| `raiz/liquidacion/informe-op-listado/informe-op-listado.component.html` | botón Liquidar (`ng-container`), `th` Baja, edición del InformeOp (expresión partida en varias líneas), `td` Baja | `'liquidaciones.liquidar'`, `'liquidaciones.eliminar'` ×2, `'liquidaciones.editar'` |
| `raiz/operaciones/carga-asignacion/carga-asignacion.component.html` | botón No disponibles | `'operaciones.noDisponibilidad'` |
| `raiz/operaciones/modal-no-disponibilidad/modal-no-disponibilidad.component.html` | acciones del modal | `'operaciones.noDisponibilidad'` ×2 |
| `raiz/operaciones/tablero-asignaciones/tablero-asignaciones.component.html` | franja de gestión (4) y de tablero (4) | `'operaciones.editar'` ×4, `'operaciones.noDisponibilidad'`, `'operaciones.agregar'`, `'operaciones.descargarAsignaciones'`, `'operaciones.limpiarTablero'` |
| `raiz/operaciones/tablero-op/tablero-op.component.html` | Alta de Operación, Descargar | `'operaciones.agregar'`, `'operaciones.descargarTablero'` |

Hay tres menciones más de `*appPermiso` fuera de templates, todas en comentarios:
`interfaces/tabla-listado.ts`, `gestion-categorias-documentacion.component.ts` y
`permisos.service.ts`.

`gestion-categorias-documentacion.component.ts` tiene un comentario que explica por qué una
acción no se gatea con `*appPermiso`.

### 4c. Inputs `modulo=` / `accion=` sobre `app-btn-*` y `app-accion-generica`

`app-accion-generica`: **0 usos**, el componente no existe (contradicción 2). Sobre los
`app-btn-*`:

| Archivo | Sección | `modulo` | `accion` |
|---|---|---|---|
| `shared/tabla/tabla-acciones/tabla-acciones.component.html` | 4 botones de fila | `[modulo]="modulo"` (reenviado) | `vehiculos`, `ver`, `editar`, `eliminar` |
| `shared/tabla/tabla-generica/tabla-generica.component.html` | reenvío a `app-tabla-acciones` | `[modulo]="modulo"` | — |
| `raiz/ajustes/gestion-usuarios/gestion-usuarios.component.html` | `app-tabla-generica` | `usuarios` | (de la tabla) |
| `raiz/choferes/choferes-listado/choferes-listado.component.html` | alta + `app-tabla-generica` | `choferes` ×2 | `agregar` |
| `raiz/clientes/clientes-listado/clientes-listado.component.html` | alta + `app-tabla-generica` | `clientes` ×2 | `agregar` |
| `raiz/proveedores/proveedores-listado/proveedores-listado.component.html` | alta + `app-tabla-generica` | `proveedores` ×2 | `agregar` |
| `raiz/vendedores/vendedores-listado/vendedores-listado.component.html` | alta + `app-tabla-generica` | `vendedores` ×2 | `agregar` |
| `raiz/operaciones/tablero-op/tablero-op.component.html` | 4 botones de fila | `operaciones` ×4 | `ver`, `editar`, `eliminar`, `cerrar` |
| `raiz/legajos/cargar-documentos/cargar-documentos.component.html` | eliminar archivo, agregar a buffer, eliminar de buffer | `'legajos'` ×3 | `'editar'` ×3 |
| `raiz/legajos/vencimientos/vencimientos.component.html` | tabla | `legajos` | (de la tabla) |
| `raiz/ajustes/papelera/papelera.component.html` | `app-btn-leer` Detalle | `[modulo]="moduloDe(e)"` | `ver` |
| `raiz/ajustes/registro-log/registro-log.component.html` | `app-btn-leer` DetalleColor | `[modulo]="moduloDe(r)"` | `ver` |

`vendedores-listado` ya no tiene cards: usa `app-tabla-generica` con `modulo="vendedores"`, y
Editar/Eliminar salen de `TablaAccionesComponent` (ver la contradicción 8).

### 4d. Otros consumidores de `PermisosService` (fuera de los tres símbolos)

Están fuera del barrido pedido, pero son el mecanismo vigente:
- **Campo `permiso: 'modulo.accion'` de `interfaces/tabla-listado.ts`**, resuelto por
  `TablaListadoComponent`. Lo usan `finanzas-cuentas`, `cuenta-entidad`,
  `listado-movimientos.ts`, `borradores-liq`, `facturacion-emitidos`,
  `facturacion-facturados` y `facturacion-revertidos` (21 acciones).
- **`.puede(...)` directo en TS:**
  - `DatosEmpresaComponent` (`configuracion`, `editar`);
  - `HomeComponent.ngOnInit` (`operaciones`);
  - `GestionCategoriasDocumentacionComponent` (`legajos`, `editar`);
  - `TableroActividadComponent`, `VendedorAltaComponent` y `VendedorHistorialComponent`
    (`vendedores`, `editar`);
  - `FichaEntidadComponent` (`editar` del módulo de la ficha; `finanzas`, `ver`);
  - `InformeLiqNuevoDetalleComponent` (`editar`, `verFactura`).

## 5. `ngClass` / `disabled` que dependen del rol

- **`[ngClass]` con rol: 5 sitios.** Son los 5 primeros del barrido 4a: tres botones
  "Visibles", el dropup de `tablero-legajos` y la pestaña de `cargarDoc`.
  - Más un sexto indirecto: el `svg` de restaurar de `papelera.component.html`, con
    `[ngClass]="{'isDisabled': !puedeRestaurar(e)}"`, donde `puedeRestaurar` mezcla regla
    de negocio (`estado === 'activo'`) y rol (`esRol('demo')`).
  - En todos, `.isDisabled` está definido en el `.scss` del componente como
    `pointer-events: none`.
  - En los tres botones "Visibles" el elemento es un `<button>` sin atributo `disabled`.
    Los handlers (`visibilidadChoferes()`, etc.) no vuelven a chequear el rol.
  - `PapeleraComponent.restaurar` sí vuelve a chequear `puedeRestaurar`.
- **`[disabled]` con rol: ninguno directo.** Los `[disabled]` encontrados dependen de:
  - permiso: `DatosEmpresaComponent.puedeEditar` y
    `GestionCategoriasDocumentacionComponent.puedeEditar`, los dos vía
    `PermisosService`;
  - regla de negocio: `tablero-op.puedeEditar(row)`, los flags de modo/ciclo de
    `ModalDetalleOpComponent` (`puedeEditarDetalleCompleto`, consumido en
    `operacion-valor-lado`) y `VisualizadorObjetoService.puedeVer`, que es por colección.
- **`@if` por rol, sin `ngClass` ni `disabled`:** los 7 componentes de Tarifas (`puedeEditar`
  / `esDev`) y el `<li>` de Migración, ya listados en 4a.

## Dependencias con otros módulos

- `PermisosService` depende de `UsuarioSesionService.getRol`.
- `*appPermiso`, `app-btn-*` y `TablaListadoComponent` dependen de `PermisosService`.
- `RoleGuard` depende de `UsuarioSesionService.sesionResuelta` / `getUsuarioActual`.
- Las listas de roles de `RoleGuard` (en `data.roles` de cada routing) y las de
  `matrizBase` se mantienen a mano por separado; no hay referencia cruzada en el código.

## Inconsistencias y deuda detectada

- Las 27 pantallas en desacuerdo de la sección 2, 13 sin contar `manager`.
- `vendedores` y `tarifas` no tienen gate en el sidebar, pero su `canMatch` excluye a
  `manager` (las dos) y a `user` (vendedores). El enlace se muestra y la navegación termina
  en `/limbo`.
- Las tres rutas `alta` admiten a `manager` y excluyen a `user`/`demo` ("no se permiten
  usuarios"). No tienen enlace desde ninguna pestaña ni del sidebar.
- `ajustes/registro` no tiene puerta para nadie: la pestaña está comentada.
- `legajos/cargarDoc`: el bloqueo de la pestaña para `demo` es solo visual (`ngClass`); la
  ruta no tiene `canActivate`. Por URL, `demo` entra, y el bloque de carga lo oculta
  `*appPermiso="'legajos.editar'"`.
- `liquidacion/borradores` admite `user` por ruta y sidebar; su única lectura (`informesLiq`)
  está en `finanzas`, sin `leer` para `user`.
- `op/asignaciones` admite `demo` por ruta; `asignaciones` no le da `leer`. La lectura se
  hace solo si `AsignacionService.getUltimaFechaVista()` tiene valor.
- `mapaModuloReglas.reportes = 'finanzas'`, pero Reportes lee `resumenes` (contradicción 6).
- La lista de 7 `esRol()` pendientes no cubre 8 sitios de gating por rol con comparación
  cruda (sidebar de Migración y 7 de Tarifas).
- Fuera del arranque, al menos 14 métodos que abren listeners no pasan por `vigilar()`
  (contradicción 4).

## Preguntas abiertas

1. **¿Las rutas `choferes/alta`, `clientes/alta` y `proveedores/alta` llegan a renderizar?**
   - `ChoferesAltaComponent`, `ClienteAltaComponent` y `ProveedoresAltaComponent` inyectan
     `NgbActiveModal`.
   - Ningún `*.module.ts` lo provee, y los componentes no declaran `providers`.
   - Su `ngOnInit` lee `this.fromParent` (`@Input`), que por ruta queda `undefined`.

   Desde el código parece que fallan al abrirse por URL (NullInjectorError o TypeError), pero
   no se confirmó en ejecución. Si fallan, la fila 4 y la 5 de la tabla de desacuerdos
   describen rutas muertas.
2. ¿El sidebar de `manager` tiene algún uso real? Se le muestran sin gate Clientes, Choferes,
   Proveedores, Tarifas, Operaciones, Liquidación, Legajos y Vendedores. Tarifas y
   Vendedores terminan en `/limbo`, y el resto abre pantallas cuyas lecturas las reglas le
   niegan.

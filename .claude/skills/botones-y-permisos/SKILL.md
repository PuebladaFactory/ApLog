---
name: botones-y-permisos
description: Permisos de UI de ApLog — PermisosService, matrizBase por rol (dev/admin/manager/user/demo) y por acción, overrides, la directiva *appPermiso, los botones app-btn-* y AccionGenericaComponent, y su relación con firestore.rules. Leer antes de trabajar sobre botones de acción, visibilidad u ocultamiento por rol, *appRole/esRol o los permisos de cualquier módulo.
---

### Frente Botones y Permisos (en progreso)

Continuación del Refactor de Roles y Seguridad, independiente del frente de Operaciones
(que ya cerró el suyo). Ataca dos problemas relevados por auditoría de solo lectura:
el sistema de botones `app-btn-*` (5 componentes, wrappers de tabla, usos directos) sin
inventario ni consistencia documentada, y la deuda de "control de permisos de UI
disperso" (`*appRole` puntual por template, sin relación con la matriz real de
`firestore.rules`).

**Arquitectura acordada, de 4 capas:**

1. **Dominio** — `PermisosService` (`servicios/permisos/`) + reglas de negocio por fila
   (funciones tipo `puedeEditar(row)`/`puedeEliminar(row)` ya existentes en algunos
   componentes, ej. `tablero-op`) deciden QUÉ está permitido: rol × módulo × acción desde
   `PermisosService`, más el estado del registro puntual desde la regla de negocio.
2. **Gating** — cómo se aplica la decisión de la capa de dominio en el template. Dos
   mecanismos según el caso: `*appPermiso` (directiva estructural, oculta el elemento)
   para botones crudos sin componente propio; inputs `modulo`/`accion` directo en los
   `app-btn-*` (agregados a los 4 componentes en el Bloque 2, ver abajo — sin conectar
   a ningún caller todavía) para el caso más común, donde el botón ya es un componente y
   puede resolver su propio estado enabled/disabled sin que el caller arme la condición
   a mano.
3. **Presentación** — catálogo semántico (los 4 `app-btn-*`: agregar/editar/eliminar/leer,
   variantes cerradas por `name`) para las acciones CRUD repetidas, más
   `AccionGenericaComponent` (Bloque 3, ver abajo) para el resto: botones crudos
   `<button>` con texto/variante/ícono libres que no encajan en el significado cerrado
   del catálogo semántico (ej. los de `tablero-asignaciones`). No reemplaza a los 4
   `app-btn-*` — conviven, cada uno cubre un caso distinto.
4. **Consumidores** — los 3 wrappers de tabla (`TablaAccionesComponent`,
   `InformesAccionesCellComponent`, `AccionesCellRendererComponent` — este último sin
   caller activo) y los ~90 usos directos relevados por la auditoría, migrados
   progresivamente a las capas 1-3 en bloques futuros.

**Bloque 1 — fundaciones (este bloque): infraestructura creada, sin conectar a ningún
consumidor.** El árbol compila exactamente igual que antes; ningún `*appRole` existente
fue tocado ni reemplazado.

- **Interfaces de tabla renombradas** (sin cambiar campos, solo identidad — colisión de
  nombres detectada por la auditoría: dos `AccionTabla`/`ColumnaTabla` distintas e
  incompatibles convivían en el proyecto):
  `interfaces/tabla.ts` → `interfaces/tabla-generica.ts`
  (`ColumnaTabla`→`ColumnaTablaGenerica`, `AccionTabla`→`AccionTablaGenerica`; consumida
  por `TablaGenericaComponent`, `TablaAccionesComponent`, `gestion-usuarios`,
  `choferes/clientes/proveedores-listado`). `interfaces/tablas.ts` →
  `interfaces/informes-tabla.ts` (`ColumnaTabla<T>`→`ColumnaInformesTabla<T>`,
  `AccionTabla<T>`→`AccionInformesTabla<T>`, `EventoAccionTabla<T>`→`EventoInformesTabla<T>`,
  `OrdenTabla`→`OrdenInformesTabla`; consumida por `InformesTablaComponent`,
  `facturacion-listado`, `facturacion-historico`).
- **`interfaces/permiso.ts`** (nuevo): `ModuloPermiso` (unión cerrada de los 11 módulos
  reales del proyecto) y `AccionPermiso` (unión abierta a propósito — se agregan valores
  ahí a medida que aparecen casos nuevos, sin tocar callsites existentes).
- **`PermisosService`** (`servicios/permisos/`, nuevo): `matrizBase` traducida
  literalmente de la función `permitido()` de `firestore.rules` (no inventada).
  `liquidaciones`/`facturacion`/`reportes` espejan `finanzas` 1:1 a propósito (confirmado
  con el desarrollador): sus colecciones reales no tienen módulo propio en `moduloDe()`
  de `firestore.rules` hoy, comparten `'finanzas'`. `overrides` (por `'modulo.accion'`)
  queda vacío en este bloque — se completa caso a caso en frentes futuros. Método
  `puede(modulo, accion?)`: sin sesión → `false`; override definido para el rol → gana;
  si no, se consulta `matrizBase`.
  ⚠️ **Diseño original de `matrizBase`, corregido después de este bloque:** en el Bloque 1
  la matriz colapsaba a un solo booleano por `[modulo][rol]` (granularidad de módulo, no de
  acción). Causó un bug real, encontrado en pruebas manuales post-Bloque 4 y corregido en
  el bloque siguiente — ver "Corrección — granularidad de `matrizBase` por acción" más
  abajo. Esta entrada queda como registro histórico del Bloque 1; el diseño vigente hoy es
  el corregido.
  ⚠️ **Hallazgo de la traducción, resuelto como decisión explícita (no deuda):** el rol
  `'manager'` no aparece en ningún módulo de `permitido()` en `firestore.rules` — no tiene
  ningún acceso real a Firestore. Es un rol teórico sin uso actual (`RolUsuario` lo declara,
  pero ningún usuario real del proyecto lo tiene asignado hoy). `PermisosService` lo
  deniega en `matrizBase` para los 11 módulos, a propósito — no es una omisión a corregir.
  La migración de los `*appRole` existentes a `*appPermiso` (bloques futuros) va a quitarle
  también el acceso visible en la UI (tarifas generales de cliente/chofer/proveedor, hoy
  con `'manager'` incluido en la lista de roles permitidos) en vez de mantenerlo como
  botón visible sin respaldo real en las reglas — mismo criterio que el resto del frente:
  la UI no debe mostrar una acción que la regla real va a rechazar.
- **`*appPermiso`** (`shared/directives/permiso.directive.ts`, nuevo): calco de
  `RoleDirective` (mismo patrón `@Input() set` + `viewContainer.createEmbeddedView`/`clear()`).
  Sintaxis `'modulo'` o `'modulo.accion'`, parseada por `.` internamente. Declarada en
  `SharedModule` junto a `RoleDirective`. Sin ningún consumidor todavía — se agrega, no se
  conecta.

**Bloque 2 — los 4 `app-btn-*` consumen `PermisosService` (sin conectar todavía).**
`BtnReimpresionComponent` ya no existe (eliminado en chunk previo, código muerto real —
ver más abajo); quedan `BtnAgregarComponent`/`BtnEditarComponent`/`BtnEliminarComponent`/
`BtnLeerComponent`. Ningún caller pasa `modulo`/`accion` todavía — comportamiento visible
idéntico a antes en toda la app, salvo la corrección de bug de disabled (ver siguiente
punto).

- **Bug de `disabled` inerte corregido, independiente de permisos:** 20 de las 40 ramas
  `@if` con `<button>` real entre los 4 componentes recibían `@Input() disabled` pero
  nunca lo bindeaban al `<button>` interno — el input llegaba, pero no hacía nada. Corregido
  agregando `[disabled]=disabled` en las variantes que faltaban (13 en
  `BtnAgregarComponent`: Cerrar, Guardar, Descargar Legajo, GuardarClaro, GuardarCambios,
  GuardarCambiosClaro, guardarTarifa, Agregar, Confirmar, 'Agregar Contacto',
  AgregarContactoClaro, Facturar, Pagar; 7 en `BtnLeerComponent`: DetalleColor, Detalle,
  Vehiculos, Imprimir, excel, pdf, print). `BtnEditarComponent`/`BtnEliminarComponent` ya
  lo bindeaban correctamente en todas sus variantes activas. La rama muerta `editarTarifa`
  de `BtnAgregarComponent` (0 invocaciones confirmadas, el valor real vive en
  `BtnEditarComponent`) quedó intacta a propósito, fuera de este arreglo — no se le agregó
  `[disabled]`, sigue siendo dead code sin tocar. Caller real que este arreglo pone a
  funcionar por primera vez: `modal-contacto-proveedores.component.html` pasa
  `[disabled]="formContacto.invalid"` a `app-btn-agregar name="Agregar"` — antes el
  formulario inválido no bloqueaba el submit pese a la intención explícita del caller,
  ahora sí.
- **Inputs `modulo?: ModuloPermiso` / `accion?: AccionPermiso`** agregados a los 4
  componentes, mismo patrón en los cuatro: inyectan `PermisosService`, exponen un getter
  `visible` (`!this.modulo || this.permisosService.puede(this.modulo, this.accion)`).
  Sin `modulo`, `visible` es siempre `true` — compatibilidad hacia atrás total con los
  ~90 sitios de uso existentes, que no pasan `modulo`/`accion` hasta que se migren en
  bloques futuros.
- **Las 40 ramas `@if` de los 4 componentes envueltas con `&& visible`**, sin excepción
  (incluidas las variantes sin uso activo detectadas por la auditoría, ej. `x` en
  `BtnEliminarComponent`, `chofer`/`proveedor`/`tarifa` en `BtnLeerComponent`,
  `editarTarifa`/`electronica`/`Cerrar` en `BtnAgregarComponent` — se envuelven igual por
  consistencia del componente, aunque hoy no tengan caller).

**Bloque 3 — `AccionGenericaComponent` (capa de Presentación, sin conectar todavía).**
`shared/botones/accion-generica/`, selector `app-accion-generica`. Cubre el caso que los
4 `app-btn-*` no cubren: botones `<button>` crudos y repetidos por la app (texto, color y
tamaño libres, no un catálogo cerrado de `name`), como los de `tablero-asignaciones`.
Mismo patrón de permisos que los otros 4 (inyecta `PermisosService`, `modulo?`/`accion?`,
getter `visible`), y mismo criterio de `disabled` real (nunca `ngClass`).

- `@Input() label!: string` (texto), `@Input() variante = 'primary'` (mapea a
  `btn-${variante}` de Bootstrap), `@Input() tamano?: 'sm' | 'lg'` (agrega `btn-sm`/
  `btn-lg` si se pasa), `@Input() disabled = false`. `claseCompleta` getter arma
  `btn btn-${variante}` + `btn-${tamano}` si corresponde.
  `<ng-content select="[icono]">` para un ícono opcional dentro del botón — el caller
  decide si lo usa, el componente no trae íconos propios (a diferencia de los 4
  `app-btn-*`, que sí traen su propio SVG fijo por variante).
- Sin `@Output()`: el `(click)` se bindea directo en `<app-accion-generica (click)="...">`
  igual que en los otros 4 `app-btn-*` — burbujea del `<button>` interno al host nativo,
  no hace falta un `EventEmitter` propio.
- Declarado en `SharedModule` junto a los otros 4. Sin ningún caller todavía — se conecta
  en un bloque posterior (botones crudos con permiso real, ej. `tablero-asignaciones`).

**Bloque 4 — `TablaAccionesComponent` conectado a `PermisosService` (primer wrapper con
callers reales conectados).** Cierra en producción, para este wrapper puntual, el caso
concreto de la deuda "control de permisos de UI disperso" (ver más abajo) — no es
funcionalidad nueva, es el hallazgo de la auditoría ya resuelto acá.

- `TablaAccionesComponent` recibe `@Input() modulo?: ModuloPermiso` y lo reenvía a los 4
  `app-btn-*` que ya renderiza, con `accion="ver"`/`"editar"`/`"eliminar"`/`"vehiculos"`
  fijo según el bloque `@if` correspondiente (los 4 valores de `AccionTablaGenerica.tipo`
  ya coincidían 1:1 con `AccionPermiso`, sin necesidad de rename — a diferencia de
  Informes, que lo va a necesitar en un bloque aparte). El `[disabled]="estaDeshabilitada(tipo)"`
  existente en editar/eliminar no se tocó — sigue siendo la regla de negocio por fila,
  ortogonal al permiso de módulo.
- `TablaGenericaComponent` recibe `@Input() modulo?: ModuloPermiso` y lo reenvía a
  `<app-tabla-acciones>`.
- 4 callers actualizados con `modulo` literal: `clientes-listado` → `"clientes"`,
  `choferes-listado` → `"choferes"`, `proveedores-listado` → `"proveedores"`,
  `gestion-usuarios` → `"usuarios"`.
- **Efecto real al momento de este bloque** (con `matrizBase` todavía colapsada a
  `[modulo][rol]`, ver corrección más abajo): `manager` pierde las 4 acciones en los 3
  listados CRUD (antes se veían igual que para cualquier rol, cero chequeo);
  `gestion-usuarios` además oculta editar/eliminar para `user`/`demo` (antes solo corría
  la regla de jerarquía `editarDeshabilitado`/`eliminarDeshabilitado`, sin filtro de
  acceso al módulo). En ese momento, sin cambios para `user`/`demo` en los 3 listados
  CRUD — la corrección de granularidad por acción (bloque siguiente) es la que además les
  quita `eliminar` (y a `demo` también `editar`) en `clientes`/`choferes`/`proveedores`.
  Sin cambios para `dev`/`admin` en ningún caso, antes ni después de la corrección.
- **No tocado:** el botón de "alta" crudo (con `ngClass` + `esRol('demo')`) de cada uno de
  los 4 listados — sigue en el esquema viejo, migra en el bloque de barrido de `*appRole`.
  `InformesTablaComponent`/`InformesAccionesCellComponent` — bloque aparte (necesita el
  rename de acciones mencionado arriba).

**Corrección — granularidad de `matrizBase` por acción (no es un bloque nuevo, corrige el
Bloque 1).** Pruebas manuales post-Bloque 4 encontraron que `manager` estaba correctamente
oculto en los 3 listados CRUD, pero `user`/`demo` seguían viendo (y pudiendo ejecutar)
`eliminar` en `clientes`/`choferes`/`proveedores` — exactamente el bug que este frente
busca cerrar. Causa: `matrizBase` original era `Record<ModuloPermiso, Record<RolUsuario,
boolean>>` — un solo booleano por módulo, así que `user`/`demo` heredaban `eliminar` por
el simple hecho de tener `leer` permitido en el módulo. `firestore.rules` sí distingue
`leer`/`crear`/`editar`/`eliminar` por separado en `permitido()`; la simplificación de
`matrizBase` no lo reflejaba.

**Rediseño, sin cambiar la firma pública `puede(modulo, accion?)`** (los Bloques 2-4 no
requirieron ningún cambio):

- `matrizBase` pasó a `Record<ModuloReglas, Record<AccionCrud, Record<RolUsuario,
  boolean>>>` — tipo nuevo `AccionCrud` (`'leer' | 'crear' | 'editar' | 'eliminar'`,
  agregado a `interfaces/permiso.ts`) y `ModuloReglas` (tipo interno de
  `PermisosService`, los 11 módulos reales de `permitido()` — `entidades`, `legajos`,
  `vendedores`, `operaciones`, `tarifas`, `tarifasHistorial`, `finanzas`,
  `legacySoloLectura`, `numeradores`, `logs`, `papelera` — más `'usuarios'`, caso
  especial). Transcripción literal de `permitido()`, entrada por entrada — incluye
  módulos sin `ModuloPermiso` equivalente todavía (`numeradores`/`logs`/`papelera`),
  poblados igual por completitud para cuando haga falta.
- `mapaModuloReglas: Record<Exclude<ModuloPermiso,'usuarios'>, ModuloReglas>`: traduce
  `ModuloPermiso` (Angular) al módulo real de las reglas — varios comparten uno
  (`clientes`/`choferes`/`proveedores` → `'entidades'`; `facturacion`/`liquidaciones`/
  `finanzas`/`reportes` → `'finanzas'`). `'usuarios'` queda fuera del tipo a propósito
  (excluido con `Exclude<>`, error de compilación si algo intenta usarlo).
- `mapaAccionCrud: Record<AccionPermiso, AccionCrud>`: `ver`/`vehiculos`/`verFactura`/
  `reimprimir` → `leer`; `agregar` → `crear`; `editar`/`vincularFactura`/`anular` →
  `editar` (anular un `InformeLiq` es una actualización de estado, no un delete — ver
  `LiquidacionService.anularLiquidacion`); `eliminar` → `eliminar`. Toda `AccionPermiso`
  actual mapea sin ambigüedad; una `AccionPermiso` nueva que no encaje claramente queda
  con TODO explícito, no se asume.
- **`usuarios` (Opción A, decisión explícita):** no pasa por `permitido()`/`moduloDe()` —
  regla propia (`/users/{uid}`: `write` solo `dev`). `matrizBase.usuarios` poblada directo
  (`leer`/`crear`/`editar`/`eliminar`: `dev`/`admin` `true`, resto `false`) — refleja
  "puede intentar la acción" (capa de permiso); `admin` sí edita/elimina usuarios en la
  práctica pero vía Cloud Functions con autorización propia (`exigirObjetivoEditable`),
  no por escritura directa. La jerarquía fina por fila (`editarDeshabilitado`/
  `eliminarDeshabilitado` en `gestion-usuarios.component.ts`) no se duplica ni se toca.
- **Sin `accion` (`*appPermiso="'modulo'"` sin `.accion`, gating de sección completa):**
  default `'leer'` — decisión de diseño explícita ("¿puede al menos leer?"), documentada
  en el código, no un valor arbitrario.
- **Efecto retroactivo, sin tocar ningún caller:** el caso de deuda ya documentado
  `operaciones.eliminar` para `user` (citado desde el Bloque 1 como "primer caso a cargar
  en `overrides`") queda resuelto por la matriz corregida sin necesitar ningún override —
  `entidades`/`operaciones`.`eliminar`.`user` ya da `false` con la transcripción literal
  de las reglas. Conectado a `tablero-op` en el Bloque 6 (sub-bloque 1) — ver más abajo.

**Bloque 5 — Facturación: reglas de negocio ya escritas, cableadas por primera vez.**
`FacturacionListadoComponent`/`FacturacionHistoricoComponent` ya tenían `puede()`/
`puedeAnular()`/`puedeVincularFactura()` (usando `informe-liq.rules.ts` →
`REGLAS_ESTADO_INFORME`/`puedeEjecutarAccion`) desde su creación, pero **nunca se llamaban
desde ningún template** — el único gating real era `disbledDemo()` (bloqueaba 3 columnas
enteras, solo para rol `demo`, sin distinguir fila ni estado del informe). No son reglas
nuevas: es la corrección de un mecanismo roto desde que se escribió.

- **`InformesTablaComponent` — código muerto eliminado:** `@Input() acciones:
  AccionInformesTabla<T>[]` (nunca recibía datos de ningún caller), `ejecutarAccion()`,
  `mostrarAccion()`, `accionDeshabilitada()` (el camino real de renderizado siempre fue
  `col.acciones` vía `InformesAccionesCellComponent`, nunca estos métodos). Import de
  `EventoInformesTabla` quitado (sin uso real en ningún lado del proyecto, solo la propia
  declaración). `disbledDemo()` y su `UsuarioSesionService` inyectado también eliminados
  (Paso 8) — quedan completamente reemplazados por permiso (`modulo`/`accion`) + regla de
  negocio por fila (`disabled`).
- **`ColumnaInformesTabla<T>.acciones`** pasó de `string[]` a `AccionInformesTabla<T>[]`
  — la interfaz ya existía (`id`, `label`, `icon?`, `class?`, `visible?`, `disabled?`), se
  le dio uso real por primera vez.
- **`AccionInformesTabla<T>` gana `accionPermiso?: AccionPermiso`** (campo nuevo, no
  interfaz nueva). Motivo: `id` sirve dos propósitos que se asumían siempre iguales —
  identidad de negocio (lo que emite el click, lo que lee el `switch` de `onAccion()`) y
  parámetro de permiso para `PermisosService`. Primer caso real donde no coinciden: las
  columnas de descarga tienen DOS entradas (`id:'excel'`, `id:'pdf'`, necesario para que
  `onAccion()` siga distinguiendo qué formato exportar) pero ambas comparten la misma
  regla de permiso (`'reimprimir'`, que sí es un `AccionPermiso` válido — `'excel'`/`'pdf'`
  no lo son). `accionPermiso` desambigua sin tocar `PermisosService` ni el significado de
  `id`; `InformesAccionesCellComponent.accionPermiso()` hace `accion.accionPermiso ??
  accion.id` — fallback al `id` cuando coinciden, el caso general.
- **Ids renombrados** para coincidir con `AccionInformeLiq` (antes strings sueltos sin
  relación): `'detalle'`→`'ver'` (ambos componentes); `'factura'`→`'vincularFactura'` en
  `facturacion-listado` (dispara `vincularFacElec()`); `'factura'`→`'verFactura'` en
  `facturacion-historico` (dispara `verPdf()`) — acción de negocio distinta pese a
  compartir hoy ícono/botón (`app-btn-agregar name="electronica"`), no unificadas. `excel`/
  `pdf` sin cambios de id, dos entradas. `editar`/`anular` sin cambios. `onAccion()`
  actualizado en cascada en ambos componentes.
- **`columnas[].acciones` poblado con `disabled` real**, conectando los métodos
  existentes tal cual: `editar` → `!puede(inf,'editar')`; `excel`/`pdf` → ambos
  `!puede(inf,'reimprimir')`; `vincularFactura` → `!puedeVincularFactura(inf)` (más
  específico que `puede()` genérico); `anular` → `!puedeAnular(inf)`; `verFactura`
  (historico) → `!puede(inf,'verFactura')`. `ver`/`detalle` sin `disabled` (siempre
  permitido si hay fila y hay permiso de módulo).
- **`InformesAccionesCellComponent`** reescrito: `@Input() acciones` pasa de `string[]` a
  `AccionInformesTabla<InformeLiq>[]`; el template itera (`@for`) en vez de `@if
  (acciones.includes(...))` fijo, selecciona el `app-btn-*` según `accion.id` (mismo mapeo
  visual de antes: `ver`→`btn-leer DetalleColor`, `editar`→`btn-editar EditarColor`,
  `excel`/`pdf`→`btn-leer excel/pdf`, `vincularFactura`/`verFactura`→`btn-agregar
  electronica`, `anular`→`btn-eliminar EliminarColor`), pasa `[disabled]` desde
  `accion.disabled?.(item)` y `[modulo]`/`[accion]` (este último vía el getter
  `accionPermiso()`) a cada botón. `ejecutar()` gana el mismo guard defensivo que
  `TablaAccionesComponent.ejecutar()` (`if (accion.disabled?.(item)) return;`).
- **Cascada de `modulo` (mismo patrón que Bloque 4):**
  `facturacion-listado`/`facturacion-historico` → `modulo="facturacion"` en
  `<app-informes-tabla>` → `InformesTablaComponent` lo reenvía a
  `<app-informes-acciones-cell>` → de ahí a cada `app-btn-*`.
- ⚠️ **Gap residual conocido, no resuelto en este bloque (`app-btn-*` fuera de alcance):**
  la rama `name === 'electronica'` de `BtnAgregarComponent` (usada por
  `vincularFactura`/`verFactura`) no bindea `[disabled]` al `<button>` interno — no estaba
  en la lista de 13 variantes corregidas en el Bloque 2 (nadie la necesitaba entonces).
  El `[disabled]` que le pasa `InformesAccionesCellComponent` llega al componente pero no
  se refleja visualmente en el botón. No es un agujero de seguridad — `ejecutar()` sigue
  bloqueando el evento de click con el guard mencionado arriba (`puedeVincularFactura`/
  `puede(inf,'verFactura')` en `false` → no se emite el click, `vincularFacElec()`/
  `verPdf()` nunca se llaman) — pero el botón no se ve gris ni cambia el cursor cuando
  debería estar deshabilitado. Corrección real pendiente: sumar `'electronica'` a la
  lista de variantes con `[disabled]` real en `BtnAgregarComponent` (mismo arreglo del
  Bloque 2, ahora sí con un caller real que lo necesita).
- **Verificado:** informe en estado `anulado` (`REGLAS_ESTADO_INFORME.anulado = ['ver']`
  únicamente) ahora deshabilita correctamente `reimprimir` (`excel`/`pdf`) y `verFactura`
  en `facturacion-historico` — antes, sin este cableado, esos botones quedaban clickeables
  sobre cualquier informe sin importar su estado (el bug señalado desde el diseño de este
  frente). `facturacion-listado` normalmente no lista informes `anulado` (`cargarInformes`
  consulta fijo por `"emitido"`), así que el efecto visible ahí es menor pero la regla
  queda igual de correcta si algún flujo futuro lista otros estados.

**Bloque 6 (sub-bloque 1) — barrido de `*appRole`/`esRol()`/`ngClass` sueltos:
`tablero-op.component.html`.** Primer sitio migrado del barrido general (caso más enredado
de la auditoría: `[disabled]` nativo + `[ngClass]` + regla de negocio + `esRol('demo')`
repetido en los 3 botones de acción de la fila, más un botón crudo de alta con su propio
`esRol('demo')` inline).

- `AccionPermiso` gana `'cerrar'` (unión abierta, mecanismo ya dejado documentado en el
  Bloque 1); `mapaAccionCrud['cerrar'] = 'editar'` — cerrar una operación es una
  actualización de `EstadoOp.ciclo`, no una creación ni un delete.
- Columna de acciones de la tabla, los 4 botones: `DetalleColor` → `modulo="operaciones"
  accion="ver"`, sin `disabled` (no hay regla de negocio sobre ver). `EditarColor` →
  `modulo="operaciones" accion="editar"`, `[ngClass]="{isDisabled: !puedeEditar(row) ||
  esRol('demo')}"` reemplazado por `[disabled]="!puedeEditar(row)"` — el chequeo de rol
  manual desaparece, cubierto por `modulo`/`accion`. `EliminarColor`/`FacturaColor`
  (`accion="eliminar"`/`accion="cerrar"`): mismo tratamiento, `[disabled]`/`[ngClass]` con
  `esRol('demo')` quitados, `[disabled]="!puedeEliminar(row)"`/`[disabled]="!puedeCerrar(row)"`
  quedan como única fuente (regla de negocio pura, sin rol mezclado).
- Botón crudo "Alta de Operación": `[disabled]="usuarioSesion.esRol('demo')"` reemplazado
  por `*appPermiso="'operaciones.agregar'"` sobre el `<button>`.
- `UsuarioSesionService` (inyección + import) eliminado de `tablero-op.component.ts` —
  confirmado sin otros usos en el componente antes de quitarla.
- ⚠️ **Efecto real para `demo`, distinto de "verse igual pero bloqueado":** `demo` en
  `matrizBase.operaciones` solo tiene `leer: true` (`crear`/`editar`/`eliminar`: `false`).
  Como `modulo`/`accion` controla el getter `visible` de cada `app-btn-*` (oculta el
  elemento entero si no hay permiso, no solo lo deshabilita — mecanismo del Bloque 2),
  `demo` deja de VER los botones Editar/Eliminar/Cerrar de la fila (antes los veía
  grises); solo le queda visible el botón Ver. Coherente con el principio ya establecido
  en este frente ("la UI no debe mostrar una acción que la regla real va a rechazar") y
  con el mismo tratamiento ya aplicado al botón de alta — pero más amplio de lo que
  "comportarse igual visualmente" hubiera sugerido. Mismo efecto para `user`: pierde
  visibilidad de Eliminar (antes visible y bloqueado solo al escribir en Firestore, el
  caso de deuda original) — Editar/Cerrar siguen visibles para `user` (sí tiene
  `editar` en `operaciones`), gobernados por `puedeEditar(row)`/`puedeCerrar(row)`.
  `dev`/`admin` sin cambios (tienen las 4 acciones, gobernados solo por la regla de
  negocio de cada botón, como antes).

### Bug estructural preexistente en los 5 `app-btn-*`/`AccionGenericaComponent`: `(click)` en el host, `disabled` en el `<button>` interno

Encontrado durante pruebas manuales del Bloque 6 (sub-bloque 1), **no específico de
Operaciones ni introducido por este frente** — existe desde la creación original de estos
componentes. Con rol `admin`, una operación `'Cerrada'` (`puedeEliminar` = `false`,
`disabled` presente y confirmado por inspección de DOM en el `<button>` interno) igual
ejecutaba `eliminar()` al hacer clic.

**Causa raíz:** los ~95 call sites de estos componentes escriben `(click)="..."` sobre el
tag host (`<app-btn-eliminar (click)="...">`), no sobre el `<button>` interno — ninguno de
estos 5 componentes definió jamás `@Output() click`, así que Angular trata ese binding
como listener DOM nativo del host. El `<button [disabled]>` bloquea clics dentro de su
propia caja (por eso el ícono siempre estuvo protegido), pero `margin: 10px` del botón es
espacio de layout del padre — un clic ahí no toca al `<button>` deshabilitado, cae directo
sobre el host, y el listener nativo lo dispara igual. El Bloque 2 corrigió que `disabled`
llegara realmente al `<button>` (antes ni eso pasaba en 20 de 40 variantes), pero eso
nunca iba a alcanzar: el problema vive un nivel más arriba, en dónde está el listener.

**Corrección:** `@HostBinding('style.pointer-events')` en los 5 componentes
(`BtnAgregarComponent`, `BtnEditarComponent`, `BtnEliminarComponent`, `BtnLeerComponent`,
`AccionGenericaComponent`) — `'none'` cuando `disabled` es `true`, `null` (sin estilo
inline, sin efecto) cuando es `false`. `pointer-events` es una propiedad heredada: al no
overridearla el `<button>` interno, hereda `none` del host cuando corresponde, sacando
tanto el margen como el botón mismo del hit-testing del navegador — ningún clic, en
ningún punto de la caja del host, llega al listener. No requiere `@Output()` nuevo ni
toca la sintaxis `(click)="..."` de ningún caller.

⚠️ **Alcance real del hallazgo:** este bug pudo haber estado causando el mismo
comportamiento (click "fantasma" en el margen ejecutando la acción pese a `disabled`) en
cualquier otro sitio de la app que ya tuviera `disabled` cableado correctamente antes de
este frente — no es exclusivo de los sitios que este frente migró. No hay forma práctica
de auditar retroactivamente cada caso histórico (requeriría probar clic por clic, sitio
por sitio, con datos que reproduzcan cada estado bloqueado). De acá en adelante queda
blindado en la base: cualquier componente que use `[disabled]` en estos 5 `app-btn-*`/
`AccionGenericaComponent` — ya migrado a `modulo`/`accion` o no — hereda la corrección
automáticamente, sin cambios propios.

**Bloque 6 (sub-bloque 2) — `proforma.component` (3 tablas: clientes/choferes/
proveedores, 4 botones por fila cada una).** A diferencia de `tablero-op` y Facturación,
acá no existía ningún método `puedeXxx` de regla de negocio — el único gating era
`[ngClass]="{isDisabled: esRol('demo')}"` repetido en 9 sitios (3 tablas × 3 botones:
`print`/`Eliminar`/`Factura`); `Detalle` no tenía gating de ningún tipo. Este sub-bloque
conecta solo permiso (`modulo`/`accion`) — no hay regla de negocio por fila que cablear,
porque no existe.

- `AccionPermiso` gana `'liquidar'` (`liquidarProforma()` crea un `InformeLiq` nuevo a
  partir de una proforma — distinta de `'vincularFactura'`, que adjunta un archivo a un
  informe ya existente en Facturación, y de `'anular'`); `mapaAccionCrud['liquidar'] =
  'crear'`.
- Las 3 tablas, mismo tratamiento en cada una: `Detalle` → `modulo="liquidaciones"
  accion="ver"` (nuevo, sin gating previo). `print` → `accion="reimprimir"`, `ngClass`
  quitado. `Eliminar` (dispara `'baja'` → `anularProforma`) → `accion="anular"`, `ngClass`
  quitado. `Factura` (dispara `'factura'` → `liquidarProforma`) → `accion="liquidar"`,
  `ngClass` quitado. Ninguno de los 4 lleva `[disabled]` — no hay regla de negocio que
  conectar. `usuarioSesion` (inyección) confirmada con otro uso real
  (`getUsuarioActual()` en `ngOnInit`, usado para `anuladoPor`/email) — se mantiene, solo
  se quitaron las 9 referencias puntuales a `esRol('demo')`.
- ⚠️ **Efecto real por rol — más amplio que "solo demo pierde acceso", con matices no
  triviales.** `liquidaciones` espeja `finanzas`: `leer` → dev/admin/demo `true`,
  manager/user `false`; `crear`/`editar` → solo dev/admin `true`. `ver`/`reimprimir`
  mapean a `leer`; `anular`/`liquidar` a `editar`/`crear`.
  - **`Detalle`:** antes visible+habilitado para los 5 roles (cero gating). Ahora oculto
    para `manager`/`user` — pierden un botón que nunca había estado restringido.
  - **`print`:** antes visible para todos, bloqueado visualmente solo para `demo`. Ahora
    oculto para `manager`/`user` (restricción nueva) y **`demo` pasa de bloqueado a
    habilitado** — `reimprimir` mapea a `leer`, que `demo` sí tiene en `finanzas`. No es
    solo "menos acceso": para `demo` es un desbloqueo real, consistente con que
    `firestore.rules` ya le permite leer el módulo — el gating viejo (mismo `ngClass` en
    los 3 botones, sin distinguir tipo de acción) era más restrictivo de lo necesario para
    una acción de solo lectura.
  - **`Eliminar`/`Factura`:** antes visibles y **sin ningún gating** para
    `manager`/`user` (solo `demo` estaba bloqueado) — esto significa que antes de este
    sub-bloque, `manager`/`user` podían ejecutar `anularProforma()`/`liquidarProforma()`
    sin ninguna restricción de rol ni de negocio. Ahora ambos botones quedan ocultos para
    `manager`/`user`/`demo`, visibles solo para `dev`/`admin` — cierra una exposición real
    que no estaba señalada como deuda explícita hasta este sub-bloque.
  - `dev`/`admin` sin cambios en los 4 botones, en las 3 tablas.

**Bloque 6 (sub-bloque 3) — `liquidaciones-op.component`** (reusado por 3 rutas:
cliente/chofer/proveedor vía `llamadaOrigen`). Estructura distinta a los sub-bloques
anteriores: dos columnas usaban `*appRole` sobre `<td>` completo (SVG crudo con `(click)`
directo, no `app-btn-*`), y el botón "Liquidar" mezclaba `[ngClass]` con `||` de regla de
UI + rol sobre un `<button>` crudo. Reutiliza `'editar'`/`'eliminar'` (ya existentes) y
`'liquidar'` (agregado en el sub-bloque de proforma, misma semántica: crea un `InformeLiq`
nuevo — acá vía `procesarInformeLiq → crearLiquidacion`) — sin extender
`AccionPermiso`/`mapaAccionCrud`.

- Botón "Liquidar" (el de `$`, dispara `liquidarInformesObjeto`): envuelto en
  `<ng-container *appPermiso="'liquidaciones.liquidar'">` (Angular no permite dos
  directivas estructurales en el mismo elemento). Adentro, `[disabled]="!mostrarTabla[i]"`
  como única fuente — el `[ngClass]="{isDisabled: !mostrarTabla[i] || esRol('demo')}"`
  quitado por completo. Regla de UI (fila expandida) y permiso quedan separados, mismo
  criterio que `tablero-op`.
- Columnas de acción de `informeOp` (editar con lápiz, eliminar con tacho), antes
  `<td *appRole="['dev','admin','manager']">`: reemplazadas por
  `<td *appPermiso="'liquidaciones.editar'">` y `<td *appPermiso="'liquidaciones.eliminar'">`
  respectivamente — **quitando `'manager'` de la lista** (decisión ya tomada en el frente:
  rol sin uso real, se le retira acceso visible en cada sitio migrado). El header
  combinado (`<th *appRole="['dev','admin','manager']" colspan="2">`) recibe
  `*appPermiso="'liquidaciones.editar'"` — alcanza con uno solo de los dos permisos
  porque ambas columnas comparten exactamente el mismo rol (`dev`/`admin`) hoy;
  simplificación válida mientras seguro sea así, a revisar si algún día divergen.
- Checkbox "seleccionar todos" y los individuales por fila (`liquidarBoleano`): sin
  gating — son estado de armado local que no escribe en Firestore, la escritura real
  ocurre recién en el botón "Liquidar" ya protegido. El `[ngClass]` de `esRol('demo')`
  en el checkbox "todos" se quitó sin reemplazo, mismo criterio que `Detalle` en
  proforma (preparación/lectura no requiere permiso).
- `usuarioSesion` confirmada con otro uso real (`getUsuarioActual()` en `ngOnInit`) — se
  mantiene, solo se quitaron las referencias puntuales a `esRol('demo')`.
- ⚠️ **Efecto real por rol, en los 3 orígenes (mismo componente reusado):**
  - **Editar/Eliminar de `informeOp`:** `manager` los veía (estaba en el `*appRole`) y
    ahora no — pérdida esperada, coherente con la decisión ya tomada sobre ese rol.
    `user` nunca los vio (no estaba en la lista original) y sigue sin verlos, sin cambio.
    `demo` tampoco los veía y sigue sin verlos, sin cambio.
  - **Botón Liquidar:** `demo` pasa de verlo gris (bloqueado) a no verlo — el caso
    señalado explícitamente. Pero además, **`manager` y `user` también lo pierden por
    completo** — antes lo veían plenamente habilitado (el único `esRol()` en el `ngClass`
    filtraba solo `demo`, sin ninguna restricción para `manager`/`user`), ahora
    `matrizBase.finanzas.crear` es `false` para ambos, así que el botón queda oculto.
    Es un cambio adicional no cubierto por la frase original del pedido ("demo pierde el
    botón Liquidar"), señalado acá igual que en los sub-bloques anteriores.
  - **Checkboxes de selección:** `demo` gana acceso (antes bloqueado visualmente, ahora
    sin restricción) — consistente con que es preparación local, no escritura.
  - `dev`/`admin` sin cambios en ningún elemento, en los 3 orígenes.

**Bloque 6 (sub-bloque 4, ÚLTIMO) — botón de alta de los 4 listados CRUD,
`vendedores-listado` (cards), `sidebar`, `nueva-facturacion/modal-detalle`.** Cierra el
barrido de `*appRole`/`esRol()`/`ngClass` sueltos del audit original.

- Botón de alta en `clientes-listado`/`choferes-listado`/`proveedores-listado`/
  `vendedores-listado` (`app-btn-leer` con `name="Cliente"/"Chofer"/"Proveedor"/"Vendedor"`):
  `[ngClass]` de `esRol('demo')` quitado, `modulo`/`accion="agregar"` agregado según cada
  listado. Decisión ya tomada: los botones `'Descargar X'`/`'X Visibles'` de estos mismos
  4 archivos quedan **sin tocar**, incluido el `ngClass` de `demo` en `'Visibles'` —
  fuera del alcance de este frente.
- `vendedores-listado` (único de los 4 con layout de cards, no `TablaGenericaComponent`
  — por eso no recibió el tratamiento del Bloque 4): `Editar`/`Eliminar` de cada card
  conectados a `modulo="vendedores"` `accion="editar"`/`"eliminar"`, `ngClass` de
  `esRol('demo')` quitado.
- `sidebar.component.html`: los 4 `@if (usuarioSesion.esRol(...))` reemplazados por
  `*appPermiso` envolviendo el `<li>` completo (directiva estructural, no `@if`):
  `Configuración`→`'usuarios.ver'`, `Facturación`→`'facturacion.ver'`,
  `Finanzas`→`'finanzas.ver'`, `Reportes`→`'reportes.ver'`. Verificado 1:1 contra la
  matriz real: Configuración/Facturación/Reportes coinciden exactamente con el
  comportamiento anterior (mismos roles, sin cambio). **Finanzas es el único cambio de
  comportamiento intencional del sub-bloque:** antes solo `dev` lo veía
  (`esRol('dev')` a mano, sin relación con la matriz real); migrado fiel a
  `matrizBase.finanzas.leer`, `admin` y `demo` GANAN visibilidad del link — no es un bug,
  es la corrección de una restricción que nunca reflejó la matriz real de permisos. El
  resto de los `<li>` del sidebar (clientes, choferes, proveedores, operaciones,
  liquidación, legajos, vendedores, migración) quedan sin gating — protegidos por
  `RoleGuard` a nivel de ruta, fuera de alcance. `usuarioSesion.getUsuarioActual()`
  (nombre de usuario) y "Cerrar Sesión" no se tocaron.
- `nueva-facturacion/modal-detalle.component.html`: único `*appRole` del archivo
  (`app-btn-eliminar name="Eliminar"`, dispara `bajaOp`) →
  `*appPermiso="'facturacion.eliminar'"`, quitando `'manager'`. Las columnas
  `excel`/`pdf`/`Detalle` de la misma fila quedan sin gating — no estaban en el listado
  original de `*appRole` del audit, fuera de alcance.

**Bloque 6 CERRADO.** Verificado por grep: el único `*appRole` que queda en toda la app
son los 6 sitios de Tarifas (`cliente`/`choferes`/`proveedores` × `gral`/`especial`),
excluidos a propósito — pertenecen al frente de Tarifas, pendiente y separado de este.
(`facturacion/modal-detalle` — legacy y comentado; eliminado en el frente Facturación, F0 — y `acciones-cell-renderer`, wrapper sin
caller activo, también usan `*appRole` pero están fuera de alcance por ser código muerto
u orfandad ya documentada, no por pertenecer a Tarifas.)

### Bloque 7 (ÚLTIMO del frente) — `tablero-asignaciones`, primer uso real de `overrides`

Dos franjas de botones crudos sin ningún gating hasta este bloque: 4 modales de gestión
(Choferes/Proveedores/Clientes/No Operativos — definen estado activo/no-disponible, no
son de lectura pura) y 4 acciones de tablero (Alta de Op/Guardar/Descargar/Limpiar — esta
última con el TODO comentado ya señalado como deuda, ahora resuelto). Requisito de
negocio explícito y verificado contra la matriz real: `'user'` (rol del único empleado
activo en producción, uso principal de este componente) conserva los 8 botones sin
excepción; `'demo'` no ve ninguno de los 8.

- `AccionPermiso` gana `'descargarTablero'` y `'limpiarTablero'`; `mapaAccionCrud`:
  `descargarTablero → 'leer'` (exporta, no escribe), `limpiarTablero → 'eliminar'`
  (borra el borrador en curso — acción destructiva, no una edición parcial).
- **Primeros dos `overrides` reales del servicio** (vacío desde el Bloque 1):
  - `'operaciones.descargarTablero': { demo: false }` — `'leer'` da `demo=true` por
    defecto en `operaciones`, pero el negocio pide bloquear puntualmente la descarga del
    tablero para `demo` sin afectar `'reimprimir'` en Facturación/Liquidaciones (que
    también mapea a `'leer'` pero en el módulo `finanzas`, sin relación).
  - `'operaciones.limpiarTablero': { user: true }` — `'eliminar'` da `user=false` por
    defecto en `operaciones`, pero `user` es el único empleado activo en producción y
    necesita conservar esta acción en su pantalla principal.
  - Ambos overrides son deliberadamente puntuales — no tocan `matrizBase` ni
    `mapaAccionCrud` en general, solo la combinación `modulo.accion` exacta que lo
    necesita. El resto de cada acción (`user` en `descargarTablero`, `demo` en
    `limpiarTablero`) sigue resolviendo por `matrizBase` sin override, y da el resultado
    correcto sin necesitarlo.
- Los 4 botones de gestión (franja izquierda): `<ng-container *appPermiso="'operaciones.editar'">`
  en los 4 — mismo permiso, todos gestionan disponibilidad/estado, no son de lectura.
- Los 4 de la franja derecha: Alta de Op → `'operaciones.agregar'`; Guardar →
  `'operaciones.editar'`; Descargar → `'operaciones.descargarTablero'`; Limpiar →
  `'operaciones.limpiarTablero'`. El `[disabled]` propio de cada botón (`isLoading`,
  `itemsBorrador.length`, `!tablero`) no se tocó — sigue siendo regla de UI/negocio,
  ortogonal al permiso, mismo criterio que todos los bloques anteriores. El TODO
  `agregar [disabled]="esRol('demo')"...` se eliminó, resuelto por este bloque.
- **Verificado contra la matriz real, exacto:** `user` ve y puede usar los 8 (izquierda:
  `editar`=true; Alta=`crear`=true; Guardar=`editar`=true; Descargar=`leer`=true vía
  `matrizBase` sin necesitar override; Limpiar=`eliminar`=false por defecto pero `true`
  vía el override). `demo` no ve ninguno (izquierda: `editar`=false; Alta=`crear`=false;
  Guardar=`editar`=false; Descargar=`leer`=true por defecto pero `false` vía el override;
  Limpiar=`eliminar`=false por defecto, sin necesitar override en ese lado). `dev`/`admin`
  sin cambios — ya tenían las 4 acciones (`leer`/`crear`/`editar`/`eliminar`) en `true`.

## Cierre del frente Botones y Permisos

Los 7 bloques (más las correcciones intercaladas: `matrizBase` por acción, `pointer-events`
en el host, el fix de `'electronica'`) dejan las 4 capas acordadas en el Bloque 1
operativas de punta a punta, con consumidores reales conectados:

1. **Dominio** — `PermisosService` (`servicios/permisos/`): `matrizBase` transcripción
   literal de `firestore.rules` por acción real (`leer`/`crear`/`editar`/`eliminar`, no
   por módulo — ver la corrección post-Bloque 4), `overrides` ahora con dos casos reales
   poblados (Bloque 7) para cuando el negocio necesita apartarse puntualmente de la
   matriz sin reinterpretarla. Reglas de negocio por fila (`puedeEditar(row)`,
   `puedeAnular(inf)`, etc.) siguen viviendo en cada componente, ortogonales al permiso.
2. **Gating** — `*appPermiso` (directiva estructural, oculta si no hay permiso) para
   botones crudos; inputs `modulo`/`accion` directo en los 4 `app-btn-*` para el caso más
   común. Ambos consumen `PermisosService.puede(modulo, accion?)` — misma firma pública
   desde el Bloque 1, nunca modificada pese a que la implementación interna sí cambió.
3. **Presentación** — los 4 `app-btn-*` (catálogo semántico cerrado por `name`) +
   `AccionGenericaComponent` (botones crudos con texto/variante/ícono libres). Los 5
   comparten el mismo bug estructural encontrado y corregido en el barrido
   (`@HostBinding('style.pointer-events')`: el `(click)` vive en el host en los ~95 call
   sites, no en el `<button>` interno, así que `disabled` por sí solo no bloqueaba clics
   en el margen del botón — corregido de raíz para los 5, sin tocar ningún caller).
4. **Consumidores** — `TablaAccionesComponent`/`TablaGenericaComponent`,
   `InformesAccionesCellComponent`/`InformesTablaComponent` (con el mismo campo
   `accionPermiso?` resolviendo los casos donde el id de negocio no coincide con el
   `AccionPermiso` real, ej. `excel`/`pdf`→`reimprimir`), y ~15 componentes migrados
   directamente (`tablero-op`, `proforma`, `liquidaciones-op`, los 4 listados CRUD +
   `vendedores-listado`, `sidebar`, `nueva-facturacion/modal-detalle`,
   `tablero-asignaciones`) — todos con el `*appRole`/`esRol()`/`ngClass` suelto que tenían
   reemplazado por `modulo`/`accion` real, y su efecto por rol verificado contra la
   matriz en cada bloque, no asumido.

**Estado final:** único `*appRole` restante en toda la app: los 6 sitios de Tarifas
(cliente/choferes/proveedores × gral/especial), excluidos a propósito — frente de Tarifas
aparte, no iniciado. `AccionesCellRendererComponent` (wrapper de AG Grid sin caller activo,
detectado en la auditoría original) queda sin consumidor real — no se le asignó uno en
este frente porque no lo necesitaba, no es deuda nueva. Pendiente real, fuera de este
frente: conectar `modulo`/`accion` en el resto de los ~90 sitios de uso directo de los 4
`app-btn-*` que la auditoría relevó pero que no tenían ningún `*appRole`/`esRol()`/`ngClass`
de por medio (no eran un problema de seguridad/UX a cerrar, quedan para cuando se toque
cada pantalla por otro motivo); diseño de un botón de acción genérico más rico en la capa
de Presentación, si se justifica más adelante; el `'manager'` sin acceso real documentado
como decisión, no deuda.

**Fix post-cierre (`firestore.rules`, no un bloque nuevo):** bug real detectado en
producción — `user` recibía "Missing or insufficient permissions" al limpiar un borrador
de `tablero-asignaciones`. El gating del cliente (Bloque 7) ya estaba correcto; el
servidor no lo reflejaba porque `moduloDe()` mapeaba `asignaciones` al mismo módulo que
`operaciones`, heredando su `eliminar=false` para `user`. Corregido desacoplando
`asignaciones` en su propia categoría de reglas (`dev`/`admin`/`user` con las 4 acciones,
sin restricción por acción — ver "Security Rules" en CLAUDE.md). Sin cambios en Angular
salvo agregar `matrizBase.asignaciones` en `PermisosService` por fidelidad de
transcripción (sin `ModuloPermiso` que la consuma todavía) — confirma que este frente,
una vez cerrado, sigue sirviendo como referencia para detectar y corregir esta clase de
divergencia cliente/servidor.

## Deuda abierta — control de permisos de UI disperso, sin fuente única

Detectado durante las pruebas del refactor de Roles: las Security Rules
nuevas bloquean correctamente acciones que la UI todavía muestra como
disponibles (ej. botón de baja de Operación/Cliente visible y clickeable
para rol `user`, que la regla rechaza — comportamiento seguro, pero mala
UX: el usuario ve un error de permisos en vez de no ver la opción).

Causa: el control de qué se muestra vive disperso en `*appRole` puntual
por template, sin relación con la matriz real de Security Rules — son
dos fuentes de verdad independientes, mantenidas a mano, que ya
divergieron al menos en los dos casos detectados (sin auditoría
exhaustiva del resto de los módulos).

**En progreso:** ver "Frente Botones y Permisos" más arriba.

**Parcialmente cerrado (Bloque 4 + corrección de granularidad):** el caso concreto que
motivó esta entrada de deuda — "ningún `accionesTabla` de los 3 listados CRUD vía
`TablaAccionesComponent` aplica chequeo de rol a editar/eliminar" — ya no es cierto para
`clientes-listado`/`choferes-listado`/`proveedores-listado`/`gestion-usuarios`: los 4
pasan `modulo` a `app-tabla-generica`, que lo reenvía a `app-tabla-acciones` y de ahí a
cada `app-btn-*`. Con `matrizBase` ya corregida a granularidad por acción (ver "Frente
Botones y Permisos" → corrección post-Bloque 4): `manager` pierde `ver`/`editar`/
`eliminar`/`vehiculos` en los 3 listados CRUD; `user`/`demo` pierden `eliminar` ahí
también (`demo` pierde además `editar`); `gestion-usuarios` oculta editar/eliminar para
`user`/`demo` (antes solo corría la regla de jerarquía `editarDeshabilitado`/
`eliminarDeshabilitado`, sin ningún filtro de rol de acceso al módulo).

El caso original citado en el ejemplo de esta deuda, `operaciones.eliminar` para `user`,
ya daba el resultado correcto (`false`) en `PermisosService` sin necesitar ningún
`override` desde la corrección de granularidad — pero seguía sin conectar a `tablero-op`.
**Cerrado en el Bloque 6 (sub-bloque 1):** `tablero-op.component.html` ya pasa
`modulo="operaciones"` + `accion` (`ver`/`editar`/`eliminar`/`cerrar`) a los 4 botones de
la fila y `*appPermiso="'operaciones.agregar'"` al botón de alta — el botón de baja de
Operación para `user` ahora refleja el resultado correcto en la UI (oculto, no solo
bloqueado al escribir). Detalle completo en "Frente Botones y Permisos" → Bloque 6. El
resto de los `*appRole`/`esRol()` puntuales sigue sin migrar, ver "Pendiente" ahí.

# Auditoría — No disponibilidad de choferes, vehículos y choferes de proveedor

Fecha: 2026-10-29 · Rama: `refactor`

## Alcance

Relevado:
- Modelo `NoDisponibilidadChofer` y colección `noOperativo` (escritura, lectura, caché, reglas).
- Regla de fechas (`no-disponibilidad.util.ts`) y sus copias.
- Consumidores: modal de gestión, `carga-asignacion`, `tablero-asignaciones`, informe del
  tablero (Excel/PDF), alta y edición de operaciones (`OperacionService`,
  `operaciones-editor`, `ResolucionTarifaOpService`), generador de demo.
- Existencia de cualquier concepto de no disponibilidad para vehículos, proveedores y
  choferes de proveedor.
- Deuda ya registrada en CLAUDE.md y en las skills `modulo-operaciones`, `subsistema-log`,
  `subsistema-papelera`, `exportacion-excel-pdf`, `botones-y-permisos`, `herramientas-demo`.

Fuera de alcance:
- El flag `activo` de Chofer/Proveedor (lo cambia `modal-objetos-activos`) y la
  documentación vencida de Legajos: se relevaron solo para confirmar si actúan como
  bloqueo de disponibilidad en asignaciones/operaciones (no actúan, ver "Dependencias"),
  no en su propio funcionamiento.
- Datos reales en Firestore (demo o `pf-logistics`): no se consultaron.
- Comportamiento en ejecución: todo lo de abajo surge de leer el código; no se ejecutó la
  app. En particular el hallazgo 1 de "Inconsistencias" no se reprodujo en el navegador.

## Inventario de archivos

| Archivo | Tipo | Rol |
|---|---|---|
| `src/app/interfaces/no-disponibilidad-chofer.ts` | Interfaz | Modelo `NoDisponibilidadChofer` |
| `src/app/shared/utils/no-disponibilidad.util.ts` | Util puro | Regla "¿cubre la fecha?" y motivo |
| `src/app/raiz/operaciones/modal-choferes-no-disponibles/` (`.ts`, `.html`, `.scss`, `.spec.ts`) | Componente (modal, no standalone) | Único punto de alta/edición/desactivación |
| `src/app/raiz/operaciones/tablero-asignaciones/tablero-asignaciones.component.{ts,html,scss}` | Componente | Atenúa vehículos de choferes directos no disponibles, bloquea el drop, abre el modal, exporta |
| `src/app/raiz/operaciones/carga-asignacion/carga-asignacion.component.{ts,html}` | Componente | Separa choferes directos disponibles / no operativos, abre el modal |
| `src/app/raiz/operaciones/operaciones.module.ts` | Módulo | Declara el modal (`:18`, `:37`) |
| `src/app/raiz/home/home.component.ts` | Componente shell | Abre el listener de `noOperativo` (`:62`) |
| `src/app/servicios/storage/storage.service.ts` | Servicio (modelo viejo) | Listener → localStorage, `addItem`/`updateItem`, `controlLog` |
| `src/app/servicios/database/db-firestore.service.ts` | Servicio | `getAllStateChangesByField`, `create`, `update`, `getMostRecentLimitId`, `obtenerTodosConId` |
| `src/app/servicios/log/log.service.ts` | Servicio (log viejo) | `logEvent` en colección `logs` |
| `src/app/shared/utils/documento-asignaciones.util.ts` | Util | Hoja "No disponibles" del informe del tablero |
| `src/app/servicios/operaciones/asignaciones-export.service.ts` | Servicio | Fachada del informe del tablero |
| `src/app/servicios/tarifario/resolucion-tarifa-op.service.ts` | Servicio | `choferesDisponibles` / `vehiculosDisponibles` del editor (no mira no disponibilidad) |
| `src/app/servicios/choferes/chofer.service.ts` | Servicio | `getChoferesActuales`, `getChoferesPorProveedor` |
| `src/app/servicios/desarrollo/generador-operaciones.service.ts` | Servicio (solo demo) | Lee `noOperativo` y aplica su propia copia de la regla |
| `firestore.rules` | Reglas | `'noOperativo': 'operaciones'` (`:32-35`) |
| `src/app/interfaces/chofer.ts`, `src/app/interfaces/proveedor.ts` | Interfaces | `activo`, `contratacion`, `Vehiculo.asignadoA` |

No hay Cloud Functions que lean o escriban `noOperativo` (búsqueda en `functions/src` sin
resultados). No hay índice para `noOperativo` en `firestore.indexes.json`.

## Interfaces y tipos

`src/app/interfaces/no-disponibilidad-chofer.ts:1-8` (archivo completo):
```ts
export interface NoDisponibilidadChofer {
    idNoDisponibilidad: string;
    idChofer: string;
    desde: string;
    hasta: string | null;
    motivo?: string;
    activa: boolean;
}
```

Tipo de vista local, `modal-choferes-no-disponibles.component.ts:13-15`:
```ts
interface NoDisponibilidadChoferView extends NoDisponibilidadChofer {
  nombreChofer: string;
}
```

Relacionados:
- `interfaces/conId.ts:1` `ConId<T> = T & { id: string }`; `:3` `ConIdType<T> = T & { id: string, type: string }`.
- `shared/utils/fecha.util.ts:18` `FechaNegocio = string`.
- `interfaces/chofer.ts:11` `activo: boolean`; `:7` `contratacion: ContratacionChofer`;
  `:15-17` `ContratacionChofer = { tipo: 'directo' } | { tipo: 'proveedor'; idProveedor: string }`.
- `Vehiculo` (`interfaces/chofer.ts:31-44`): sin `activo` ni ningún campo de
  disponibilidad; solo `asignadoA` (`:43`, `:46-48`:
  `{ tipo: 'chofer'; idChofer } | { tipo: 'proveedor'; idProveedor }`).
- `interfaces/proveedor.ts:13` `activo: boolean`.

No existe interfaz, campo ni colección de no disponibilidad para vehículos ni para
proveedores.

## Servicios y métodos

| Servicio | Método | Qué hace | Escribe en | Atómico |
|---|---|---|---|---|
| `no-disponibilidad.util` | `cubreFecha` (`:26-28`) | `fecha >= nd.desde && (!nd.hasta \|\| fecha <= nd.hasta)`, comparación de strings | — | — |
| `no-disponibilidad.util` | `noDisponibilidadesEnFecha` (`:31-36`) | Filtra la lista por `cubreFecha` | — | — |
| `no-disponibilidad.util` | `choferesNoOperativos` (`:39-44`) | `Set` de `idChofer` que cubren la fecha | — | — |
| `no-disponibilidad.util` | `motivoNoDisponibilidad` (`:48-50`) | `nd.motivo \|\| 'No disponible'` | — | — |
| `no-disponibilidad.util` | `motivoNoDisponibilidadDe` (`:53-60`) | Motivo de la primera que cubre la fecha para ese chofer, o `''` | — | — |
| `StorageService` | `listenForChangesField` (`:154-187`) | `onSnapshot` con `where activa == true` (vía `db-firestore.service.ts:433-462`), merge sobre `loadInfo` y `setInfo` | localStorage `'noOperativo'` | — |
| `StorageService` | `setInfo` / `updateObservable` (`:68-73`, `:42-64`) | Guarda en localStorage; `updateObservable` no tiene caso `noOperativo` (`default: break`) | localStorage | — |
| `StorageService` | `getObservable` (`:189-202`) | Solo `clientes`/`choferes`/`proveedores`/`users`; `default` lanza `Error('Componente no reconocido')` | — | — |
| `StorageService` | `addItem` (`:204-217`) | `dbFirebase.create` (= `addDoc`, `db-firestore.service.ts:713-723`) y después `logService.logEvent` | `noOperativo` + `logs` | No (dos escrituras separadas, `void`, sin `await`) |
| `StorageService` | `updateItem` (`:233-247`) | `dbFirebase.update` (= `updateDoc` sobre el doc id, `db-firestore.service.ts:725-734`) y después `logEvent` | `noOperativo` + `logs` | No |
| `StorageService` | `controlLog` (`:249-`, caso en `:271`) | `noOperativo` loguea toda acción salvo `INTERNA` | — | — |
| `LogService` | `logEvent` (`log.service.ts:16-32`) | `setDoc` en `/Vantruck/datos/logs`; omitido para rol `dev` (`storage.service.ts:208`, `:239`) | `logs` | — |
| `DbFirestoreService` | `getMostRecentLimitId` (`:242-266`) | `getDocs` con `orderBy(desde desc)`, `limit`, `where activa == false` (historial del modal) | — | — |
| `DbFirestoreService` | `obtenerTodosConId` (`:972-976`) | `getDocs` de toda la colección (generador) | — | — |
| `GeneradorOperacionesService` | lectura (`:186-188`) | Lee toda `noOperativo`, filtra `activa` | — | — |
| `GeneradorOperacionesService` | `choferesNoDisponibles` (`:588-594`) | Copia propia de la regla de `cubreFecha` (no importa el util) | — | — |
| `GeneradorOperacionesService` | `poolDelDia` (`:598-615`) | Excluye choferes directos y de proveedor no disponibles; un vehículo de proveedor entra si el proveedor tiene al menos un chofer disponible | — | — |
| `ResolucionTarifaOpService` | `choferesDisponibles` (`:43-46`) | `getChoferesPorProveedor(op.proveedor.id)` sin filtro de no disponibilidad ni de `activo` | — | — |
| `ResolucionTarifaOpService` | `vehiculosDisponibles` (`:50-61`) | Filtra vehículos solo por dueño | — | — |
| `ChoferService` | `getChoferesPorProveedor` (`chofer.service.ts:406-411`) | Filtra solo por `contratacion.idProveedor` | — | — |
| `OperacionService` | `crearOperacionesDesdeAsignacion` (`:122-198`), `altaDesdeAsignacion` (`:205-`), `editarOperacion` (`:665-686`) | Ninguna guarda de no disponibilidad (las guardas existentes: tarifa, contratación, proveedor, borrador `'bloquear'`, chofer/vehículo pendiente) | — | — |

No hay `XxxService` ni `XxxFactoryService` de no disponibilidad: la escritura vive en el
componente modal.

## Componentes y puntos de consumo

| Componente | Cómo lo usa | Archivo |
|---|---|---|
| `ModalChoferesNoDisponiblesComponent` | Lista activas con `storageService.getObservable('noOperativo')` (`:76-86`, desde `ngOnInit:68` y `verHistorial:243`); historial con `getMostRecentLimitId` (`:160-169`); alta `addItem` (`:117`), edición `updateItem` "EDICION" (`:115`), desactivación `updateItem` "BAJA" con `activa=false` (`:197-238`). Sin `@Input`/`fromParent`. Lista de choferes = `getChoferesActuales()` completa, sin filtrar contratación ni `activo` (`:65`). Ningún botón con `*appPermiso`/`*appRole`. | `raiz/operaciones/modal-choferes-no-disponibles/modal-choferes-no-disponibles.component.ts`, `.html` |
| `TableroAsignacionesComponent` | Suscribe `getObservable('noOperativo')` en `ngOnInit` (`:161-176`), filtra `activa`, quita `id`/`type` con `as any`. `vehiculoNoOperativo` (`:835-840`) solo para vehículos de chofer directo; clase `.no-operativo` + `cdkDragDisabled` + `title` con motivo en el pool (`.html:221-241`, `.scss:216`); guarda en `onDropEnCliente` (`:368-374`). Recalcula al iniciar con borrador (`:129`), al cambiar fecha (`:245`) y al llegar datos (`:174`). No revalida en `guardarBorrador` (`:485-522`) ni en `altaOp` (`:524-610`). Abre el modal (`:853-856`, botón con `*appPermiso="'operaciones.editar'"`, `.html:32-39`). Pasa las activas al informe (`:699`). | `raiz/operaciones/tablero-asignaciones/` |
| `CargaAsignacionComponent` | Suscribe `getObservable('noOperativo')` en `ngOnInit` (`:124-138`). `choferesDirectosDisponibles` / `choferesDirectosNoOperativos` (`:179-187`) sobre `choferesDirectosBase` (solo directos activos con vehículos, `:155-166`). `proveedoresBase` (`:168-176`) no se filtra ni marca. Fecha: `fechaSeleccionada` (`onFechaChange :193-210`). `altaOp` (`:329-399`) no revalida. Abre el modal (`:412-415`); el botón "No Operativos" (`.html:42-47`) no tiene `*appPermiso`. | `raiz/operaciones/carga-asignacion/` |
| `OperacionesEditorComponent` | `choferesDisponibles(op)` (`.ts:151-154`) y `vehiculosDisponibles(op)` (`.ts:196-197`) delegan en `ResolucionTarifaOpService`; la autoselección con opción única (`.ts:125-138`) tampoco mira no disponibilidad. | `raiz/operaciones/operaciones-editor/` |
| Informe del tablero | `armarFilasNoDisponibles` (`documento-asignaciones.util.ts:167-185`): una fila por chofer no disponible en la fecha y por vehículo propio (`vehiculosPorChofer`); chofer sin vehículos → dominio/categoría vacíos; id no resuelto → "Sin resolver". Hoja "No disponibles" (`:99-112`) con nota (`:110`): "La no-disponibilidad del sistema es solo de choferes: no se puede marcar como no disponible a un proveedor ni a un vehículo suelto." | `shared/utils/documento-asignaciones.util.ts`, `servicios/operaciones/asignaciones-export.service.ts:33-44` |
| `HomeComponent` | `listenForChangesField<NoDisponibilidadChofer>("noOperativo", "activa", true)` (`:62`) | `raiz/home/home.component.ts` |
| Generador de demo | Lee toda la colección y aplica su copia de la regla a directos y choferes de proveedor (`:186-188`, `:399`, `:581-585`, `:588-615`) | `servicios/desarrollo/generador-operaciones.service.ts` |

Falso positivo descartado: `shared/modales/compensaciones-liq/` usa "disponible" como
saldo de un movimiento financiero, sin relación con `noOperativo`.

## Colecciones de Firestore involucradas

**`/Vantruck/datos/noOperativo`**
- Forma: `{ idNoDisponibilidad: string, idChofer: string, desde: 'YYYY-MM-DD', hasta: 'YYYY-MM-DD' | null, motivo?: string, activa: boolean }`.
- Doc id: automático (`addDoc`), distinto de `idNoDisponibilidad` (timestamp + random,
  `modal:104`). Las ediciones usan el doc id (`this.bajaOp.id`); el log usa `idNoDisponibilidad`.
- Escribe: solo `ModalChoferesNoDisponiblesComponent` vía `StorageService.addItem`/`updateItem`.
  Sin delete (la baja es `activa=false`).
- Lee: listener de `HomeComponent` (solo `activa == true`, a localStorage); historial del
  modal (`activa == false`, `getDocs`); generador de demo (`getDocs` de todo).
- Reglas (`firestore.rules:32-35`, `:154-158`): módulo `operaciones` → `dev`/`admin` todo;
  `user` leer/crear/editar; `demo` leer; `manager` sin acceso. Según la skill
  `herramientas-demo` (`SKILL.md:96-97`) este mapeo está desplegado solo en demo.
- No está en `LimpiezaDemoService.COLECCIONES_A_VACIAR` (`limpieza-demo.service.ts:53-71`)
  ni en `PapeleraService`.

**`/Vantruck/datos/logs`** — log viejo: `LogService.logEvent` después de cada escritura
(acciones `ALTA`, `EDICION`, `BAJA`).

**localStorage `noOperativo`** — caché escrita por el listener; no hay observable que la emita.

## Dependencias con otros módulos

- **StorageService / LogService (modelo viejo):** toda la escritura y la lectura de UI
  pasan por ahí. Es el primer eslabón registrado de la cadena
  `rehacer noDisponibilidad → eliminar log viejo → eliminar Papelera legado`
  (skills `modulo-operaciones` `:296-302`, `subsistema-log` `:552-559`,
  `subsistema-papelera` `:185-191`).
- **Asignaciones (modelo nuevo):** `tablero-asignaciones` y `carga-asignacion` consumen la
  regla; el `TODO: migrar ModalChoferesNoDisponiblesComponent al modelo nuevo (frente aparte)`
  está en `tablero-asignaciones.component.ts:854` y `carga-asignacion.component.ts:413`.
- **Choferes / Proveedores (modelo nuevo):** solo se lee `getChoferesActuales`. El flag
  `activo` (cambiado por `modal-objetos-activos.component.ts:66-79`, con `TODO` de log)
  filtra los pools en `carga-asignacion.ts:156,169` y `tablero-asignaciones.ts:744,758`,
  independiente de `noOperativo`.
- **Operaciones (modelo nuevo):** `OperacionService` y `operaciones-editor` no consultan la
  no disponibilidad.
- **Legajos:** el estado vencido de la documentación no aparece en `carga-asignacion`,
  `tablero-asignaciones` ni `servicios/operaciones`; solo se muestra en la ficha
  (`shared/ficha-entidad/ficha-entidad.util.ts:43,53`) y en `raiz/legajos/`.
- **Exportación:** `AsignacionesExportService` → `documento-asignaciones.util`.
- **Permisos:** botón del tablero con `operaciones.editar`; botón de `carga-asignacion` y
  acciones del modal sin gating de UI (las reglas de Firestore sí restringen).
- **Herramientas de demo:** el generador depende de la forma del documento.

## Inconsistencias y deuda detectada

1. **`getObservable('noOperativo')` lanza error.** `StorageService.getObservable`
   (`storage.service.ts:189-202`) no tiene caso `noOperativo` y su `default` hace
   `throw new Error(...)`. Lo llaman `tablero-asignaciones.component.ts:162-163`,
   `carga-asignacion.component.ts:124-125` y `modal-choferes-no-disponibles.component.ts:77-78`.
   El caso (y `_noOperativo$`) lo eliminó el commit `6f350b5` (LR2a, 2026-10-12), cuyo
   mensaje dice "Sin cambio de comportamiento: quedan los 4 observables con suscriptores".
   Por lectura de código: en los tres componentes `noDisponibilidades` queda en `[]`, por lo
   que ningún chofer se marca como no operativo y la hoja "No disponibles" del informe sale
   vacía; en el modal, la lista de activas no se carga. No reproducido en ejecución. La
   verificación de AS1 (posterior, `72e7d2d`, 2026-10-20; `CHANGELOG.md:2346-2353`) se hizo
   con build y archivos generados, no ejecutando la pantalla.
2. **Escritura no atómica y sin `await`.** `addItem`/`updateItem` son `void`; el log se
   escribe aparte después del `then`. El `try/catch` del modal (`:112-136`, `:207-233`) no
   recibe errores de Firestore; el Swal de éxito (`:121`, `:218`) se muestra antes de que
   termine la escritura; los errores se tragan con `console.log(e.message)`
   (`storage.service.ts:216`, `:246`).
3. **Log viejo.** Usa `LogService` (`logs`), no `LogRegistroService`. Acción `"EDICION"`
   en vez de `EDITAR`; la desactivación se loguea como `"BAJA"` siendo un update.
4. **Regla duplicada.** `generador-operaciones.service.ts:588-594` repite la condición de
   `cubreFecha` en lugar de importar el util. El fallback `|| 'No disponible'` se repite en
   `carga-asignacion.ts:221-223` y `tablero-asignaciones.ts:831-832` sobre
   `motivoNoDisponibilidadDe`, que ya lo aplica.
5. **`activa` filtrada en tres capas:** query del listener (`home:62`), `.filter(n => n.activa)`
   en cada suscriptor y en el generador (`:188`); el util no la mira (docblock `:22-23`).
6. **Choferes de proveedor: se pueden cargar pero nada los aplica en la UI.** El modal lista
   todos los choferes (`:65`). El tablero (`:368-374`, `:835-840`) y `carga-asignacion`
   (`:155-156`, `:180-187`) solo aplican a directos. El comentario de
   `tablero-asignaciones.ts:836-837` dice que la disponibilidad del chofer de proveedor "se
   gestiona allí" (editor), pero `ResolucionTarifaOpService.choferesDisponibles`
   (`:43-46`) no la consulta. El único que la aplica a choferes de proveedor es el generador
   de demo.
7. **Vehículos y proveedores:** no existe no disponibilidad propia. La de un chofer directo
   se propaga a sus vehículos solo en el tablero y en el informe.
8. **Sin revalidación al confirmar.** `guardarBorrador`, `altaOp` (tablero y carga),
   `altaDesdeAsignacion` y `editarOperacion` no verifican no disponibilidad; solo actúan las
   guardas de UI al arrastrar/seleccionar. Ítems ya colocados en el tablero no se marcan
   (`.html:299` usa `.no-operativo` solo para anulados).
9. **Validaciones del modal:** solo `form.invalid`. No chequea `desde <= hasta`, solapamiento
   con otra no disponibilidad del mismo chofer, `activo` del chofer, ni operaciones o
   asignaciones existentes en el rango.
10. **`hasta` required vs. "Sin definir":** `hasta: ['', Validators.required]` (`:58`) y
    `toggleSinDefinir` (`:265-274`) deshabilita el control; el valor sale de `form.value`
    y `:107` lo convierte a `null`.
11. **Tipos del id en edición:** `idEditando: number | null` (`:36`) contra
    `idNoDisponibilidad: string`; `:178` `Number(...)` y `:104` `String(...)`.
12. **Genéricos inconsistentes para el mismo dato en el modal:** `ConId<...>[]` (`:35`),
    `getObservable<ConIdType<...>>` (`:78`), `getMostRecentLimitId` devuelve `ConId<T>[]`
    (`:163`), `ConIdType<NoDisponibilidadChoferView>` (`:37`, `:176`, `:197`); `:210`
    desestructura `type`, que los registros del historial no traen.
13. **`patchValue` de un control inexistente:** `activa` (`:186`) no está en el form (`:55-60`).
14. **Mutaciones en sitio:** `:66` ordena el array devuelto por `getChoferesActuales()`
    (valor del BehaviorSubject de `ChoferService`); `:209` muta `n.activa` del objeto de la
    vista antes de escribir.
15. **Historial:** "No hay registros" (`.html:168`) depende de `noDisponibilidades.length`,
    la tabla itera `noDisponibilidadesView`; `verHistorial` (`:240-247`) vacía la primera y
    no la segunda.
16. **`any`:** `noDisponibilidadesView: any[]` (`modal:40`), `toggleSinDefinir(event: any)`
    (`:265`), `n as any` en `tablero-asignaciones:170` y `carga-asignacion:132`, firmas
    `any` de `StorageService`/`DbFirestoreService`.
17. **Código comentado:** `modal:67` (`loadInfo`), `:81`, `:83`; checkbox `activa` comentado
    en `modal.html:55-60`; `console.log` activo en `modal:213`.
18. **Spec:** `modal-choferes-no-disponibles.component.spec.ts:10-12` importa como
    standalone un componente `standalone: false`.
19. **Referencia de documentación desactualizada:** el docblock de
    `no-disponibilidad.util.ts:21` remite a CLAUDE.md ("Deuda — no-disponibilidad y
    tablero"); esa sección hoy está en la skill `modulo-operaciones`, `:275`.
20. **Permiso del botón de descarga:** el tablero usa `operaciones.descargarAsignaciones`
    (`.html:165-174`); la skill `botones-y-permisos` (`:527-528`) nombra
    `operaciones.descargarTablero` para ese botón (el CHANGELOG `:2335-2336` registra el
    cambio a `descargarAsignaciones`).

Deuda ya registrada (no nueva): rediseño con sujeto discriminado
(chofer-entidad / proveedor-entidad / vehículo / chofer-de-proveedor) y "no-disponibilidad
sin probar end-to-end" (skill `modulo-operaciones` `:252-254`, `:275-302`; CLAUDE.md, "Deuda
abierta"). El hallazgo 1 no figura en ninguna deuda registrada.

## Preguntas abiertas

- ¿El hallazgo 1 se manifiesta en demo tal como surge del código (error en consola al abrir
  el tablero, la carga o el modal, y ningún chofer atenuado)? No se ejecutó la app.
- ¿Hay documentos en `noOperativo` cargados para choferes de proveedor, en demo o en
  `pf-logistics`? Determina si el hueco del punto 6 tiene datos afectados.
- ¿`pf-logistics` tiene `noOperativo` mapeado en sus reglas desplegadas? La skill
  `herramientas-demo` indica que el mapeo se desplegó solo en demo.
- ¿Existen en datos reales no disponibilidades solapadas del mismo chofer o con
  `hasta < desde`? El modal no lo impide.
- ¿El estado `activo` de chofer/proveedor y la documentación vencida forman parte del mismo
  concepto de "disponibilidad" o quedan separados? Hoy son mecanismos independientes.
- ¿La no disponibilidad debe revalidarse al guardar/dar de alta (tablero, carga,
  `altaDesdeAsignacion`) o alcanza con las guardas de UI? Hoy solo hay guardas de UI.

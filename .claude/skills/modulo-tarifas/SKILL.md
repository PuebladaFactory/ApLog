---
name: modulo-tarifas
description: Tarifario nuevo de ApLog (colecciones tarifas, tarifasEspeciales y registrosOpEventuales; TarifarioService, ValoresTarifaService) — tarifas General, Especial, Personalizada y Eventual, versionado append-only con vigenciaDesde, tarifas habilitadas por entidad (RefTarifaHabilitada) y el cálculo de valoresNuevos de una operación. Leer antes de trabajar sobre tarifas, precios, tarifas habilitadas o el cálculo de valores de una operación.
---

### Decisiones de arquitectura — mini-frente RefTarifaHabilitada (multiplicidad de tarifas)

Patrones fijados al resolver "una entidad puede tener múltiples tarifas habilitadas a
la vez"; aplican como precedente al frente grande de Tarifas.

> **Nota (cierre de Tarifas, Octubre 2026):** `RefTarifaHabilitada` ya no lleva
> `idTarifa` en ningún nivel: es solo `{ nivel }`, y la tarifa concreta se elige por
> operación. Lo que sigue sobre `idTarifa` en especial/personalizada es histórico; los
> patrones (union discriminada, `null` explícito, puente con vencimiento, preservar
> sub-estado no editable) siguen valiendo.

**Union type discriminado por `nivel`, no un array de un tipo único con campos
opcionales.** `RefTarifaHabilitada` fuerza en el tipo que solo `especial`/
`personalizada` tienen `idTarifa` — `general`/`eventual` no pueden tenerlo por
error. Mismo criterio que `SujetoAsignacion`/`ContratacionChofer` en el resto del
proyecto.

**`null` explícito en vez de estado "vacío pero técnicamente presente", cuando el dato
no aplica.** `Chofer.tarifasHabilitadas: null` para chofer de proveedor, en vez de `[]`
o de copiar la lista del proveedor al chofer. Un array vacío sería ambiguo ("no tiene
ninguna tarifa" vs. "no aplica, mirar al proveedor"); copiar la lista duplica un
estado que requeriría sincronizarse ante cada cambio del proveedor — mismo problema que
ya tenía `ChoferFormData.tarifaTipo` antes de este frente. La resolución por ID contra
el servicio vivo (patrón ya establecido en el proyecto) no tiene costo real: es un
`.find()` en memoria sobre un `BehaviorSubject` ya cacheado, no una consulta a
Firestore.

**Puente de compatibilidad temporal, con TODO explícito de cuándo desaparece.**
`habilitadasDesdeTarifaTipo` (inverso) existió solo mientras los formularios producían
selección única; se eliminó al conectar los componentes al modelo real de lista, en el
mismo bloque que originalmente lo marcó como su fecha de vencimiento. Útil como
plantilla: un shim temporal necesita, desde que se escribe, el comentario de qué
bloque futuro lo hace innecesario — no un TODO genérico sin fecha.

**Preservar sub-estado no editable en la UI al reconstruir un objeto desde el
formulario.** El formulario solo administra el booleano (¿está habilitado o no?), nunca
`idTarifa` (responsabilidad de otro módulo). Al editar, si un nivel especial/
personalizada no se destildó, se reusa su `idTarifa` real guardado al cargar el form,
en vez de reconstruirlo con `''` cada vez — evitar que un formulario que solo conoce
una parte del objeto destruya silenciosamente la parte que no administra.

## Frente Tarifas — tarifario nuevo (Agosto–Octubre 2026)

Reemplaza al sistema viejo: 7 colecciones vigentes por entidad (`tarifasGral*`,
`tarifasEsp*`, `tarifasPersCliente`) + 7 historiales + `tarifasEventuales`, pantallas
de tarifas dentro de Clientes/Choferes/Proveedores, `TarifasService` y el tipo de tarifa
de 4 booleanos. El tarifario nuevo factura todo desde el alta. El cierre del frente
(Octubre 2026, bloques TC1–TC11, TC-R1–TC-R5, TC-L y TC-P1) retiró el módulo viejo y
los campos legacy de `Operacion` y de las entidades, y corrigió bugs del motor. Diseño y
avance: `claude/diseno-tarifas-cierre.md` (Project).

### Modelo
- `interfaces/tarifa.ts` — `TarifaBase`: `idTarifa` (id del documento, poblado al
  leer), `nivel`, `idEntidadDueño` (null en General), `nombre`, `modoTarifacion`
  ('categoria' | 'km'), `kmDistancia`, `activo`, `vigenciaDesde`, `versionAnteriorId`,
  `fechaActualizacion?`, `actualizadoPor?`, `metadataAumento?`. `Tarifa` (General y
  Personalizada): secciones de `CategoriaTarifa` (`aCobrar`, `aPagar`,
  `aPagarProveedor?` y adicional por km por columna), acompañante por columna,
  `usaValoresProveedor`.
- `interfaces/tarifa-especial.ts` — `TarifaEspecial`: parche de la General para UNA
  entidad (`entidadTipo` + `idEntidadDueño`), solo con las categorías elegidas; un
  `valor` por categoría (la columna del lado de esa entidad) y `adicionalAcompaniante`.
  `alcance`: `entidad` o `entidadCliente` (chofer/proveedor: rige solo con ese cliente).
- General: singleton (una sola activa; `crearTarifa` lo valida). Personalizada: solo
  Clientes, varias vigentes posibles, y define LOS DOS lados (el lado chofer espeja la
  misma referencia). Especial: varias vigentes por entidad. Eventual: sin documento de
  tarifa.
- `registrosOpEventuales` (`RegistroOpEventual`, 3 lados): historial de operaciones
  eventuales; `estado?` ('activo' | 'anulado') + `anulacion`; sin `estado` = activo
  (registros migrados).
- `RefTarifaAplicada` (`interfaces/ref-tarifa-aplicada.ts`): `idTarifa`, `nivel`,
  `nombreTarifa`, `seccion`/`nombreSeccion`, `categoria`/`nombreCategoria` — referencia
  congelada de la tarifa usada en un lado de la operación.

### Versionado append-only y vigencia por fecha
- Editar o aumentar = documento nuevo con `versionAnteriorId` = el anterior; el
  anterior queda `activo: false` con `fechaActualizacion` = `vigenciaDesde` de la nueva.
  Los valores de una versión nunca se modifican. Baja sin reemplazo (`darDeBaja*`):
  `activo: false`, irreversible (para volver, se carga una tarifa nueva).
- `TarifarioService.nuevaVersionTarifa*` / `darDeBajaTarifa*` corren en
  `commitEnTransaccion`: releen el documento y abortan si ya no está activo (dos
  ediciones simultáneas no bifurcan el linaje), con el log adentro (EDITAR con diff
  contra la versión anterior / BAJA).
- Vigencia POR FECHA (`shared/utils/vigencia-tarifa.util.ts`, puro): una versión rige
  en la fecha F si `vigenciaDesde <= F < fin`; `fin` = `vigenciaDesde` de la versión
  que la reemplaza; sin sucesora y dada de baja, su `fechaActualizacion`; sin sucesora y
  activa, sin fin. `getTarifaGeneralVigente(fecha?)`,
  `getTarifasPersonalizadasVigentes(id, fecha?)` y `getTarifasEspecialesVigentes(id,
  fecha?)`: sin fecha, las activas hoy (pantallas de Tarifas); con fecha, las vigentes
  ese día (operaciones: candidatos y acompañante eventual a `op.fecha`). Un aumento con
  `vigenciaDesde` futura no rige hasta esa fecha.
- `vigenciaDesde` manual (fechas retroactivas): solo rol `dev`, para la migración.

### Servicios (`servicios/tarifario/`)
| Servicio | Responsabilidad |
|---|---|
| `TarifarioService` | Listener en memoria de `tarifas`, `tarifasEspeciales` y `registrosOpEventuales` (TODAS las versiones: hacen falta para la vigencia por fecha); getters por id y vigentes; alta, versionado y baja; escrituras del `RegistroOpEventual` (alta en el cierre, anulación en la baja de una cerrada) |
| `TarifaFactoryService` / `TarifaEspecialFactoryService` | Arman el documento desde el form (puros) |
| `TarifaGuardadoService` | Guardado centralizado de forms y aumentos (crear o versión nueva) y bajas, con sus avisos |
| `ValoresTarifaService` | Motor: `listarCandidatosLado`, `resolverSeccionCategoria`, `armarRefManual`, `calcularAlta`, `calcularCierre`, `armarRegistroEventual` |
| `ResolucionTarifaOpService` | Reglas compartidas por `operaciones-editor` y el generador (ver la skill `herramientas-demo`) |

### Motor (`ValoresTarifaService`)
- **Elección (antes del alta):** `operaciones-editor` y el generador, vía
  `ResolucionTarifaOpService.candidatosOp`. `listarCandidatosLado` devuelve TODAS las
  versiones vigentes a `op.fecha` de los niveles HABILITADOS de la entidad, sin
  fallback implícito entre niveles. Con un candidato y una sola sección/categoría
  posible se autoselecciona; si no, el usuario elige tarifa y sección/categoría.
  Especial: solo cubre sus categorías; con alcance por cliente, solo ese cliente.
- **Alta (`calcularAlta`, en `altaDesdeAsignacion`):** EXIGE las referencias elegidas
  (o eventual); si falta alguna, el alta se aborta. No resuelve jerarquía por su cuenta.
- **Cierre, edición de InformeOp y restaurar (`calcularCierre`):** reusa las
  referencias congeladas (no re-resuelve) con km, multiplicadores, acompañantes,
  adicional extra y overrides actuales.
- **Cálculo por lado:** tarifa base de la categoría (modo km: valor × `op.km`);
  adicional por km con P = primer sector y S = intervalo: `km <= P` → 0; si no, primer
  sector + (ceil((km − P) / S) − 1) × intervalo (cada límite cierra su tramo; S = 0 no
  divide); acompañante de la tarifa aplicada (eventual: de la General vigente a
  `op.fecha`); `adExtra`; multiplicador 0 → el lado entero en 0;
  `tarifaBaseManual*` congela la base.
- **Eventual:** `valoresNuevos` desde `datosTarifaEventual`. Al cerrar,
  `armarRegistroEventual` arma el registro que `cerrarOperacion` escribe en SU
  transacción. `bajaOperacionCerrada` lo anula (query por `idOperacion` fuera de la
  transacción, relectura y anulación adentro, misma anulación que el par de InformeOp).

### Operaciones
- `operaciones-editor`: candidatos por lado, selector de sección/categoría, toggle
  Eventual (`OperacionFactoryService.aplicarEventual`, mantiene el invariante
  eventual ⟺ `datosTarifaEventual !== null`), badges de los niveles habilitados del
  cliente (`nivelesHabilitados`). No deja dar el alta sin referencias.
- Eventual forzada: cliente o chofer/proveedor con Eventual habilitada
  (`OperacionFactoryService.esEventualPorHabilitadas` /
  `ResolucionTarifaOpService.esEventualForzada`). Al resolver el chofer de un
  proveedor, `asignarChofer` recalcula la marca (`eventualRecalculado`).
- Leen `valoresNuevos`: InformeOp (tarifaBase × multiplicador), `modal-detalle-op`,
  `tablero-op` y su Excel, Reportes, comisiones de venta y la papelera.

### Pantallas (`raiz/tarifas`, ruta `tarifas`, lazy)
- Pestañas General, Personalizada, Especial, Eventual (registros, con los anulados
  marcados) e Historial (linajes).
- Viewers, forms, aumento (único / segmentado / manual; en Especial, único / manual;
  redondeo hasta miles; `metadataAumento` queda en la versión), duplicar (nombre único
  entre vigentes), "Ver historial" y dar de baja.
- Helpers del historial: `shared/utils/historial-tarifa.util.ts` (`deltaTarifa`,
  `deltaTarifaEspecial`, `textoAumentoTarifa`), expuestos en los componentes como
  propiedades.
- Permisos: entran dev/admin/user/demo; editar, solo dev/admin (`puedeEditar`).

### Reglas (`firestore.rules`)
- `tarifas`, `tarifasEspeciales` → módulo 'tarifas' (escritura dev/admin; lectura
  user/demo). `registrosOpEventuales` → 'informesOp' (lo escribe el cierre, que hace
  `user`, y lo anula la baja de una cerrada).
- Las colecciones viejas (vigentes → 'tarifas', `historialTarifas<…>` →
  'tarifasHistorial') siguen mapeadas: las leen las herramientas de `/migracion` hasta
  migrar Vantruck.

### Retiro del sistema viejo (cierre)
- Módulo viejo: rutas `clientes|choferes|proveedores/general|especial|personalizada|eventual`,
  sus pantallas, `servicios/tarifas/` (`TarifasService`), componentes shared
  (`ConsolaTarifa`, `HistorialTarifasGral`, `TarifasEventuales`, `TarigaGralEdicion`),
  7 listeners de `HomeComponent` y 33 subjects de `StorageService`.
- Código muerto acoplado: `EditarInfOp`, `EditarTarifaOp`, `BuscarTarifaService`,
  `ValoresOpClienteService.$calcularKm`, `DbFirestoreService.buscarContraParteInformeOp`
  / `guardarOpMultiple` / `buscarInformesPorIdOperacion` / `reemplazarConVersionNueva`,
  interfaces `TarifaEventual` y `TarifaPersonalizadaCliente`.
- `Operacion`: fuera `datosTarifaPersonalizada`, el tipo de tarifa de 4 booleanos (con
  su shim y el getter del proveedor), `adExtraConcepto` y el espejo `valores`
  (con sus espejos en el modal, el generador y `ValoresOpCliente/ChoferService`, que
  quedaron como calculadoras puras del InformeOp sobre `valoresNuevos`).
- Entidades: fuera `idTarifa` y `tarifaAsignada`.
- Reportes: fuera la fuente legacy; una op sin `valoresNuevos`, o sin tarifa aplicada y
  no eventual, es un error del aporte.
- Reglas: fuera `historialTarifas` / `historialTarifasEspeciales` (nunca se usaron).
- Se queda `interfaces/tarifa-gral-cliente.ts` (tipos viejos): lo usan `InformeOp`
  viejo y `choferes-alta`; se va con la Liquidación vieja (`migrar-datos` y las
  interfaces `TarifaGralCliente` / `AdicionalTarifa` se retiraron en el frente Lazy
  loading + fechas).

### Herramientas de `/migracion`
- `TarifaMigrationService` (lee las colecciones viejas directo de Firestore, como
  `any`): auditoría de colecciones viejas, auditoría de categorías de vehículo contra la
  General, volcado histórico de la General (para armar el linaje a mano) y migración
  Eventual → `RegistroOpEventual` (previsualizar / confirmar).
- Migración de entidades: `migrar<Entidad>()` deja `tarifaTipo` en el documento A
  PROPÓSITO; `migrarTarifasHabilitadas()` lo lee, arma `tarifasHabilitadas`
  (`habilitadasDesdeTarifaTipoMigracion`) y lo quita. El orden es obligatorio.
- Limpieza de campos de tarifa en operaciones (solo demo, rol dev;
  `OperacionMigrationService.auditarLimpiezaCamposTarifas` /
  `aplicarLimpiezaCamposTarifas`): traduce el adicional viejo a `adExtra` y borra con
  `deleteField()` los campos retirados de `Operacion`. Hace falta porque
  `opToFirestore` reescribe lo que se leyó (spread).

## Deuda abierta — Tarifas (tras el cierre del frente)
- Datos de demo: clientes/choferes/proveedores conservan `idTarifa`/`tarifaAsignada`
  en Firestore (inertes; las ediciones con merge no los borran).
- Papelera: una op sin `valoresNuevos` muestra $0 en "Tarifa Base" (solo ops de
  Vantruck dadas de baja antes de migrar).
- `interfaces/tarifa-gral-cliente.ts` sobrevive por `InformeOp` viejo y `choferes-alta`;
  se va con la Liquidación vieja (`migrar-datos` se borró en el frente Lazy loading +
  fechas).
- Demo: las ops con adicional viejo editadas o cerradas entre TC9 y TC-L quedaron con
  `adExtra: null` (el adicional viejo se perdió; datos de prueba).
- Cosmético: los campos de TC-L en `MigracionComponent` quedaron entre los de
  documentación y los de legajos.
- ~~`idCliente` number de `TarifaPersonalizadaCliente`, `idTarifa`/`tarifaAsignada` en
  entidades, bug de `proveedores-tarifa-gral` (colección equivocada), bug de
  `modal-resumen-op` (leía el tipo de tarifa sobre snapshots)~~ — RESUELTOS en el cierre
  de Tarifas: las interfaces, los campos y los componentes ya no existen
  (`modal-resumen-op` lo reemplazó `modal-detalle-op`).

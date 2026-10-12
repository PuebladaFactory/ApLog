````
INSTRUCCIÓN TC-DOC — Tarifas (cierre): CLAUDE.md y CHANGELOG.md
================================================================================

Si no ves la línea "FIN DE LA INSTRUCCIÓN TC-DOC" al final, el texto llegó
cortado: leé el archivo completo antes de empezar.

## Contexto y razonamiento

Último bloque del cierre del Frente Tarifas. El código quedó cerrado en
TC1–TC11, TC-R1–TC-R5, TC-L y TC-P1; la documentación seguía describiendo el
sistema viejo:
  - CLAUDE.md → "Sistema de tarifas" decía "Refactor grande planificado (no
    iniciado)", describía RefTarifaHabilitada con idTarifa y el shim de 4
    booleanos.
  - El tarifario nuevo (TarifarioService, raiz/tarifas, motor, vigencia por
    fecha, RegistroOpEventual) no tenía sección propia.
  - Varias deudas ya no existen (idCliente de TarifaPersonalizadaCliente,
    idTarifa/tarifaAsignada, bug de proveedores-tarifa-gral, bug de
    modal-resumen-op, campos legacy de Operacion, fallback legacy de
    Reportes, vigencia por `activo` en el generador, rutas viejas).
  - Faltaba el checklist de la migración de Tarifas a Vantruck.
  - CHANGELOG sin entrada del frente y con el "Pendiente" desactualizado.

Cambios (SOLO documentación, ningún archivo de código):
CLAUDE.md
  1. Capa de datos: colecciones de tarifas nuevas.
  2. "Sistema de tarifas": resumen del modelo actual (reemplaza el texto viejo).
  3. Tabla de servicios: `tarifario/` en lugar de `tarifas/` (ya no existe).
  4. Fase D: fila de la tabla de fallo y "Nullable de tarifa" al día.
  5. Mini-frente RefTarifaHabilitada: nota de que idTarifa ya no existe.
  6. Referencias sueltas al día: papelera (shim), ResolucionTarifaOpService
     (eventualRecalculado), generador (op.adExtra), Frente Reportes
     (fallback legacy y editores viejos retirados).
  7. Sección NUEVA "## Frente Tarifas — tarifario nuevo" antes de
     "## Deuda conocida".
  8. Deuda conocida: operaciones-editor/Tarifas y el componente
     operaciones-editor al día; las 3 deudas viejas de tarifas se
     reemplazan por "Deuda — Tarifas (tras el cierre del frente)" y
     "Checklist — migración de Tarifas a Vantruck"; Reportes, generador y
     campos legacy de Operacion marcados como resueltos.
CHANGELOG.md
  9. Entrada nueva "## Frente Tarifas — tarifario nuevo y cierre" antes de
     "### Pendiente".
 10. "Pendiente": fuera los 2 puntos de Tarifas resueltos; la migración a
     Vantruck remite al checklist nuevo.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Esta instrucción toca SOLO CLAUDE.md y CHANGELOG.md (es el bloque de
  cierre: la regla de no tocarlos hasta cerrar el frente termina acá).
  Ningún otro archivo.
- Si un texto a BUSCAR no está, o aparece más de una vez: detenete y reportá.
- Aplicá los cambios de cada archivo EN ORDEN (los BUSCAR siguen el orden
  del archivo).
- Editá el archivo en el lugar (leer, reemplazar, escribir); nunca abras un
  archivo para escritura antes de haber leído su contenido.
- Ningún BUSCAR de esta instrucción tiene espacios al final de línea.
- Finales de línea LF; codificación UTF-8 (hay tildes, flechas y "⟺").
- Los textos a REEMPLAZAR son markdown: copialos tal cual (incluidos `~~`,
  backticks y tablas).

## PASO 0 — Verificación (sin modificar nada)

0.1 `git status --short CLAUDE.md CHANGELOG.md` → sin cambios pendientes.
0.2 `wc -l CLAUDE.md CHANGELOG.md` → 4105 y 2195.
0.3 `grep -n "^### Sistema de tarifas\|^## Deuda conocida\|^### Deuda — campos legacy de Operacion" CLAUDE.md`
    → 191, 3261 y 4061.
0.4 `grep -n "^### Pendiente" CHANGELOG.md` → 2150.
0.5 `grep -c " $" CLAUDE.md` y `grep -c " $" CHANGELOG.md` → 0 y 0.
Si algo no coincide (por ejemplo, si alguno de los dos archivos cambió desde
el último commit del frente), DETENETE y reportá: los BUSCAR están armados
contra esas versiones exactas.

## PASO 1 — CLAUDE.md

1.1 BUSCAR:
```
`DbFirestoreService` (`servicios/database/db-firestore.service.ts`) envuelve todas las operaciones de Firestore. Todas las colecciones viven bajo `/Vantruck/datos/`. Colecciones principales: `operaciones`, `clientes`, `choferes`, `proveedores`, `tarifasGralCliente/Esp/Pers`, `tarifasGralChofer/Esp`, `facturaCliente`, `facturaChofer`, `liquidaciones`, `legajos`, `vendedores`, `comisionesVenta`, `liquidacionesVenta`, `movimientosFin`, `configuracion`, `logs`, `registroLog`, `users`.
```
REEMPLAZAR:
```
`DbFirestoreService` (`servicios/database/db-firestore.service.ts`) envuelve todas las operaciones de Firestore. Todas las colecciones viven bajo `/Vantruck/datos/`. Colecciones principales: `operaciones`, `clientes`, `choferes`, `proveedores`, `tarifas`, `tarifasEspeciales`, `registrosOpEventuales`, `facturaCliente`, `facturaChofer`, `liquidaciones`, `legajos`, `vendedores`, `comisionesVenta`, `liquidacionesVenta`, `movimientosFin`, `configuracion`, `logs`, `registroLog`, `users`.
```

1.2 BUSCAR:
```
### Sistema de tarifas

Cada entidad (cliente, chofer, proveedor) tiene `tarifasHabilitadas:
RefTarifaHabilitada[]` (`Chofer`: `| null`, ver abajo) — reemplaza al viejo
`tarifaTipo: TarifaTipo` (4 booleanos, selección única). Una entidad puede tener
múltiples tarifas habilitadas a la vez (ej. general + especial). `RefTarifaHabilitada`
(`interfaces/tarifa-habilitada.ts`): `{ nivel: 'general' | 'eventual' }` o
`{ nivel: 'especial' | 'personalizada'; idTarifa: string }` (`idTarifa: ''` = habilitado,
tarifa concreta aún no creada — estado válido esperado, se completa desde el módulo de
Tarifas). Reglas: `'eventual'` solo válida como única entrada; al menos una tarifa
habilitada es obligatoria (`validarTarifasHabilitadas`, en los 3 factories).

**Chofer de proveedor:** `tarifasHabilitadas: null` — no tiene tarifa propia, hereda la
del proveedor. Resolver SIEMPRE vía
`ProveedorService.resolverTarifasHabilitadasChofer(chofer)` (nunca leer
`chofer.tarifasHabilitadas` directo sin chequear `contratacion.tipo` antes).

**Shim de compatibilidad:** `tarifaTipoDesdeHabilitadas(lista): TarifaTipo`
(`interfaces/tarifa-habilitada.ts`) reconstruye los 4 booleanos legacy para
consumidores que aún no resuelven multiplicidad real: `OperacionFactoryService` (varios
métodos), `operaciones-editor` (badges), `ProveedorService.getTarifaTipo`, los 3
listados, `objeto-papelera`. Marcados `// TODO: refactor Tarifas`.

> **Refactor grande planificado (no iniciado):** unificar en un tarifario único con
> interfaz común para general/especial/personalizada (eventual aparte, por ser ad-hoc
> por operación) — `TarifaBase`, `Tarifa`, `TarifaEspecial`, `TarifaEventual`. Incluye
> resolver `operaciones-editor` para multiplicidad real (hoy usa el shim, que colapsa a
> "la primera tarifa que matchea", igual que hacía `TarifaTipo` antes), migrar
> `idTarifa`/`tarifaAsignada` de las 3 entidades a `RefTarifaHabilitada`, y reescribir el
> módulo de Tarifas actual (`Xxx-tarifa-gral`/`Xxx-tarifa-especial`/
> `cliente-tarifa-personalizada`, `TarifasService`), hoy con las líneas que leían
> `tarifaTipo` comentadas al mínimo para compilar. Hasta entonces, la lógica de cálculo
> de tarifas en los servicios de Operaciones se toca al mínimo (marcada con
> `// TODO: refactor Tarifas`), no se reescribe. Ver `CHANGELOG.md` → mini-frente
> "Multiplicidad de tarifas por entidad" para el detalle completo de lo ya resuelto.
```
REEMPLAZAR:
```
### Sistema de tarifas

Resumen del modelo; el detalle (versionado, vigencia por fecha, motor, pantallas,
reglas, migración) está en "Frente Tarifas — tarifario nuevo".

- **Tarifas:** `Tarifa` (`nivel` 'general' | 'personalizada'; `aCobrar`/`aPagar`/
  `aPagarProveedor` por categoría) y `TarifaEspecial` (parche de la General para una
  entidad), en las colecciones `tarifas` y `tarifasEspeciales`. Append-only: editar o
  aumentar crea una versión nueva. Eventual no tiene documento de tarifa: los valores se
  cargan por operación (`op.datosTarifaEventual`) y el historial queda en
  `registrosOpEventuales`.
- **Entidades:** `tarifasHabilitadas: RefTarifaHabilitada[]` (`Chofer`: `| null`, ver
  abajo). `RefTarifaHabilitada` (`interfaces/tarifa-habilitada.ts`) es solo `{ nivel }`
  ('general' | 'especial' | 'personalizada' | 'eventual'), sin id de tarifa: la tarifa
  concreta se elige POR OPERACIÓN entre las vigentes de los niveles habilitados. Reglas:
  al menos una entrada; 'eventual' solo como única (`validarTarifasHabilitadas`, en los 3
  factories). Para leerla: `nivelesHabilitados(lista)` (orden fijo personalizada,
  especial, general, eventual). Personalizada: solo Clientes.
- **Operación:** `tarifaAplicadaCliente/Chofer: RefTarifaAplicada | null` (elegida antes
  del alta y congelada), `valoresNuevos` (única fuente de valores), `datosTarifaEventual`
  (única marca de eventual: `!== null`), `adExtra` (entrada del adicional extra),
  `tarifaBaseManualCliente/Chofer?`, `multiplicadorCliente/Chofer`.

**Chofer de proveedor:** `tarifasHabilitadas: null` — no tiene tarifa propia, hereda la
del proveedor. Resolver SIEMPRE vía
`ProveedorService.resolverTarifasHabilitadasChofer(chofer)` (nunca leer
`chofer.tarifasHabilitadas` directo sin chequear `contratacion.tipo` antes).
```

1.3 BUSCAR:
```
| `tarifas/` | Resolución y cálculo de tarifas |
```
REEMPLAZAR:
```
| `tarifario/` | Tarifario nuevo: `TarifarioService` (estado y escritura de `tarifas` / `tarifasEspeciales` / `registrosOpEventuales`), factories, `TarifaGuardadoService`, motor `ValoresTarifaService` y `ResolucionTarifaOpService` — ver "Frente Tarifas — tarifario nuevo" |
```

1.4 BUSCAR:
```
| Cálculo en servicios `valores-op*` | `op.datosTarifaX!` + `// TODO: refactor Tarifas` |
```
REEMPLAZAR:
```
| Cálculo de valores (motor de tarifas) | No resuelve entidades: usa lo congelado en la op (`tarifaAplicada*`, `datosTarifaEventual`) y la tarifa por id en `TarifarioService` (ver "Frente Tarifas — tarifario nuevo") |
```

1.5 BUSCAR:
```
#### Nullable de tarifa (datosTarifaEventual / datosTarifaPersonalizada)

Ahora son `| null`. Invariante confirmado: `datosTarifaEventual !== null ⟺ tarifaTipo.eventual` (idem personalizada). Tratamiento por contexto:
- **Cálculo:** `op.datosTarifaX!` + `// TODO: refactor Tarifas`.
- **Exhibición que lee un valor:** `op.datosTarifaX?.… ?? 0/'—'`.
- **Getter de exhibición:** guard `if (!op.datosTarifaX) return ''/[]`.
- **Múltiples accesos en un método de una sola tarifa:** guard al inicio (`if (!op.datosTarifaX) return;`) que estrecha todo el cuerpo, en vez de `!` repetido.
```
REEMPLAZAR:
```
#### Nullable de tarifa (datosTarifaEventual)

`datosTarifaEventual: DatosTarifaEventual | null`. Desde el cierre de Tarifas es la ÚNICA
marca de eventual (`!== null`); el campo de datos de Personalizada y el tipo de tarifa de
4 booleanos se retiraron de `Operacion`. Mutarla solo con
`OperacionFactoryService.aplicarEventual` (mantiene el invariante). Tratamiento por contexto:
- **Exhibición que lee un valor:** `op.datosTarifaEventual?.… ?? 0/'—'`.
- **Getter de exhibición:** guard `if (!op.datosTarifaEventual) return ''/[]`.
- **Múltiples accesos en un método:** guard al inicio (`if (!op.datosTarifaEventual) return;`)
  que estrecha todo el cuerpo, en vez de `!` repetido.
```

1.6 BUSCAR:
```
Patrones fijados al resolver "una entidad puede tener múltiples tarifas habilitadas a
la vez"; aplican como precedente al frente grande de Tarifas.
```
REEMPLAZAR:
```
Patrones fijados al resolver "una entidad puede tener múltiples tarifas habilitadas a
la vez"; aplican como precedente al frente grande de Tarifas.

> **Nota (cierre de Tarifas, Octubre 2026):** `RefTarifaHabilitada` ya no lleva
> `idTarifa` en ningún nivel: es solo `{ nivel }`, y la tarifa concreta se elige por
> operación. Lo que sigue sobre `idTarifa` en especial/personalizada es histórico; los
> patrones (union discriminada, `null` explícito, puente con vencimiento, preservar
> sub-estado no editable) siguen valiendo.
```

1.7 BUSCAR:
```
  en otras partes de este archivo por su uso de `tarifaTipoDesdeHabilitadas`). Por eso
```
REEMPLAZAR:
```
  en otras partes de este archivo; el shim de tarifas que usaba se retiró en el cierre de Tarifas). Por eso
```

1.8 BUSCAR:
```
`asignarChofer` (→ `{asignado, tipoRecalculado}`), `asignarVehiculo`,
```
REEMPLAZAR:
```
`asignarChofer` (→ `{asignado, eventualRecalculado}`), `asignarVehiculo`,
```

1.9 BUSCAR:
```
  una como el modal de cierre (km; adicional en
  `op.valores.<lado>.adExtraValor` + `adExtraConcepto`; `calcularCierre`;
  espejo aCobrar/aPagar a `op.valores`; `cerrarOperacion`). No es atómico
```
REEMPLAZAR:
```
  una como el modal de cierre (km; adicional en `op.adExtra` con
  `armarAdExtra`; `calcularCierre`; `cerrarOperacion`). No es atómico
```

1.10 BUSCAR:
```
- Fallback legacy (`usaFuenteLegacy`): sin `valoresNuevos` (o sin
  `tarifaAplicada` de un lado) → `op.valores` (tarifaBase ya multiplicada) y
  el nivel de `op.tarifaTipo` en los dos lados. Para ops históricas de
  Vantruck; lo usan el Recálculo y el camino en vivo.
```
REEMPLAZAR:
```
- ~~Fallback legacy (`usaFuenteLegacy`)~~ — retirado en el cierre de Tarifas: una op
  sin `valoresNuevos`, o sin `tarifaAplicada` de un lado y no eventual, es un error
  del aporte. Las ops históricas de Vantruck se traducen al modelo nuevo con el
  método de migración de operaciones ANTES del Recálculo.
```

1.11 BUSCAR:
```
- Editor de InformeOp (`InformeOpEditorComponent`): después de
  `calcularCierre` reutiliza `ValoresOpClienteService` /
  `ValoresOpChoferService` → espeja `valoresNuevos` a `op.valores` y guarda
  en el InformeOp la tarifaBase multiplicada (igual que el cierre). Con la
  contraparte congelada (proforma/liquidada), el lado contrario de
  `valoresNuevos` vuelve al de la op original.
- Editores viejos (`editar-tarifa-op`, `editar-inf-op`): NO tocan
  resúmenes (camino viejo).
```
REEMPLAZAR:
```
- Editor de InformeOp (`InformeOpEditorComponent`): después de
  `calcularCierre` reutiliza `ValoresOpClienteService` /
  `ValoresOpChoferService` (calculadoras puras sobre `valoresNuevos`) y guarda
  en el InformeOp la tarifaBase multiplicada (igual que el cierre). Con la
  contraparte congelada (proforma/liquidada), el lado contrario de
  `valoresNuevos` vuelve al de la op original.
- ~~Editores viejos (`editar-tarifa-op`, `editar-inf-op`)~~ — borrados en el
  cierre de Tarifas.
```

1.12 BUSCAR:
```
`resumenOpMensual` en Vantruck y su mapeo en `firestore.rules` /
`LimpiezaDemoService` (hasta la migración) y `buscarContraParteInformeOp` (lo
usa `editar-inf-op`).
```
REEMPLAZAR:
```
`resumenOpMensual` en Vantruck y su mapeo en `firestore.rules` /
`LimpiezaDemoService` (hasta la migración). (`buscarContraParteInformeOp` se
borró con `editar-inf-op` en el cierre de Tarifas.)
```

1.13 BUSCAR:
```
conservan: las colecciones `movimientos` / `resumenFinanzas` en Vantruck y
sus mapeos en `firestore.rules` (ver "Deuda — Finanzas").

## Deuda conocida
```
REEMPLAZAR:
```
conservan: las colecciones `movimientos` / `resumenFinanzas` en Vantruck y
sus mapeos en `firestore.rules` (ver "Deuda — Finanzas").

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
| `ResolucionTarifaOpService` | Reglas compartidas por `operaciones-editor` y el generador (ver "Herramientas de desarrollo") |

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
  viejo, `migrar-datos` y `choferes-alta`; se va con la Liquidación vieja.

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

## Deuda conocida
```

1.14 BUSCAR:
```
### Deuda — operaciones-editor / Tarifas

**`idCliente` de TarifaPersonalizadaCliente: tipo vs dato divergen.** La interfaz declara
`idCliente: number`, pero los datos en Firestore se corrigieron a string (consola Firestore)
para cruzar con `op.cliente.id` (string). `getTarifaPersonalizada(idCliente: any)` usa `any`
para forzar la igualdad sin romper la interfaz. RIESGO: el alta/edición de tarifas
personalizadas en el módulo viejo lee `idCliente` esperando number — verificar al refactor de
Tarifas. Marcado `// TODO: refactor Tarifas`.

**Estilos duplicados:** las clases SCSS de tarifa eventual/personalizada se copiaron de
operaciones-table a operaciones-editor. operaciones-table ya fue eliminado en el switch de
Asignaciones (Bloques 13-19) — pendiente ahora consolidar los estilos duplicados en
operaciones-editor (ya no hay original que mantenga la copia sincronizada).

**Celdas de tarifa en el template:** los bindings a `datosTarifaEventual`/`datosTarifaPersonalizada`
usan guarda `@if (objeto)` (no `[disabled]` + `!`): el `disabled` NO impide que Angular evalúe
el binding, y el `!` revienta en runtime cuando el objeto es null. Patrón a respetar en
cualquier template que bindee tarifas nullable.
```
REEMPLAZAR:
```
### Deuda — operaciones-editor / Tarifas

~~**`idCliente` de TarifaPersonalizadaCliente: tipo vs dato divergen.**~~ — RESUELTO en el
cierre de Tarifas (la interfaz y el módulo viejo ya no existen).

**Estilos duplicados:** las clases SCSS de tarifa eventual/personalizada se copiaron de
operaciones-table a operaciones-editor. operaciones-table ya fue eliminado en el switch de
Asignaciones (Bloques 13-19) — pendiente ahora consolidar los estilos duplicados en
operaciones-editor (ya no hay original que mantenga la copia sincronizada).

**Celdas de tarifa en el template:** los bindings a `datosTarifaEventual`
usan guarda `@if (objeto)` (no `[disabled]` + `!`): el `disabled` NO impide que Angular evalúe
el binding, y el `!` revienta en runtime cuando el objeto es null. Patrón a respetar en
cualquier template que bindee tarifas nullable.
```

1.15 BUSCAR:
```
- Chofer (caso proveedor, `op.chofer.id === ''`): selector con
  `ChoferService.getChoferesPorProveedor(idProveedor)`. Al resolver, recalcula `tarifaTipo`
  con la tarifa del PROVEEDOR (`ProveedorService.getTarifaTipo`, NO `chofer.tarifaTipo`) vía
  `OperacionFactoryService.recalcularTarifaTipo` + `aplicarTarifaTipo`.
```
REEMPLAZAR:
```
- Chofer (caso proveedor, `op.chofer.id === ''`): selector con
  `ChoferService.getChoferesPorProveedor(idProveedor)`. Al resolver,
  `ResolucionTarifaOpService.asignarChofer` recalcula si la op es eventual con las
  tarifas habilitadas del PROVEEDOR (`resolverTarifasHabilitadasChofer`) y devuelve
  `eventualRecalculado`.
```

1.16 BUSCAR:
```
**Toggle eventual reversible:** `tarifaOriginal: Map<idItem, TarifaTipo>` guarda el tipo
original (estado de UI, no ensucia la Operacion — reemplaza el viejo `OperacionRuntime`).
La mutación coherente (tarifaTipo + datosTarifaX, manteniendo el invariante) vive en
`OperacionFactoryService.aplicarTarifaEventual`.

**Badge tarifa de cliente:** inmune a toggles — leído del cliente vivo
(`ClienteService.getClientePorId(idCliente)?.tarifaTipo`), con fallback al snapshot si el
cliente está en papelera.

**Badge tarifa de chofer (informativo):** resuelto por ID, no congelado. Directo →
`chofer.tarifaTipo`; proveedor → `ProveedorService.getTarifaTipo`. Solo display.
```
REEMPLAZAR:
```
**Toggle eventual reversible:** `eventualOriginal: Map<idItem, boolean>` guarda si la op
era eventual al entrar (estado de UI, no ensucia la Operacion — reemplaza el viejo
`OperacionRuntime`). La mutación coherente (`datosTarifaEventual`, manteniendo el
invariante) vive en `OperacionFactoryService.aplicarEventual`.

**Badges de tarifa del encabezado:** los niveles habilitados del CLIENTE vivo
(`nivelesHabilitados(cliente.tarifasHabilitadas)`), uno por nivel; informativos. La
tarifa elegida de cada lado se ve en su fila.
```

1.17 BUSCAR:
```
**El editor NO calcula valores ni persiste:** edita un snapshot en memoria y devuelve.
`calcularValoresIniciales` + persistencia siguen en `altaDesdeAsignacion`. Sin suscripciones
(resolución síncrona puntual): edita, no observa.
```
REEMPLAZAR:
```
**El editor NO calcula valores ni persiste:** edita un snapshot en memoria y devuelve
(con las referencias de tarifa elegidas). El cálculo (`calcularAlta`) y la persistencia
siguen en `altaDesdeAsignacion`. Sin suscripciones (resolución síncrona puntual): edita,
no observa.
```

1.18 BUSCAR:
```
### Deuda — `idTarifa`/`tarifaAsignada` en Cliente/Chofer/Proveedor

Campos legacy sin migrar a `RefTarifaHabilitada` (que no tiene `idTarifa` en los
niveles `general`/`eventual`, no alcanza para sustituirlos todavía). Consumidores
activos confirmados por auditoría: el módulo de Tarifas actual completo
(`Xxx-tarifa-gral.component.ts` × 3, `TarifasService.guardarTarifaPersonalizada`).
Resolver junto con el frente grande de Tarifas, cuando ese módulo se reescriba.

### Bug — `proveedores-tarifa-gral.component.ts` escribe en colección equivocada

Líneas ~560/~591: al asignar `idTarifa` a un `Chofer` de proveedor, hace
`updateItem("proveedores", ch, ...)` en vez de `"choferes"`. Detectado en auditoría del
mini-frente RefTarifaHabilitada (Agosto 2026), no corregido — el archivo entero se
elimina con el frente grande de Tarifas.

### Bug — `modal-resumen-op.component.html` lee `tarifaTipo` sobre snapshots sin ese campo

Lee `op.cliente.tarifaTipo`/`op.chofer.tarifaTipo` sobre `RefCliente`/`RefChofer`
(snapshots de Operación, sin ese campo desde la Fase D). Probablemente `undefined` en
runtime hoy. Detectado en auditoría del mini-frente RefTarifaHabilitada (Agosto 2026),
no corregido, sin relación con ese frente — revisar en sesión propia de ese componente.
```
REEMPLAZAR:
```
### Deuda — Tarifas (tras el cierre del frente)
- Datos de demo: clientes/choferes/proveedores conservan `idTarifa`/`tarifaAsignada`
  en Firestore (inertes; las ediciones con merge no los borran).
- Papelera: una op sin `valoresNuevos` muestra $0 en "Tarifa Base" (solo ops de
  Vantruck dadas de baja antes de migrar).
- `interfaces/tarifa-gral-cliente.ts` sobrevive por `InformeOp` viejo, `migrar-datos`
  (sus arrays de operaciones son `any[]`) y `choferes-alta`; se va con la Liquidación
  vieja.
- Demo: las ops con adicional viejo editadas o cerradas entre TC9 y TC-L quedaron con
  `adExtra: null` (el adicional viejo se perdió; datos de prueba).
- Cosmético: los campos de TC-L en `MigracionComponent` quedaron entre los de
  documentación y los de legajos.
- ~~`idCliente` number de `TarifaPersonalizadaCliente`, `idTarifa`/`tarifaAsignada` en
  entidades, bug de `proveedores-tarifa-gral` (colección equivocada), bug de
  `modal-resumen-op` (leía el tipo de tarifa sobre snapshots)~~ — RESUELTOS en el cierre
  de Tarifas: las interfaces, los campos y los componentes ya no existen
  (`modal-resumen-op` lo reemplazó `modal-detalle-op`).

### Checklist — migración de Tarifas a Vantruck
Después del backup completo y de deployar este código en `pf-logistics`:
1. Reglas: `tarifas`, `tarifasEspeciales` ('tarifas') y `registrosOpEventuales`
   ('informesOp'; sin esta, `user` no puede cerrar una eventual).
2. Auditar en `/migracion` las colecciones viejas de tarifas y
   `Vehiculo.categoria.nombre` contra la General; corregir los vehículos antes de
   cargar Especiales de chofer/proveedor.
3. Entidades: `migrar<Entidad>()` y DESPUÉS `migrarTarifasHabilitadas()`; revisar a
   mano los niveles habilitados que quedaron.
4. Tarifas, a mano con los forms (rol dev, `vigenciaDesde` retroactiva): General (el
   linaje se arma con el volcado histórico), Especiales y Personalizadas, en orden
   cronológico real (la vigencia por fecha depende de eso).
5. Eventual: previsualizar y confirmar → `registrosOpEventuales`.
6. Operaciones: método de migración propio (por diseñar), con entidades, vehículos y
   tarifas nuevos ya cargados: cada op vieja → `tarifaAplicada*` /
   `datosTarifaEventual` / `valoresNuevos` / `adExtra`, sin `valores`, `tarifaTipo`,
   `datosTarifaPersonalizada` ni `adExtraConcepto`. Recién después, Recálculo de
   `resumenesOp` y de comisiones (sin `valoresNuevos`, la op es un error y bloquea).
7. Entidades: borrar `idTarifa` y `tarifaAsignada` (`deleteField`).
8. Al terminar, con backup: borrar las colecciones viejas de tarifas (7 vigentes, 7
   historiales, `tarifasEventuales` y `tarifasChofer`/`tarifasCliente`/
   `tarifasProveedor`), sus mapeos en `firestore.rules`, `TarifaMigrationService` y
   su sección de `/migracion`, y los `_backup_*` de entidades que usa.
```

1.19 BUSCAR:
```
  simulando primero un rango con operaciones históricas para validar el
  fallback legacy con datos reales (nivel de `op.tarifaTipo` contado en los
  dos lados; las ops con error bloquean la ejecución); después, borrar la
  colección `resumenOpMensual`, su mapeo en `firestore.rules` y en
  `LimpiezaDemoService`, y los índices compuestos de su query que se habían
  creado desde la consola.
- Fallback legacy de `aporteDeOperacion`: también lo usa el camino en vivo,
  así que editar o dar de baja una op histórica sin `valoresNuevos` suma o
  resta desde `op.valores`. Se retira con los campos legacy de Operacion.
```
REEMPLAZAR:
```
  simulando primero un rango (las ops con error bloquean la ejecución); las
  ops históricas tienen que estar ya traducidas al modelo nuevo (ver
  "Checklist — migración de Tarifas a Vantruck", paso 6); después, borrar la
  colección `resumenOpMensual`, su mapeo en `firestore.rules` y en
  `LimpiezaDemoService`, y los índices compuestos de su query que se habían
  creado desde la consola.
- ~~Fallback legacy de `aporteDeOperacion`~~ — retirado en el cierre de
  Tarifas.
```

1.20 BUSCAR:
```
- Editores viejos (`editar-tarifa-op`, `editar-inf-op`): no actualizan
  `resumenesOp` (tampoco actualizaban `resumenOpMensual`). Se retiran con el
  camino viejo de Liquidación.
```
REEMPLAZAR:
```
- ~~Editores viejos (`editar-tarifa-op`, `editar-inf-op`)~~ — borrados en el
  cierre de Tarifas.
```

1.21 BUSCAR:
```
- Vigencia de tarifas por `activo`, no por fecha (`vigenciaDesde` no se usa
  al resolver): generar meses pasados usa las tarifas de hoy.
```
REEMPLAZAR:
```
- ~~Vigencia de tarifas por `activo`, no por fecha~~ — RESUELTO en el cierre de
  Tarifas: el generador toma la General vigente a la fecha de cada día.
```

1.22 BUSCAR:
```
- Registradas durante el frente (diseño §10): rutas viejas de tarifas
  (`clientes|choferes|proveedores/general|especial|personalizada|eventual`)
  siguen activas y HomeComponent escucha las colecciones viejas (retirar en
  el cierre de Tarifas); `LogService` viejo sigue escribiendo en `logs`
```
REEMPLAZAR:
```
- Registradas durante el frente (diseño §10): ~~rutas viejas de tarifas
  (`clientes|choferes|proveedores/general|especial|personalizada|eventual`)
  activas y listeners de HomeComponent sobre las colecciones viejas~~ —
  RESUELTO en el cierre de Tarifas; `LogService` viejo sigue escribiendo en `logs`
```

1.23 BUSCAR:
```
### Deuda — campos legacy de Operacion (`valores`, `tarifaTipo`, `datosTarifaPersonalizada`)
Siguen siendo necesarios hoy (verificado en el frente Generador, diseño
§11):
- `op.valores`: `valores.<lado>.adExtraValor` es dato real (lo carga el
  modal de cierre) y solo vive ahí; el motor nuevo lo lee de ahí
  (`ValoresTarifaService`) e InformeOpEditor también. Desde el frente
  Reportes, el editor de InformeOp vuelve a espejar `valoresNuevos` →
  `op.valores` (tarifaBase multiplicada, como el cierre) y Reportes ya NO
  lee `op.valores`, salvo el fallback legacy de ops históricas sin
  `valoresNuevos`. Tablero-op y el Excel viejo leen el espejo (las comisiones
  de venta toman la base de `valoresNuevos` desde el Frente Vendedores).
- `op.tarifaTipo`: `tarifaTipo.eventual` gobierna el invariante eventual ⇔
  `datosTarifaEventual` (OperacionFactoryService) y el toggle/badge del
  editor; Reportes solo lo lee en el fallback legacy (nivel de las ops sin
  `tarifaAplicada*`).
- `datosTarifaPersonalizada`: peso muerto en el camino nuevo (solo lo lee
  el modal viejo `editar-inf-op`).
Para retirarlos (cierre de Tarifas + migración de Vantruck): mover
`adExtraValor` a un campo propio de la op (o tomar `valoresNuevos` como
fuente); ~~Reportes a `valoresNuevos` + `tarifaAplicada*.nivel` /
`datosTarifaEventual !== null`~~ (hecho en el frente Reportes; queda su
fallback legacy hasta migrar Vantruck); editor y factory a `datosTarifaEventual`
como única marca de eventual; tablero-op a `valoresNuevos` (~~InformeVenta~~:
hecho en el Frente Vendedores);
retirar `editar-inf-op` / `buscar-tarifa`.
```
REEMPLAZAR:
```
### ~~Deuda — campos legacy de Operacion~~ — RESUELTO (cierre de Tarifas, Octubre 2026)
Fuera de `Operacion`: el campo de datos de Personalizada, el tipo de tarifa de 4
booleanos, `adExtraConcepto` y el espejo `valores`. Marca de eventual:
`datosTarifaEventual !== null`; adicional extra: `op.adExtra` (entrada) →
`valoresNuevos.<lado>.adExtraValor` (salida); única fuente de valores:
`valoresNuevos` (tablero-op, su Excel, la papelera, Reportes y comisiones). Las ops de
demo se limpiaron con la herramienta de `/migracion`; las de Vantruck se traducen con el
método de migración (ver "Checklist — migración de Tarifas a Vantruck").
```

## PASO 2 — CHANGELOG.md

2.1 BUSCAR:
```
---

### Pendiente

Detalle de cada punto en `CLAUDE.md` → "Deuda conocida".
```
REEMPLAZAR:
```
---

## Frente Tarifas — tarifario nuevo y cierre (Agosto–Octubre 2026)

- Tarifario nuevo (`servicios/tarifario/`, `raiz/tarifas`): `Tarifa` (General
  singleton / Personalizada por cliente) y `TarifaEspecial` en `tarifas` /
  `tarifasEspeciales`, append-only con `versionAnteriorId`; pantallas General,
  Personalizada, Especial, Eventual e Historial con viewers, forms, aumento
  (único / segmentado / manual, redondeo hasta miles), duplicar, historial
  por linaje y baja.
- Motor `ValoresTarifaService`: candidatos de los niveles habilitados sin
  fallback implícito, alta con la tarifa elegida y cierre con la referencia
  congelada, modo km, multiplicador 0, tarifa base manual, Personalizada que
  define los dos lados; `operaciones-editor` con multiplicidad real.
- Cierre (Octubre 2026):
  - Fixes del motor: adicional por km sin división por cero y con límites de
    tramo inclusivos (antes cobraba de más en 50, 60, 70…); el alta se aborta
    sin tarifa elegida; vigencia por fecha de la operación
    (`vigencia-tarifa.util`): un aumento con fecha futura ya no rige en el
    acto.
  - Versionado y baja de tarifas en transacción, con el log adentro.
  - `RegistroOpEventual` dentro de la transacción del cierre y anulado en la
    baja de una cerrada; reglas: `registrosOpEventuales` → 'informesOp'
    (antes `user` no podía crearlo).
  - Retiro del módulo viejo de tarifas (rutas y pantallas por entidad,
    `TarifasService`, componentes shared, listeners de Home y cachés de
    `StorageService`) y del código muerto acoplado de Liquidación
    (`EditarInfOp`, `EditarTarifaOp`, `BuscarTarifaService`).
  - `Operacion` sin campos legacy de tarifa: marca de eventual =
    `datosTarifaEventual`, adicional extra en `op.adExtra`, única fuente de
    valores `valoresNuevos` (Excel de operaciones y papelera incluidos);
    Reportes sin fuente legacy.
  - Entidades sin `idTarifa`/`tarifaAsignada`; badges con varios niveles
    habilitados (`nivelesHabilitados`); helpers del historial en
    `historial-tarifa.util`.
  - Herramienta de demo en `/migracion` para limpiar los campos de tarifa de
    las operaciones.
  - Reglas: fuera `historialTarifas` / `historialTarifasEspeciales` (nunca
    usadas). Desplegadas solo en demo.

Detalle completo en `CLAUDE.md` → "Frente Tarifas — tarifario nuevo";
checklist de Vantruck en "Deuda conocida" → "Checklist — migración de Tarifas
a Vantruck".

**Verificación:** `ng build --configuration=demo` limpio en cada bloque;
pruebas manuales en demo.

---

### Pendiente

Detalle de cada punto en `CLAUDE.md` → "Deuda conocida".
```

2.2 BUSCAR:
```
- Tarifas — cierre: retirar el módulo viejo (pantallas `*-tarifa-gral` /
  especial / personalizada, rutas `clientes|choferes|proveedores/general|
  especial|personalizada|eventual`, listeners de HomeComponent/StorageService
  sobre las colecciones viejas); multiplicidad real en operaciones-editor
  (hoy el shim `tarifaTipoDesdeHabilitadas`); documentar el tarifario nuevo
  en CLAUDE.md.
- Finanzas (frentes aparte): cartera de cheques, pago de liquidaciones de
  vendedores como movimiento, plazo de pago por entidad.
- Campos legacy de Operacion (`valores`, `tarifaTipo`,
  `datosTarifaPersonalizada`): retirar con el cierre de Tarifas (Reportes
  ya usa `valoresNuevos`; queda su fallback legacy hasta migrar Vantruck).
```
REEMPLAZAR:
```
- Finanzas (frentes aparte): cartera de cheques, pago de liquidaciones de
  vendedores como movimiento, plazo de pago por entidad.
```

2.3 BUSCAR:
```
- Migración de datos (entidades, tarifas, operaciones, liquidaciones y
  facturación, con los checklists registrados en CLAUDE.md), deploy de
  reglas / índices / `storage.rules` en `pf-logistics` (incluidas las de
```
REEMPLAZAR:
```
- Migración de datos (entidades, tarifas, operaciones, liquidaciones y
  facturación, con los checklists registrados en CLAUDE.md; tarifas:
  "Checklist — migración de Tarifas a Vantruck", que incluye el método de
  migración de operaciones al modelo nuevo antes del Recálculo), deploy de
  reglas / índices / `storage.rules` en `pf-logistics` (incluidas las de
  `tarifas` / `tarifasEspeciales` / `registrosOpEventuales` /
```

2.4 BUSCAR:
```
  `resumenOpMensual` / `informesVenta` / `resumenVenta` / `movimientos` /
  `resumenFinanzas`, y retiro del camino viejo (LiquidacionesOp, Proforma,
  exportaciones viejas de liquidación).
```
REEMPLAZAR:
```
  `resumenOpMensual` / `informesVenta` / `resumenVenta` / `movimientos` /
  `resumenFinanzas` y de las colecciones viejas de tarifas, y retiro del
  camino viejo (LiquidacionesOp, Proforma, exportaciones viejas de
  liquidación).
```

## Verificación

1. `grep -c "Refactor grande planificado\|tipoRecalculado\|aplicarTarifaEventual\|recalcularTarifaTipo\|tarifaOriginal\|tarifaTipoDesdeHabilitadas\|getTarifaTipo" CLAUDE.md`
   → 0.
2. `grep -n "^## Frente Tarifas\|^### Deuda — Tarifas (tras el cierre del frente)\|^### Checklist — migración de Tarifas a Vantruck\|^## Deuda conocida" CLAUDE.md`
   → 4 líneas, en este orden: Frente Tarifas, Deuda conocida, Deuda — Tarifas
   y Checklist.
3. `grep -n "^| \`tarifas/\`" CLAUDE.md` → sin resultados;
   `grep -c "^| \`tarifario/\`" CLAUDE.md` → 1.
4. `grep -c "^## Frente Tarifas" CHANGELOG.md` → 1, y
   `grep -c "Tarifas — cierre: retirar el módulo viejo" CHANGELOG.md` → 0.
5. `wc -l CLAUDE.md CHANGELOG.md` → 4250 y 2237.
6. `grep -c " $" CLAUDE.md` y `grep -c " $" CHANGELOG.md` → 0 y 0.
7. `git status --short` → solo CLAUDE.md y CHANGELOG.md modificados.
8. Mostrá el diff completo de los dos archivos.
(No hace falta build: no se toca código.)

## Revisión (Nico)

Leé en el diff:
1. CLAUDE.md → "Sistema de tarifas" y "## Frente Tarifas — tarifario nuevo":
   que el modelo, el motor y las pantallas coincidan con lo que ves en demo.
2. "Checklist — migración de Tarifas a Vantruck": el orden de los pasos
   (sobre todo 3, 4 y 6) es el plan para la migración real.
3. CHANGELOG → entrada nueva y "Pendiente".

## Mensaje de commit

docs(tarifas): cierre del frente — CLAUDE.md y CHANGELOG (TC-DOC)

- CLAUDE.md: "Sistema de tarifas" al día y sección nueva "Frente Tarifas —
  tarifario nuevo" (modelo, versionado y vigencia por fecha, servicios,
  motor, operaciones, pantallas, reglas, retiro del sistema viejo,
  herramientas de /migracion); referencias sueltas corregidas; deudas
  resueltas marcadas; "Deuda — Tarifas" y "Checklist — migración de
  Tarifas a Vantruck" nuevas.
- CHANGELOG: entrada del Frente Tarifas y "Pendiente" al día.

FIN DE LA INSTRUCCIÓN TC-DOC
````

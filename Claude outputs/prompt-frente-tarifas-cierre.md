PROMPT — Nuevo chat: Cierre del Frente Tarifas (ApLog)
=====================================================

Hola. Vamos a encarar el CIERRE del frente de TARIFAS de ApLog. El chat
original de ese frente se hizo muy largo y perdió el hilo, así que arrancamos
de nuevo. Te paso el contexto para que tengas el mismo nivel de conocimiento,
pero **desconfiá de la documentación**: parte puede estar desactualizada o
incompleta. El primer paso es verificarla contra el código (ver §8).

## 0. Primer paso: acceso al código

Antes de analizar nada, pedime acceso a la carpeta del proyecto:
`C:\Users\anico\Desktop\Proyectos\Vantruck\ApLog`

- Trabajá SIEMPRE sobre el código real: leelo, no lo supongas.
- Leé los archivos directamente de la carpeta conectada, no copias viejas.
  Si la carpeta tiene muchos archivos, copiá en lotes lo que necesites.
- Si algo de este prompt no coincide con el código, manda el código y
  avisame.

Fuentes de contexto:
- **Docs del Project** (léelos con la herramienta del Project, no del
  disco):
  - `claude/instruccion-bloque0-tarifas.md`: registro completo del frente,
    Bloques 0 a 7, polish Ronda 1, deuda acumulada y "Qué sigue". Es el
    doc principal.
  - `claude/instruccion-migracion-tarifas-vantruck.md`: plan de migración
    de tarifas viejas al modelo nuevo, ensayo en demo, mejoras de UI
    posteriores, bugs de multiplicidad en `operaciones-editor`, auditoría
    de `op.valores`/`op.tarifaTipo` y limpieza de legacy en niveles 1 y 2.
  - `claude/auditoria-polish-tarifas.md`: auditoría de polish.
  - `claude/instruccion-fix-tarifa-proveedor-cierre.md`: fix en una rama
    de PRODUCCIÓN (`errorProveedores`) sobre el módulo VIEJO. Indica que
    Vantruck corre otro código.
  - Diseños de frentes cerrados posteriores, que tocaron piezas de
    tarifas/operaciones: `claude/diseno-reportes.md`,
    `claude/diseno-vendedores.md`, `claude/diseno-finanzas.md`,
    `claude/diseno-generador-operaciones.md`,
    `claude/diseno-informe-liq-nuevo.md`,
    `claude/diseno-facturacion-nueva.md`.
- **CLAUDE.md del repo:** "Sistema de tarifas", "Deuda — operaciones-editor
  / Tarifas", "Deuda — `idTarifa`/`tarifaAsignada`…", los dos "Bug — …
  tarifa…", "Deuda — campos legacy de Operacion", "Deuda — generador…" y el
  resto de "Deuda conocida".
- **CHANGELOG.md del repo:** lista "Pendiente".

## 1. El proyecto

ApLog es una app web de administración de una empresa de logística
(Vantruck), en producción.

- **Stack:** Angular 20 (componentes `standalone: false`, sintaxis
  `@if`/`@for`), Firebase (Firestore, Auth con custom claims, Storage,
  Cloud Functions), Bootstrap, NgbModal, SweetAlert2, exceljs, jsPDF.
- Soy autodidacta y es mi primer proyecto serio, así que hay código
  temprano poco prolijo.

Entornos:
- `demo`: proyecto Firebase `demoapplog`, alias `demo`.
- `vantruck`: `pf-logistics`, producción.

**Regla de seguridad:**
- Todo se hace y se prueba en demo.
- NADA va a Vantruck hasta la migración final de datos, que empieza con un
  backup completo.
- Los deploys (reglas, índices, functions) los hago yo, SOLO a demo
  (`--project demo`).
- Claude Code nunca deploya ni commitea.

## 2. Cómo trabajo (importante)

1. **Primero se analiza y se diseña:** qué hace hoy, qué está mal, qué se
   puede mejorar, preguntas abiertas. Me consultás las dudas numeradas (T1,
   T2, …) y yo decido. Recién después vienen las instrucciones.
2. **El diseño se guarda en el Project** (`claude/diseno-tarifas-cierre.md`)
   y se actualiza con cada decisión: las respuestas de cada ronda y una
   sección "Avance" con cada bloque hecho.
3. **Bloques CHICOS:** las instrucciones para Claude Code van en bloques
   (TC1, TC2, … y ajustes TC2.a, etc.), uno por vez. Cada uno se prueba en
   demo y se commitea antes del siguiente.
4. **Cada instrucción va en UN SOLO bloque de código**, una sola ventana para
   copiar, con cerca exterior de 4 backticks para que los bloques internos
   no la corten. Contiene:
   - contexto y razonamiento;
   - PASO 0 de verificación, sin modificar nada;
   - pasos con código completo y BUSCAR/REEMPLAZAR exactos;
   - verificación y pruebas manuales;
   - mensaje de commit.

   Termina con la línea `FIN DE LA INSTRUCCIÓN <bloque>`, más la regla de
   leer el archivo completo si esa línea no se ve.

   Se guarda en dos lugares: el Project
   (`claude/instruccion-<bloque>-tarifas.md`) y la carpeta
   `Claude outputs\` del repo. Además me lo mandás como archivo y me ofrecés
   pegarlo en el chat.
5. **Reglas que van dentro de cada instrucción:**
   - "Hacé SOLO lo indicado. NO deploy. NO commit."
   - Si un texto a BUSCAR no está o aparece más de una vez: detenerse y
     reportar.
   - Aplicar los cambios de cada archivo EN ORDEN.
   - "Editá el archivo en el lugar (leer, reemplazar, escribir); nunca abras
     un archivo para escritura antes de haber leído su contenido."
   - Finales de línea LF (hay `.gitattributes` y `.editorconfig`).
   - Build de verificación: `npm run build:demo`.
   - No tocar CLAUDE.md ni CHANGELOG hasta el cierre del frente.
   - Si se toca un tipo o interfaz, revisar TODOS sus usos en `src/`,
     incluidos `.spec.ts` y `.html`.
   - Archivos nuevos: "NUEVO" en el título del paso.
6. **Lecciones de armado.** El parser de Claude Code:
   - **No acepta reemplazos de archivo completo sobre archivos
     existentes.** Usar solo BUSCAR/REEMPLAZAR; los archivos nuevos van
     completos.
   - **Agrega un salto de línea al final de cada BUSCAR.** Los BUSCAR tienen
     que ser LÍNEAS COMPLETAS (nunca un fragmento de línea), sin línea en
     blanco al principio ni al final.
   - **Toma un bloque suelto "agregá al final del archivo" como archivo
     nuevo.** Los agregados van anclados en contenido existente.
7. **Verificar contra el archivo real antes de entregar:**
   - Cada BUSCAR tiene que aparecer exactamente una vez. Lo ideal es
     aplicar la instrucción completa sobre una copia del repo y verificarla
     antes de entregarla.
   - Cuidado con los greps de verificación: el texto que se agrega no tiene
     que hacerlos fallar, y si el patrón tiene `$`, comillas simples.
   - Si podés, chequeo de tipos con tsc estricto y una prueba rápida en Node
     de las funciones puras.
8. **Respuestas:** sin relleno, con el razonamiento explicado y el código
   listo para usar. Estoy abierto a todo lo que mejore el diseño, desde la
   funcionalidad hasta la estética.
9. **Al cerrar el frente**, dos bloques separados:
   - uno de código, con el retiro de lo viejo que quede sin uso (si no
     compromete el resto de la app);
   - uno solo de documentación: CLAUDE.md (sección del frente, deudas
     resueltas y nuevas, checklist de migración a Vantruck), CHANGELOG y la
     lista "Pendiente".

## 3. Estrategias de arquitectura establecidas (aplican a este cierre)

**Encapsulación de acciones (ownership):**
- Cada acción de negocio vive en el servicio DUEÑO de la entidad principal
  del gesto. Por ejemplo, el cierre de una operación está en
  `OperacionService`, aunque escriba InformeOp, resúmenes y comisiones.
- Los componentes no escriben en Firestore: llaman a orquestadores y
  muestran `Resultado<T>` (`{exito, mensaje, objeto?}`).
- **Escritura atómica.** Los orquestadores arman `EscrituraBatch[]`
  (`{coleccion, id, modo, data}`, con modos `'crear' | 'reemplazar' |
  'actualizar' | 'eliminar' | 'fusionar'`) y los confirman de una de dos
  formas:
  - `DbFirestoreService.commitBatch`;
  - `commitEnTransaccion(armar)`, si hay que leer, validar y escribir:
    todas las lecturas primero, ≤ 500 escrituras, y `armar` puro y
    re-ejecutable.
- **En el mismo batch** van el negocio, el log
  (`LogRegistroService.agregarAlBatch` → `registroLog`, un solo log por
  gesto) y la papelera por referencia.
- **Detalle de los modos:**
  - `'actualizar'` = `update()` con claves punteadas;
  - `'fusionar'` = `set(merge)` + `increment()`, para agregados sin
    lecturas.
- **Piezas para otros orquestadores** devuelven `EscrituraBatch[]` sin
  commitear.
- **Factories puras, consultas de solo lectura y utils puros** en
  `shared/utils/`.
- **Patrón ConId e ids:** el id del documento no se guarda en el body. Ids
  string, nunca `Number(id)`.
- **Fechas** 'YYYY-MM-DD' operadas como string; nunca
  `new Date('YYYY-MM-DD')`.
- **Snapshot + ID:** los datos de las entidades se congelan en la operación
  al alta (`RefCliente`/`RefChofer`/…, `RefTarifaAplicada`). Lo vivo se
  resuelve por id solo para calcular.

**Camino nuevo en paralelo al viejo:**
- Lo nuevo se construye AL LADO de lo viejo, sin tocarlo: modelo, servicio,
  colección y pantallas nuevas.
- **También aplica a nivel MÉTODO:** se crea el método nuevo, se pasan los
  callers y se borra el viejo cuando no lo usa nadie. Nunca se reescribe un
  método existente en el lugar.
- El camino viejo queda funcionando (o comentado) hasta que el nuevo está
  probado. Lo que queda sin uso se retira al cerrar el frente; lo que
  todavía sirve a producción, en la migración de Vantruck.
- Las operaciones hoy se crean en forma DUAL: `op.valores` / `op.tarifaTipo`
  (legacy, espejo) + `op.valoresNuevos` / `op.tarifaAplicadaCliente` /
  `op.tarifaAplicadaChofer` (motor nuevo). Retirar lo legacy depende de lo
  que lo siga leyendo y de la migración de Vantruck (el "nivel 3" del doc
  de migración).
- Herramientas de `/migracion` (rol dev; simular → ejecutar):
  - Limpieza de demo;
  - generadores de operaciones / circuito / cobros;
  - recálculos de resúmenes y comisiones;
  - auditorías y migración de tarifas (`TarifaMigrationService`).

  Cuidado: `componentes/migracion/` es la herramienta activa, NO
  `raiz/liquidacion/migrar-datos`.

## 4. Lo que se hizo en Tarifas (según los docs: VERIFICAR)

- **Modelo nuevo:**
  - `Tarifa` (general / personalizada) y `TarifaEspecial` (parche liviano,
    solo categorías elegidas), `RegistroOpEventual` y `RefTarifaAplicada`
    en la operación.
  - En las entidades, `tarifasHabilitadas: RefTarifaHabilitada[]` (en un
    chofer de proveedor es `null` y se hereda del proveedor).
  - Colecciones `tarifas`, `tarifasEspeciales` y `registrosOpEventuales`.
    Son append-only: cada edición crea un documento nuevo con
    `versionAnteriorId` y desactiva el anterior.
- **Servicios:** `servicios/tarifario/` (`TarifarioService`,
  `TarifaFactoryService`, `TarifaEspecialFactoryService`,
  `TarifaGuardadoService`, `ValoresTarifaService`, el motor con
  `calcularAlta` / `calcularCierre`, jerarquía Eventual > Personalizada >
  Especial > General, y modo por km).
- **Módulo nuevo `raiz/tarifas`** (ruta `tarifas`): pestañas General,
  Personalizada, Especial, Eventual e Historial. Tiene viewers, forms,
  aumento (único / segmentado / manual, redondeo hasta miles), duplicar
  (también a la misma entidad, con nombre único entre vigentes) e
  historial por linaje.
- **Operaciones:**
  - `operaciones-editor` con selección manual de tarifa y
    sección/categoría (multiplicidad real);
  - la Personalizada del cliente define también el lado chofer;
  - el alta se bloquea sin tarifa resuelta;
  - alta y cierre facturan con el motor nuevo.
  - Se retiraron los métodos muertos del motor viejo `valores-op*`
    (nivel 1).
- **Migración (ensayo en demo):**
  - General y Especial recreadas a mano;
  - Eventual migrada con herramienta (214 registros);
  - en Vantruck no arrancó.
  - `vigenciaDesde` manual solo para dev.

## 5. Lo que figura como pendiente (VERIFICAR, tengo dudas)

**CHANGELOG → "Pendiente":**
- Tarifas, cierre: retirar el módulo viejo:
  - pantallas `*-tarifa-gral` / especial / personalizada en
    clientes/choferes/proveedores;
  - rutas `clientes|choferes|proveedores/general|especial|personalizada|eventual`;
  - listeners de `HomeComponent` / `StorageService` sobre
    `tarifasGral*`/`tarifasEsp*`/`tarifasPersCliente`.
- Multiplicidad real en `operaciones-editor`: hoy usa el shim
  `tarifaTipoDesdeHabilitadas`.
- Documentar el tarifario nuevo en CLAUDE.md.
- Campos legacy de `Operacion` (`valores`, `tarifaTipo`,
  `datosTarifaPersonalizada`): retirarlos con el cierre de Tarifas.

**Deuda en CLAUDE.md y en los docs:**
- `idTarifa` / `tarifaAsignada` en Cliente/Chofer/Proveedor.
- Bug de `proveedores-tarifa-gral`, que escribe en la colección
  equivocada.
- `modal-resumen-op` lee `tarifaTipo` sobre snapshots: ¿sigue existiendo, o
  lo reemplazó `modal-detalle-op`?
- `idCliente` de `TarifaPersonalizadaCliente`: el tipo dice number, el dato
  es string.
- Colecciones `historialTarifas` / `historialTarifasEspeciales` sin uso en
  `firestore.rules`.
- `TarifaEventual` (interfaz) y la colección `tarifasEventuales` viejas.
- `bajaOperacion` no limpiaba `RegistroOpEventual`: ¿se resolvió en el
  frente de baja de operación cerrada?
- 4 consultas `where("idOperacion", …)` sospechosas en
  `db-firestore.service`.
- Polish Ronda 2: validaciones y alertas.
- Vehículos con `categoria.nombre` heredado (texto libre).
- Indicador de variación aproximada.
- Tipado de `FormatearValorPipe` `'sufijo'`: los docs se contradicen.
- Usos de la tarifa general vieja fuera del cálculo:
  - `editar-tarifa-op` / `editar-inf-op` / `informe-liq-detalle` (camino
    viejo de Liquidación);
  - `migrar-datos`;
  - imports de `TarifaGralCliente` en los `-alta`.

**Señales concretas de documentación desactualizada:**
- **CLAUDE.md → "Sistema de tarifas":**
  - dice "Refactor grande planificado (no iniciado)", aunque se hizo;
  - describe `RefTarifaHabilitada` con `idTarifa`, que se eliminó antes de
    Bloque 3a;
  - lista consumidores del shim que pueden haber cambiado.
- **Nivel 2 del doc de migración:** habla de `reportes-op` /
  `resumenOpMensual` / `resumen-op-calculator`, pero el Frente Reportes
  (cerrado) los reemplazó por `resumenesOp`
  (`ResumenOpFactoryService`). Verificar qué queda.
- **Frentes posteriores que tocaron piezas relacionadas:**
  - **Liquidación nueva:** `InformeLiqNuevo`, `informesOp` y el editor de
    InformeOp, que espeja `valoresNuevos` → `op.valores`.
  - **Generador de operaciones:** usa `ResolucionTarifaOpService`.
  - **Finanzas:** retiró componentes viejos de Facturación.
  - **Fix `restaurar-op`**, que tocó tarifas.

  Puede que parte de lo "pendiente" ya esté resuelto, o que haya
  pendientes nuevos que no figuran.

## 6. Producción (Vantruck)

Vantruck corre código del camino VIEJO, por ejemplo el módulo viejo de
tarifas y Liquidación con `resumenLiq`. Hay fixes en ramas de producción
(`errorProveedores`). Confirmá conmigo el esquema de ramas antes de
proponer algo que dependa de él.

El retiro de lo viejo no puede romper nada que la migración de Vantruck
vaya a necesitar: datos viejos, herramientas de migración y backups.

## 7. Pendientes transversales relacionados (no son de este frente, pero cruzan)

- Auditoría de fechas 'YYYY-MM-DD' vs huso horario.
- `RaizModule` con módulos de feature eager.
- Estilo global `.col-numero`.
- Los dos pendientes nuevos de CLAUDE.md:
  - sidebar que no se cierra solo;
  - spinner de carga que no termina.

## 8. Qué te pido en este primer paso

Relevamiento y diagnóstico, SIN instrucciones todavía:

1. **Leé TODO el módulo de tarifas, viejo y nuevo:**
   - `raiz/tarifas/*`;
   - las pantallas viejas de tarifas dentro de `raiz/clientes`,
     `raiz/choferes`, `raiz/proveedores` y sus rutas;
   - `servicios/tarifario/*`, `servicios/tarifas/*`,
     `servicios/valores-op/*`, `servicios/buscarTarifa/*` (si existe) y
     `ResolucionTarifaOpService`;
   - las interfaces de tarifas, viejas y nuevas;
   - `operaciones-editor` y el modal de cierre / detalle de operación;
   - `HomeComponent` / `StorageService` (listeners);
   - `firestore.rules` (mapeos de colecciones de tarifas);
   - `TarifaMigrationService` y `componentes/migracion`.
2. **Compará con la documentación** (§0, §4 y §5) y armá tres listas:
   - lo que está hecho y funciona;
   - lo pendiente que es REAL, con evidencia en el código: archivo y
     línea;
   - lo que la documentación da como pendiente pero ya no lo es, o que
     está mal descripto.

   Agregá también los pendientes nuevos que encuentres.
3. **Mapa de consumidores de lo viejo:** qué pantallas, servicios, campos
   (`op.valores`, `op.tarifaTipo`, `datosTarifaPersonalizada`,
   `idTarifa`/`tarifaAsignada`, `tarifaTipo` de las entidades, shim) y
   colecciones viejas siguen vivos y quién los usa. Separalo en:
   - lo que se puede retirar ya;
   - lo que depende del camino viejo de Liquidación o de la migración de
     Vantruck.
4. **Propuesta de cómo seguir:** alcance del cierre, qué entra y qué se
   difiere, riesgos, plan tentativo de bloques (TC1, TC2, …) y preguntas
   numeradas (T1, T2, …) para que yo decida.
5. Guardá el relevamiento en `claude/diseno-tarifas-cierre.md`.

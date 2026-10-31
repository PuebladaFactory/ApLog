---
name: herramientas-demo
description: Herramientas de desarrollo solo para demo de ApLog, en la pantalla /migracion — limpieza de demo (LimpiezaDemoService), generador de operaciones de prueba (GeneradorOperacionesService) y ResolucionTarifaOpService, con sus guardas (projectId demoapplog + rol dev). Leer antes de trabajar sobre /migracion, la limpieza de datos, el generador o los datos de prueba de demo.
---

## Herramientas de desarrollo (solo demo) — Limpieza + Generador de operaciones (Septiembre 2026)

Objetivo: vaciar lo operativo de demo y generar un período de operaciones
realistas (≈500/mes, con tablero y cierres) para probar Tarifas,
Liquidación y Facturación con volumen. Viven en `/migracion` (ruta con
RoleGuard dev), debajo de las migraciones. Diseño y decisiones G1–G12: doc
de proyecto `claude/diseno-generador-operaciones.md`; instrucciones:
`claude/instruccion-p1…p5-*.md`, `instruccion-p3-1-ajustes-plan.md`,
`instruccion-fix-reglas-nooperativo.md`.

### Guardas (las dos herramientas)
- `environment.firebase.projectId === LimpiezaDemoService.PROYECTO_DEMO`
  ('demoapplog') + rol 'dev' (`UsuarioSesionService.getRol()`). Los
  servicios lo verifican en cada método público que lee o escribe y lanzan
  si no se cumple; los componentes muestran "solo funciona en demo" fuera
  de demo.
- Regla del proyecto: todo se hace y se prueba en demo; nada va a Vantruck
  hasta la migración final de datos. Estas herramientas nunca se usan en
  Vantruck.

### Limpieza de demo (`servicios/desarrollo/limpieza-demo.service.ts`, `componentes/limpieza-demo/`)
- Allowlist `COLECCIONES_A_VACIAR` (operativas del modelo nuevo):
  operaciones, asignaciones, informesOp, informesLiq, informesLiqSnapshots,
  facturasVinculadas, informesVenta, comisionesVenta, liquidacionesVenta,
  registrosOpEventuales, noDisponibilidades,
  resumenOpMensual, resumenesOp, movimientos, movimientosFin, resumenFinanzas, registroLog,
  generacionesPrueba. Una colección que no está en la lista nunca se borra
  (fail-safe: el SDK web no puede listar colecciones).
- Papelera: solo los eventos con `coleccionPrincipal` 'operaciones' y sus
  objetos (`PapeleraService.armarPurgaPorColeccion`; ids de
  objetosEliminados `${coleccion}__${idOriginal}`). La papelera de
  entidades se conserva.
- Numeradores: se ponen en 0 con 'actualizar' (dev puede editar
  `numeradores`, no borrarlos; el código recrea el doc si falta).
- UI en tres pasos: Contar (`DbFirestoreService.contarDocumentos`,
  getCountFromServer) → escribir "LIMPIAR DEMO" → Limpiar
  (`DbFirestoreService.eliminarTodosLosDocumentos`, lotes de 500 con
  progreso). `obtenerTodosConId<T>` también es nuevo (P1).
- Storage no se toca: los adjuntos de `facturas/` y `operaciones/` quedan
  huérfanos (borrar a mano desde la consola si hace falta; `legajos/` se
  conserva). Después de limpiar conviene borrar el almacenamiento local del
  sitio (StorageService cachea colecciones en localStorage).
- Purga única del legado (28 colecciones del modelo viejo + `_backup_*`),
  hecha UNA vez con Firebase CLI (`firebase firestore:delete <ruta>
  --recursive --project demo`, desde Git Bash) después de un export
  administrado de Firestore a Cloud Storage. No es parte de la herramienta:
  la CLI usa las credenciales de la cuenta y no pasa por las reglas.

### ResolucionTarifaOpService (`servicios/tarifario/resolucion-tarifa-op.service.ts`)
Extraído de `operaciones-editor` (P2) para que el editor y el generador
usen las mismas reglas: `choferesDisponibles`, `vehiculosDisponibles`,
`asignarChofer` (→ `{asignado, eventualRecalculado}`), `asignarVehiculo`,
`esEventualForzada`, `candidatosOp` ('eventual' | 'pendiente' |
'sinEntidad' | 'ok'), `aplicarRef` (espejo de Personalizada al lado
chofer), `requiereSeleccionManual`. Sobre los métodos públicos de
`ValoresTarifaService` / `OperacionFactoryService`.

### Generador (`servicios/desarrollo/generador-operaciones.service.ts`, `componentes/generador-operaciones/`)
- Dos pasos: **Simular** (`planificar`: no escribe) y **Generar**
  (`ejecutar`), habilitado solo si los parámetros no cambiaron desde la
  simulación (`igualesPorContenido`). Planificar exige los datos de
  disponibilidad cargados (`DisponibilidadService.datosCargados()`): sin
  ellos no planifica.
- Azar con semilla: `shared/utils/azar.util.ts` (`Azar`, mulberry32:
  `siguiente`, `entero`, `chance`, `elegir`, `elegirPonderado`, `mezclar`,
  `variar`). Misma semilla + mismos datos de demo = mismo plan (los idItem
  son UUID y no influyen).
- Plan: días hábiles peso 1, sábado `pesoSabado`, domingos opcionales;
  objetivo por día = total × peso relativo ±15%. Por día, en cada vuelta se
  sortean solo vehículos con chofer libre (1 op por vehículo y por chofer
  por día, G2). El pool del día y los choferes de proveedor elegibles salen
  de `DisponibilidadService` con `consultasDeAsignacion` — la misma regla que
  la guarda de `altaDesdeAsignacion`, así que un día planificado no falla
  después por disponibilidad (skill `modulo-operaciones`, "No
  disponibilidad"). Además, regla de capacidad: un vehículo de proveedor
  necesita un chofer activo, disponible y sin operación ese día. Cliente con
  reparto sesgado (orden al azar + pesos Zipf, `sesgoClientes`). Cada op se
  arma con las mismas piezas que la UI: `crearOperacionesDesdeAsignacion` +
  `ResolucionTarifaOpService`. Chofer de proveedor al azar (G11); candidato
  de tarifa al azar (G4); sección/categoría automática si se puede; si no:
  Personalizada o por km → sección y categoría libres; General/Especial →
  sección al azar entre las que tienen la categoría del vehículo.
  Eventuales (forzadas + `pctEventualExtra`): tarifa general de la
  categoría ±20%, cada lado por separado (G5). Lo que no resuelve tarifa se
  excluye con motivo (G7). Cierre solo en fechas pasadas (`pctCerrar`),
  multiplicadores en 1 (G6).
- Ejecutar: vuelve a planificar con los mismos parámetros (objetos nuevos:
  `altaDesdeAsignacion` les asigna ids y números); por día
  `altaDesdeAsignacion(fecha, creadas, 'bloquear')`; después cierre una por
  una como el modal de cierre (km; adicional en `op.adExtra` con
  `armarAdExtra`; `calcularCierre`; `cerrarOperacion`). No es atómico
  en conjunto: un error se registra y sigue; lo escrito queda en un estado
  válido. Rehacer = Limpieza + generar con la misma semilla.
- Lote `generacionesPrueba/{id}`: 'en curso' al empezar (usuario,
  parámetros, resumen del plan); al terminar estado ('completo' | 'con
  errores' | 'interrumpido'), `fin`, altas, cierres, errores (máx. 200),
  `idsOperacion` (best-effort). Aviso `beforeunload` mientras genera.
- Reglas (deployadas SOLO en demo): módulo 'desarrollo' para
  `generacionesPrueba` (ver "Security Rules"). RaizModule importa FormsModule (el componente usa ngModel).
- Primer lote (demo, agosto 2026): 508 operaciones en 26 días, 408
  cerradas (816 InformeOp), 98 registros eventuales, 0 errores. Exclusiones
  restantes: solo Ofidirect (su tarifa Especial no cubre algunas categorías
  de vehículo: dato real, no del generador).

## Deuda abierta — generador de operaciones y datos de demo
- Eventuales: cliente y chofer se varían ±20% por separado → puede quedar
  pago al chofer mayor que el cobro al cliente. Inofensivo para pruebas; si
  molesta, derivar el valor del chofer del cliente con un margen.
- ~~Vigencia de tarifas por `activo`, no por fecha~~ — RESUELTO en el cierre de
  Tarifas: el generador toma la General vigente a la fecha de cada día.
- ~~`idInfVenta = Date.now() + random(0..999)`: puede colisionar en cierres
  rápidos~~ — RESUELTO en el Frente Vendedores (`comisionesVenta` con id
  determinista). Para tener comisiones en demo: asignar vendedores a
  clientes desde Vendedores → Listado y correr el Recálculo de comisiones.
- Ofidirect (demo): su Especial no cubre algunas categorías de vehículo →
  exclusiones en el plan. Completar la tarifa si se quieren 0 exclusiones.
- La limpieza no toca Storage (ver "Herramientas de desarrollo").
- `idsOperacion` del lote es un array en el doc: con ~500 ids no hay
  problema; con varios miles se acercaría al límite de 1 MB por documento.
- Registradas durante el frente (diseño §10): ~~rutas viejas de tarifas
  (`clientes|choferes|proveedores/general|especial|personalizada|eventual`)
  activas y listeners de HomeComponent sobre las colecciones viejas~~ —
  RESUELTO en el cierre de Tarifas; el `LogService` viejo sigue escribiendo en
  `logs` sólo desde la Papelera legado (skill `subsistema-log`); ~~la papelera vieja todavía recibe bajas
  (vendedores con rol no dev vía `deleteItemPapelera`)~~ — resuelto en el
  Frente Vendedores (los vendedores se desactivan); ~~Finanzas lee/escribe
  colecciones purgadas en demo~~ — resuelto en el Frente Finanzas (módulo
  nuevo sobre `informesLiq` / `movimientosFin`; Vendedores ya no usa
  `resumenVenta`); `firestore.rules` conserva el mapeo de las
  colecciones purgadas.

---
name: ficha-entidad
description: Ficha de entidad de ApLog (FichaEntidadService.abrir, FichaEntidadComponent, EdicionEntidadService) — la carpeta de solo lectura de un cliente, chofer o proveedor con sus pestañas (datos, vehículos, legajo, tarifas, contactos), datos vivos, acciones y accesos. Leer antes de trabajar sobre la ficha, el botón Ver ficha, los enlaces a la ficha o la fecha de nacimiento del chofer.
---

## Frente Ficha de entidad (Octubre 2026)

Una "carpeta" de SOLO LECTURA de un chofer, proveedor o cliente: un modal `xl` con
pestañas que junta los datos administrativos, sin abrir el form de alta. Bloques FI1, FI1b,
FI1c, FI2, FI3 (incluye FI5 del plan), FI4, FI6 y FI7 (detalle de valores, posterior al
cierre). Diseño, decisiones F1–F14 y de la Ronda 2 (§11), y avance:
`claude/diseno-ficha-entidad.md` (Project). Todo se probó en demo; nada se deployó a
Vantruck.

### Piezas
- `FichaEntidadService.abrir(tipo, id)` (`servicios/ficha-entidad/`): punto de entrada
  único. Importa SOLO el componente de Shared (nunca un componente de feature: lo
  arrastraría al chunk común de todos los que usan la ficha — ver la trampa de
  `VisualizadorObjetoService` en la skill `subsistema-log`, subsección "Frente 3").
- `FichaEntidadComponent` (`shared/ficha-entidad/`): contenedor. Contrato tipado
  `@Input() tipo: TipoFicha` (= `EntidadTipo`) / `@Input() id`, seteados por el servicio
  antes del primer ciclo de detección (no `fromParent`).
- Pestañas de solo presentación (`@Input`, sin servicios de datos), declaradas en
  `SharedModule` sin exportar: `FichaChoferDatos`, `FichaVehiculos`, `FichaLegajo`,
  `FichaEmpresaDatos` (recibe `EmpresaFicha`: los 5 campos que comparten `Proveedor` y
  `Cliente`), `FichaContactos`, `FichaChoferes` (`@Output() abrir`), `FichaTarifas`
  (`@Output() irATarifas`) y `FichaTarifaDetalle` (FI7, recibe `DetalleTarifaFicha`).
- Utils puros: `ficha-entidad.util.ts` (`cuitLegible`, `direccionLegible`, estados del
  legajo, `renglonesLegajo`, `nombreChofer`, `contactoLegible`,
  `filasChoferesDeProveedor`, `MODULO_FICHA`) y `ficha-tarifas/ficha-tarifas.util.ts`.
- `EdicionEntidadService` (`servicios/ficha-entidad/`): "Editar" (ver abajo). Servicio
  aparte de `FichaEntidadService` a propósito: ese importa el componente, y si el
  componente lo inyectara habría un import circular.

### Pestañas
| Ficha | Pestañas |
|---|---|
| Chofer | Datos personales · Vehículos (de un chofer de proveedor: los del proveedor) · Legajo (estado, documentos con carrusel, categorías activas sin cargar como "Falta cargar") · Tarifas · Proveedor (solo chofer de proveedor: datos, contacto principal y "Abrir ficha del proveedor") |
| Proveedor | Datos de la empresa · Contactos · Choferes (con estado del legajo; el nombre abre la ficha del chofer) · Vehículos · Tarifas |
| Cliente | Datos de la empresa · Contactos · Tarifas |

Encabezado fijo: nombre / razón social, CUIT con guiones, condición fiscal y badges
(contratación del chofer, "Oculto en listados" si `visible === false`, estado del legajo).
Historial de reemplazos y ZIP del legajo siguen en Legajos → Consultar.

**Pestaña Tarifas** (F3 (b)): niveles habilitados (pipes `etiquetaNivelTarifa` /
`claseNivelTarifa`) y tarifas vigentes HOY **sin valores**: General en una línea,
Personalizadas (clientes) y Especiales en tabla (nombre, modo, vigente desde, categorías;
Alcance solo en especiales de chofer/proveedor). Si hay vigentes de un nivel no
habilitado, se listan con un aviso. Reglas: chofer → niveles con
`ProveedorService.resolverTarifasHabilitadasChofer` (chofer de proveedor: "heredados del
proveedor", especiales del proveedor); vigentes con los getters de `TarifarioService` sin
fecha (la misma regla que la pantalla de Tarifas). "Ver en Tarifas" cierra y navega a la
pestaña del nivel (Tarifas no tiene enlace a una tarifa puntual).

**Detalle de valores (FI7):** cada tarifa (General, Personalizadas, Especiales) tiene "Ver
valores", que despliega debajo del renglón una tabla de solo lectura
(`FichaTarifaDetalleComponent`, componente propio: los viewers de `raiz/tarifas` no se
tocan). `detalleTarifaFicha` (`ficha-tarifas.util.ts`, puro) arma:
- **Solo el lado de la entidad**, con la regla del motor (`ValoresTarifaService.calcularLado`):
  cliente → `aCobrar` / `adicionalKmACobrar` / `acompanianteACobrar`; chofer directo →
  `aPagar` / `adicionalKmAPagar` / `acompanianteAPagar`; proveedor y chofer de proveedor →
  `aPagarProveedor ?? aPagar` (ídem adicional y acompañante); Especial → `valor` /
  `adicionalKm` / `adicionalAcompaniante`. Adicional por km con 1er sector e intervalo y los
  escalones de `kmDistancia`; tarifa por km: "(por km)".
- **Categorías de sus vehículos** (chofer: los suyos; chofer de proveedor: los suyos y los
  del proveedor; proveedor: los del proveedor; cliente: ninguno), comparadas por NOMBRE como
  `resolverSeccionCategoria` (en todas las secciones; una tarifa por km no se compara):
  columna con los dominios, y un aviso por cada vehículo cuya categoría no está en la
  tarifa (el caso en que el motor no puede usarla para ese vehículo).
- **Vista inicial:** si hay vehículos que coinciden, solo sus categorías ("Ver todas las
  categorías" muestra el resto con las suyas resaltadas); si no, todas.
- El contenedor arma el contexto (`ContextoTarifaFicha`: lado + vehículos) en
  `armarTarifas`; con datos vivos el detalle se actualiza y respeta la vista elegida.

### Datos vivos y navegación
- UNA suscripción (`combineLatest`) a `choferes$`, `vehiculos$`, `proveedores$`,
  `legajos$`, `categorias$`, `clientes$`, `tarifas$` y `tarifasEspeciales$` (todos en
  memoria desde `HomeComponent`: cero lecturas nuevas a Firestore). Guarda la última
  emisión y arma la ficha del tipo actual. Si la entidad se edita en otra pestaña, se
  actualiza; si se da de baja, lo avisa ("se dio de baja", ver Papelera).
- Las emisiones pueden llegar fuera de la zona de Angular (aviso "Firebase API called
  outside injection context"): se reingresa con `NgZone.run`.
- Navegación DENTRO del mismo modal (NgbModal apilado se ve mal y duplica el fondo): pila
  `anteriores` con tipo, id, nombre y pestaña; `abrirFicha(tipo, id)` apila la actual; "←
  Volver a …" retoma la anterior en la pestaña en la que estaba. Al navegar se rearma con
  la última emisión, sin resuscribirse.

### Acciones (pie de la ficha, sobre la entidad MOSTRADA)
- **Editar** (`PermisosService.puede(MODULO_FICHA[tipo], 'editar')`: demo no lo ve):
  cierra la ficha y abre el MISMO modal de edición de los listados (`fromParent = { modo:
  'edicion', item }`). `EdicionEntidadService.cargarModal` trae `ChoferesAlta` /
  `ProveedoresAlta` / `ClienteAlta` con `import()` dinámico: siguen en el chunk de su
  módulo (el build agrega tres chunks puente de ≈ 2,4 kB). Al terminar no se vuelve a la
  ficha.
- **Ver cuenta** (`finanzas.ver`: user no lo ve): cierra y navega a
  `/finanzas/cuenta/:tipo/:id`. No se muestra en un chofer de proveedor (no tiene cuenta
  propia).

### Accesos
- Legajos → Tablero y Vencimientos: el nombre del chofer.
- Legajos → Consultar: botón "Ver ficha" al lado de "Descargar Legajo".
- Clientes, Choferes y Proveedores → Listado: el "ver" (ojo) de cada fila abre la ficha
  (`abrirVista`). El modo `'vista'` del alta sigue existiendo para
  `VisualizadorObjetoService` (Registro, Papelera, Tarifas).
- `tabla-generica`: `ColumnaTablaGenerica.accionCelda?: (fila) => void` (opcional, como
  `claseCelda`) dibuja la celda como enlace (`role="link"`, Enter, `.enlace-celda`). Hoy
  lo usa Vencimientos.
- Estilo de los nombres clickeables: el de `.enlace-entidad` de Finanzas (sin azul ni
  subrayado; subrayado al pasar el mouse).

### Bundle
La ficha vive en un chunk compartido (≈ 59 kB desde FI7) entre Clientes, Choferes, Proveedores y
Legajos. El inicial no cambió (1,53 MB).

### Fecha de nacimiento del chofer (F10 + FI1c)
- `Chofer.datosPersonales.fechaNac` y `ChoferFormData.fechaNac` son `string`
  'YYYY-MM-DD' (antes tipados `Date`). El Excel de choferes la formatea con `fechaLegible`
  (salía un día antes: D6 resuelta).
- En demo había fechas guardadas como Timestamp o mapa `{seconds, nanoseconds}`. Causas:
  el anonimizador de prueba de `choferes-listado` (borrado) y la edición, que re-guardaba
  lo leído (`patchValue` con el objeto; el input de fecha no lo muestra y el control lo
  conserva).
- `shared/utils/fecha-nacimiento.util.ts`: `errorFechaNacimiento` (1900–hoy) y
  `normalizarFechaNacimiento` (texto, Timestamp, mapa o Date → 'YYYY-MM-DD'; un instante
  justo a las 00:00 UTC toma el día UTC, el resto el día de Argentina).
- `ChoferFactoryService.buildDatosPersonales` (único punto de escritura, alta y edición)
  normaliza y LANZA si no queda una fecha válida: nunca se guarda un objeto de fecha. El
  form carga la fecha normalizada y valida el rango (`ValidarService.fechaNacimientoValida`,
  `min`/`max`). `ChoferMigrationService` normaliza.
- Lectura defensiva: ficha, Excel y `fechaLegible` (un valor que no es texto → el valor de
  "vacío").
- Herramienta de `/migracion` "Fecha de nacimiento de choferes"
  (`NormalizacionFechaNacService`, rol dev + id del proyecto escrito, en cualquier
  proyecto): simula (convertir / ok / revisar) y escribe solo `datosPersonales.fechaNac`,
  en `choferes` y en las copias de la papelera (`objetosEliminados`, `choferes__…`). Sin
  log. Ejecutada en demo.

### Verificación de cada bloque
Antes de entregar cada instrucción: archivos comparados con el repo real, BUSCAR validados
todos antes de escribir, aplicación por script sobre una copia limpia (resultado idéntico
a la referencia), `tsc` (también `--noUnusedLocals`), pruebas de render con Karma +
Chromium (spec temporal con `tsconfig` propio, porque los 7 specs rotos impiden
`npm test`) y `build:demo` (mismas 9 advertencias). La prueba de render se sumó en FI1b:
FI1 compilaba pero fallaba al abrir (NG0309, ver "Deuda — tras el frente Ficha de
entidad").

## Deuda abierta — tras el frente Ficha de entidad
- **ng-bootstrap 15.1.2 sobre Angular 20:** está hecho para Angular 16. Los componentes
  con `hostDirectives` + selector propio aplican la directiva base dos veces y Angular 20
  lo rechaza en runtime (NG0309; `tsc` y el build no lo ven). Pasó con `ngbNavLink` en la
  ficha (se reemplazó por pestañas de Bootstrap). Actualizar a la versión de ng-bootstrap
  de Angular 20 es un frente aparte: revisar carrusel, datepicker, dropdown, nav y
  modales.
- **Anonimizadores de prueba sin uso** en `clientes-listado` (`editarClientes` /
  `anonimizarClientes`) y `proveedores-listado` (`anonimizarProveedores`): borrarlos
  cuando se toquen esas pantallas (el de choferes se borró en FI1c).
- ~~F3: un componente que muestre el detalle de una tarifa con sus valores~~ — RESUELTO
  en FI7 (ver "Frente Ficha de entidad → Pestaña Tarifas → Detalle de valores").
- F7 (pedido del cliente: el apellido / la razón social de los listados como enlace a la
  ficha): ampliado a toda la app, va como frente propio — ver "Frente futuro — nombre de la
  entidad como enlace a la ficha en toda la app".
- `VisualizadorObjetoService.verObjeto` podría delegar en la ficha para `choferes` /
  `clientes` / `proveedores` vivos (hoy abre el alta en modo vista).

## Deuda abierta — Frente futuro — nombre de la entidad como enlace a la ficha en toda la app
Análisis hecho al cierre del frente Ficha de entidad (18/10/2026); se encara como FRENTE
PROPIO, no como extra de ese frente. Idea: en (casi) todas las pantallas donde aparece el
nombre de un cliente, chofer o proveedor (razón social, apellido y nombre), que sea un
enlace que abre su ficha (`FichaEntidadService.abrir`).
- **Pieza única compartida**, no código suelto por pantalla: una directiva o componente de
  Shared (por ejemplo `<app-enlace-entidad tipo id>`) con estilo (`.enlace-entidad`),
  teclado y accesibilidad; en `tabla-generica`, `accionCelda` más una condición por fila
  (si la celda es enlace o texto, por ejemplo con la entidad dada de baja o un chofer
  directo en la columna Proveedor); en `tabla-listado`, sumar una acción al lado de
  `enlace` (hoy solo `routerLink`). Cada pantalla queda en una línea.
- **Inventario inicial:** nombres de entidades en ≈ 34 plantillas (Operaciones,
  Liquidación, Facturación, Finanzas, Vendedores, Reportes, Legajos, Tarifas, Ajustes y
  modales de Shared). Antes de abrir el frente: inventario fino por pantalla (componente,
  tipo de tabla, clics que ya existen).
- **Pros:** ir a la carpeta de la entidad desde cualquier pantalla sin pasar por el
  listado; mismo comportamiento en toda la app (como Legajos y Vencimientos); costo bajo
  por pantalla (la ficha lee de memoria; el chunk compartido de ≈ 59 kB se descarga una
  vez).
- **Contras / riesgos:**
  - clics que ya existen: tablero de asignaciones (las tarjetas se arrastran: excluir),
    Finanzas (el nombre abre la CUENTA: no cambiarlo; la ficha tiene "Ver cuenta"), filas
    que se expanden o abren algo al hacer clic (el enlace debe cortar la propagación);
  - modales apilados cuando el nombre está dentro de otro modal (detalle de operación o
    de liquidación): decidir caso por caso;
  - datos históricos vs vivos: en operaciones y liquidaciones el nombre es el snapshot del
    alta y la ficha muestra la entidad HOY (si se dio de baja, lo avisa; si cambió el
    nombre, no coinciden); los snapshots traen el id;
  - Registro y Papelera muestran entidades borradas: tienen su propio "ver" con la foto
    (excluir);
  - saturación visual (mitigada por el estilo sin azul ni subrayado) y copiar texto con el
    mouse (menor).
- **Alcance sugerido por etapas:** (1) pieza compartida + `tabla-listado` con acción;
  (2) listados de Clientes, Choferes y Proveedores (el pedido original del cliente: F7);
  (3) Operaciones y Liquidación (tablero de operaciones, InformeOp, borradores, emitidos,
  facturados); (4) Vendedores, Reportes y modales de Shared, caso por caso; (5) excluidos:
  tablero de asignaciones, Finanzas (salvo lo que no sea "abrir cuenta"), Registro y
  Papelera.

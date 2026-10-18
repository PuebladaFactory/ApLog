````
Si no ves la línea FIN DE LA INSTRUCCIÓN DOC-FI al final, el texto llegó cortado: leé el archivo completo.

INSTRUCCIÓN DOC-FI — Frente Ficha de entidad (ApLog, rama refactor)
====================================================================
Cierre (documentación): CLAUDE.md y CHANGELOG.md

## Contexto y razonamiento

Último bloque del frente. El código quedó cerrado en FI1, FI1b, FI1c, FI2, FI3 (con FI5),
FI4 y FI6, todos aplicados, probados en demo y commiteados. La documentación todavía no los
menciona.

**Cambios (SOLO documentación, ningún archivo de código):**

CLAUDE.md
1. "Servicios clave": fila nueva `ficha-entidad/` y `NormalizacionFechaNacService` en la
   fila `desarrollo/`.
2. "Patrones → Tablas": `claseCelda` y `accionCelda`.
3. Sección NUEVA "## Frente Ficha de entidad (Octubre 2026)" antes de "## Deuda conocida":
   piezas, pestañas, datos vivos y navegación, acciones (Editar / Ver cuenta), accesos,
   bundle, fecha de nacimiento (F10 + FI1c) y cómo se verificó cada bloque.
4. "Deuda — Excel/PDF": D6 (fecha del Excel de choferes) tachada como RESUELTA.
5. Secciones NUEVAS al final: "Deuda — tras el frente Ficha de entidad" (ng-bootstrap 15
   sobre Angular 20, anonimizadores de clientes y proveedores, alternativas F3 y F7 para
   analizar, `VisualizadorObjetoService`) y "Checklist — migración a Vantruck: frente Ficha
   de entidad" (herramienta de fecha de nacimiento).

CHANGELOG.md
6. Entrada nueva "## Frente Ficha de entidad (Octubre 2026)" antes de "### Pendiente".
7. "Pendiente": Excel/PDF al día (D6 resuelta), ng-bootstrap como pendiente transversal y
   la migración remite al checklist nuevo.

No se documenta acá tu commit `3ef4e34` (orden del sidebar y log viejo oculto): no es de
este frente.

**Verificación previa:** antes de armarla traje CLAUDE.md y CHANGELOG.md de tu repo por el
puente y apliqué los BUSCAR/REEMPLAZAR con un script sobre esas copias: cada BUSCAR aparece
una sola vez, el resultado es idéntico a la referencia y no deja espacios al final de línea.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- **Esta instrucción toca SOLO CLAUDE.md y CHANGELOG.md.** Es el bloque de cierre: acá
  termina la regla de no tocarlos durante el frente. Ningún otro archivo.
- Validá TODOS los BUSCAR antes de escribir el primero. Si un texto a BUSCAR no está o
  aparece más de una vez: detenete y reportá. Los BUSCAR son líneas completas.
- Aplicá los cambios de cada archivo EN ORDEN (siguen el orden del archivo).
- Editá el archivo en el lugar (leer, reemplazar, escribir); nunca abras un archivo para
  escritura antes de haber leído su contenido.
- Finales de línea LF; codificación UTF-8 (hay tildes, flechas y "→").
- Los textos a REEMPLAZAR son markdown: copialos tal cual (incluidos `~~`, backticks y
  tablas).

## PASO 0 — Verificación (sin modificar nada)

```
git status --short CLAUDE.md CHANGELOG.md
wc -l CLAUDE.md CHANGELOG.md
grep -n "^## Deuda conocida\|^### Checklist — migración a Vantruck: frente Lazy\|^| \`ficha-entidad/\`\|^## Frente Ficha" CLAUDE.md
grep -n "^### Pendiente\|^## Frente Ficha" CHANGELOG.md
grep -c " $" CLAUDE.md
grep -c " $" CHANGELOG.md
```

Esperado:
1. Sin cambios pendientes.
2. 4486 y 2284.
3. 3573 (Deuda conocida) y 4468 (Checklist Lazy); nada más.
4. 2243 (Pendiente); nada más.
5. 0 y 0.

Si algo no coincide (por ejemplo, si alguno de los dos archivos cambió desde el último
commit), DETENETE y reportá: los BUSCAR están armados contra esas versiones exactas.

## PASO 1 — CLAUDE.md

1.1 `CLAUDE.md` — Servicios clave: ficha-entidad. BUSCAR:
```
| `visualizador-objeto/` | `VisualizadorObjetoService` — dispatcher `coleccion -> modal de vista real`, usado por `RegistroLogComponent` y (desde el Frente Papelera) por `PapeleraComponent` vía el parámetro `snapshot` de `verObjeto` |
```
REEMPLAZAR:
```
| `visualizador-objeto/` | `VisualizadorObjetoService` — dispatcher `coleccion -> modal de vista real`, usado por `RegistroLogComponent` y (desde el Frente Papelera) por `PapeleraComponent` vía el parámetro `snapshot` de `verObjeto` |
| `ficha-entidad/` | `FichaEntidadService.abrir(tipo, id)` (ficha de solo lectura de chofer / proveedor / cliente) y `EdicionEntidadService` ("Editar" desde la ficha, con `import()` dinámico de los modales de alta) — ver "Frente Ficha de entidad" |
```

1.2 `CLAUDE.md` — Servicios clave: herramienta de desarrollo nueva. BUSCAR:
```
| `desarrollo/` | Herramientas de `/migracion`. SOLO demo (guarda projectId `demoapplog` + rol dev): `LimpiezaDemoService`, `GeneradorOperacionesService` — ver "Herramientas de desarrollo (solo demo)"; `GeneradorCircuitoService`, `GeneradorCobrosService` — ver "Frente Finanzas". En cualquier proyecto (rol dev + confirmación escrita del id de proyecto; se usa en la migración de Vantruck): `RecalculoResumenesService` — ver "Frente Reportes"; `RecalculoComisionesService` — ver "Frente Vendedores" |
```
REEMPLAZAR:
```
| `desarrollo/` | Herramientas de `/migracion`. SOLO demo (guarda projectId `demoapplog` + rol dev): `LimpiezaDemoService`, `GeneradorOperacionesService` — ver "Herramientas de desarrollo (solo demo)"; `GeneradorCircuitoService`, `GeneradorCobrosService` — ver "Frente Finanzas". En cualquier proyecto (rol dev + confirmación escrita del id de proyecto; se usa en la migración de Vantruck): `RecalculoResumenesService` — ver "Frente Reportes"; `RecalculoComisionesService` — ver "Frente Vendedores"; `NormalizacionFechaNacService` — ver "Frente Ficha de entidad" |
```

1.3 `CLAUDE.md` — Tablas: accionCelda. BUSCAR:
```
- Los botones del toolbar (alta, descarga, visibilidad) quedan fuera de la tabla
```
REEMPLAZAR:
```
- Los botones del toolbar (alta, descarga, visibilidad) quedan fuera de la tabla
- Celdas: `claseCelda` (badge) y `accionCelda` (enlace que ejecuta una acción, ej. abrir
  la ficha de entidad), los dos opcionales
```

1.4 `CLAUDE.md` — sección nueva del frente, antes de Deuda conocida. BUSCAR:
```
`version.ts` con la versión de package.json, el commit y la fecha. La app muestra solo
`appVersion` (sidebar).

## Deuda conocida
```
REEMPLAZAR:
```
`version.ts` con la versión de package.json, el commit y la fecha. La app muestra solo
`appVersion` (sidebar).

## Frente Ficha de entidad (Octubre 2026)

Una "carpeta" de SOLO LECTURA de un chofer, proveedor o cliente: un modal `xl` con
pestañas que junta los datos administrativos, sin abrir el form de alta. Bloques FI1, FI1b,
FI1c, FI2, FI3 (incluye FI5 del plan), FI4 y FI6. Diseño, decisiones F1–F14 y avance:
`claude/diseno-ficha-entidad.md` (Project). Todo se probó en demo; nada se deployó a
Vantruck.

### Piezas
- `FichaEntidadService.abrir(tipo, id)` (`servicios/ficha-entidad/`): punto de entrada
  único. Importa SOLO el componente de Shared (nunca un componente de feature: lo
  arrastraría al chunk común de todos los que usan la ficha — ver la trampa de
  `VisualizadorObjetoService` en "Frente Log → Frente 3").
- `FichaEntidadComponent` (`shared/ficha-entidad/`): contenedor. Contrato tipado
  `@Input() tipo: TipoFicha` (= `EntidadTipo`) / `@Input() id`, seteados por el servicio
  antes del primer ciclo de detección (no `fromParent`).
- Pestañas de solo presentación (`@Input`, sin servicios de datos), declaradas en
  `SharedModule` sin exportar: `FichaChoferDatos`, `FichaVehiculos`, `FichaLegajo`,
  `FichaEmpresaDatos` (recibe `EmpresaFicha`: los 5 campos que comparten `Proveedor` y
  `Cliente`), `FichaContactos`, `FichaChoferes` (`@Output() abrir`) y `FichaTarifas`
  (`@Output() irATarifas`).
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
La ficha vive en un chunk compartido (≈ 51 kB) entre Clientes, Choferes, Proveedores y
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

## Deuda conocida
```

1.5 `CLAUDE.md` — Deuda — Excel/PDF: D6 resuelta. BUSCAR:
```
- Excel de choferes (decisión D6 del frente Lazy loading + fechas):
  `ExcelService.formatearFecha` muestra `fechaNac` un día antes (`new Date` sobre
  un string 'YYYY-MM-DD'), y `Chofer.datosPersonales.fechaNac` está tipado `Date`
  aunque se guarda como string. Se corrige al reescribir esa exportación sobre
  `DocumentoTabular` (`fechaLegible`).
```
REEMPLAZAR:
```
- ~~Excel de choferes (decisión D6 del frente Lazy loading + fechas):
  `ExcelService.formatearFecha` muestra `fechaNac` un día antes, y
  `Chofer.datosPersonales.fechaNac` está tipado `Date`~~ — RESUELTO en el frente Ficha
  de entidad (F10 + FI1c): `fechaNac: string` y `fechaLegible`. La reescritura sobre
  `DocumentoTabular` sigue pendiente por `exceljs` (punto siguiente).
```

1.6 `CLAUDE.md` — secciones nuevas al final. BUSCAR:
```
6. **Supabase:** decidir qué hacer con las facturas históricas (ver "Deuda —
   Facturación") y rotar las anon keys.
```
REEMPLAZAR:
```
6. **Supabase:** decidir qué hacer con las facturas históricas (ver "Deuda —
   Facturación") y rotar las anon keys.

### Deuda — tras el frente Ficha de entidad
- **ng-bootstrap 15.1.2 sobre Angular 20:** está hecho para Angular 16. Los componentes
  con `hostDirectives` + selector propio aplican la directiva base dos veces y Angular 20
  lo rechaza en runtime (NG0309; `tsc` y el build no lo ven). Pasó con `ngbNavLink` en la
  ficha (se reemplazó por pestañas de Bootstrap). Actualizar a la versión de ng-bootstrap
  de Angular 20 es un frente aparte: revisar carrusel, datepicker, dropdown, nav y
  modales.
- **Anonimizadores de prueba sin uso** en `clientes-listado` (`editarClientes` /
  `anonimizarClientes`) y `proveedores-listado` (`anonimizarProveedores`): borrarlos
  cuando se toquen esas pantallas (el de choferes se borró en FI1c).
- **Para analizar con la ficha en uso:**
  - F3: un componente que muestre el detalle de una tarifa con sus valores (sin
    edición), reutilizable desde la ficha y otras pantallas (comparar con los viewers de
    `raiz/tarifas`, que hoy viven en el módulo de Tarifas);
  - F7 (pedido del cliente): el apellido / la razón social de los listados como enlace a
    la ficha. Con `accionCelda` es una línea por listado.
- `VisualizadorObjetoService.verObjeto` podría delegar en la ficha para `choferes` /
  `clientes` / `proveedores` vivos (hoy abre el alta en modo vista).

### Checklist — migración a Vantruck: frente Ficha de entidad
Después del backup completo y de migrar `choferes` (incluida la papelera):
1. `/migracion` → "Fecha de nacimiento de choferes": simular, ejecutar (id
   `pf-logistics`) y corregir a mano los que queden en "revisar" (editando el chofer).
2. Sin reglas ni índices nuevos: la ficha solo lee colecciones que ya están mapeadas.
```

## PASO 2 — CHANGELOG.md

2.1 `CHANGELOG.md` — entrada del frente. BUSCAR:
```
(mismas 9 advertencias), pruebas del util en Node bajo varios husos y
pruebas manuales en demo. Diseño y avance: `claude/diseno-lazy-fechas.md`
(Project).

---
```
REEMPLAZAR:
```
(mismas 9 advertencias), pruebas del util en Node bajo varios husos y
pruebas manuales en demo. Diseño y avance: `claude/diseno-lazy-fechas.md`
(Project).

---

## Frente Ficha de entidad (Octubre 2026)

- **Ficha de entidad:** modal de solo lectura de chofer, proveedor y cliente
  (`FichaEntidadService.abrir`), con datos vivos y sin lecturas nuevas:
  - chofer: Datos personales, Vehículos, Legajo, Tarifas y Proveedor (si es de
    proveedor);
  - proveedor: Datos de la empresa, Contactos, Choferes, Vehículos y Tarifas;
  - cliente: Datos de la empresa, Contactos y Tarifas.
- **Navegación** chofer ↔ proveedor dentro del mismo modal, con "← Volver a …".
- **Tarifas:** niveles habilitados y vigentes sin valores; "Ver en Tarifas".
- **Acciones:** "Editar" (abre el modal de edición; carga diferida con
  `import()`) y "Ver cuenta" (Finanzas), según permisos.
- **Accesos:** el "ver" de los listados de Clientes, Choferes y Proveedores;
  Legajos → Tablero y Vencimientos (nombre) y Consultar ("Ver ficha").
  `tabla-generica` suma `accionCelda`.
- **Fecha de nacimiento del chofer:** siempre 'YYYY-MM-DD' (tipo `string`,
  factory que valida y lanza, form que no re-guarda el objeto leído);
  herramienta de `/migracion` para normalizar lo guardado (ejecutada en demo);
  Excel de choferes corregido (D6). Fuera el anonimizador de choferes.

Detalle en `CLAUDE.md` → "Frente Ficha de entidad"; deudas en "Deuda — tras el
frente Ficha de entidad"; pasos para Vantruck en "Checklist — migración a
Vantruck: frente Ficha de entidad".

**Verificación:** por bloque, aplicación por script sobre una copia limpia,
`tsc`, pruebas de render con Karma, `build:demo` (mismas 9 advertencias,
inicial 1,53 MB) y pruebas manuales en demo. Diseño y avance:
`claude/diseno-ficha-entidad.md` (Project).

---
```

2.2 `CHANGELOG.md` — Pendiente: transversales. BUSCAR:
```
- Excel/PDF de los demás informes sobre `DocumentoTabular` + los renderers
  de `servicios/exportacion/` (incluye el Excel de choferes, D6, y saca
  `exceljs` del chunk de `/op`).
```
REEMPLAZAR:
```
- Excel/PDF de los demás informes sobre `DocumentoTabular` + los renderers
  de `servicios/exportacion/` (saca `exceljs` del chunk de `/op`; la fecha
  del Excel de choferes, D6, ya se corrigió en el frente Ficha de entidad).
- ng-bootstrap 15 sobre Angular 20 (NG0309 en componentes con
  `hostDirectives`): actualizar a la versión de Angular 20.
```

2.3 `CHANGELOG.md` — Pendiente: migración. BUSCAR:
```
  fechas" (deploy de la Function de vencimientos, budget de `vantruck`,
  eventuales D7, legajos FL4).
```
REEMPLAZAR:
```
  fechas" (deploy de la Function de vencimientos, budget de `vantruck`,
  eventuales D7, legajos FL4). Del frente Ficha de entidad: normalizar la
  fecha de nacimiento de los choferes migrados ("Checklist — migración a
  Vantruck: frente Ficha de entidad").
```

## Verificación

1. Comandos (reportá la salida):
```
grep -n "^## Frente Ficha de entidad\|^## Deuda conocida\|^### Deuda — tras el frente Ficha\|^### Checklist — migración a Vantruck: frente Ficha" CLAUDE.md
grep -c "^| \`ficha-entidad/\`\|NormalizacionFechaNacService\` — ver" CLAUDE.md
grep -n "^## Frente Ficha de entidad" CHANGELOG.md
wc -l CLAUDE.md CHANGELOG.md
grep -c " $" CLAUDE.md
grep -c " $" CHANGELOG.md
git diff --numstat
git status --short
```
Esperado:
- (a) 4 líneas, en este orden: 3576 (Frente), 3697 (Deuda conocida), 4612 (Deuda — tras
  el frente) y 4631 (Checklist).
- (b) 2.
- (c) 2243.
- (d) 4635 y 2319.
- (e) 0 y 0.
- (f) CHANGELOG.md `38 3`; CLAUDE.md `155 6`.
- (g) solo CLAUDE.md y CHANGELOG.md modificados (más los `.md` de instrucciones sin
  trackear, si los hay).

2. Mostrá el diff completo de los dos archivos.

No hace falta build: no se toca código.

## Revisión (Nico)

Leé en el diff:
1. CLAUDE.md → "## Frente Ficha de entidad": que las pestañas, la navegación, los botones y
   los accesos coincidan con lo que ves en demo.
2. "Fecha de nacimiento del chofer (F10 + FI1c)": causas y reglas.
3. "Deuda — tras el frente Ficha de entidad" y su checklist: que no falte nada.
4. CHANGELOG: la entrada nueva y el "Pendiente".

## Mensaje de commit

```
docs(ficha-entidad): cierre del frente — CLAUDE.md y CHANGELOG (DOC)

- CLAUDE.md: sección nueva "Frente Ficha de entidad" (piezas, pestañas, datos vivos,
  navegación, Editar / Ver cuenta, accesos, fecha de nacimiento del chofer); Servicios
  clave (ficha-entidad/, NormalizacionFechaNacService); Tablas (accionCelda); D6 resuelta;
  "Deuda — tras el frente Ficha de entidad" (ng-bootstrap 15, anonimizadores, F3 / F7) y
  su checklist para Vantruck.
- CHANGELOG: entrada del frente y "Pendiente" al día.
```

FIN DE LA INSTRUCCIÓN DOC-FI
````

# Diseño — No disponibilidad (choferes, vehículos y proveedores)

Fecha: 2026-10-30 · Rama: `refactor` · Auditoría: `docs/auditorias/no-disponibilidad-choferes-vehiculos-proveedores.md`

## Alcance funcional

Reconstruir la no disponibilidad sobre el modelo nuevo, con un **sujeto discriminado** que
cubra choferes, vehículos y proveedores, resolución centralizada con cascadas, y bloqueo
efectivo en todos los puntos donde hoy no se revalida.

**Qué tiene que hacer:**

1. Registrar que un chofer, un vehículo o un proveedor no está disponible durante un período,
   con fecha de fin **determinada** (vacaciones) o **indeterminada** (rotura de vehículo).
2. Resolver en un único punto la pregunta "¿está disponible el sujeto X en la fecha F?",
   devolviendo los motivos y no sólo un booleano.
3. Aplicar las cascadas de propiedad: lo que arrastra cada sujeto se deduce de
   `Vehiculo.asignadoA` y de `Chofer.contratacion`.
4. Bloquear la asignación y el alta de operaciones cuando el sujeto no está disponible, en
   todos los caminos y no sólo en el arrastre de la UI.
5. Escribir de forma atómica, con `Resultado<T>` y con el log nuevo.

**Qué NO entra:**

- Unificar `noDisponibilidad` con el flag `activo` de las entidades ni con la documentación
  vencida de Legajos. Son tres mecanismos independientes y siguen siéndolo. Lo que sí se
  hace es **dejar la costura preparada** (ver "Servicio de resolución").
- Migrar los datos de la colección vieja `noOperativo`. La colección nueva arranca vacía.
- Tocar el flujo de alta de operaciones más allá de las guardas.

## Por qué este frente

Dos motivos, los dos verificados:

1. **La funcionalidad está caída en `refactor` desde el 2026-10-12.**
   `StorageService.getObservable('noOperativo')` lanza `Error('Componente no reconocido')`;
   el caso lo borró el commit `6f350b5` (LR2a) y lo llaman `tablero-asignaciones`,
   `carga-asignacion` y el modal. Confirmado en demo por consola.
2. **Es el primer eslabón de la cadena** `rehacer noDisponibilidad → eliminar el log viejo →
   eliminar el camino legado de la Papelera`: es el último consumidor de `StorageService` y
   `LogService` en este circuito.

Y un dato del uso real: de las dos no disponibilidades vigentes en producción, **una es por
rotura del vehículo**, registrada sobre el chofer porque el sistema no sabe expresar un
vehículo no disponible. Ese workaround saca del pool a un chofer que podría manejar otro
camión.

## Modelo de datos

### Sujeto

```ts
// src/app/interfaces/no-disponibilidad.ts

export type SujetoNoDisponibilidad =
  | { tipo: 'chofer';    idChofer: string;    nombre: string; apellido: string }
  | { tipo: 'vehiculo';  idVehiculo: string;  dominio: string }
  | { tipo: 'proveedor'; idProveedor: string; razonSocial: string };
```

Tres casos, no cuatro. **El chofer de proveedor no es un tipo de sujeto**: es un `Chofer` con
`contratacion.tipo === 'proveedor'`, así que `{ tipo: 'chofer' }` ya lo cubre. Lo que falta hoy
no es un tipo, es que nadie aplica la regla a esos choferes; eso se resuelve en la resolución.

Cada caso lleva el **id** (para resolver en vivo) y el **snapshot de exhibición** congelado al
crear, que es el patrón del proyecto: el historial tiene que seguir mostrando a quién
correspondía aunque la entidad cambie de nombre después.

**Sobre el vocabulario de las etiquetas.** El proyecto ya tiene tres uniones discriminadas con
vocabularios parcialmente distintos:

| Unión | Etiquetas | Qué discrimina |
|---|---|---|
| `SujetoAsignacion` | `'directo'` \| `'proveedor'` | Quién aporta el vehículo en una asignación |
| `AsignacionVehiculo` (`Vehiculo.asignadoA`) | `'chofer'` \| `'proveedor'` | De quién es el vehículo |
| `ContratacionChofer` | `'directo'` \| `'proveedor'` | Cómo está contratado el chofer |

`SujetoNoDisponibilidad` usa `'chofer'`, alineado con `AsignacionVehiculo`, que es la que habla
de entidades. **No reutilizar `SujetoAsignacion`**: responde otra pregunta. Un `SujetoAsignacion`
es una terna que se resuelve progresivamente (`idVehiculo` y `idChofer` pueden ser `null` hasta
que se eligen); una no disponibilidad es sobre **una** entidad concreta, siempre. Y
`SujetoAsignacion` no puede expresar "este vehículo no está disponible" sin un chofer.

La inconsistencia `'directo'` vs `'chofer'` entre las uniones existentes queda como está: no es
parte de este frente.

### Registro

```ts
export interface NoDisponibilidad {
  idNoDisponibilidad: string;      // = document ID de Firestore. NO se persiste;
                                   // se reconstruye al leer (patrón idXxx del proyecto).
  sujeto: SujetoNoDisponibilidad;
  desde: string;                   // 'YYYY-MM-DD'. Obligatorio.
  hasta: string | null;            // 'YYYY-MM-DD' o null = SIN FECHA DE FIN PREVISTA.
  motivo: string;                  // Obligatorio.
  activa: boolean;                 // false = ANULADA (cargada por error).
                                   // NO expresa vigencia.
  anulacion?: Anulacion;           // presente sólo si activa === false.
                                   // Reutiliza interfaces/anulacion.ts, como InformeOp.
  timestamp: number;               // último guardado
}
```

**El sujeto no es editable.** Si se cargó sobre la entidad equivocada se anula y se carga otra.
Permitir cambiarlo obligaría a reconstruir el snapshot y dejaría un registro cuyo historial no
corresponde a ninguna entidad real.

**La anulación lleva motivo.** El log registra quién y cuándo, pero no por qué, y el historial
del modal muestra las anuladas: una anulada sin explicación es ruido para quien la lee después.
Se reutiliza la interfaz `Anulacion` del proyecto en vez de inventar un campo suelto, aunque eso
duplique usuario y fecha con el log — misma redundancia aceptada que `ConId` sobre
`idNoDisponibilidad`, y por la misma razón: la consistencia con el resto del proyecto vale más
que ahorrar un campo.

### Vigencia: derivada, no guardada

Esta es la decisión que cambia respecto del modelo viejo.

> Una no disponibilidad **cubre una fecha** si `activa && desde <= fecha && (hasta === null || fecha <= hasta)`.

- `hasta === null` es un **estado con significado**: "no se sabe cuándo vuelve". No es un dato
  faltante y por eso `hasta` **no puede ser obligatorio** en el formulario. Es el caso de la
  rotura de vehículo.
- **Cerrar** una no disponibilidad indeterminada es **escribir `hasta`**. Es una edición, no un
  cambio de estado. Así queda registrado el fin real y se puede responder "cuántos días estuvo
  fuera el chofer X", que con el modelo viejo se perdía.
- **Anular** (`activa: false`) significa una sola cosa: se cargó por error, nunca existió. No se
  usa para "ya terminó".

En el modelo viejo `activa` mezclaba las dos cosas, y además la vigencia quedaba filtrada en
tres capas distintas (query del listener, `.filter()` en cada suscriptor, y el generador).
Acá la vigencia se calcula en un solo lugar.

**No se agregan campos de "fecha efectiva" separados de las declaradas.** `desde`/`hasta` ya
son la ventana efectiva una vez que `hasta` es editable. Un segundo par (previsto vs. real)
sólo se justifica si alguna vez hace falta reportar el **desvío** respecto de lo planificado
—"se preveían 15 días y fueron 22"—, y en ese caso se agrega sin tocar a los consumidores.

### Colección

- **Nueva:** `/Vantruck/datos/noDisponibilidades`. Arranca vacía.
- La colección vieja `noOperativo` queda como pseudo-backup, sin lectores. Se retira del código
  en el bloque 7.
- Alta en `firestore.rules`: `'noDisponibilidades': 'operaciones'`, con el mismo mapeo por rol
  que tiene hoy `noOperativo`.
- Alta en `LimpiezaDemoService.COLECCIONES_A_VACIAR`, donde `noOperativo` nunca estuvo.

## Reglas de resolución y cascadas

Las cascadas se deducen de `Vehiculo.asignadoA` y `Chofer.contratacion`. No son una regla
nueva: son la propiedad de los bienes.

| Sujeto no disponible | Arrastra |
|---|---|
| Un **vehículo** | Sólo ese vehículo. La entidad sigue disponible con otro vehículo. |
| Un **chofer directo** | Él, y los vehículos cuyo `asignadoA` es `{ tipo: 'chofer', idChofer }` con su id. El camión es suyo. |
| Un **chofer de proveedor** | Sólo él. Los vehículos del proveedor (`asignadoA.tipo === 'proveedor'`) siguen disponibles si queda otro chofer del proveedor. |
| Un **proveedor** | Todos sus choferes (`contratacion.idProveedor`) y todos sus vehículos (`asignadoA.idProveedor`). |

La asimetría de las filas 2 y 3 sale sola del modelo: el vehículo de un chofer directo le
pertenece a él; el de un proveedor le pertenece al proveedor, que asigna el chofer que quiera.

Esta regla **ya existe implementada** en `GeneradorOperacionesService.poolDelDia` ("un vehículo
de proveedor entra si el proveedor tiene al menos un chofer disponible"), que es el único lugar
del código que hoy la aplica a choferes de proveedor.

### Resolución transitiva

Un vehículo con `asignadoA.tipo === 'chofer'` donde ese chofer es de proveedor hereda la cadena
completa: proveedor no disponible → chofer no disponible → vehículo no disponible.

### Casos que la tabla no dice en voz alta

Salieron al implementar el bloque 2 y quedan fijados acá para que nadie los resuelva distinto
después:

- **Vehículo de proveedor sin ningún chofer disponible:** cae. La fila 3 dice "siguen
  disponibles si queda otro chofer"; su contrapositiva es que sin ninguno, no. Los motivos son
  los registros de cada chofer, con origen `cascadaChofer`.
- **Proveedor sin choferes:** `disponibilidadDe(proveedor)` lo da **disponible**, porque no hay
  ningún registro que citar y un motivo sin registro no existe. Que no pueda aportar nada no es
  una no disponibilidad, es falta de capacidad, y eso lo responde `vehiculosDisponiblesDe`
  devolviendo lista vacía. El consumidor bloquea la entidad por la segunda condición —"no le
  queda ningún vehículo disponible"—, no por la primera. El resultado para el usuario es el
  mismo; el camino es otro.
- **El proveedor como entidad sólo cae por registros propios.** Que todos sus choferes estén
  fuera no lo tumba a él; lo que caen son sus vehículos.
- **Un chofer directo con todos sus vehículos no disponibles está disponible.** Él no tiene
  registro. Por eso las guardas tienen que preguntar por la entidad **y** por el vehículo: con
  una sola de las dos no alcanza.
- **`origen` en la cadena transitiva** se etiqueta según **de quién es el registro**, no por
  dónde pasó la cascada. Si el vehículo cae porque cayó el proveedor del chofer, es
  `cascadaProveedor`.
- **`origen` sale del dueño del registro, no del camino recorrido.** Un registro de proveedor
  llega siempre como `cascadaProveedor`, uno de chofer como `cascadaChofer` y uno de vehículo
  como `propia`, sin importar por cuántas vías alcance al sujeto que se está evaluando. Un
  registro repetido se deja una sola vez y **no hace falta desempatar**, porque un mismo
  registro nunca llega con dos orígenes distintos en una misma evaluación.

  Esto se intentó fijar con una regla de precedencia (`propia` > `cascadaProveedor` >
  `cascadaChofer`) y resultó **código inalcanzable**: invertirla dejaba los 27 tests en verde,
  porque el conflicto que pretendía resolver no puede ocurrir. La ambigüedad está eliminada en
  la construcción, no resuelta en tiempo de ejecución. **No volver a agregarla.** Lo que
  garantiza el etiquetado correcto es que `heredadoDeChofer` sólo convierte en `cascadaChofer`
  lo que es propio del chofer, y eso ya lo fija el test de la fila 4.

### Limitaciones conocidas

- **`activo` no entra en "queda otro chofer".** Un chofer inactivo cuenta como disponible a los
  efectos de sostener los vehículos del proveedor, porque `activo` está fuera del frente. Un
  proveedor cuyo único chofer restante está inactivo va a mostrar sus vehículos como
  disponibles, y el usuario se entera recién en el editor, donde la lista de choferes sale
  vacía. **Este es el caso concreto que justifica sumar `activo` a la costura**, y el primero
  que hay que arreglar cuando eso pase. No se parchea sólo acá: se resolvería en un lugar y
  seguiría mal en los otros tres donde `activo` se filtra por separado.
- **Un sujeto ausente de los datos en memoria** —en papelera, o sin cargar— sólo cuenta sus
  registros propios. `datosCargados()` detecta que no cargó nada, no que falte una entidad
  puntual.

## Servicio de resolución

Punto único que responde la pregunta de disponibilidad. **Es la costura**: hoy consulta sólo
`noDisponibilidades`; mañana puede sumar documentación vencida de legajos y el flag `activo` sin
que el tablero, la carga ni el editor se enteren.

```ts
export type ConsultaSujeto =
  | { tipo: 'chofer';    idChofer: string }
  | { tipo: 'vehiculo';  idVehiculo: string }
  | { tipo: 'proveedor'; idProveedor: string };

export type MotivoNoDisponible = {
  origen: 'propia' | 'cascadaChofer' | 'cascadaProveedor';
  noDisponibilidad: ConId<NoDisponibilidad>;
};

export type ResultadoDisponibilidad =
  | { disponible: true }
  | { disponible: false; motivos: MotivoNoDisponible[] };
```

API:

```ts
// DisponibilidadService
disponibilidadDe(sujeto: ConsultaSujeto, fecha: string): ResultadoDisponibilidad;

// Para carga-asignacion: qué vehículos de una entidad están disponibles en la fecha.
vehiculosDisponiblesDe(
  entidad: { tipo: 'chofer'; idChofer: string } | { tipo: 'proveedor'; idProveedor: string },
  fecha: string,
): {
  disponibles: ConId<Vehiculo>[];
  noDisponibles: { vehiculo: ConId<Vehiculo>; motivos: MotivoNoDisponible[] }[];
};
```

**Los motivos van en plural y con el registro adentro** porque la UI tiene que poder decir *por
qué* está bloqueado —"el vehículo está en taller" es distinto de "el chofer está de licencia"—
y el mensaje del bloqueo duro tiene que nombrar la causa.

**Dónde vive.** En un servicio propio, NO en el servicio de datos: la resolución necesita
inyectar `ChoferService` y `ProveedorService` (y mañana `LegajoService`), y el proyecto no
inyecta servicios en la capa de datos.

La regla pura de fechas vive en `shared/utils/vigencia-no-disponibilidad.util.ts`, como funciones
puras sin estado. Nombre provisorio: el util viejo `no-disponibilidad.util.ts` sigue en uso por
los componentes que todavía no se migraron, y los dos no pueden convivir con el mismo nombre. En
el **bloque 7**, al borrar el viejo, el nuevo se renombra a `no-disponibilidad.util.ts`.

El generador de demo **borra su copia** de `cubreFecha` e importa el util **nuevo**.

`ConsultaSujeto` vive en `interfaces/no-disponibilidad.ts`, no dentro del servicio de resolución:
el alta del bloque 1 ya la necesita para recibir el sujeto por id, y duplicarla sería peor.

## Comportamiento por consumidor

Cada pantalla conoce distinta información, así que verifica distinto. La verificación sigue la
misma **resolución progresiva** que `SujetoAsignacion`: se chequea lo que ya se sabe.

### `tablero-asignaciones`

Lista **vehículos** y la entidad a la que están asignados. No muestra choferes de proveedor.

- Verifica **los dos lados**: el vehículo (`sujeto.idVehiculo`, si no es `null`) y la entidad
  (`idChofer` si `tipo === 'directo'`, `idProveedor` si `tipo === 'proveedor'`).
- Si `idVehiculo` es `null` (todavía no resuelto), sólo verifica la entidad.
- Atenúa, deshabilita el arrastre y muestra el motivo en el `title`.
- **Los ítems ya colocados en el tablero también se marcan.** Hoy la clase `.no-operativo` en
  la celda se usa sólo para anuladas.
- Recalcula al cambiar de fecha, al llegar datos y al iniciar con borrador.

### `carga-asignacion`

Lista **choferes directos y proveedores** con las **categorías de vehículo** de cada uno. No
muestra choferes de proveedor.

- Verifica los dos lados: la entidad y sus vehículos, vía `vehiculosDisponiblesDe`.
- **Una categoría se atenúa** si no le queda ningún vehículo disponible en la fecha.
- **La entidad se bloquea sólo si** la entidad misma no está disponible, **o** si no le queda
  ningún vehículo disponible en ninguna categoría.
- Una entidad con varios vehículos y uno no disponible **no se bloquea**: se atenúa esa
  categoría y la entidad sigue en el listado de disponibles. Este es el caso del cliente hoy
  (rotura de un camión), y es el que el workaround actual resuelve mal.

### `operaciones-editor`

Es la única pantalla donde **sí** se muestran los choferes de proveedor, y donde se eligen los
vehículos que `carga-asignacion` no lista.

- Filtra/bloquea **choferes**, incluidos los de proveedor. Hoy
  `ResolucionTarifaOpService.choferesDisponibles` no consulta nada.
- Filtra/bloquea **vehículos**.
- La autoselección cuando hay una sola opción tiene que respetar la disponibilidad: si la única
  opción no está disponible, no se autoselecciona y queda pendiente con el motivo a la vista.

### Guardas duras

Bloquean y devuelven `Resultado` con el detalle:

| Punto | Comportamiento |
|---|---|
| `guardarBorrador` | **Bloquea.** Un borrador tiene fecha determinada; si esa fecha cae dentro del período, la entidad no va a estar disponible y dejarlo pasar induce a un error de planificación. |
| `altaDesdeAsignacion` | **Bloquea y aborta el alta completa**, nombrando qué ítems y por qué. Mismo patrón que TC2 cuando falta la tarifa: nada toca la red. |
| `editarOperacion` | **Bloquea** al cambiar chofer o vehículo por uno no disponible en la fecha de la operación. |

En los tres casos la verificación es contra la **fecha de la operación/tablero**, no contra hoy,
y pregunta **por la entidad y por el vehículo por separado**. Un chofer directo cuyos vehículos
están todos no disponibles está él mismo disponible —no tiene registro propio—, así que
preguntar sólo por la entidad deja pasar la operación.

**Sin camino de forzado.** Cuando una guarda bloquea, el usuario recibe el mensaje con el sujeto
y el motivo, y nada más: no hay opción de forzar la asignación dejando constancia. Si la
situación cambió, lo que corresponde es corregir la no disponibilidad.

**"No se pudo verificar" no es "está disponible".** Las guardas duras consultan el estado en
memoria del servicio. Si el listener todavía no cargó, la lista está vacía y una guarda ingenua
dejaría pasar todo. Por eso el servicio expone su estado de inicialización y las guardas
**rechazan** cuando no puede verificar, con un mensaje que lo diga, en vez de aprobar por
defecto. Es el mismo criterio que usa `restaurarOperacion` cuando no encuentra el tablero de la
fecha: ante la duda, no escribe.

## Validaciones del alta/edición

| Regla | Comportamiento |
|---|---|
| `desde` obligatorio | Rechaza |
| `hasta` opcional | `null` = sin fecha de fin prevista. **Nunca obligatorio.** |
| `hasta >= desde` cuando `hasta` no es `null` | Rechaza, con mensaje |
| `motivo` obligatorio | Rechaza. Hoy es opcional y el fallback `'No disponible'` no sirve en un informe |
| Solapamiento con otra no disponibilidad **activa del mismo sujeto cuyo período se superpone**, sea cual sea la fecha de hoy | **Avisa, no rechaza.** Muestra la existente (período y motivo) y ofrece editarla en vez de crear otra. Dos registros solapados con motivos distintos no son un error —alguien puede empezar vacaciones y enfermarse—, y la resolución toma la unión. El error real es el duplicado por olvido, y avisar con el dato a la vista lo evita sin prohibir el caso legítimo |

## Listado y historial del modal

- **Vigentes:** las que cubren la fecha de hoy, ordenadas por sujeto para poder buscar a alguien
  de un vistazo.
- **Historial:** **todas** las no disponibilidades, de la más nueva a la más vieja por `desde`.
  Incluye las ya terminadas y las anuladas, estas últimas marcadas como tales — el sentido de
  `activa: false` en vez de borrar es justamente que el registro quede.

Las dos listas salen del mismo stream del listener; no hay consulta aparte.

## Arquitectura de servicios

Siguiendo el patrón del proyecto:

- **`NoDisponibilidadService`** — estado con `BehaviorSubject`, listener vivo de Firestore,
  getters sincrónicos, y los coordinadores de alta/edición/anulación con `commitBatch` +
  `Resultado<T>`. **Toda la escritura sale del componente**: hoy vive en el modal.
- **`NoDisponibilidadFactoryService`** — construcción pura del registro y del snapshot del
  sujeto.
- **`DisponibilidadService`** — la resolución y las cascadas (arriba).
- **`no-disponibilidad.util.ts`** — las funciones puras de fechas, sin estado.

### Listener

Una sola query, **sin filtro**: trae la colección completa. La vigencia y el historial se
derivan en memoria por fecha, y las anuladas se marcan. Con eso no hace falta una segunda
consulta para el historial y el stream es la única fuente.

El volumen lo permite: unas pocas decenas de registros por año, documentos chicos.

**Quién lo arranca.** `HomeComponent`, como el resto de los catálogos, pero **condicionado al
permiso de lectura del módulo `operaciones`** vía `PermisosService`. Sin esa condición, un rol
sin acceso al módulo —hoy `manager`— abre un listener que Firestore rechaza, deja un error en
consola y el servicio queda sin inicializar de todos modos. Gatear con la matriz que el proyecto
ya tiene es preferible a escribir una lista de roles a mano en el componente.

### Log

`LogRegistroService.agregarAlBatch` dentro del mismo `commitBatch`, con las acciones del
vocabulario nuevo: `ALTA`, `EDITAR`, `ANULAR`. **No** `LogService`, que es el log viejo, ni la
acción `"EDICION"` ni `"BAJA"` para un update.

### Escritura atómica

Hoy `addItem`/`updateItem` son `void`, el log va en una escritura aparte y el aviso de éxito se
muestra antes de que termine la escritura: si Firestore falla, el usuario ve "Guardado". Con
`commitBatch` + `Resultado<T>` eso desaparece.

## Permisos

Hoy el modal no tiene ningún `*appPermiso` y el botón de `carga-asignacion` tampoco; sólo el
botón del tablero (`operaciones.editar`). Las reglas de Firestore sí restringen, así que la
falla es de UI: se muestran acciones que después el backend rechaza.

**Permiso propio: `operaciones.noDisponibilidad`.**

| Rol | Acceso |
|---|---|
| `dev` | Sí |
| `admin` | Sí |
| `user` | Sí |
| `demo` | No |
| `manager` | No, como en todos los módulos hoy |

Se aplica con `*appPermiso` en el botón del tablero, el botón de `carga-asignacion` y las
acciones de alta, edición, cierre y anulación dentro del modal.

Propio y no `operaciones.editar` para que un cambio que el usuario pida sobre quién administra
no disponibilidades no arrastre a la edición de operaciones.

**Esto es gating de UI, no una frontera de seguridad.** Las reglas de Firestore gobiernan por
**módulo**, así que la colección `noDisponibilidades` queda mapeada a `operaciones` igual que el
resto: a nivel de reglas, un rol con escritura en el módulo puede escribirla por fuera de la UI.
Es el esquema que el proyecto ya tiene y no cambia acá.

## Informe del tablero

`documento-asignaciones.util.ts` arma la hoja "No disponibles" sólo con choferes, y lleva esta
nota:

> "La no-disponibilidad del sistema es solo de choferes: no se puede marcar como no disponible
> a un proveedor ni a un vehículo suelto."

Esa nota queda **falsa** y hay que reescribirla. La hoja pasa a listar los tres tipos de sujeto,
con una columna que indique cuál es, el período y el motivo.

## Bloques de implementación

Cada bloque deja el proyecto compilando.

1. **Modelo y datos.** Interfaz, `NoDisponibilidadService` con listener, factory, colección
   nueva, `firestore.rules`, `LimpiezaDemoService`. Sin consumidores todavía.
2. **Resolución.** `DisponibilidadService` con las cascadas y **tests**. Sin consumidores.
   **Las cascadas van en funciones puras** que reciben los datos por argumento; el servicio
   sólo lee el estado y delega. Así los tests no necesitan TestBed ni stubs, y la lógica queda
   verificable sin infraestructura — mismo patrón que `calcularEstadoDocumentacion` en Legajos.
3. **Modal nuevo.** Selector de sujeto, alta/edición/cerrar/anular, las validaciones de arriba,
   permisos, historial.
4. **Tablero y carga.** Los dos sobre `DisponibilidadService`, con la verificación por los dos
   lados y el tratamiento por categoría en `carga-asignacion`.
5. **Editor.** Choferes de proveedor y vehículos, más la autoselección.
6. **Guardas duras.** `guardarBorrador`, `altaDesdeAsignacion`, `editarOperacion`.
7. **Informe y retiro del camino viejo.** La hoja con tres sujetos; el caso `noOperativo` de
   `StorageService`, el util viejo (y el renombre del nuevo), y el `LogService` de este
   circuito. **El generador de demo migra acá, no en el bloque 2**: su copia de la regla está
   tipada contra el modelo viejo y lee la colección vieja, así que cambiarle la regla sin
   cambiarle la fuente de datos no se puede. Es un cambio de camino completo, no de una
   función.

El bloque 2 es donde los tests valen: las cascadas son funciones puras sobre datos, el
compilador no puede verificarlas, y son exactamente el tipo de regla que se rompe en silencio.
La caída que originó este frente fue justamente eso.

El bloque 7 cierra el primer eslabón de la cadena y habilita el frente de eliminación del log
viejo.

## Verificación

- Compila en cada bloque (`npm run build:demo`).
- Tests del bloque 2: las cuatro filas de la tabla de cascadas, más `hasta: null`,
  `hasta >= desde`, y los bordes de `cubreFecha` (primer y último día del rango).
- Verificación manual, en demo y abriendo la pantalla —no sólo build, que es lo que falló en
  AS1—: marcar un vehículo de un chofer con dos vehículos y confirmar que el chofer sigue
  disponible con el otro; marcar un proveedor y confirmar que caen sus choferes y sus
  vehículos; intentar dar de alta una operación con un sujeto no disponible y confirmar que
  aborta con el motivo.

## Fuera de alcance, explícito

- Los hallazgos 10 a 18 de la auditoría (tipos del id, `any`, `patchValue` de un control
  inexistente, el historial que vacía un array y no el otro, el spec mal declarado, código
  comentado) son del modal viejo y **desaparecen con la reescritura**. No se arreglan: se
  reemplazan.
- La deuda `restaurarOperacion` / snapshot del alta: es otro frente.
- La unificación de `activo`, documentación vencida y no disponibilidad en un único concepto de
  disponibilidad: fuera. La costura queda preparada.
- Las referencias de documentación desactualizadas (hallazgos 19 y 20) van con el cierre del
  frente.

## Decisiones tomadas

| Punto | Decisión |
|---|---|
| Sujetos a cubrir | Los tres, aunque hoy el cliente sólo use choferes directos |
| Bloqueo | Bloquea, no avisa |
| Bloqueo en borrador | Bloquea: un borrador tiene fecha fija y la no disponibilidad la cubre |
| Alta bloqueada | Sólo mensaje de error, sin camino de forzado |
| Permiso | Propio, `operaciones.noDisponibilidad`, para `user`, `admin` y `dev` |
| Historial | Todas, de la más nueva a la más vieja |
| `hasta` | Nunca obligatorio: `null` = sin fecha de fin prevista |
| Vigencia | Derivada, no guardada |
| Migración de datos | Colección nueva vacía; `noOperativo` queda como pseudo-backup |
| Sujeto | No editable. Si está mal, se anula y se carga otra |
| Anulación | Lleva `Anulacion` con motivo, reutilizando la interfaz del proyecto |
| Solapamiento | Se evalúa por superposición de períodos, no por "cubre hoy" |
| `init()` del listener | Desde `HomeComponent`, condicionado al permiso de lectura de `operaciones` |
| Guardas sin datos cargados | Rechazan. "No se pudo verificar" no es "está disponible" |
| Util de fechas | `vigencia-no-disponibilidad.util.ts` hasta el bloque 7, donde se renombra |

No quedan puntos abiertos de diseño.

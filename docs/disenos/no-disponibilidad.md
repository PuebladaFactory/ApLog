# Diseño — No disponibilidad (choferes, vehículos y proveedores)

Fecha: 2026-10-30 · Cierre: 2026-10-31 · Rama: `refactor` · Auditoría: `docs/auditorias/no-disponibilidad-choferes-vehiculos-proveedores.md`

## Alcance funcional

La no disponibilidad registra que un chofer, un vehículo o un proveedor no se puede usar
durante un período, la resuelve en un único punto con las cascadas de propiedad, y bloquea su
uso en todos los caminos de asignación y alta de operaciones.

**Qué hace:**

1. Registra que un chofer, un vehículo o un proveedor no está disponible durante un período,
   con fecha de fin **determinada** (vacaciones) o **indeterminada** (rotura de vehículo).
2. Resuelve en un único punto la pregunta "¿está disponible el sujeto X en la fecha F?",
   devolviendo los motivos y no sólo un booleano.
3. Aplica las cascadas de propiedad: lo que arrastra cada sujeto se deduce de
   `Vehiculo.asignadoA` y de `Chofer.contratacion`.
4. Bloquea la asignación y el alta de operaciones cuando el sujeto no está disponible, en todos
   los caminos y no sólo en la UI.
5. Escribe de forma atómica, con `Resultado<T>` y con el log nuevo.

**Qué no hace:**

- Unificar la no disponibilidad con el flag `activo` de las entidades ni con la documentación
  vencida de Legajos. Son tres mecanismos independientes. La **costura queda preparada** (ver
  "Servicio de resolución").
- Migrar datos de la colección anterior (`noOperativo`). La colección `noDisponibilidades`
  arrancó vacía; los datos viejos se resuelven en el plan de migración general.
- Tocar el flujo de alta de operaciones más allá de las guardas.

**Un dato del uso real que motivó el diseño:** de las dos no disponibilidades vigentes en
producción al empezar, **una era por rotura del vehículo**, registrada sobre el chofer porque el
modelo anterior sólo sabía expresar choferes. Ese workaround sacaba del pool a un chofer que
podía manejar otro camión.

## Modelo de datos

### Sujeto

```ts
// src/app/interfaces/no-disponibilidad.ts

export type SujetoNoDisponibilidad = SujetoChofer | SujetoVehiculo | SujetoProveedor;

export type SujetoChofer    = { tipo: 'chofer';    idChofer: string;    nombre: string; apellido: string };
export type SujetoProveedor = { tipo: 'proveedor'; idProveedor: string; razonSocial: string };
export type SujetoVehiculo  = {
  tipo: 'vehiculo';
  idVehiculo: string;
  dominio: string;
  asignadoA?: SujetoChofer | SujetoProveedor;  // de quién era al cargarse (ver "Listado")
};
```

Tres casos, no cuatro. **El chofer de proveedor no es un tipo de sujeto**: es un `Chofer` con
`contratacion.tipo === 'proveedor'`, así que `{ tipo: 'chofer' }` ya lo cubre; la regla que le
aplica la resuelve la resolución.

Cada caso lleva el **id** (para resolver en vivo) y el **snapshot de exhibición** congelado al
crear, que es el patrón del proyecto: el historial tiene que seguir mostrando a quién
correspondía aunque la entidad cambie de nombre o se dé de baja. El de vehículo lleva además su
dueño (`asignadoA`), resuelto por el factory al crear. Es opcional: se omite si el dueño no se
pudo resolver, y los registros cargados antes de que existiera el campo no lo tienen.

**Sobre el vocabulario de las etiquetas.** El proyecto tiene tres uniones discriminadas con
vocabularios parcialmente distintos:

| Unión | Etiquetas | Qué discrimina |
|---|---|---|
| `SujetoAsignacion` | `'directo'` \| `'proveedor'` | Quién aporta el vehículo en una asignación |
| `AsignacionVehiculo` (`Vehiculo.asignadoA`) | `'chofer'` \| `'proveedor'` | De quién es el vehículo |
| `ContratacionChofer` | `'directo'` \| `'proveedor'` | Cómo está contratado el chofer |

`SujetoNoDisponibilidad` usa `'chofer'`, alineado con `AsignacionVehiculo`, que es la que habla
de entidades. **No reutilizar `SujetoAsignacion`**: responde otra pregunta. Un `SujetoAsignacion`
es una terna que se resuelve progresivamente (`idVehiculo` y `idChofer` pueden ser `null` hasta
que se eligen); una no disponibilidad es sobre **una** entidad concreta, siempre. La
inconsistencia `'directo'` vs `'chofer'` entre las uniones existentes no es parte de este diseño.

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

> Una no disponibilidad **cubre una fecha** si `activa && desde <= fecha && (hasta === null || fecha <= hasta)`.

- `hasta === null` es un **estado con significado**: "no se sabe cuándo vuelve". No es un dato
  faltante y por eso `hasta` **no puede ser obligatorio** en el formulario. Es el caso de la
  rotura de vehículo.
- **Cerrar** una no disponibilidad indeterminada es **escribir `hasta`**. Es una edición, no un
  cambio de estado. Así queda registrado el fin real y se puede responder "cuántos días estuvo
  fuera el chofer X".

  La UI pregunta **la fecha de regreso** —el primer día disponible—, que es la pregunta natural
  para quien carga, y guarda `hasta = regreso − 1`. Guardar el regreso tal cual dejaría el día
  en que vuelve marcado como no disponible.
- **Anular** (`activa: false`) significa una sola cosa: se cargó por error, nunca existió. No se
  usa para "ya terminó".

`activa` no mezcla las dos cosas, y la vigencia se calcula en un solo lugar (`cubreFecha`), no
filtrada en el listener ni en cada suscriptor.

**No se agregan campos de "fecha efectiva" separados de las declaradas.** `desde`/`hasta` ya
son la ventana efectiva una vez que `hasta` es editable. Un segundo par (previsto vs. real)
sólo se justifica si alguna vez hace falta reportar el **desvío** respecto de lo planificado
—"se preveían 15 días y fueron 22"—, y en ese caso se agrega sin tocar a los consumidores.

### Colección

- `/Vantruck/datos/noDisponibilidades`.
- `firestore.rules`: `'noDisponibilidades': 'operaciones'`.
- Incluida en `LimpiezaDemoService.COLECCIONES_A_VACIAR`.

**Colección anterior (`noOperativo`).** Ningún código la lee ni la escribe. Sus documentos
siguen en Firestore y su mapeo en `firestore.rules` se conserva hasta que el plan de migración
general decida qué hacer con ellos. Forma de esos documentos y qué haría falta para pasarlos al
modelo actual: ver "Datos de la colección anterior".

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

### Dos invariantes que hacen que estas reglas cierren

- **Un vehículo se asigna a un chofer directo o a un proveedor, nunca a un chofer de
  proveedor.** Los choferes de proveedor dependen de su proveedor tanto para los vehículos
  como para las tarifas. Por eso `vehiculosDisponiblesDe(proveedor)` contando sólo los
  vehículos con `asignadoA.idProveedor` está completo: no hay vehículos de la flota de un
  proveedor colgando de sus choferes.
- **El dueño de un vehículo es inmutable.** El vehículo se crea bajo una entidad y para
  moverlo a otra habría que darlo de baja y crear uno nuevo, con distinto `idVehiculo`. Así
  que las cascadas no se desplazan con el tiempo: un vehículo que hoy cae con su chofer
  directo va a seguir cayendo con él.

### Resolución transitiva: no puede darse

La cadena "proveedor no disponible → chofer de proveedor → vehículo de ese chofer" **no puede
darse en los datos**, por el invariante 1. El código igual la resuelve de forma defensiva (si el
dueño de un vehículo fuera un chofer de proveedor, el vehículo heredaría lo que tumba a ese
chofer, incluido su proveedor) y hay un test que lo fija, pero no es un caso que los datos
produzcan. El código y el test se quedan; lo que no hay que hacer es tratarlo como un caso real
al diseñar.

### Casos que la tabla no dice en voz alta

Fijados acá para que nadie los resuelva distinto después:

- **Vehículo de proveedor sin ningún chofer disponible:** cae. La fila 3 dice "siguen
  disponibles si queda otro chofer"; su contrapositiva es que sin ninguno, no. Los motivos son
  los registros de cada chofer, con origen `cascadaChofer`.
- **Proveedor sin choferes:** son dos casos distintos y no hay que mezclarlos.
  - **Todos sus choferes no disponibles:** hay registros que citar, así que los vehículos del
    proveedor caen, con origen `cascadaChofer` (el punto anterior).
  - **Cero choferes:** no hay ningún registro, y una no disponibilidad sin registro no existe.
    El proveedor queda **disponible** y sus vehículos también: `vehiculosDisponiblesDe` los
    devuelve como disponibles, a propósito y con un test.

  Un proveedor con vehículos y sin choferes no puede aportar nada, pero **eso es falta de
  capacidad, no indisponibilidad** (ver "Limitaciones conocidas").
- **El proveedor como entidad sólo cae por registros propios.** Que todos sus choferes estén
  fuera no lo tumba a él; lo que caen son sus vehículos.
- **Un chofer directo con todos sus vehículos no disponibles está disponible.** Él no tiene
  registro. Por eso todo chequeo pregunta por la entidad **y** por el vehículo (ver "Qué se
  pregunta en cada caso"): con una sola de las dos no alcanza.
- **`origen` sale del dueño del registro, no del camino recorrido.** Un registro de proveedor
  llega siempre como `cascadaProveedor`, uno de chofer como `cascadaChofer` y uno de vehículo
  como `propia`, sin importar por cuántas vías alcance al sujeto que se está evaluando. Un
  registro repetido se deja una sola vez y **no hace falta desempatar**, porque un mismo
  registro nunca llega con dos orígenes distintos en una misma evaluación.

  Esto se intentó fijar con una regla de precedencia (`propia` > `cascadaProveedor` >
  `cascadaChofer`) y resultó **código inalcanzable**: invertirla dejaba los tests en verde,
  porque el conflicto que pretendía resolver no puede ocurrir. La ambigüedad está eliminada en
  la construcción, no resuelta en tiempo de ejecución. **No volver a agregarla.** Lo que
  garantiza el etiquetado correcto es que `heredadoDeChofer` sólo convierte en `cascadaChofer`
  lo que es propio del chofer, y eso lo fija el test de la fila 4.

### Limitaciones conocidas

- **`activo` no entra en "queda otro chofer".** Un chofer inactivo cuenta como disponible a los
  efectos de sostener los vehículos del proveedor, porque `activo` está fuera de este diseño. Un
  proveedor cuyo único chofer restante está inactivo va a mostrar sus vehículos como
  disponibles, y el usuario se entera recién en el editor, donde la lista de choferes sale
  vacía. **Este es el caso concreto que justifica sumar `activo` a la costura**, y el primero
  que hay que arreglar cuando eso pase. No se parchea sólo acá: se resolvería en un lugar y
  seguiría mal en los otros donde `activo` se filtra por separado.
- **Un proveedor con vehículos y sin ningún chofer aparece disponible.** No puede aportar
  nada, pero eso es falta de capacidad, no indisponibilidad: no hay registro que citar. Se
  resuelve con filtrado de pool, igual que `activo`, y va junto con él cuando se sume a la
  costura.
- **Un sujeto ausente de los datos en memoria** —en papelera, o sin cargar— sólo cuenta sus
  registros propios. `datosCargados()` detecta que no cargó nada, no que falte una entidad
  puntual.

## Servicio de resolución

Punto único que responde la pregunta de disponibilidad. **Es la costura**: consulta sólo
`noDisponibilidades`; mañana puede sumar documentación vencida de legajos y el flag `activo` sin
que el tablero, la carga, el editor, el informe ni las guardas se enteren.

```ts
// interfaces/no-disponibilidad.ts
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

`DisponibilidadService` (capa fina: arma los datos con el estado vivo y delega en las funciones
puras):

```ts
datosCargados(): boolean;
disponibilidadDe(sujeto: ConsultaSujeto, fecha: string): ResultadoDisponibilidad;
vehiculosDisponiblesDe(entidad: EntidadConVehiculos, fecha: string): VehiculosDisponibles<ConIdType<Vehiculo>>;
motivosDe(consultas: ConsultaSujeto[], fecha: string): MotivoNoDisponible[] | null;
itemsNoDisponibles(items: AsignacionItem[], fecha: string): ItemNoDisponible[] | null;
motivosDeOperacion(op, soloConsultas?): MotivoNoDisponible[] | null;
```

Los que devuelven `null` lo hacen cuando **no se pudo verificar** (`datosCargados()` en
`false`). Quien llama nunca lo toma como "disponible" (ver "Guardas duras").

**Los motivos van en plural y con el registro adentro** porque la UI tiene que poder decir *por
qué* está bloqueado —"el vehículo está en taller" es distinto de "el chofer está de licencia"—
y el mensaje del bloqueo duro tiene que nombrar la causa.

**Dónde vive.** En un servicio propio, NO en el servicio de datos: la resolución necesita los
servicios de entidades y el proyecto no inyecta servicios en la capa de datos. Hoy inyecta
`NoDisponibilidadService` y `ChoferService`: `ProveedorService` no hace falta, porque la
pertenencia ya está en `Chofer.contratacion` y `Vehiculo.asignadoA`. Mañana, `LegajoService`.

**`datosCargados()`.** Para las no disponibilidades, el flag real del listener (la colección
puede estar vacía de verdad, así que `[]` no alcanza). Para choferes y vehículos,
`ChoferService` no expone si ya cargó: se toma "lista no vacía" como señal.

### Las funciones puras

Viven en `shared/utils/no-disponibilidad.util.ts`, sin estado, y tienen los tests:

- **Vigencia:** `cubreFecha`, `noDisponibilidadesEnFecha`, `periodosSeSolapan`.
- **Resolución:** `disponibilidadDe`, `vehiculosDisponiblesDe` (cascadas), sobre
  `DatosDisponibilidad` recibido por argumento.
- **Qué se pregunta en cada caso:** `consultasDeAsignacion`, `consultasDeOperacion`,
  `sujetoAsignacionDeVehiculo` (ver la sección siguiente).
- **Presentación:** `unirMotivos`, `describirMotivos`, `resumirMotivos`, `causaMotivo`,
  `describirItemAsignacion`, `listarItemsNoDisponibles`.

### Qué se pregunta en cada caso

Una sola regla, que usan **el tablero, el informe, el generador de demo y las cuatro guardas**:
si el informe contara distinto de lo que marca el tablero y de lo que bloquean las guardas, el
usuario no sabría a cuál creerle.

- **Un ítem de asignación** (`consultasDeAsignacion`): el vehículo si ya está resuelto; la
  entidad (chofer directo o proveedor) siempre; y en uno de proveedor, también el chofer si ya
  se eligió. Es la **resolución progresiva** de `SujetoAsignacion`: se pregunta lo que ya se sabe.
- **Un vehículo de la flota** (`sujetoAsignacionDeVehiculo`): lo mismo que un ítem con ese
  vehículo — él y su dueño.
- **Una operación** (`consultasDeOperacion`): el chofer y el vehículo si están resueltos, y el
  proveedor si es de proveedor.

Siempre la entidad **y** el vehículo por separado.

## Comportamiento por consumidor

Cada pantalla conoce distinta información, así que verifica distinto, siempre contra la **fecha
del tablero o de la operación**, no contra hoy. Si los datos no cargaron, ninguna asume
disponible.

### `tablero-asignaciones`

Lista **vehículos** con la entidad a la que están asignados. No muestra choferes de proveedor.

- **Tarjetas del pool:** atenuadas, sin arrastre y con los motivos en el `title` cuando el
  vehículo o su dueño no están disponibles. Sin datos cargados, también atenuadas y sin
  arrastre, con "No se pudo verificar…".
- **Ítems ya colocados:** se marcan con `.no-operativo` y un borde rojo (`.no-disponible`) que
  los distingue de los anulados, con los motivos en el `title`. Sin datos cargados no se marcan
  ni se dan por buenos: los que rechazan en ese caso son las guardas.
- Recalcula al cambiar de fecha, al llegar datos y al iniciar con borrador.

### `carga-asignacion`

Lista **choferes directos y proveedores** con las **categorías de vehículo** de cada uno (un
badge por categoría). No muestra choferes de proveedor.

- Verifica la entidad (`disponibilidadDe`) y sus vehículos (`vehiculosDisponiblesDe`).
- **Una categoría se atenúa** si no le queda ningún vehículo disponible en la fecha.
- **La entidad se bloquea sólo si** la entidad misma no está disponible, **o** si tiene
  vehículos y no le queda ninguno disponible. Un proveedor sin vehículos no se bloquea por esa
  vía (es un caso válido: el vehículo se resuelve en el editor).
- Una entidad con varios vehículos y uno no disponible **no se bloquea**: se atenúa esa
  categoría y la entidad sigue en el listado de disponibles. Es el caso real de un camión roto.
- **La preselección de vehículo único** elige entre los **disponibles**: con dos vehículos y
  uno roto, se preselecciona el sano.
- Sin datos cargados, avisa que está verificando y deshabilita la selección y el alta.

### `operaciones-editor`

Es la única pantalla donde se muestran los choferes de proveedor, y donde se eligen los
vehículos que `carga-asignacion` no resuelve.

- Los candidatos salen de `ResolucionTarifaOpService.choferesDisponibles` /
  `vehiculosDisponibles`, que **pese al nombre devuelven candidatos de tarifa y no miran
  disponibilidad** (renombre pendiente, ver la skill `modulo-tarifas`). El editor cruza cada
  candidato con `DisponibilidadService` contra la fecha de la operación.
- **No se esconde a nadie:** un candidato no disponible aparece deshabilitado en el selector,
  con el motivo en el texto. Si ninguno es elegible, aparece un aviso bajo el selector.
- Un chofer o vehículo **ya resuelto** que no está disponible se marca en rojo con el motivo.
- **Autoselección:** se elige sola cuando hay **un único candidato disponible**. Si la única
  opción no está disponible o no se pudo verificar, queda pendiente con el motivo a la vista.
- **Confirmar** no cierra si alguna fila usa un chofer o vehículo no disponible: lista cuáles y
  por qué. Para un **chofer directo** indica quitar la operación y reasignar en el tablero, porque
  ahí no se puede cambiar: él es el sujeto de la asignación.

### Guardas duras

Bloquean de verdad, en los coordinadores (y en el botón de alta del tablero), y devuelven
`Resultado` con el detalle — no lanzan:

| Punto | Comportamiento |
|---|---|
| Botón **"Alta de Op"** de `tablero-asignaciones` | **Se frena en el botón**, antes de abrir `operaciones-editor`, nombrando qué ítems y por qué. Dejar entrar al editor para fallar al confirmar es peor que no dejar entrar. |
| `AsignacionService.guardarBorrador` | **Bloquea.** Un borrador tiene fecha fija: si un ítem no está disponible en esa fecha, dejarlo pasar induce a un error de planificación. El mensaje nombra los ítems y dice cómo salir: quitarlos no requiere guardar, están marcados en el tablero, y el resto de los cambios no se pierde. Devuelve `Resultado<void>` también ante un fallo de escritura. |
| `OperacionService.altaDesdeAsignacion` | **Bloquea y aborta el alta completa**, nombrando qué operaciones y por qué. Es el primer paso del método: se verifica todo antes de tocar la red, como TC2 cuando falta la tarifa. |
| `OperacionService.editarOperacion` | **Bloquea sólo si se mueve la operación hacia un sujeto no disponible**: verifica el chofer, el vehículo y el proveedor que se escriben **y son distintos** de los guardados. Si ninguno cambió no verifica nada: una operación cuyo chofer quedó no disponible después del alta tiene que poder seguir editándose (km, observaciones, hoja de ruta). |

**Sin camino de forzado.** Cuando una guarda bloquea, el usuario recibe el mensaje con el sujeto
y el motivo, y nada más. Si la situación cambió, lo que corresponde es corregir la no
disponibilidad.

**"No se pudo verificar" no es "está disponible".** Las guardas consultan el estado en memoria.
Si el listener todavía no cargó, una guarda ingenua dejaría pasar todo. Por eso las cuatro
**rechazan** cuando no pueden verificar, con un mensaje que lo diga — el mismo criterio que
`restaurarOperacion` cuando no encuentra el tablero de la fecha: ante la duda, no escribe.

### Generador de demo

`GeneradorOperacionesService` arma el pool de cada día con la misma resolución
(`DisponibilidadService` + `consultasDeAsignacion`) y elige los choferes de proveedor entre los
disponibles, así que un día planificado no puede fallar después por la guarda de
`altaDesdeAsignacion`. Sin datos cargados no planifica. Conserva su regla de capacidad (un
vehículo de proveedor necesita un chofer activo, disponible y sin operación ese día).

## Validaciones del alta/edición

| Regla | Comportamiento |
|---|---|
| `desde` obligatorio | Rechaza |
| `hasta` opcional | `null` = sin fecha de fin prevista. **Nunca obligatorio.** |
| `hasta >= desde` cuando `hasta` no es `null` | Rechaza, con mensaje |
| `motivo` obligatorio | Rechaza. Un fallback genérico ("No disponible") no sirve en un informe |
| Solapamiento con otra no disponibilidad **activa del mismo sujeto cuyo período se superpone**, sea cual sea la fecha de hoy | **Avisa, no rechaza.** Muestra la existente (período y motivo) y ofrece editarla en vez de crear otra. Dos registros solapados con motivos distintos no son un error —alguien puede empezar vacaciones y enfermarse—, y la resolución toma la unión. El error real es el duplicado por olvido, y avisar con el dato a la vista lo evita sin prohibir el caso legítimo |

El chequeo de solapamiento corre en el alta, en la edición **y al cerrar**. Acortar un período
no puede crear un solapamiento, pero alargarlo sí, y cerrar con una fecha de regreso posterior
a la que ya tenía es alargarlo.

## Listado y historial del modal

`ModalNoDisponibilidadComponent` (`raiz/operaciones/modal-no-disponibilidad/`), botón "No
disponibles" en `tablero-asignaciones` y en `carga-asignacion`.

- **Activas:** las que cubren hoy **y las programadas a futuro**, ordenadas por fecha de inicio,
  con una marca que distingue "en curso" de "programada". Las dos responden la misma pregunta
  desde ventanas distintas —quién no está disponible y quién no va a estarlo— y el usuario
  necesita las dos para planificar.
- **Historial:** **todas** las no disponibilidades, de la más nueva a la más vieja por `desde`.
  Incluye las ya terminadas y las anuladas, estas últimas marcadas como tales — el sentido de
  `activa: false` en vez de borrar es justamente que el registro quede.

Las dos listas salen del mismo stream del listener; no hay consulta aparte, y **se superponen
a propósito**: "Activas" es la vista de trabajo y el historial es el registro completo. Filtrar
las activas del historial dejaría sin ninguna vista que muestre todo.

**Un sujeto de tipo vehículo muestra en los listados a quién pertenecía**, tomado del snapshot
y no resuelto en vivo, por dos motivos. Uno: un vehículo se puede **dar de baja**, y entonces
resolver en vivo no devuelve nada y el historial mostraría el dominio sin dueño; el snapshot
sobrevive a la baja de la entidad que describe. Dos: es el principio de **denormalizar la
contraparte** que ya rige el proyecto, que evita resolver contra otro servicio en cada fila de
cada listado. Va como texto complementario en la misma celda, no como columna, que quedaría
vacía para los otros dos tipos de sujeto. El selector, en cambio, muestra el dueño actual: ahí
se elige entre entidades que existen hoy.

El selector de sujeto lista choferes con su contratación (directo, o de qué proveedor),
vehículos con dominio, categoría y dueño, y proveedores; incluye las entidades inactivas,
marcadas.

## Arquitectura de servicios

- **`NoDisponibilidadService`** — estado con `BehaviorSubject`, listener vivo de Firestore,
  getters sincrónicos, `estaCargado()`, `solapadasCon`, y los coordinadores `alta`, `editar` y
  `anular` con `commitBatch` + `Resultado<T>`. El alta recibe el sujeto por id y lo resuelve
  contra `ChoferService` / `ProveedorService` (patrón puente). **Toda la escritura sale del
  servicio**: el modal no escribe.
- **`NoDisponibilidadFactoryService`** — validación del período y construcción pura del
  registro y del snapshot del sujeto (incluido el dueño del vehículo).
- **`DisponibilidadService`** — la resolución (arriba).
- **`no-disponibilidad.util.ts`** — las funciones puras (arriba).

### Listener

Una sola query, **sin filtro**: trae la colección completa. La vigencia y el historial se
derivan en memoria por fecha, y las anuladas se marcan. El volumen lo permite: unas pocas
decenas de registros por año, documentos chicos.

**Quién lo arranca.** `HomeComponent`, como el resto de los catálogos, **condicionado al permiso
de lectura del módulo `operaciones`** vía `PermisosService`: sin esa condición, un rol sin
acceso al módulo —hoy `manager`— abriría un listener que Firestore rechaza. Los consumidores
(modal, tablero, carga, editor, generador) llaman además a `init()`, que es idempotente.

### Log

`LogRegistroService.agregarAlBatch` dentro del mismo `commitBatch`, con `ALTA`, `EDITAR` y
`ANULAR`. Cerrar es una edición y queda como `EDITAR`. El registro de un error
(`registrarError`) es best-effort y no se espera: el `Resultado` vuelve en el momento.

### Escritura sin conexión

Con la red cortada, Firestore encola las escrituras locales y **la promesa de `commitBatch` no
rechaza**: queda pendiente hasta que la escritura llega al servidor (verificado en demo con un
alta, que se completó sola al reconectar). No hay error que mostrar y el dato no se pierde.

Lo que corresponde es **informar, no fallar**: si la escritura no resuelve en 8 segundos, el
modal avisa que no hay conexión y que el cambio se guardará al reconectar, y deja cerrar sin
cancelar nada. Nunca muestra "Guardado" antes de que vuelva el `Resultado`.

**Las cuatro operaciones se comportan igual sin conexión.** Ninguna lee del servidor antes de
escribir: el `anterior` del log y las validaciones de `editar`/`anular` salen del estado en
memoria del listener.

Esto vale para **toda** escritura de la app, no sólo para este modal: cualquier `commitBatch`
se comporta igual. Acá se resuelve puntualmente; generalizarlo es su propio frente.

## Permisos

**Permiso propio: `operaciones.noDisponibilidad`**, mapeado a la acción `editar` del módulo
`operaciones` en `PermisosService` (no necesita override):

| Rol | Acceso |
|---|---|
| `dev` | Sí |
| `admin` | Sí |
| `user` | Sí |
| `demo` | No |
| `manager` | No, como en todos los módulos |

Se aplica con `*appPermiso` en los botones de `tablero-asignaciones` y `carga-asignacion` que
abren el modal, y en las acciones de alta, edición, cierre y anulación dentro del modal.

Propio y no `operaciones.editar` para que un cambio sobre quién administra no
disponibilidades no arrastre a la edición de operaciones.

**Esto es gating de UI, no una frontera de seguridad.** Las reglas de Firestore gobiernan por
**módulo**, así que la colección `noDisponibilidades` queda mapeada a `operaciones` igual que el
resto: a nivel de reglas, un rol con escritura en el módulo puede escribirla por fuera de la UI.

## Informe del tablero

`AsignacionesExportService` resuelve la disponibilidad de la fecha con `DisponibilidadService` y
la regla de "Qué se pregunta en cada caso"; `documento-asignaciones.util.ts` sólo la presenta.

- **Hoja "Asignaciones":** columna **No disponible** por ítem activo, con los motivos — lo
  mismo que el borde rojo del tablero.
- **Hoja "No disponibles":** dos tablas.
  - **Vehículos:** los de la flota que lista el pool del tablero (dueño activo) que no están
    disponibles en la fecha, una fila por vehículo **y causa**: dueño, tipo, dominio,
    categoría, causa (el sujeto del registro), desde, hasta y motivo.
  - **Choferes de proveedor:** aparte, porque no tienen vehículo propio y no están en el pool;
    una fila por chofer y causa.
- **Sin datos cargados**, el informe lo dice (subtítulo y nota "No se pudo verificar la
  disponibilidad…", y "Sin verificar" en la columna de cada ítem): no omite ni da por
  disponible.

## Datos de la colección anterior

`/Vantruck/datos/noOperativo` quedó sin lectores ni escritores. Forma de sus documentos
(interfaz que tenía el código): `{ idNoDisponibilidad: string | number, idChofer: string |
number, desde: 'YYYY-MM-DD', hasta: 'YYYY-MM-DD' | null, motivo?: string, activa: boolean }`.
Sólo choferes, sin snapshot, sin `timestamp` ni `anulacion`, y con `activa: false` usado tanto
para "se cargó por error" como para "ya terminó".

Para pasarlos al modelo actual haría falta, por documento:

1. **Resolver `idChofer`.** Puede ser el id de Firestore del chofer o un id numérico del modelo
   anterior de Choferes; este último sólo se resuelve con el mapeo de la migración de choferes
   (ver la skill `migracion-vantruck`, migración conjunta Choferes/Vehículos/Legajos). Sin chofer
   resuelto, no hay snapshot que armar.
2. **Armar el sujeto** `{ tipo: 'chofer', idChofer, nombre, apellido }` desde el chofer.
3. **Motivo vacío:** completar con un texto explícito ("Sin motivo (migrado)"), porque el modelo
   actual lo exige.
4. **`activa: false`:** decidir caso por caso si fue anulación (→ `activa: false` +
   `anulacion` con motivo de migración) o fin (→ `activa: true` con `hasta` cargado). El dato
   viejo no lo distingue.
5. **`timestamp`:** no hay; usar el momento de la migración.
6. **Rotura de vehículo registrada sobre el chofer:** es el workaround del modelo anterior;
   conviene revisarlas a mano y recargarlas como no disponibilidad del vehículo.
7. **Log:** una entrada `ALTA` por documento migrado (o el criterio que fije la migración).

## Verificación

- Compila en cada cambio (`npm run build:demo`, y la pasada de `tsc` del hook, que cubre los
  archivos sin consumidores).
- Tests (`npm run test:ci`, `no-disponibilidad.util.spec.ts`): `cubreFecha` con sus bordes y
  `hasta: null`; las cuatro filas de la tabla de cascadas, la asimetría directo/proveedor, la
  cadena transitiva, las anuladas, `vehiculosDisponiblesDe` y los motivos con su origen; y
  `consultasDeAsignacion` / `consultasDeOperacion` (si se cae la pregunta por el vehículo o por
  la entidad, las cuatro guardas siguen pasando y dejan de servir). Las guardas de coordinador
  no tienen tests propios: necesitarían stubs.
- Verificación manual, en demo y abriendo la pantalla: marcar un vehículo de un chofer con dos
  vehículos y confirmar que el chofer sigue disponible con el otro; marcar un proveedor y
  confirmar que caen sus choferes y sus vehículos; intentar dar de alta una operación con un
  sujeto no disponible y confirmar que aborta con el motivo.

## Fuera de alcance, explícito

- La deuda `restaurarOperacion` / snapshot del alta: es otro frente.
- La unificación de `activo`, documentación vencida y no disponibilidad en un único concepto de
  disponibilidad. La costura queda preparada.
- La migración de los datos de `noOperativo` (ver "Datos de la colección anterior").
- El renombre de `choferesDisponibles` / `vehiculosDisponibles` de `ResolucionTarifaOpService`
  (deuda en la skill `modulo-tarifas`).

## Decisiones tomadas

| Punto | Decisión |
|---|---|
| Sujetos a cubrir | Los tres, aunque hoy el cliente sólo use choferes directos |
| Bloqueo | Bloquea, no avisa |
| Bloqueo en borrador | Bloquea: un borrador tiene fecha fija y la no disponibilidad la cubre |
| Alta bloqueada | Sólo mensaje de error, sin camino de forzado |
| Edición de una operación | Bloquea sólo si el chofer, vehículo o proveedor cambia hacia uno no disponible |
| Permiso | Propio, `operaciones.noDisponibilidad`, para `user`, `admin` y `dev` |
| Historial | Todas, de la más nueva a la más vieja; "Activas" = en curso + programadas |
| `hasta` | Nunca obligatorio: `null` = sin fecha de fin prevista |
| Cerrar | Pregunta la fecha de regreso y guarda `hasta = regreso − 1` |
| Vigencia | Derivada, no guardada |
| Migración de datos | Colección nueva vacía; `noOperativo` queda sin lectores, para el plan de migración general |
| Sujeto | No editable. Si está mal, se anula y se carga otra |
| Dueño del vehículo | Snapshot en el sujeto; los listados lo leen de ahí, el selector en vivo |
| Anulación | Lleva `Anulacion` con motivo, reutilizando la interfaz del proyecto |
| Solapamiento | Se evalúa por superposición de períodos, no por "cubre hoy"; también al cerrar |
| `init()` del listener | Desde `HomeComponent`, condicionado al permiso de lectura de `operaciones` |
| Sin datos cargados | Nada asume disponible: pantallas bloquean, guardas rechazan, informe lo dice |
| Qué se pregunta | Una sola regla (`consultasDeAsignacion` / `consultasDeOperacion`) para todos |
| Precedencia de origen | No existe y no hace falta: el origen sale del dueño del registro |

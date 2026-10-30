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
  timestamp: number;               // último guardado
}
```

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

La regla pura de fechas sigue en `shared/utils/no-disponibilidad.util.ts`, como funciones puras
sin estado. El generador de demo **borra su copia** de `cubreFecha` e importa el util.

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

En los tres casos la verificación es contra la **fecha de la operación/tablero**, no contra hoy.

## Validaciones del alta/edición

| Regla | Comportamiento |
|---|---|
| `desde` obligatorio | Rechaza |
| `hasta` opcional | `null` = sin fecha de fin prevista. **Nunca obligatorio.** |
| `hasta >= desde` cuando `hasta` no es `null` | Rechaza, con mensaje |
| `motivo` obligatorio | Rechaza. Hoy es opcional y el fallback `'No disponible'` no sirve en un informe |
| Solapamiento con otra no disponibilidad **vigente del mismo sujeto** | **Avisa, no rechaza.** Muestra la existente (período y motivo) y ofrece editarla en vez de crear otra. Dos registros solapados con motivos distintos no son un error —alguien puede empezar vacaciones y enfermarse—, y la resolución toma la unión. El error real es el duplicado por olvido, y avisar con el dato a la vista lo evita sin prohibir el caso legítimo |

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

Una sola query: `where('activa', '==', true)`. Trae las no anuladas, vigentes y pasadas, y la
vigencia se deriva en memoria por fecha. Con eso el historial sale del mismo stream y no hace
falta una segunda consulta.

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

- Abrir el modal: `operaciones.editar` desde las dos pantallas.
- Alta, edición y anulación: `operaciones.editar`, con `*appPermiso` en cada botón.

**A confirmar:** si conviene un permiso propio (`operaciones.noDisponibilidad`) en vez de
reutilizar `operaciones.editar`. Reutilizar es más simple; uno propio permite que un rol
administre no disponibilidades sin poder editar operaciones.

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
2. **Resolución.** `DisponibilidadService` con las cascadas, el util de fechas, y **tests** de
   las funciones puras y de las cascadas. El generador borra su copia de la regla.
3. **Modal nuevo.** Selector de sujeto, alta/edición/cerrar/anular, las validaciones de arriba,
   permisos, historial.
4. **Tablero y carga.** Los dos sobre `DisponibilidadService`, con la verificación por los dos
   lados y el tratamiento por categoría en `carga-asignacion`.
5. **Editor.** Choferes de proveedor y vehículos, más la autoselección.
6. **Guardas duras.** `guardarBorrador`, `altaDesdeAsignacion`, `editarOperacion`.
7. **Informe y retiro del camino viejo.** La hoja con tres sujetos; el caso `noOperativo` de
   `StorageService`, la copia de la regla del generador, y el `LogService` de este circuito.

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

## Preguntas abiertas

1. ¿Permiso propio `operaciones.noDisponibilidad` o se reutiliza `operaciones.editar`?
2. El historial del modal: ¿muestra todas las no disponibilidades pasadas, o sólo las de los
   últimos N meses? Hoy trae las últimas por `getMostRecentLimitId`.
3. Cuando se bloquea un alta por no disponibilidad, ¿alcanza con el mensaje de error, o el
   usuario necesita un camino para forzar la asignación dejando constancia? El cliente dijo
   "bloquea", así que la respuesta por defecto es que no hay forzado.

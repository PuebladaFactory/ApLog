````
INSTRUCCIÓN TC5 — Tarifas (cierre): vigencia de tarifas por fecha de la operación
================================================================================

Si no ves la línea "FIN DE LA INSTRUCCIÓN TC5" al final, el texto llegó
cortado: leé el archivo completo antes de empezar.

## Contexto y razonamiento

Las tarifas son append-only: editar o aumentar crea una versión nueva
(versionAnteriorId = la anterior) y la anterior queda activo: false. Hoy los
candidatos de una operación se buscan con `activo`, o sea, con la ÚLTIMA
versión, sin mirar la fecha de la operación. Dos errores concretos:
  - Operación del 05/10 cargada el 12/10, con un aumento vigente desde el
    10/10: toma la tarifa aumentada (debería tomar la del 05/10).
  - Aumento cargado HOY con vigenciaDesde = 01/11: la versión actual queda
    inactiva en el acto y las operaciones de hoy ya toman la de noviembre.

Regla (diseño §10.1): una versión rige en la fecha F si
`vigenciaDesde <= F < fin`, donde fin es la vigenciaDesde de la versión que
la reemplaza; si no tiene sucesora y está dada de baja, su
fechaActualizacion; si no tiene sucesora y está activa, sin fin. El fin sale
de la sucesora (no de fechaActualizacion) porque el factory escribe
fechaActualizacion = fecha de creación en toda versión, y las reemplazadas
antes de TC3 no la tienen pisada con la fecha de corte.

Cambios:
1. NUEVO shared/utils/vigencia-tarifa.util.ts: funciones puras
   `vigentesEnFecha(versiones, fecha)` (devuelve las que rigen, más reciente
   primero) y `finVigencia(version, versiones)`. Sin Angular.
2. TarifarioService: getTarifaGeneralVigente / getTarifasPersonalizadasVigentes
   / getTarifasEspecialesVigentes reciben `fecha?` opcional. SIN fecha: igual
   que hoy (activo) → pantallas y forms de Tarifas, modal-vehiculo,
   tablero-asignaciones y carga-asignacion NO cambian. CON fecha: vigentes en
   esa fecha. El caché del servicio ya trae todas las versiones (activas e
   inactivas), que hacen falta para calcular los fines.
3. ValoresTarifaService.listarCandidatosLado recibe `fecha` (obligatorio) y
   la pasa a los 3 getters; los motivos sin candidatos dicen "al <fecha>".
   valoresEventual toma el acompañante de la General vigente a op.fecha
   (alta, cierre y restaurar dan lo mismo aunque la General cambie después).
4. ResolucionTarifaOpService.candidatosOp pasa op.fecha (único caller de
   listarCandidatosLado; lo usan operaciones-editor y el generador). En el
   editor la fecha es fija (la de la asignación), no hace falta recalcular.
5. Generador de pruebas: la General para los valores eventuales al azar se
   toma por día (vigente a la fecha), no una vez con la de hoy.

No cambia: el cierre / edición de InformeOp / restaurar con tarifa (usan la
referencia congelada en el alta, calcularCierre), ni los forms de Tarifas.

Efecto en demo: operaciones con fecha anterior a la primera versión de una
tarifa ya no la ven como candidata (motivo "sin tarifa vigente al <fecha>").
Con el generador, rangos de fechas anteriores a las tarifas cargadas van a
dar exclusiones.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- Si un texto a BUSCAR no está, o aparece más de una vez: detenete y reportá.
- Aplicá los cambios de cada archivo EN ORDEN.
- Editá el archivo en el lugar (leer, reemplazar, escribir); nunca abras un
  archivo para escritura antes de haber leído su contenido. El único archivo
  NUEVO es vigencia-tarifa.util.ts (verificá antes que no exista).
- Finales de línea LF.
- No toques CLAUDE.md ni CHANGELOG.md.

## PASO 0 — Verificación (sin modificar nada)

0.1 `src/app/shared/utils/vigencia-tarifa.util.ts` NO existe, y
    `grep -rn "vigentesEnFecha" src/` → sin resultados.
0.2 `grep -rn "listarCandidatosLado(" src/` → la definición en
    valores-tarifa.service.ts y 2 llamadas en resolucion-tarifa-op.service.ts
    (candidatosOp). Ningún .spec.ts.
0.3 `grep -rn "getTarifaGeneralVigente(\|getTarifasPersonalizadasVigentes(\|getTarifasEspecialesVigentes(" src/`
    → definiciones en tarifario.service.ts y llamadas en:
    valores-tarifa.service.ts (4), generador-operaciones.service.ts (1),
    modal-vehiculo, tablero-asignaciones, carga-asignacion,
    tarifa-especial-form (2), tarifa-form, tarifas-especial,
    tarifas-general, tarifas-personalizada. Ningún .spec.ts. Todas las que
    no son de valores-tarifa ni del generador quedan sin fecha (sin cambios).
0.4 TarifaBase (interfaces/tarifa.ts) tiene idTarifa, activo, vigenciaDesde,
    versionAnteriorId y fechaActualizacion?; TarifaEspecial extiende
    TarifaBase.
0.5 En generador-operaciones.service.ts, la variable `general` de
    `planificar` solo se usa en la llamada a planificarOperacion dentro del
    `for (const { fecha, peso } of fechas)`.
Si algo no coincide, DETENETE y reportá.

## PASO 1 — src/app/shared/utils/vigencia-tarifa.util.ts (NUEVO)

Crear el archivo con este contenido exacto:
```
/** Vigencia POR FECHA de tarifas versionadas (Tarifa / TarifaEspecial).
 *
 *  Las tarifas son append-only: cada edición/aumento crea una versión nueva
 *  con `versionAnteriorId` = id de la que reemplaza (un "linaje"), y la
 *  anterior queda `activo: false`. `activo` dice cuál es la ÚLTIMA versión,
 *  no cuál regía en una fecha: una operación del 05/10 tiene que tomar la
 *  versión vigente el 05/10 aunque hoy haya otra (y una versión cargada con
 *  `vigenciaDesde` futura todavía no rige).
 *
 *  Regla: una versión rige en la fecha F si `vigenciaDesde <= F < fin`, con
 *  `fin` (exclusivo):
 *   - la `vigenciaDesde` de la versión que la reemplaza (la que tiene
 *     `versionAnteriorId` = su id), si existe;
 *   - si no tiene sucesora y está dada de baja (`activo === false`):
 *     `fechaActualizacion` (si falta, la propia `vigenciaDesde` → nunca rige);
 *   - si no tiene sucesora y está activa: sin fin.
 *  El fin sale de la sucesora y no de `fechaActualizacion` porque el factory
 *  escribe `fechaActualizacion` = fecha de creación en toda versión nueva:
 *  en las reemplazadas antes de que el versionado la pisara con la fecha de
 *  corte, ese "fin" es falso.
 *
 *  Casos: varias versiones creadas el mismo día dejan a las intermedias con
 *  intervalo vacío [d, d) y gana la última; una fecha anterior a la primera
 *  versión de un linaje no tiene vigente en ese linaje. Fechas comparadas
 *  como string 'YYYY-MM-DD' (se recortan a 10 caracteres por si alguna trae
 *  hora). Funciones puras, sin Angular: testeables en Node. */

/** Campos que usa el cálculo — TarifaBase (con idTarifa poblado al leer) los
 *  cumple, tanto Tarifa como TarifaEspecial. */
export interface VersionConVigencia {
  idTarifa: string;
  activo: boolean;
  vigenciaDesde: string;
  versionAnteriorId?: string | null;   // documentos viejos no lo tienen
  fechaActualizacion?: string;
}

const dia = (f: string): string => f.slice(0, 10);

/** Mapa idTarifa → versión que la reemplaza. Si un linaje se bifurcó (dos
 *  versiones con el mismo versionAnteriorId), corta la de vigenciaDesde
 *  más temprana. */
function mapaSucesoras<T extends VersionConVigencia>(versiones: T[]): Map<string, T> {
  const sucesoras = new Map<string, T>();
  for (const v of versiones) {
    const anterior = v.versionAnteriorId ?? null;
    if (!anterior) continue;
    const actual = sucesoras.get(anterior);
    if (!actual || dia(v.vigenciaDesde) < dia(actual.vigenciaDesde)) {
      sucesoras.set(anterior, v);
    }
  }
  return sucesoras;
}

/** Fin exclusivo ('YYYY-MM-DD') del intervalo de vigencia de `version`, o
 *  null si está abierto. `versiones`: todas las versiones conocidas (de
 *  cualquier linaje), incluidas las inactivas. */
export function finVigencia<T extends VersionConVigencia>(version: T, versiones: T[]): string | null {
  return finConSucesoras(version, mapaSucesoras(versiones));
}

function finConSucesoras<T extends VersionConVigencia>(version: T, sucesoras: Map<string, T>): string | null {
  const sucesora = sucesoras.get(version.idTarifa);
  if (sucesora) return dia(sucesora.vigenciaDesde);
  if (version.activo === false) return dia(version.fechaActualizacion ?? version.vigenciaDesde);
  return null;
}

/** Versiones que rigen en `fecha` ('YYYY-MM-DD'). `versiones`: TODAS las
 *  versiones del conjunto a evaluar (activas e inactivas) — sin las
 *  inactivas no se pueden calcular los fines. Se devuelven ordenadas por
 *  vigenciaDesde descendente (la más reciente primero). */
export function vigentesEnFecha<T extends VersionConVigencia>(versiones: T[], fecha: string): T[] {
  const f = dia(fecha);
  const sucesoras = mapaSucesoras(versiones);
  return versiones
    .filter(v => {
      if (dia(v.vigenciaDesde) > f) return false;
      const fin = finConSucesoras(v, sucesoras);
      return fin === null || f < fin;
    })
    .sort((a, b) => dia(b.vigenciaDesde).localeCompare(dia(a.vigenciaDesde)));
}
```

## PASO 2 — src/app/servicios/tarifario/tarifario.service.ts

2.1 BUSCAR:
```
import { ConIdType } from 'src/app/interfaces/conId';
import { DbFirestoreService, EscrituraBatch } from 'src/app/servicios/database/db-firestore.service';
```
REEMPLAZAR:
```
import { ConIdType } from 'src/app/interfaces/conId';
import { vigentesEnFecha } from 'src/app/shared/utils/vigencia-tarifa.util';
import { DbFirestoreService, EscrituraBatch } from 'src/app/servicios/database/db-firestore.service';
```

2.2 BUSCAR:
```
  /** La tarifa general es singleton — esta es LA forma de resolverla, nunca por id
   *  cacheado en una entidad (RefTarifaHabilitada.general no lleva idTarifa). */
  getTarifaGeneralVigente(): ConIdType<Tarifa> | undefined {
    return this.getTarifasActuales().find(t => t.nivel === 'general' && t.activo);
  }
```
REEMPLAZAR:
```
  /** La tarifa general es singleton — esta es LA forma de resolverla, nunca por id
   *  cacheado en una entidad (RefTarifaHabilitada.general no lleva idTarifa).
   *  Sin `fecha`: la versión activa hoy (pantallas de Tarifas, categorías de
   *  vehículo). Con `fecha` ('YYYY-MM-DD'): la que regía en esa fecha
   *  (vigencia-tarifa.util — operaciones, TC5); si hubiera más de una, la de
   *  vigenciaDesde más reciente. */
  getTarifaGeneralVigente(fecha?: string): ConIdType<Tarifa> | undefined {
    const generales = this.getTarifasActuales().filter(t => t.nivel === 'general');
    if (!fecha) return generales.find(t => t.activo);
    return vigentesEnFecha(generales, fecha)[0];
  }
```

2.3 BUSCAR:
```
   *  multiplicidad. */
  getTarifasPersonalizadasVigentes(idEntidadDueño: string): ConIdType<Tarifa>[] {
    return this.getTarifasActuales().filter(
      t => t.nivel === 'personalizada' && t.idEntidadDueño === idEntidadDueño && t.activo,
    );
  }
```
REEMPLAZAR:
```
   *  multiplicidad. Sin `fecha`: las activas hoy; con `fecha`: las que regían
   *  en esa fecha (ver getTarifaGeneralVigente). */
  getTarifasPersonalizadasVigentes(idEntidadDueño: string, fecha?: string): ConIdType<Tarifa>[] {
    const deLaEntidad = this.getTarifasActuales().filter(
      t => t.nivel === 'personalizada' && t.idEntidadDueño === idEntidadDueño,
    );
    if (!fecha) return deLaEntidad.filter(t => t.activo);
    return vigentesEnFecha(deLaEntidad, fecha);
  }
```

2.4 BUSCAR:
```
   *  múltiples activas por diseño. */
  getTarifasEspecialesVigentes(idEntidadDueño: string): ConIdType<TarifaEspecial>[] {
    return this.getTarifasEspecialesActuales().filter(
      t => t.idEntidadDueño === idEntidadDueño && t.activo,
    );
  }
```
REEMPLAZAR:
```
   *  múltiples activas por diseño. Sin `fecha`: las activas hoy; con `fecha`:
   *  las que regían en esa fecha (ver getTarifaGeneralVigente). */
  getTarifasEspecialesVigentes(idEntidadDueño: string, fecha?: string): ConIdType<TarifaEspecial>[] {
    const deLaEntidad = this.getTarifasEspecialesActuales().filter(
      t => t.idEntidadDueño === idEntidadDueño,
    );
    if (!fecha) return deLaEntidad.filter(t => t.activo);
    return vigentesEnFecha(deLaEntidad, fecha);
  }
```

## PASO 3 — src/app/servicios/tarifario/valores-tarifa.service.ts

3.1 BUSCAR:
```
   *  tildada": si ningún nivel habilitado tiene vigente, la operación queda sin
   *  candidatos y motivoSinCandidatos junta los motivos de cada nivel habilitado. */
  listarCandidatosLado(
    entidadTipo: EntidadTipo,
    idEntidad: string,
    habilitadas: RefTarifaHabilitada[],
    categoriaVehiculo: { catOrden: number; nombre: string },
    idClienteOp: string,
  ): CandidatosLado {
```
REEMPLAZAR:
```
   *  tildada": si ningún nivel habilitado tiene vigente, la operación queda sin
   *  candidatos y motivoSinCandidatos junta los motivos de cada nivel habilitado.
   *
   *  Vigencia POR FECHA (TC5): `fecha` es la de la operación ('YYYY-MM-DD');
   *  se toman las versiones que regían ese día (vigencia-tarifa.util), no las
   *  activas hoy. */
  listarCandidatosLado(
    entidadTipo: EntidadTipo,
    idEntidad: string,
    habilitadas: RefTarifaHabilitada[],
    categoriaVehiculo: { catOrden: number; nombre: string },
    idClienteOp: string,
    fecha: string,
  ): CandidatosLado {
```

3.2 BUSCAR:
```
      const candidatas = this.tarifario.getTarifasPersonalizadasVigentes(idEntidad);
      if (candidatas.length > 0) {
        candidatos.push(...candidatas.map(t => this.aCandidato(t)));
      } else {
        motivos.push(`personalizada de ${entidadTipo} ${idEntidad}: sin tarifa vigente`);
      }
```
REEMPLAZAR:
```
      const candidatas = this.tarifario.getTarifasPersonalizadasVigentes(idEntidad, fecha);
      if (candidatas.length > 0) {
        candidatos.push(...candidatas.map(t => this.aCandidato(t)));
      } else {
        motivos.push(`personalizada de ${entidadTipo} ${idEntidad}: sin tarifa vigente al ${fecha}`);
      }
```

3.3 BUSCAR:
```
      let candidatas = this.tarifario.getTarifasEspecialesVigentes(idEntidad)
```
REEMPLAZAR:
```
      let candidatas = this.tarifario.getTarifasEspecialesVigentes(idEntidad, fecha)
```

3.4 BUSCAR:
```
        motivos.push(`especial de ${entidadTipo} ${idEntidad}: sin tarifa vigente que cubra la categoría`);
```
REEMPLAZAR:
```
        motivos.push(`especial de ${entidadTipo} ${idEntidad}: sin tarifa vigente al ${fecha} que cubra la categoría`);
```

3.5 BUSCAR:
```
      const general = this.tarifario.getTarifaGeneralVigente();
      if (general && general.modoTarifacion !== 'km') {
        candidatos.push(this.aCandidato(general));
      } else {
        motivos.push('no hay tarifa general vigente');
      }
```
REEMPLAZAR:
```
      const general = this.tarifario.getTarifaGeneralVigente(fecha);
      if (general && general.modoTarifacion !== 'km') {
        candidatos.push(this.aCandidato(general));
      } else {
        motivos.push(`no hay tarifa general vigente al ${fecha}`);
      }
```

3.6 BUSCAR:
```
  /** Eventual: no hay RefTarifaAplicada — el valor base sale directo de
   *  datosTarifaEventual (mismo criterio que el sistema viejo); el adicional
   *  por acompañante se toma siempre de la General vigente (ídem sistema
   *  viejo). Sin adicional por km: eventual no lo contempla. */
  private valoresEventual(op: Operacion): Valores | null {
    if (!op.datosTarifaEventual) return null;
    const general = this.tarifario.getTarifaGeneralVigente();
```
REEMPLAZAR:
```
  /** Eventual: no hay RefTarifaAplicada — el valor base sale directo de
   *  datosTarifaEventual (mismo criterio que el sistema viejo); el adicional
   *  por acompañante se toma de la General vigente A LA FECHA de la operación
   *  (TC5 — alta, cierre y restaurar dan lo mismo aunque la General cambie
   *  después). Sin adicional por km: eventual no lo contempla. */
  private valoresEventual(op: Operacion): Valores | null {
    if (!op.datosTarifaEventual) return null;
    const general = this.tarifario.getTarifaGeneralVigente(op.fecha);
```

## PASO 4 — src/app/servicios/tarifario/resolucion-tarifa-op.service.ts

4.1 BUSCAR:
```
  /** Candidatos de tarifa de ambos lados (ValoresTarifaService.listarCandidatosLado).
   *  El lado chofer se calcula SIEMPRE con su propia jerarquía (chofer directo
   *  o proveedor del chofer); quién lo gobierna al final (propio o espejo de
   *  Personalizada del cliente) lo decide el consumidor al aplicar la ref. */
```
REEMPLAZAR:
```
  /** Candidatos de tarifa de ambos lados (ValoresTarifaService.listarCandidatosLado),
   *  con las versiones vigentes a op.fecha (TC5).
   *  El lado chofer se calcula SIEMPRE con su propia jerarquía (chofer directo
   *  o proveedor del chofer); quién lo gobierna al final (propio o espejo de
   *  Personalizada del cliente) lo decide el consumidor al aplicar la ref. */
```

4.2 BUSCAR:
```
    const ladoCliente = this.valoresTarifa.listarCandidatosLado(
      'cliente', cliente.id, cliente.tarifasHabilitadas, op.vehiculo.categoria, op.cliente.id);
    const ladoChofer = this.valoresTarifa.listarCandidatosLado(
      entidadTipoChofer, idEntidadChofer, habilitadasChofer, op.vehiculo.categoria, op.cliente.id);
```
REEMPLAZAR:
```
    const ladoCliente = this.valoresTarifa.listarCandidatosLado(
      'cliente', cliente.id, cliente.tarifasHabilitadas, op.vehiculo.categoria, op.cliente.id, op.fecha);
    const ladoChofer = this.valoresTarifa.listarCandidatosLado(
      entidadTipoChofer, idEntidadChofer, habilitadasChofer, op.vehiculo.categoria, op.cliente.id, op.fecha);
```

## PASO 5 — src/app/servicios/desarrollo/generador-operaciones.service.ts

5.1 BUSCAR:
```
    const general = this.tarifario.getTarifaGeneralVigente() ?? null;
    const noDisponibles = (await this.db.obtenerTodosConId<NoDisponibilidadChofer>('noOperativo'))
```
REEMPLAZAR:
```
    const noDisponibles = (await this.db.obtenerTodosConId<NoDisponibilidadChofer>('noOperativo'))
```

5.2 BUSCAR:
```
      const noDispDia = this.choferesNoDisponibles(noDisponibles, fecha);
      const pool = this.poolDelDia(vehiculos, choferes, proveedores, noDispDia);
```
REEMPLAZAR:
```
      const noDispDia = this.choferesNoDisponibles(noDisponibles, fecha);
      const pool = this.poolDelDia(vehiculos, choferes, proveedores, noDispDia);
      // General vigente A LA FECHA del día (TC5): base de los valores eventuales.
      const general = this.tarifario.getTarifaGeneralVigente(fecha) ?? null;
```

## Verificación

1. `grep -rn "vigentesEnFecha(" src/` → 3 llamadas, todas en
   tarifario.service.ts (la definición es `vigentesEnFecha<T ...>(`, no
   matchea).
2. `grep -c "op.fecha);" src/app/servicios/tarifario/resolucion-tarifa-op.service.ts` → 2.
3. `grep -c "getTarifaGeneralVigente(fecha)" src/app/servicios/tarifario/valores-tarifa.service.ts` → 1.
4. `grep -c "getTarifaGeneralVigente(op.fecha)" src/app/servicios/tarifario/valores-tarifa.service.ts` → 1.
5. `grep -c "getTarifaGeneralVigente()" src/app/servicios/desarrollo/generador-operaciones.service.ts` → 0.
6. `npm run build:demo` sin errores nuevos.
7. Mostrá el diff completo de los 4 archivos modificados y el archivo nuevo.

## Pruebas manuales (demo)

Preparación: un cliente con General habilitada (y, si podés, uno con
Personalizada). Anotá el valor actual de una categoría.

1. Tarifas → General → Aumentar con vigenciaDesde = una fecha FUTURA (ej.
   01/11). Crear una asignación de HOY y completar la operación: el candidato
   General resuelve con los valores VIEJOS (la versión de noviembre todavía
   no rige). Antes de TC5 tomaba los nuevos.
2. Asignación con fecha >= 01/11 → toma los valores nuevos.
3. Asignación con fecha anterior a la vigenciaDesde de la PRIMERA versión de
   la General → sin candidatos, motivo "no hay tarifa general vigente al
   <fecha>"; el alta no se puede completar.
4. Lo mismo (1 y 2) con una Personalizada o una Especial.
5. Operación eventual con acompañante, fecha de hoy: el acompañante sale de
   la General vigente hoy (no de la de noviembre). Cerrarla: mismo valor.
6. Pantallas de Tarifas: la General que se ve como vigente sigue siendo la
   última versión (sin cambios de comportamiento).
7. Generador (/desarrollo), rango que incluya días antes y después del
   01/11: las operaciones de cada día usan la versión de su fecha.

## Mensaje de commit

feat(tarifas): candidatos y acompañante eventual por vigencia a la fecha de la operación (TC5)

- shared/utils/vigencia-tarifa.util.ts (nuevo, puro): vigentesEnFecha /
  finVigencia — intervalo [vigenciaDesde, fin) por linaje (fin = vigenciaDesde
  de la sucesora; baja → fechaActualizacion; activa → abierto).
- TarifarioService: getters de vigentes con `fecha?` (sin fecha, igual que
  antes: activo).
- ValoresTarifaService.listarCandidatosLado con `fecha` (motivos "al
  <fecha>"); valoresEventual con la General vigente a op.fecha.
- ResolucionTarifaOpService.candidatosOp pasa op.fecha; el generador toma la
  General por día.

FIN DE LA INSTRUCCIÓN TC5
````

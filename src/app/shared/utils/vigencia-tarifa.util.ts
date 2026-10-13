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

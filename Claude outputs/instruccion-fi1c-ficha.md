````
Si no ves la línea FIN DE LA INSTRUCCIÓN FI1c al final, el texto llegó cortado: leé el archivo completo.

INSTRUCCIÓN FI1c — Fecha de nacimiento del chofer: un solo formato, al guardar y en lo guardado (ApLog, rama refactor)
=====================================================================================================================

## Contexto y razonamiento

Tercer bloque del frente "Ficha de entidad" (diseño: `claude/diseno-ficha-entidad.md`).
En la ficha, la fecha de nacimiento de algunos choferes sale como `[object Object]`, y en el
Excel de choferes sale vacía o rara. Hay dos formatos guardados en `choferes`: el string
'YYYY-MM-DD' (el correcto) y un Timestamp de Firestore (o un mapa `{seconds, nanoseconds}`).

**Por qué hay Timestamps (dos causas, las dos cerradas acá):**
1. **El anonimizador de prueba** de `choferes-listado` (`editarChoferesMock` →
   `anonimizarChoferes` → `actualizarActivos`, sin uso desde la UI) guardaba
   `fechaNac: this.randomDate()`, un `Date`: Firestore lo convierte en Timestamp. Además lo
   ponía en la raíz del chofer, no en `datosPersonales`. Se borra (PASO 6).
2. **La edición re-guardaba lo que leía.** El alta en modo edición hace `patchValue` con
   `this.chofer.datosPersonales.fechaNac`. Si lo guardado era un Timestamp, el input de
   fecha no lo puede mostrar (queda vacío a la vista), pero el control conserva el objeto;
   si el usuario no toca el campo, al guardar el factory lo escribe de nuevo tal cual. Así
   un dato malo se perpetuaba con cada edición. Ahora el form recibe la fecha normalizada
   (PASO 3.8) y el factory solo escribe una 'YYYY-MM-DD' válida (PASO 3.2–3.3).

**Para que no se repita (lo central del bloque):**
- **El factory es el único punto de escritura** de la fecha de nacimiento (alta y
  edición, chofer directo y de proveedor: los dos pasan por
  `ChoferFactoryService.buildDatosPersonales`). Ahora normaliza y valida: si no queda una
  'YYYY-MM-DD' real entre el 01/01/1900 y hoy (Argentina), lanza
  `Chofer: <motivo>.` y no se guarda nada. Es la red de seguridad: aunque una pantalla
  futura mande un `Date`, un Timestamp o un texto, nunca llega a Firestore.
- **El form** valida lo mismo (`ValidarService.fechaNacimientoValida`, mensaje propio) y
  limita el selector con `min`/`max`, así el usuario ve el error antes de guardar.
- **La migración de Vantruck** (`ChoferMigrationService`) ya escribe 'YYYY-MM-DD' (o null
  si no se puede interpretar: la herramienta de /migracion lo marca).
- **Lo guardado** se corrige con una herramienta nueva de /migracion, "Fecha de
  nacimiento de choferes" (rol dev + id del proyecto escrito, como el Recálculo): simula,
  muestra qué convierte y qué hay que revisar a mano, y ejecuta. Revisa también las copias
  de choferes en la papelera (`objetosEliminados`, ids `choferes__…`), para que restaurar
  un chofer no traiga de vuelta un Timestamp.
- **Lectura defensiva:** la ficha y el Excel muestran bien la fecha aunque todavía esté
  guardada como objeto, y `fechaLegible` devuelve el valor de "vacío" ante algo que no es
  texto (antes devolvía el objeto y se veía `[object Object]`).

Los otros caminos que escriben un chofer (baja en cascada de un proveedor, restaurar desde
la papelera) copian lo que ya está guardado: con los datos normalizados, quedan cubiertos.

**Conversión de un Timestamp** (`normalizarFechaNacimiento`, util nuevo y puro): el día de
ese instante en Argentina; salvo que el instante sea justo 00:00:00 UTC (se armó con
`new Date('YYYY-MM-DD')`), en cuyo caso se toma el día UTC, que es el que se cargó. Un
texto se toma tal cual si es 'YYYY-MM-DD' válida. Lo que no se puede interpretar queda
como "revisar": la herramienta no lo toca.

**Herramienta (`NormalizacionFechaNacService`, `servicios/desarrollo/`):** una fila por
chofer y por copia en la papelera, con estado `convertir` (se escribe
`datosPersonales.fechaNac` con modo 'actualizar', nada más), `ok` (ya está bien) o
`revisar` (falta, no se puede interpretar o queda fuera de rango: corregir a mano editando
el chofer). Sin log: es una corrección de datos de desarrollo, como el Recálculo.

**Verificación previa (sobre una copia del repo en el commit de FI1b, aplicando esta
instrucción con un script):**
- cada BUSCAR encontrado una sola vez;
- `tsc` limpio;
- prueba en Node del util (texto, Timestamp, mapa, Date, medianoche UTC, fuera de rango,
  vacío): todo OK;
- pruebas con Karma: la ficha con un Timestamp guardado muestra DD/MM/AAAA; el form de
  edición carga 'YYYY-MM-DD' y marca el error fuera de rango; el factory lanza ante una
  fecha inválida y guarda un string; la herramienta clasifica 3 convertir / 1 ok / 2
  revisar y escribe strings;
- `build:demo` con las mismas 9 advertencias; inicial 1,53 MB; el chunk de /migracion
  pasa de 172,6 a 180,8 kB.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- NO corras `npm run deploy:*`, `npm run build` ni `node set-version.js`. Para compilar
  usá `npm run build:demo`.
- Aplicá los pasos EN ORDEN.
- Si un texto a BUSCAR no está o aparece más de una vez: detenete y reportá. Los BUSCAR
  son líneas completas.
- Editá cada archivo en el lugar (leer, reemplazar, escribir); nunca abras un archivo
  para escritura antes de haber leído su contenido.
- Archivos NUEVOS: crealos exactamente con el contenido dado. Finales de línea LF.
- No toques CLAUDE.md ni CHANGELOG.md (se actualizan al cierre del frente).
- Si al revisar usos aparece algo que esta instrucción no contempla (otro lugar que
  escriba `fechaNac`, un `.spec.ts`), detenete y reportá.

## PASO 0 — Verificación (sin modificar nada)

Antes de empezar: FI1 y FI1b tienen que estar commiteados (`git status` limpio, último
commit FI1b). Si no, detenete y avisá.

```
git status --short
grep -rn "fechaNac" src/app --include=*.ts --include=*.html
grep -rln "fecha-nacimiento\|normalizacion-fecha-nac\|NormalizacionFechaNac" src
grep -n "editarChoferesMock\|anonimizarChoferes\|actualizarActivos\|DbFirestoreService\|choferesMock: " src/app/raiz/choferes/choferes-listado/choferes-listado.component.ts
grep -n "if (!f) return vacio;" src/app/shared/utils/fecha.util.ts
grep -n "} from '@angular/forms';\|static validarDominio" src/app/servicios/validar/validar.service.ts
wc -l src/app/componentes/desarrollo.module.ts src/app/componentes/migracion/migracion.component.html src/app/raiz/choferes/choferes-alta/choferes-alta.component.html src/app/raiz/choferes/choferes-alta/choferes-alta.component.ts src/app/raiz/choferes/choferes-listado/choferes-listado.component.ts src/app/servicios/choferes/chofer-factory.service.ts src/app/servicios/informes/excel/excel.service.ts src/app/servicios/migracion/chofer-migration.service.ts src/app/servicios/validar/validar.service.ts src/app/shared/ficha-entidad/ficha-chofer-datos/ficha-chofer-datos.component.ts src/app/shared/utils/fecha.util.ts
```
Esperado:
1. Nada.
2. 17 líneas:
   - `ficha-chofer-datos.component.ts:34`;
   - `objeto-papelera.component.html:362`;
   - `chofer-factory.service.ts:13` y `:71`;
   - `excel.service.ts:777`;
   - `chofer-migration.service.ts:68`;
   - `validar.service.ts:101`;
   - `interfaces/chofer.ts:23`;
   - `choferes-alta.component.ts:97, 244, 339`;
   - `choferes-alta.component.html:82, 88, 89, 90, 95`;
   - `choferes-listado.component.ts:297`.
3. Nada.
4. 11 (import), 33, 43, 270, 272, 277 y 331.
5. 126.
6. 7, 36 y 133 (hay dos bloques de import de `@angular/forms`: el PASO 3.5 usa el
   primero).
7. 36, 357, 595, 627, 351, 79, 889, 287, 184, 42 y 159.

Si algo no coincide, detenete y reportá.

## PASO 1 — Archivos NUEVOS (4)

1.1 NUEVO `src/app/shared/utils/fecha-nacimiento.util.ts`
```
import { FechaNegocio, esFechaNegocio, hoyNegocio } from './fecha.util';

/**
 * Fecha de nacimiento de un chofer (FI1c, frente Ficha de entidad).
 *
 * Se guarda como fecha de negocio 'YYYY-MM-DD': el string del input de fecha
 * del alta. En demo hay datos viejos guardados como Timestamp de Firestore o
 * como mapa {seconds, nanoseconds} (venían de una anonimización de prueba):
 * `normalizarFechaNacimiento` los convierte, y la herramienta de /migracion
 * lo usa para corregir lo guardado.
 */

/** Fecha mínima aceptada. La máxima es hoy (Argentina). */
export const FECHA_NAC_MINIMA: FechaNegocio = '1900-01-01';

/** null si `valor` es una fecha de nacimiento válida ('YYYY-MM-DD' real,
 *  entre FECHA_NAC_MINIMA y hoy); si no, el motivo. */
export function errorFechaNacimiento(valor: unknown, hoy: FechaNegocio = hoyNegocio()): string | null {
  if (valor === null || valor === undefined || valor === '') {
    return 'falta la fecha de nacimiento';
  }
  if (!esFechaNegocio(valor)) {
    return 'la fecha de nacimiento no tiene el formato AAAA-MM-DD';
  }
  if (valor < FECHA_NAC_MINIMA || valor > hoy) {
    return 'la fecha de nacimiento tiene que estar entre el 01/01/1900 y hoy';
  }
  return null;
}

export type OrigenFechaNacimiento = 'texto' | 'timestamp' | 'mapa' | 'fecha' | 'vacio' | 'otro';

export interface FechaNacimientoNormalizada {
  /** 'YYYY-MM-DD', o null si no se puede interpretar. */
  fecha: FechaNegocio | null;
  origen: OrigenFechaNacimiento;
}

/**
 * Interpreta cualquier forma guardada de la fecha de nacimiento:
 * - texto 'YYYY-MM-DD' → tal cual (aunque esté fuera de rango; eso lo dice
 *   errorFechaNacimiento);
 * - Timestamp de Firestore (tiene toDate), mapa {seconds} o Date → el día de
 *   ese instante en Argentina; salvo que caiga justo a las 00:00:00 UTC (se
 *   armó con new Date('YYYY-MM-DD')): ahí el día UTC, que es el que se cargó;
 * - vacío o cualquier otra cosa → fecha null.
 */
export function normalizarFechaNacimiento(valor: unknown): FechaNacimientoNormalizada {
  if (valor === null || valor === undefined || valor === '') {
    return { fecha: null, origen: 'vacio' };
  }
  if (typeof valor === 'string') {
    const texto = valor.trim();
    return { fecha: esFechaNegocio(texto) ? texto : null, origen: 'texto' };
  }
  if (valor instanceof Date) {
    return { fecha: diaDeInstante(valor.getTime()), origen: 'fecha' };
  }
  if (typeof valor === 'object') {
    const v = valor as { toDate?: unknown; seconds?: unknown; nanoseconds?: unknown };
    if (typeof v.toDate === 'function') {
      return { fecha: diaDeInstante((v.toDate as () => Date).call(valor).getTime()), origen: 'timestamp' };
    }
    if (typeof v.seconds === 'number') {
      const nanos = typeof v.nanoseconds === 'number' ? v.nanoseconds : 0;
      return { fecha: diaDeInstante(v.seconds * 1000 + Math.floor(nanos / 1e6)), origen: 'mapa' };
    }
  }
  return { fecha: null, origen: 'otro' };
}

function diaDeInstante(ms: number): FechaNegocio | null {
  if (!Number.isFinite(ms)) return null;
  const d = new Date(ms);
  if (isNaN(d.getTime())) return null;
  if (ms % 86_400_000 === 0) {
    return d.toISOString().slice(0, 10);
  }
  return hoyNegocio(d);
}
```

1.2 NUEVO `src/app/servicios/desarrollo/normalizacion-fecha-nac.service.ts`
```
import { Injectable, inject } from '@angular/core';
import { environment } from 'src/environments/environment';
import { DbFirestoreService, EscrituraBatch } from 'src/app/servicios/database/db-firestore.service';
import { UsuarioSesionService } from 'src/app/servicios/usuario-sesion/usuario-sesion.service';
import {
  OrigenFechaNacimiento, errorFechaNacimiento, normalizarFechaNacimiento,
} from 'src/app/shared/utils/fecha-nacimiento.util';
import { fechaLegible } from 'src/app/shared/utils/fecha.util';

/** 'convertir': se reescribe como 'YYYY-MM-DD'. 'ok': ya está bien.
 *  'revisar': no se puede convertir o queda fuera de rango; no se toca (se
 *  corrige editando el chofer, que ahora exige una fecha válida). */
export type AccionFechaNac = 'convertir' | 'ok' | 'revisar';

export interface RenglonFechaNac {
  coleccion: 'choferes' | 'objetosEliminados';
  id: string;
  nombre: string;
  origen: OrigenFechaNacimiento;
  /** Lo guardado, para leer: el texto, o el instante del Timestamp/mapa. */
  actual: string;
  /** 'DD/MM/AAAA' que queda, o '—'. */
  propuesta: string;
  accion: AccionFechaNac;
  motivo: string;
}

export interface SimulacionFechaNac {
  proyecto: string;
  renglones: RenglonFechaNac[];
  convertir: number;
  ok: number;
  revisar: number;
}

interface Preparacion {
  simulacion: SimulacionFechaNac;
  escrituras: EscrituraBatch[];
}

const PREFIJO_PAPELERA = 'choferes__';

/**
 * Herramienta de /migracion (FI1c): normaliza `datosPersonales.fechaNac` de
 * los choferes a 'YYYY-MM-DD'. Recorre `choferes` y los choferes archivados
 * en la papelera (`objetosEliminados`, id `choferes__<id>`), para que una
 * restauración no traiga de vuelta el formato viejo.
 *
 * Seguridad: rol dev; Ejecutar pide escribir el id del proyecto. Sirve en
 * cualquier proyecto (en la migración de Vantruck: simular primero). Escribe
 * solo la fecha (update con dot-notation), sin log (como los Recálculos).
 */
@Injectable({ providedIn: 'root' })
export class NormalizacionFechaNacService {

  private db = inject(DbFirestoreService);
  private usuarioSesion = inject(UsuarioSesionService);

  static readonly PROYECTO_DEMO = 'demoapplog';

  get proyecto(): string {
    return environment.firebase.projectId;
  }

  esEntornoDemo(): boolean {
    return this.proyecto === NormalizacionFechaNacService.PROYECTO_DEMO;
  }

  /** No escribe nada. */
  async simular(): Promise<SimulacionFechaNac> {
    this.verificarAcceso();
    return (await this.preparar()).simulacion;
  }

  /** Vuelve a leer todo y escribe solo los renglones 'convertir'. */
  async ejecutar(confirmacion: string): Promise<number> {
    this.verificarAcceso();
    if ((confirmacion ?? '').trim() !== this.proyecto) {
      throw new Error(`Confirmación incorrecta: escribí el id del proyecto (${this.proyecto}).`);
    }
    const { escrituras } = await this.preparar();
    if (escrituras.length > 0) {
      await this.db.commitBatch(escrituras);
    }
    return escrituras.length;
  }

  private async preparar(): Promise<Preparacion> {
    const choferes = await this.db.obtenerTodosConId<any>('choferes');
    // objetosEliminados se lee entero: en el modelo nuevo es chica (empezó de
    // cero con el frente Papelera). Si creciera, consultar por rango de id.
    const archivados = (await this.db.obtenerTodosConId<any>('objetosEliminados'))
      .filter(o => o.id.startsWith(PREFIJO_PAPELERA));

    const renglones: RenglonFechaNac[] = [];
    const escrituras: EscrituraBatch[] = [];
    for (const { id, data } of choferes) {
      this.evaluar('choferes', id, data, renglones, escrituras);
    }
    for (const { id, data } of archivados) {
      this.evaluar('objetosEliminados', id, data, renglones, escrituras);
    }

    const orden: Record<AccionFechaNac, number> = { revisar: 0, convertir: 1, ok: 2 };
    renglones.sort((a, b) => orden[a.accion] - orden[b.accion] || a.nombre.localeCompare(b.nombre));
    const cuenta = (a: AccionFechaNac) => renglones.filter(r => r.accion === a).length;
    return {
      simulacion: {
        proyecto: this.proyecto,
        renglones,
        convertir: cuenta('convertir'),
        ok: cuenta('ok'),
        revisar: cuenta('revisar'),
      },
      escrituras,
    };
  }

  private evaluar(
    coleccion: RenglonFechaNac['coleccion'],
    id: string,
    data: any,
    renglones: RenglonFechaNac[],
    escrituras: EscrituraBatch[],
  ): void {
    const dp = data?.datosPersonales ?? {};
    const valor = dp.fechaNac;
    const { fecha, origen } = normalizarFechaNacimiento(valor);
    const error = fecha ? errorFechaNacimiento(fecha) : null;
    const base = {
      coleccion,
      id,
      nombre: `${dp.apellido ?? ''} ${dp.nombre ?? ''}`.trim() || id,
      origen,
      actual: this.describir(valor),
      propuesta: fecha ? fechaLegible(fecha) : '—',
    };

    if (!fecha) {
      renglones.push({ ...base, accion: 'revisar', motivo: origen === 'vacio' ? 'Sin fecha' : 'No se puede interpretar' });
      return;
    }
    if (error) {
      renglones.push({ ...base, accion: 'revisar', motivo: error });
      return;
    }
    if (origen === 'texto' && valor === fecha) {
      renglones.push({ ...base, accion: 'ok', motivo: '' });
      return;
    }
    renglones.push({ ...base, accion: 'convertir', motivo: `Guardada como ${origen}` });
    escrituras.push({ coleccion, id, data: { 'datosPersonales.fechaNac': fecha }, modo: 'actualizar' });
  }

  private describir(valor: unknown): string {
    if (valor === null || valor === undefined) return '(vacío)';
    if (typeof valor === 'string') return `"${valor}"`;
    const v = valor as { toDate?: () => Date; seconds?: number };
    try {
      if (typeof v.toDate === 'function') return `Timestamp ${v.toDate().toISOString()}`;
      if (typeof v.seconds === 'number') return `{seconds} ${new Date(v.seconds * 1000).toISOString()}`;
    } catch {
      // fecha fuera de rango para Date: cae al JSON
    }
    return JSON.stringify(valor);
  }

  private verificarAcceso(): void {
    if (this.usuarioSesion.getRol() !== 'dev') {
      throw new Error('Normalización bloqueada: requiere rol dev.');
    }
  }
}
```

1.3 NUEVO `src/app/componentes/normalizacion-fecha-nac/normalizacion-fecha-nac.component.ts`
```
import { Component } from '@angular/core';
import {
  NormalizacionFechaNacService,
  SimulacionFechaNac,
} from 'src/app/servicios/desarrollo/normalizacion-fecha-nac.service';

/** Sección "Fecha de nacimiento de choferes" de /migracion (FI1c). Dos
 *  pasos: Simular (no escribe) → Ejecutar (requiere escribir el id del
 *  proyecto). Mismo criterio que los Recálculos. */
@Component({
  selector: 'app-normalizacion-fecha-nac',
  standalone: false,
  templateUrl: './normalizacion-fecha-nac.component.html',
})
export class NormalizacionFechaNacComponent {

  readonly proyecto: string;
  readonly esDemo: boolean;

  simulacion: SimulacionFechaNac | null = null;
  escritos: number | null = null;
  textoConfirmacion = '';
  ejecutando = false;
  error = '';

  constructor(private normalizacion: NormalizacionFechaNacService) {
    this.proyecto = normalizacion.proyecto;
    this.esDemo = normalizacion.esEntornoDemo();
  }

  get puedeEjecutar(): boolean {
    return !!this.simulacion
      && this.simulacion.convertir > 0
      && this.textoConfirmacion.trim() === this.proyecto
      && !this.ejecutando;
  }

  async simular(): Promise<void> {
    this.error = '';
    this.escritos = null;
    this.ejecutando = true;
    try {
      this.simulacion = await this.normalizacion.simular();
    } catch (e: any) {
      this.simulacion = null;
      this.error = e?.message ?? String(e);
    } finally {
      this.ejecutando = false;
    }
  }

  async ejecutar(): Promise<void> {
    if (!this.puedeEjecutar) return;
    this.error = '';
    this.ejecutando = true;
    try {
      this.escritos = await this.normalizacion.ejecutar(this.textoConfirmacion);
      this.textoConfirmacion = '';
      this.simulacion = await this.normalizacion.simular();
    } catch (e: any) {
      this.error = e?.message ?? String(e);
    } finally {
      this.ejecutando = false;
    }
  }
}
```

1.4 NUEVO `src/app/componentes/normalizacion-fecha-nac/normalizacion-fecha-nac.component.html`
```
<div class="border border-success rounded-3 p-3 mb-4">
  <h4 class="text-success">Fecha de nacimiento de choferes (FI1c)</h4>

  @if (!esDemo) {
    <div class="alert alert-danger">
      Proyecto <b>{{ proyecto }}</b> — NO es demo. Ejecutar reescribe la fecha de nacimiento de
      los choferes de este proyecto.
    </div>
  }

  <p class="mb-2">
    Pasa <code>datosPersonales.fechaNac</code> a texto AAAA-MM-DD en los choferes y en los
    choferes de la papelera. Convierte las guardadas como fecha de Firestore (Timestamp o
    mapa con <code>seconds</code>) al día que corresponde en Argentina. Las que no se
    pueden convertir o quedan fuera de rango (antes de 1900 o después de hoy) se listan para
    revisar y no se tocan: se corrigen editando el chofer. <b>Simular</b> no escribe nada.
  </p>

  <div class="d-flex flex-wrap gap-2 align-items-end mb-2">
    <button type="button" class="btn btn-outline-success btn-sm" [disabled]="ejecutando" (click)="simular()">
      1. Simular
    </button>
  </div>

  @if (error) {
    <div class="alert alert-danger mt-2 mb-0">{{ error }}</div>
  }

  @if (escritos !== null) {
    <div class="alert alert-success mt-2">Fechas reescritas: {{ escritos }}.</div>
  }

  @if (simulacion) {
    <p class="mt-3 mb-2">
      A convertir: <b>{{ simulacion.convertir }}</b> — ya correctas: {{ simulacion.ok }}
      — para revisar: <b>{{ simulacion.revisar }}</b>
    </p>

    @if (simulacion.renglones.length > 0) {
      <div class="table-responsive" style="max-height: 24rem;">
        <table class="table table-sm">
          <thead>
            <tr>
              <th>Chofer</th><th>Dónde</th><th>Guardado</th><th>Queda</th><th>Acción</th>
            </tr>
          </thead>
          <tbody>
            @for (r of simulacion.renglones; track r.coleccion + r.id) {
              @if (r.accion !== 'ok') {
                <tr>
                  <td>{{ r.nombre }}</td>
                  <td>{{ r.coleccion === 'choferes' ? 'Choferes' : 'Papelera' }}</td>
                  <td class="small text-break">{{ r.actual }}</td>
                  <td>{{ r.propuesta }}</td>
                  <td>
                    @if (r.accion === 'convertir') {
                      <span class="badge bg-primary">Convertir</span>
                    } @else {
                      <span class="badge bg-warning text-dark">Revisar</span> {{ r.motivo }}
                    }
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>
    }

    @if (simulacion.convertir > 0) {
      <div class="d-flex flex-wrap gap-2 align-items-end mt-2">
        <div>
          <label class="form-label small mb-0">Escribí el id del proyecto ({{ proyecto }})</label>
          <input type="text" class="form-control form-control-sm" [(ngModel)]="textoConfirmacion"
            [disabled]="ejecutando" />
        </div>
        <button type="button" class="btn btn-success btn-sm" [disabled]="!puedeEjecutar" (click)="ejecutar()">
          2. Ejecutar
        </button>
      </div>
    }
  }
</div>
```

## PASO 2 — `fechaLegible` no devuelve objetos

2.1 `src/app/shared/utils/fecha.util.ts` — fechaLegible no devuelve objetos. BUSCAR:
```
/** 'YYYY-MM-DD' → 'DD/MM/AAAA', sin pasar por Date. Vacío o nulo → `vacio`.
 *  Cualquier otro string se devuelve tal cual (no se esconde el dato). */
export function fechaLegible(f: string | null | undefined, vacio: string = '—'): string {
  if (!f) return vacio;
```
REEMPLAZAR:
```
/** 'YYYY-MM-DD' → 'DD/MM/AAAA', sin pasar por Date. Vacío, nulo o un valor
 *  que no es texto (ej. un Timestamp de Firestore guardado por error) →
 *  `vacio`. Cualquier otro string se devuelve tal cual (no se esconde el dato). */
export function fechaLegible(f: string | null | undefined, vacio: string = '—'): string {
  if (!f || typeof f !== 'string') return vacio;
```

## PASO 3 — Escritura: factory, form de alta/edición y migración

3.1 `src/app/servicios/choferes/chofer-factory.service.ts` — import del util. BUSCAR:
```
import { RefTarifaHabilitada, validarTarifasHabilitadas } from 'src/app/interfaces/tarifa-habilitada';
```
REEMPLAZAR:
```
import { RefTarifaHabilitada, validarTarifasHabilitadas } from 'src/app/interfaces/tarifa-habilitada';
import { errorFechaNacimiento, normalizarFechaNacimiento } from 'src/app/shared/utils/fecha-nacimiento.util';
```

3.2 `src/app/servicios/choferes/chofer-factory.service.ts` — el factory solo escribe 'YYYY-MM-DD' válida. BUSCAR:
```
  private buildDatosPersonales(data: ChoferFormData): DatosPersonales {
```
REEMPLAZAR:
```
  private buildDatosPersonales(data: ChoferFormData): DatosPersonales {
    // FI1c: único punto de escritura de la fecha de nacimiento (alta y
    // edición). Se normaliza a 'YYYY-MM-DD' y se valida: nunca se guarda un
    // objeto de fecha ni una fecha fuera de rango.
    const fechaNac = normalizarFechaNacimiento(data.fechaNac).fecha;
    const errorFecha = errorFechaNacimiento(fechaNac);
    if (errorFecha) {
      throw new Error(`Chofer: ${errorFecha}.`);
    }
```

3.3 `src/app/servicios/choferes/chofer-factory.service.ts` — usa la fecha normalizada. BUSCAR:
```
      fechaNac: data.fechaNac,
```
REEMPLAZAR:
```
      fechaNac: fechaNac!,
```

3.4 `src/app/servicios/validar/validar.service.ts` — validador del form. BUSCAR:
```
  static validarDominio(control: AbstractControl): ValidationErrors | null {
```
REEMPLAZAR:
```
  /** FI1c: fecha de nacimiento 'YYYY-MM-DD' entre 1900 y hoy. Vacío lo
   *  resuelve Validators.required. */
  static fechaNacimientoValida(control: AbstractControl): ValidationErrors | null {
    if (control.value === null || control.value === undefined || control.value === '') return null;
    return errorFechaNacimiento(control.value) ? { fechaNacimiento: true } : null;
  }

  static validarDominio(control: AbstractControl): ValidationErrors | null {
```

3.5 `src/app/servicios/validar/validar.service.ts` — import del util (el primer bloque de imports). BUSCAR:
```
  ValidationErrors,
  Validators,
} from '@angular/forms';
```
REEMPLAZAR:
```
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { errorFechaNacimiento } from 'src/app/shared/utils/fecha-nacimiento.util';
```

3.6 `src/app/raiz/choferes/choferes-alta/choferes-alta.component.ts` — import del util. BUSCAR:
```
import { RefTarifaHabilitada, nivelesHabilitados } from "src/app/interfaces/tarifa-habilitada";
```
REEMPLAZAR:
```
import { RefTarifaHabilitada, nivelesHabilitados } from "src/app/interfaces/tarifa-habilitada";
import { FECHA_NAC_MINIMA, normalizarFechaNacimiento } from "src/app/shared/utils/fecha-nacimiento.util";
import { hoyNegocio } from "src/app/shared/utils/fecha.util";
```

3.7 `src/app/raiz/choferes/choferes-alta/choferes-alta.component.ts` — validador en el control. BUSCAR:
```
      fechaNac: ["", Validators.required],
```
REEMPLAZAR:
```
      fechaNac: ["", [Validators.required, ValidarService.fechaNacimientoValida]],
```

3.8 `src/app/raiz/choferes/choferes-alta/choferes-alta.component.ts` — al editar, el input recibe 'YYYY-MM-DD' (no el objeto guardado). BUSCAR:
```
      fechaNac: this.chofer.datosPersonales.fechaNac,
```
REEMPLAZAR:
```
      // FI1c: un Timestamp guardado no se puede mostrar en un input de fecha
      // y, sin tocar el campo, se volvía a guardar tal cual.
      fechaNac: normalizarFechaNacimiento(this.chofer.datosPersonales.fechaNac).fecha ?? "",
```

3.9 `src/app/raiz/choferes/choferes-alta/choferes-alta.component.ts` — límites para el selector de fecha. BUSCAR:
```
  hasError(controlName: string, errorName: string): boolean {
```
REEMPLAZAR:
```
  /** Límites del selector de fecha de nacimiento (FI1c). */
  readonly fechaNacMinima = FECHA_NAC_MINIMA;
  readonly fechaNacMaxima = hoyNegocio();

  hasError(controlName: string, errorName: string): boolean {
```

3.10 `src/app/raiz/choferes/choferes-alta/choferes-alta.component.html` — min / max del input. BUSCAR:
```
                                type="date"
                                [ngClass]="{
                                    'is-invalid':
                                        form.get('fechaNac').invalid &&
```
REEMPLAZAR:
```
                                type="date"
                                [min]="fechaNacMinima"
                                [max]="fechaNacMaxima"
                                [ngClass]="{
                                    'is-invalid':
                                        form.get('fechaNac').invalid &&
```

3.11 `src/app/raiz/choferes/choferes-alta/choferes-alta.component.html` — mensaje de fecha fuera de rango. BUSCAR:
```
                        @if (hasError("fechaNac", "required")) {
                            <div>La fecha de nacimiento es obligatoria.</div>
                        }
```
REEMPLAZAR:
```
                        @if (hasError("fechaNac", "required")) {
                            <div>La fecha de nacimiento es obligatoria.</div>
                        }
                        @if (hasError("fechaNac", "fechaNacimiento")) {
                            <div>La fecha de nacimiento tiene que estar entre el 01/01/1900 y hoy.</div>
                        }
```

3.12 `src/app/servicios/migracion/chofer-migration.service.ts` — import del util. BUSCAR:
```
import { habilitadasDesdeTarifaTipoMigracion } from './tarifa-habilitada-migracion.util';
```
REEMPLAZAR:
```
import { habilitadasDesdeTarifaTipoMigracion } from './tarifa-habilitada-migracion.util';
import { normalizarFechaNacimiento } from 'src/app/shared/utils/fecha-nacimiento.util';
```

3.13 `src/app/servicios/migracion/chofer-migration.service.ts` — la migración de Vantruck ya escribe 'YYYY-MM-DD'. BUSCAR:
```
        fechaNac: datos.fechaNac ?? null,
```
REEMPLAZAR:
```
        // FI1c: 'YYYY-MM-DD' (null si falta o no se puede interpretar; lo
        // marca la herramienta "Fecha de nacimiento de choferes").
        fechaNac: normalizarFechaNacimiento(datos.fechaNac).fecha,
```

## PASO 4 — Lectura: ficha y Excel de choferes

4.1 `src/app/shared/ficha-entidad/ficha-chofer-datos/ficha-chofer-datos.component.ts` — import del util. BUSCAR:
```
import { fechaLegible } from 'src/app/shared/utils/fecha.util';
```
REEMPLAZAR:
```
import { fechaLegible } from 'src/app/shared/utils/fecha.util';
import { normalizarFechaNacimiento } from 'src/app/shared/utils/fecha-nacimiento.util';
```

4.2 `src/app/shared/ficha-entidad/ficha-chofer-datos/ficha-chofer-datos.component.ts` — muestra también lo guardado en otro formato. BUSCAR:
```
      { etiqueta: 'Fecha de nacimiento', valor: fechaLegible(d.fechaNac) },
```
REEMPLAZAR:
```
      { etiqueta: 'Fecha de nacimiento', valor: fechaLegible(normalizarFechaNacimiento(d.fechaNac).fecha) },
```

4.3 `src/app/servicios/informes/excel/excel.service.ts` — import del util. BUSCAR:
```
import { anioDe, fechaLegible, hoyNegocio } from "src/app/shared/utils/fecha.util";
```
REEMPLAZAR:
```
import { anioDe, fechaLegible, hoyNegocio } from "src/app/shared/utils/fecha.util";
import { normalizarFechaNacimiento } from "src/app/shared/utils/fecha-nacimiento.util";
```

4.4 `src/app/servicios/informes/excel/excel.service.ts` — Excel de choferes. BUSCAR:
```
  private formatearFecha(fecha: string): string {
    return fechaLegible(fecha, "");
```
REEMPLAZAR:
```
  private formatearFecha(fecha: unknown): string {
    return fechaLegible(normalizarFechaNacimiento(fecha).fecha, "");
```

## PASO 5 — /migracion: herramienta "Fecha de nacimiento de choferes"

5.1 `src/app/componentes/desarrollo.module.ts` — import del componente. BUSCAR:
```
import { RecalculoComisionesComponent } from './recalculo-comisiones/recalculo-comisiones.component';
```
REEMPLAZAR:
```
import { RecalculoComisionesComponent } from './recalculo-comisiones/recalculo-comisiones.component';
import { NormalizacionFechaNacComponent } from './normalizacion-fecha-nac/normalizacion-fecha-nac.component';
```

5.2 `src/app/componentes/desarrollo.module.ts` — declaración. BUSCAR:
```
    RecalculoComisionesComponent,
  ],
```
REEMPLAZAR:
```
    RecalculoComisionesComponent,
    NormalizacionFechaNacComponent,
  ],
```

5.3 `src/app/componentes/migracion/migracion.component.html` — sección nueva. BUSCAR:
```
  <app-recalculo-comisiones></app-recalculo-comisiones>
```
REEMPLAZAR:
```
  <app-recalculo-comisiones></app-recalculo-comisiones>

  <app-normalizacion-fecha-nac></app-normalizacion-fecha-nac>
```

## PASO 6 — choferes-listado: fuera el anonimizador de prueba

6.1 `src/app/raiz/choferes/choferes-listado/choferes-listado.component.ts` — fuera el anonimizador (sin uso; guardaba fechaNac como Date). BUSCAR:
```
    }
  }

  editarChoferesMock() {
    this.choferesMock = structuredClone(this.$choferes);
    this.choferesMock = this.anonimizarChoferes(this.choferesMock);

    console.log("this.clientesActivo", this.choferesMock);
  }

  public anonimizarChoferes(
    choferes: ConIdType<Chofer>[],
  ): ConIdType<Chofer>[] {
    return choferes.map((chofer) => ({
      ...chofer,

      nombre: this.randomString(10),
      apellido: this.randomString(10),
      cuit: this.randomNumber(11),
      celularContacto: this.randomNumber(10),
      celularEmergencia: this.randomNumber(10),
      contactoEmergencia: this.randomString(10),

      direccion: {
        ...chofer.datosPersonales.direccion,
        domicilio: this.randomString(10),
      },

      email: this.randomEmail(10),

      fechaNac: this.randomDate(),

      /*     vehiculo: chofer.vehiculo.map(v => ({
      ...v,
      dominio: this.randomDominio(),
    })) */
    }));
  }

  private randomString(length: number): string {
    const chars = "abcdefghijklmnopqrstuvwxyz";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private randomNumber(length: number): number {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private randomEmail(length: number): string {
    return `${this.randomString(length)}@mail.com`;
  }

  private randomDate(): Date {
    const start = new Date(1960, 0, 1).getTime();
    const end = new Date(2005, 11, 31).getTime();
    return new Date(start + Math.random() * (end - start));
  }

  async actualizarActivos() {
    this.isLoading = true;
    const resp = await this.dbFirebase.actualizarMultiple(
      this.choferesMock,
      "choferes",
    );
    if (resp) {
      this.isLoading = false;
      this.mensajesError(resp.mensaje);
    }
  }

  mensajesError(msj: string) {
    Swal.fire({
      icon: "error",
      //title: "Oops...",
      text: `${msj}`,
      //footer: `${msj}`
    });
  }
```
REEMPLAZAR:
```
    }
  }
```

6.2 `src/app/raiz/choferes/choferes-listado/choferes-listado.component.ts` — fuera choferesMock. BUSCAR:
```
  choferesMock: ConIdType<Chofer>[] = [];
```
REEMPLAZAR: (borrar esas líneas, sin dejar nada)

6.3 `src/app/raiz/choferes/choferes-listado/choferes-listado.component.ts` — fuera la inyección de DbFirestoreService (solo la usaba el anonimizador). BUSCAR:
```
    private dbFirebase: DbFirestoreService,
```
REEMPLAZAR: (borrar esas líneas, sin dejar nada)

6.4 `src/app/raiz/choferes/choferes-listado/choferes-listado.component.ts` — fuera el import. BUSCAR:
```
import { DbFirestoreService } from "src/app/servicios/database/db-firestore.service";
```
REEMPLAZAR: (borrar esas líneas, sin dejar nada)

## Verificación

1. Comandos (reportá la salida):
```
grep -rn "randomDate\|editarChoferesMock\|anonimizarChoferes" src/app
grep -c "typeof f !== 'string'" src/app/shared/utils/fecha.util.ts
grep -rln "normalizarFechaNacimiento" src/app
grep -c "NormalizacionFechaNacComponent" src/app/componentes/desarrollo.module.ts
git add -N src/app/shared/utils/fecha-nacimiento.util.ts src/app/servicios/desarrollo/normalizacion-fecha-nac.service.ts src/app/componentes/normalizacion-fecha-nac
git diff --numstat
git diff -U0 | grep "^+" | grep -v "^+++" | grep -c " $"
npx tsc -p tsconfig.app.json --noEmit
```
Esperado:
- (a) nada.
- (b) 1.
- (c) 7 archivos: `choferes-alta.component.ts`, `chofer-factory.service.ts`,
  `normalizacion-fecha-nac.service.ts`, `excel.service.ts`, `chofer-migration.service.ts`,
  `ficha-chofer-datos.component.ts` y `fecha-nacimiento.util.ts` (en cualquier orden).
- (d) 2.
- (e) sin salida (marca los archivos nuevos para que entren en el numstat; no es un
  commit ni un stage del contenido).
- (f) 15 archivos:
  - `src/app/componentes/desarrollo.module.ts` `2 0`;
  - `src/app/componentes/migracion/migracion.component.html` `2 0`;
  - `src/app/componentes/normalizacion-fecha-nac/normalizacion-fecha-nac.component.html` `83 0`;
  - `src/app/componentes/normalizacion-fecha-nac/normalizacion-fecha-nac.component.ts` `66 0`;
  - `src/app/raiz/choferes/choferes-alta/choferes-alta.component.html` `5 0`;
  - `src/app/raiz/choferes/choferes-alta/choferes-alta.component.ts` `10 2`;
  - `src/app/raiz/choferes/choferes-listado/choferes-listado.component.ts` `0 85`;
  - `src/app/servicios/choferes/chofer-factory.service.ts` `10 1`;
  - `src/app/servicios/desarrollo/normalizacion-fecha-nac.service.ts` `173 0`;
  - `src/app/servicios/informes/excel/excel.service.ts` `3 2`;
  - `src/app/servicios/migracion/chofer-migration.service.ts` `4 1`;
  - `src/app/servicios/validar/validar.service.ts` `8 0`;
  - `src/app/shared/ficha-entidad/ficha-chofer-datos/ficha-chofer-datos.component.ts` `2 1`;
  - `src/app/shared/utils/fecha-nacimiento.util.ts` `80 0`;
  - `src/app/shared/utils/fecha.util.ts` `4 3`.
- (g) 0 (sin espacios finales en lo agregado).
- (h) sin errores.

2. `npm run build:demo`: las mismas 9 advertencias; main ≈ 1,10 MB; Initial total
   ≈ 1,53 MB; el chunk `componentes-desarrollo-module` ≈ 181 kB (antes ≈ 173 kB).

## Pruebas manuales en demo (las hace Nico)

Deploy a demo antes de probar. En Vantruck no se corre nada (queda en el checklist de la
migración).

1. **Antes de corregir — lectura defensiva:** abrí la ficha de un chofer que mostraba
   `[object Object]` → ahora muestra la fecha DD/MM/AAAA. El Excel de choferes
   (Choferes → Descargar) también la muestra.
2. **Herramienta, simular** (/migracion → "Fecha de nacimiento de choferes", rol dev):
   "1. Simular" muestra cuántos están bien, cuántos se convierten y cuántos hay que
   revisar, con una tabla de los que no están bien (chofer o copia en la papelera, valor
   guardado y valor nuevo). Anotá los números.
3. **Herramienta, ejecutar:** escribí `demoapplog` y "2. Ejecutar". Al terminar, "1.
   Simular" de nuevo → 0 para convertir. Los de "revisar" (si hay) se corrigen a mano
   editando el chofer.
4. **Edición:** editá un chofer (cualquier dato menos la fecha) y guardá → en la ficha la
   fecha sigue igual; en la consola de Firestore, `datosPersonales.fechaNac` es un texto
   'YYYY-MM-DD'.
5. **Alta con fecha inválida:** en el alta, el selector no deja elegir antes de 1900 ni
   después de hoy; si se escribe a mano una fecha fuera de rango, aparece "La fecha de
   nacimiento tiene que estar entre el 01/01/1900 y hoy." y no se puede guardar.
6. **Alta normal:** alta de un chofer directo y de uno de proveedor con una fecha válida →
   se guardan y la ficha la muestra bien.
7. **Papelera:** dar de baja un chofer y restaurarlo → la fecha sigue bien.
8. **Choferes → Listado:** sigue funcionando igual (se borró solo código sin uso).

## Mensaje de commit

```
FI1c: fecha de nacimiento del chofer siempre 'YYYY-MM-DD'

- fecha-nacimiento.util: errorFechaNacimiento (1900–hoy) y normalizarFechaNacimiento
  (texto, Timestamp, mapa {seconds} o Date → 'YYYY-MM-DD').
- ChoferFactoryService (único punto de escritura, alta y edición): normaliza y lanza si
  la fecha no es válida; nunca guarda un objeto de fecha.
- Alta de chofer: el form de edición carga la fecha normalizada (antes re-guardaba el
  Timestamp sin tocarlo), validador de rango con mensaje y min/max en el selector.
- ChoferMigrationService: escribe la fecha normalizada.
- Ficha y Excel de choferes: muestran también lo guardado como objeto; fechaLegible ya no
  devuelve un valor que no es texto.
- /migracion: herramienta "Fecha de nacimiento de choferes" (rol dev + id del proyecto):
  simula y normaliza choferes y sus copias en la papelera.
- choferes-listado: fuera el anonimizador de prueba sin uso (guardaba fechaNac como Date).
```

FIN DE LA INSTRUCCIÓN FI1c
````

````
Si no ves la línea FIN DE LA INSTRUCCIÓN FI1 al final, el texto llegó cortado: leé el archivo completo.

INSTRUCCIÓN FI1 — Ficha de entidad: infraestructura + ficha del chofer (ApLog, rama refactor)
=============================================================================================

## Contexto y razonamiento

Primer bloque del frente "Ficha de entidad" (diseño: `claude/diseno-ficha-entidad.md`).
Cumple el pedido del usuario: en el tablero de Legajos, el nombre de cada chofer abre una
ventana con sus datos.

**Qué es la ficha:** una "carpeta" de SOLO LECTURA de una entidad, en un modal `xl` con
pestañas (`ngbNav`). En este bloque, solo el chofer: Datos personales, Vehículos y Legajo.
Proveedor, cliente, Tarifas, los accesos desde los listados y los botones Editar / Ver
cuenta vienen en FI2–FI6. La edición sigue en el modal de alta de cada entidad.

**Piezas nuevas:**
- `FichaEntidadService.abrir(tipo, id)` (`servicios/ficha-entidad/`): punto de entrada
  único, como `VisualizadorObjetoService`. Importa SOLO el componente de Shared, nunca un
  componente de un módulo de feature: eso lo arrastraría al chunk común de todos los que
  usan la ficha.
- `FichaEntidadComponent` (`shared/ficha-entidad/`): encabezado fijo (nombre, CUIT,
  condición fiscal, badges de contratación, "Oculto en listados" y estado del legajo) y
  las pestañas. Contrato tipado `@Input() tipo` / `@Input() id` (no `fromParent`), que el
  servicio setea antes del primer ciclo de detección. `TipoFicha` = `EntidadTipo`, así
  que FI2/FI3 son aditivos; hoy `proveedor` y `cliente` muestran "todavía no disponible".
- Pestañas de solo presentación (`@Input`, sin forms ni servicios de datos):
  `FichaChoferDatosComponent`, `FichaVehiculosComponent` (reutilizable para el proveedor)
  y `FichaLegajoComponent`.
- `ficha-entidad.util.ts` (puro): `cuitLegible`, `direccionLegible`, etiquetas y clases de
  badge por estado del legajo, y `renglonesLegajo`.
- Los 4 componentes van declarados en `SharedModule`, sin exportar: la ficha se abre por
  servicio y las pestañas solo las usa el contenedor.

**Datos:** todo sale de memoria (`HomeComponent` ya inicia Chofer, Proveedor, Legajo y
CategoriaDocumentacion): cero lecturas nuevas a Firestore. Los datos son VIVOS
(`combineLatest` de `choferes$`, `vehiculos$`, `proveedores$`, `legajos$` y
`categorias$`): si alguien edita el chofer o carga un documento mientras la ficha está
abierta, se actualiza; si el chofer se da de baja, lo avisa. Las emisiones pueden llegar
fuera de la zona de Angular (el aviso "Firebase API called outside injection context",
ver `claude/pendiente-spinner.md`), por eso el componente reingresa con `NgZone.run`.

**Pestañas del chofer:**
- **Datos personales:** apellido y nombre, CUIT, fecha de nacimiento, condición fiscal,
  email, celular, contacto de emergencia (nombre · celular) y domicilio en una línea.
- **Vehículos:** dominio, marca y modelo, categoría, combustible, tarjeta, publicidad,
  refrigeración y seguimiento satelital. Chofer directo: sus vehículos. Chofer de
  proveedor: "Vehículos del proveedor X" (más los propios, si tuviera alguno).
- **Legajo:** estado general + un renglón por documento (título, vencimiento, estado y
  "Ver (n)", que abre el `CarruselComponent` de Shared) + las categorías activas sin
  cargar, como "Falta cargar". Orden del catálogo; un documento de una categoría que ya no
  está activa va al final. El historial de reemplazos y el ZIP siguen en Legajos →
  Consultar.

**F10 — `fechaNac`:** `Chofer.datosPersonales.fechaNac` estaba tipado `Date`, pero se
guarda el string 'YYYY-MM-DD' del input de fecha (deuda D6). Pasa a `string` en
`DatosPersonales` y en `ChoferFormData`. Revisé todos los usos (16 líneas, PASO 0):
- el form de alta, el factory y la migración no cambian (ya manejaban el string);
- el único que lo trataba como fecha es `ExcelService.formatearFecha` (Excel de
  choferes), que con `new Date` mostraba la fecha un día antes. Pasa a `fechaLegible`:
  se corrige el bug de D6 como efecto del cambio de tipo;
- `choferes-listado` (`anonimizarChoferes`, código de prueba sin uso) y
  `objeto-papelera` (sin tipo) no se tocan.

**Tablero de Legajos:** el nombre del chofer pasa a ser un enlace (`role="link"`,
teclado con Enter) con el mismo estilo que `.enlace-entidad` de Finanzas: sin el azul ni
el subrayado de un link, subrayado al pasar el mouse.

**Verificación previa (sobre una copia del repo, aplicando esta instrucción con un
script):** cada BUSCAR encontrado una sola vez; `tsc` limpio (también con
`--noUnusedLocals` sobre los archivos tocados); `build:demo` limpio con las mismas 9
advertencias. La ficha queda en el chunk de Legajos (149,55 → 165,30 kB). El inicial pasa
de 1,53 a 1,54 MB: `ngbNav` se agrega a `main` porque ng-bootstrap ya vive ahí
(`AppModule` importa `NgbModule`). Prueba en Node de `cuitLegible`, `direccionLegible` y
`renglonesLegajo` (9 casos): todo OK.

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

## PASO 0 — Verificación (sin modificar nada)

```
grep -rn "fechaNac" src/app --include=*.ts --include=*.html
grep -rn "ficha-entidad\|FichaEntidad" src
grep -n "getChofer(legajo.idChofer)\|public usuarioSesion: UsuarioSesionService,\|abrirGestionCategorias(): void {\|^import { GestionCategoriasDocumentacionComponent" src/app/raiz/legajos/tablero-legajos/tablero-legajos.component.ts src/app/raiz/legajos/tablero-legajos/tablero-legajos.component.html
grep -n "AcortarNombreArchivoPipe" src/app/shared/shared.module.ts
grep -n "formatearFecha\|shared/utils/fecha.util\|new Date(fecha)" src/app/servicios/informes/excel/excel.service.ts
grep -n "z-index: 1030;" src/app/raiz/legajos/tablero-legajos/tablero-legajos.component.scss
wc -l src/app/interfaces/chofer.ts src/app/servicios/choferes/chofer-factory.service.ts src/app/servicios/informes/excel/excel.service.ts src/app/shared/shared.module.ts src/app/raiz/legajos/tablero-legajos/tablero-legajos.component.ts src/app/raiz/legajos/tablero-legajos/tablero-legajos.component.html src/app/raiz/legajos/tablero-legajos/tablero-legajos.component.scss
```
Esperado:
1. 16 líneas:
   - `objeto-papelera.component.html:362`;
   - `chofer-factory.service.ts:13` (`fechaNac: Date;`) y `:71`;
   - `excel.service.ts:777`;
   - `chofer-migration.service.ts:68`;
   - `validar.service.ts:101`;
   - `interfaces/chofer.ts:23` (`fechaNac: Date;`);
   - `choferes-alta.component.ts:97, 244, 339`;
   - `choferes-alta.component.html:82, 88, 89, 90, 95`;
   - `choferes-listado.component.ts:297`.
2. Nada.
3. `tablero-legajos.component.ts:14, 45, 137` y `tablero-legajos.component.html:40`.
4. 53, 98 y 146.
5. 14 (`import { anioDe, hoyNegocio } …`), 777, 845 y 847.
6. 156.
7. 60, 79, 889, 149, 163, 94 y 157.

Si algo no coincide, detenete y reportá.

## PASO 1 — Archivos NUEVOS (11)

1.1 NUEVO `src/app/shared/ficha-entidad/ficha-entidad.util.ts`
```
import { Direccion } from 'src/app/interfaces/chofer';
import { CategoriaDocumentacion, Documentacion, EstadoDocumentacion } from 'src/app/interfaces/legajo';
import { EntidadTipo } from 'src/app/interfaces/tarifa';

/** Entidades que tienen ficha. Mismo universo que EntidadTipo (Tarifas). */
export type TipoFicha = EntidadTipo;

/** CUIT de 11 dígitos → 'XX-XXXXXXXX-X'. Otro largo se muestra tal cual;
 *  vacío o nulo → '—'. */
export function cuitLegible(cuit: number | string | null | undefined): string {
  const digitos = String(cuit ?? '').replace(/\D/g, '');
  if (digitos.length !== 11) return digitos || '—';
  return `${digitos.slice(0, 2)}-${digitos.slice(2, 10)}-${digitos.slice(10)}`;
}

/** Dirección en una línea: domicilio, localidad, municipio, provincia
 *  (sin vacíos ni repetidos — localidad y municipio suelen coincidir). */
export function direccionLegible(d: Direccion | null | undefined): string {
  if (!d) return '—';
  const partes = [d.domicilio, d.localidad, d.municipio, d.provincia]
    .map(p => (p ?? '').trim())
    .filter(p => p !== '');
  return partes.length ? [...new Set(partes)].join(', ') : '—';
}

/** Estado de un renglón del legajo en la ficha: el de la documentación,
 *  'vacio' (legajo sin documentos) o 'faltante' (categoría activa sin cargar). */
export type EstadoRenglonLegajo = EstadoDocumentacion | 'vacio' | 'faltante';

export const ETIQUETA_ESTADO_LEGAJO: Readonly<Record<EstadoRenglonLegajo, string>> = {
  enFecha: 'En fecha',
  porVencer: 'Por vencer',
  vencido: 'Vencido',
  sinVto: 'Sin vencimiento',
  vacio: 'Sin documentación',
  faltante: 'Falta cargar',
};

/** Clases de badge de Bootstrap por estado. */
export const CLASE_ESTADO_LEGAJO: Readonly<Record<EstadoRenglonLegajo, string>> = {
  enFecha: 'bg-success',
  porVencer: 'bg-warning text-dark',
  vencido: 'bg-danger',
  sinVto: 'bg-info text-dark',
  vacio: 'bg-secondary',
  faltante: 'bg-light text-dark border',
};

export interface RenglonLegajo {
  idCategoria: string;
  titulo: string;
  /** null = categoría activa sin documento cargado. */
  documento: Documentacion | null;
}

/** Renglones de la pestaña Legajo: los documentos cargados (aunque su
 *  categoría ya no esté activa) más las categorías activas sin documento.
 *  Orden: el del catálogo (`orden`); lo que no está en las activas, al final
 *  y por título. */
export function renglonesLegajo(
  documentacion: Documentacion[],
  categoriasActivas: CategoriaDocumentacion[],
): RenglonLegajo[] {
  const orden = new Map(categoriasActivas.map(c => [c.idCategoria, c.orden]));
  const cargados: RenglonLegajo[] = documentacion.map(d => ({
    idCategoria: d.idCategoria,
    titulo: d.titulo,
    documento: d,
  }));
  const faltantes: RenglonLegajo[] = categoriasActivas
    .filter(c => !documentacion.some(d => d.idCategoria === c.idCategoria))
    .map(c => ({ idCategoria: c.idCategoria, titulo: c.nombre, documento: null }));
  const posicion = (r: RenglonLegajo) => orden.get(r.idCategoria) ?? Number.MAX_SAFE_INTEGER;
  return [...cargados, ...faltantes].sort(
    (a, b) => posicion(a) - posicion(b) || a.titulo.localeCompare(b.titulo),
  );
}
```

1.2 NUEVO `src/app/shared/ficha-entidad/ficha-entidad.component.ts`
```
import { Component, Input, NgZone, OnDestroy, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, combineLatest, takeUntil } from 'rxjs';
import { Chofer, Vehiculo } from 'src/app/interfaces/chofer';
import { ConIdType } from 'src/app/interfaces/conId';
import { CategoriaDocumentacion, EstadoDocumentacion, Legajo, estadoGeneralDeLegajo } from 'src/app/interfaces/legajo';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { CategoriaDocumentacionService } from 'src/app/servicios/categoria-documentacion/categoria-documentacion.service';
import { ChoferService } from 'src/app/servicios/choferes/chofer.service';
import { LegajoService } from 'src/app/servicios/legajos/legajo.service';
import { ProveedorService } from 'src/app/servicios/proveedores/proveedor.service';
import {
  CLASE_ESTADO_LEGAJO, ETIQUETA_ESTADO_LEGAJO, TipoFicha, cuitLegible,
} from './ficha-entidad.util';

/**
 * Ficha de entidad: carpeta de SOLO LECTURA con los datos administrativos de
 * un chofer (FI1; proveedor y cliente en bloques siguientes). Se abre con
 * FichaEntidadService.abrir(tipo, id), que setea `tipo` e `id` antes del
 * primer ciclo de detección.
 *
 * Datos VIVOS: se suscribe a los observables de los servicios (ya cargados
 * desde HomeComponent, sin lecturas nuevas a Firestore). Si la entidad se
 * edita en otra pestaña, la ficha se actualiza; si se da de baja, lo avisa.
 * Las emisiones pueden llegar fuera de la zona de Angular (aviso "Firebase
 * API called outside injection context"): se reingresa con NgZone.run para
 * que la vista se refresque.
 */
@Component({
  selector: 'app-ficha-entidad',
  standalone: false,
  templateUrl: './ficha-entidad.component.html',
  styleUrl: './ficha-entidad.component.scss',
})
export class FichaEntidadComponent implements OnInit, OnDestroy {

  @Input() tipo!: TipoFicha;
  @Input() id!: string;

  pestana = 'datos';
  /** false hasta la primera emisión de datos (evita mostrar "no existe" de entrada). */
  cargado = false;

  chofer: ConIdType<Chofer> | null = null;
  proveedor: ConIdType<Proveedor> | null = null;
  /** Vehículos asignados al chofer (directo; de un chofer de proveedor, si tuviera). */
  vehiculosPropios: ConIdType<Vehiculo>[] = [];
  /** Chofer de proveedor: los vehículos del proveedor. */
  vehiculosProveedor: ConIdType<Vehiculo>[] = [];
  legajo: ConIdType<Legajo> | null = null;
  categoriasActivas: ConIdType<CategoriaDocumentacion>[] = [];
  estadoLegajo: EstadoDocumentacion | 'vacio' | null = null;

  readonly etiquetaEstado = ETIQUETA_ESTADO_LEGAJO;
  readonly claseEstado = CLASE_ESTADO_LEGAJO;
  readonly cuitLegible = cuitLegible;

  private destroy$ = new Subject<void>();

  constructor(
    public activeModal: NgbActiveModal,
    private choferService: ChoferService,
    private proveedorService: ProveedorService,
    private legajoService: LegajoService,
    private categoriaDocumentacionService: CategoriaDocumentacionService,
    private zone: NgZone,
  ) {}

  ngOnInit(): void {
    if (this.tipo === 'chofer') {
      this.observarChofer();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get esChoferDeProveedor(): boolean {
    return this.chofer?.contratacion.tipo === 'proveedor';
  }

  get cantidadVehiculos(): number {
    return this.vehiculosPropios.length + this.vehiculosProveedor.length;
  }

  cerrar(): void {
    this.activeModal.dismiss();
  }

  private observarChofer(): void {
    combineLatest([
      this.choferService.choferes$,
      this.choferService.vehiculos$,
      this.proveedorService.proveedores$,
      this.legajoService.legajos$,
      this.categoriaDocumentacionService.categorias$,
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([choferes, vehiculos, proveedores, legajos]) =>
        this.zone.run(() => this.armarChofer(choferes, vehiculos, proveedores, legajos)),
      );
  }

  private armarChofer(
    choferes: ConIdType<Chofer>[],
    vehiculos: ConIdType<Vehiculo>[],
    proveedores: ConIdType<Proveedor>[],
    legajos: ConIdType<Legajo>[],
  ): void {
    this.cargado = true;
    const chofer = choferes.find(c => c.id === this.id) ?? null;
    this.chofer = chofer;
    if (!chofer) {
      this.proveedor = null;
      this.vehiculosPropios = [];
      this.vehiculosProveedor = [];
      this.legajo = null;
      this.estadoLegajo = null;
      return;
    }

    const contratacion = chofer.contratacion;
    const idProveedor = contratacion.tipo === 'proveedor' ? contratacion.idProveedor : null;
    const porDominio = (a: Vehiculo, b: Vehiculo) => a.dominio.localeCompare(b.dominio);

    this.proveedor = idProveedor ? proveedores.find(p => p.idProveedor === idProveedor) ?? null : null;
    this.vehiculosPropios = vehiculos
      .filter(v => v.asignadoA.tipo === 'chofer' && v.asignadoA.idChofer === chofer.id)
      .sort(porDominio);
    this.vehiculosProveedor = idProveedor
      ? vehiculos
          .filter(v => v.asignadoA.tipo === 'proveedor' && v.asignadoA.idProveedor === idProveedor)
          .sort(porDominio)
      : [];
    this.legajo = legajos.find(l => l.idChofer === chofer.id) ?? null;
    this.categoriasActivas = this.categoriaDocumentacionService.getCategoriasActivas();
    this.estadoLegajo = this.legajo ? estadoGeneralDeLegajo(this.legajo) : null;
  }
}
```

1.3 NUEVO `src/app/shared/ficha-entidad/ficha-entidad.component.html`
```
<div class="modal-header">
  <div>
    @if (chofer; as ch) {
      <h4 class="modal-title">{{ ch.datosPersonales.apellido }} {{ ch.datosPersonales.nombre }}</h4>
      <div class="text-muted">
        CUIT {{ cuitLegible(ch.datosPersonales.cuit) }}
        @if (ch.condFiscal) {
          · {{ ch.condFiscal }}
        }
      </div>
      <div class="d-flex flex-wrap gap-1 mt-1">
        @if (esChoferDeProveedor) {
          <span class="badge bg-secondary">
            Chofer de proveedor: {{ proveedor ? proveedor.razonSocial : 'proveedor dado de baja' }}
          </span>
        } @else {
          <span class="badge bg-secondary">Chofer directo</span>
        }
        @if (ch.visible === false) {
          <span class="badge bg-light text-dark border">Oculto en listados</span>
        }
        @if (estadoLegajo) {
          <span class="badge" [ngClass]="claseEstado[estadoLegajo]">Legajo: {{ etiquetaEstado[estadoLegajo] }}</span>
        }
      </div>
    } @else {
      <h4 class="modal-title">Ficha de {{ tipo }}</h4>
    }
  </div>
  <button type="button" class="btn-close" aria-label="Cerrar" (click)="cerrar()"></button>
</div>

<div class="modal-body">
  @switch (tipo) {
    @case ('chofer') {
      @if (chofer; as ch) {
        <ul ngbNav #nav="ngbNav" [(activeId)]="pestana" class="nav-tabs flex-nowrap overflow-auto">
          <li ngbNavItem="datos">
            <button type="button" ngbNavLink>Datos personales</button>
            <ng-template ngbNavContent>
              <app-ficha-chofer-datos [chofer]="ch"></app-ficha-chofer-datos>
            </ng-template>
          </li>
          <li ngbNavItem="vehiculos">
            <button type="button" ngbNavLink>
              Vehículos <span class="badge rounded-pill bg-secondary">{{ cantidadVehiculos }}</span>
            </button>
            <ng-template ngbNavContent>
              @if (!esChoferDeProveedor || vehiculosPropios.length > 0) {
                <app-ficha-vehiculos
                  [vehiculos]="vehiculosPropios"
                  mensajeVacio="El chofer no tiene vehículos asignados.">
                </app-ficha-vehiculos>
              }
              @if (esChoferDeProveedor) {
                <h6 class="mt-2">Vehículos del proveedor {{ proveedor?.razonSocial ?? '' }}</h6>
                <app-ficha-vehiculos
                  [vehiculos]="vehiculosProveedor"
                  mensajeVacio="El proveedor no tiene vehículos cargados.">
                </app-ficha-vehiculos>
              }
            </ng-template>
          </li>
          <li ngbNavItem="legajo">
            <button type="button" ngbNavLink>Legajo</button>
            <ng-template ngbNavContent>
              <app-ficha-legajo [legajo]="legajo" [categoriasActivas]="categoriasActivas"></app-ficha-legajo>
            </ng-template>
          </li>
        </ul>
        <div [ngbNavOutlet]="nav" class="mt-3"></div>
      } @else if (cargado) {
        <div class="alert alert-secondary mb-0">
          El chofer ya no existe: se dio de baja. Su información está en Ajustes → Papelera.
        </div>
      }
    }
    @default {
      <div class="alert alert-secondary mb-0">La ficha de {{ tipo }} todavía no está disponible.</div>
    }
  }
</div>

<div class="modal-footer">
  <button type="button" class="btn btn-secondary" (click)="cerrar()">Cerrar</button>
</div>
```

1.4 NUEVO `src/app/shared/ficha-entidad/ficha-entidad.component.scss`
```
:host {
  font-size: 1.3rem;
}

// Bootstrap fija estas clases en rem (relativo a la raíz del documento, no
// al :host): sin este override no escalan con el font-size de arriba.
.btn,
.nav-link {
  font-size: 1em;
}

.nav-link {
  white-space: nowrap;
}
```

1.5 NUEVO `src/app/shared/ficha-entidad/ficha-chofer-datos/ficha-chofer-datos.component.ts`
```
import { Component, Input, OnChanges } from '@angular/core';
import { Chofer } from 'src/app/interfaces/chofer';
import { fechaLegible } from 'src/app/shared/utils/fecha.util';
import { cuitLegible, direccionLegible } from '../ficha-entidad.util';

interface DatoFicha {
  etiqueta: string;
  valor: string;
}

/** Pestaña "Datos personales" de la ficha de un chofer. Solo presentación. */
@Component({
  selector: 'app-ficha-chofer-datos',
  standalone: false,
  templateUrl: './ficha-chofer-datos.component.html',
})
export class FichaChoferDatosComponent implements OnChanges {

  @Input({ required: true }) chofer!: Chofer;

  datos: DatoFicha[] = [];

  ngOnChanges(): void {
    const d = this.chofer.datosPersonales;
    const texto = (v: string | number | null | undefined) =>
      v === null || v === undefined || String(v).trim() === '' ? '—' : String(v);
    const emergencia = [d.contactoEmergencia, d.celularEmergencia]
      .map(v => (v === null || v === undefined ? '' : String(v).trim()))
      .filter(v => v !== '')
      .join(' · ');
    this.datos = [
      { etiqueta: 'Apellido y nombre', valor: `${d.apellido} ${d.nombre}` },
      { etiqueta: 'CUIT', valor: cuitLegible(d.cuit) },
      { etiqueta: 'Fecha de nacimiento', valor: fechaLegible(d.fechaNac) },
      { etiqueta: 'Condición fiscal', valor: texto(this.chofer.condFiscal) },
      { etiqueta: 'Email', valor: texto(d.email) },
      { etiqueta: 'Celular', valor: texto(d.celularContacto) },
      { etiqueta: 'Contacto de emergencia', valor: emergencia || '—' },
      { etiqueta: 'Domicilio', valor: direccionLegible(d.direccion) },
    ];
  }
}
```

1.6 NUEVO `src/app/shared/ficha-entidad/ficha-chofer-datos/ficha-chofer-datos.component.html`
```
<dl class="row mb-0">
  @for (dato of datos; track dato.etiqueta) {
    <dt class="col-sm-4 col-lg-3 text-muted fw-normal">{{ dato.etiqueta }}</dt>
    <dd class="col-sm-8 col-lg-9">{{ dato.valor }}</dd>
  }
</dl>
```

1.7 NUEVO `src/app/shared/ficha-entidad/ficha-vehiculos/ficha-vehiculos.component.ts`
```
import { Component, Input } from '@angular/core';
import { Vehiculo } from 'src/app/interfaces/chofer';

/** Tabla de vehículos de la ficha (chofer o proveedor). Solo presentación. */
@Component({
  selector: 'app-ficha-vehiculos',
  standalone: false,
  templateUrl: './ficha-vehiculos.component.html',
})
export class FichaVehiculosComponent {

  @Input() vehiculos: Vehiculo[] = [];
  @Input() mensajeVacio = 'Sin vehículos.';

  siNo(valor: boolean | null | undefined): string {
    return valor === true ? 'Sí' : valor === false ? 'No' : '—';
  }

  combustible(v: Vehiculo): string {
    return v.tipoCombustible?.length ? v.tipoCombustible.join(', ') : '—';
  }

  satelital(v: Vehiculo): string {
    if (!v.segSat) return 'No';
    return v.satelital?.trim() ? `Sí (${v.satelital.trim()})` : 'Sí';
  }
}
```

1.8 NUEVO `src/app/shared/ficha-entidad/ficha-vehiculos/ficha-vehiculos.component.html`
```
@if (vehiculos.length === 0) {
  <p class="text-muted">{{ mensajeVacio }}</p>
} @else {
  <div class="table-responsive">
    <table class="table table-sm table-striped align-middle">
      <thead>
        <tr>
          <th>Dominio</th>
          <th>Marca y modelo</th>
          <th>Categoría</th>
          <th>Combustible</th>
          <th class="text-center">Tarjeta comb.</th>
          <th class="text-center">Publicidad</th>
          <th class="text-center">Refrigeración</th>
          <th>Seguimiento satelital</th>
        </tr>
      </thead>
      <tbody>
        @for (v of vehiculos; track v.idVehiculo) {
          <tr>
            <td class="text-nowrap">{{ v.dominio }}</td>
            <td>{{ v.marca }} {{ v.modelo }}</td>
            <td>{{ v.categoria.nombre || '—' }}</td>
            <td>{{ combustible(v) }}</td>
            <td class="text-center">{{ siNo(v.tarjetaCombustible) }}</td>
            <td class="text-center">{{ siNo(v.publicidad) }}</td>
            <td class="text-center">{{ siNo(v.refrigeracion) }}</td>
            <td>{{ satelital(v) }}</td>
          </tr>
        }
      </tbody>
    </table>
  </div>
}
```

1.9 NUEVO `src/app/shared/ficha-entidad/ficha-legajo/ficha-legajo.component.ts`
```
import { Component, Input, OnChanges } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CategoriaDocumentacion, Legajo, estadoGeneralDeLegajo } from 'src/app/interfaces/legajo';
import { CarruselComponent } from 'src/app/shared/carrusel/carrusel.component';
import { fechaLegible } from 'src/app/shared/utils/fecha.util';
import {
  CLASE_ESTADO_LEGAJO, ETIQUETA_ESTADO_LEGAJO, EstadoRenglonLegajo, RenglonLegajo, renglonesLegajo,
} from '../ficha-entidad.util';

/**
 * Pestaña "Legajo" de la ficha de un chofer: documentos cargados con su
 * vencimiento y estado, más las categorías activas sin cargar. Solo lectura;
 * el historial de reemplazos y la descarga ZIP siguen en Legajos → Consultar.
 */
@Component({
  selector: 'app-ficha-legajo',
  standalone: false,
  templateUrl: './ficha-legajo.component.html',
})
export class FichaLegajoComponent implements OnChanges {

  @Input() legajo: Legajo | null = null;
  @Input() categoriasActivas: CategoriaDocumentacion[] = [];

  renglones: RenglonLegajo[] = [];
  estadoGeneral: EstadoRenglonLegajo | null = null;

  readonly etiquetaEstado = ETIQUETA_ESTADO_LEGAJO;
  readonly claseEstado = CLASE_ESTADO_LEGAJO;
  readonly fechaLegible = fechaLegible;

  constructor(private modalService: NgbModal) {}

  ngOnChanges(): void {
    this.renglones = this.legajo ? renglonesLegajo(this.legajo.documentacion, this.categoriasActivas) : [];
    this.estadoGeneral = this.legajo ? estadoGeneralDeLegajo(this.legajo) : null;
  }

  estadoDe(r: RenglonLegajo): EstadoRenglonLegajo {
    return r.documento ? r.documento.estado : 'faltante';
  }

  verArchivos(r: RenglonLegajo): void {
    const imagenes = r.documento?.imagenes ?? [];
    if (imagenes.length === 0) return;
    const modalRef = this.modalService.open(CarruselComponent, {
      windowClass: 'myCustomModalClass',
      centered: true,
      size: 'lg',
    });
    modalRef.componentInstance.fromParent = { item: imagenes };
    modalRef.result.then(() => {}, () => {});
  }
}
```

1.10 NUEVO `src/app/shared/ficha-entidad/ficha-legajo/ficha-legajo.component.html`
```
@if (!legajo) {
  <p class="text-muted">El chofer no tiene legajo.</p>
} @else {
  @if (estadoGeneral) {
    <p>
      Estado general:
      <span class="badge" [ngClass]="claseEstado[estadoGeneral]">{{ etiquetaEstado[estadoGeneral] }}</span>
    </p>
  }
  @if (renglones.length === 0) {
    <p class="text-muted">No hay documentos cargados ni categorías activas.</p>
  } @else {
    <div class="table-responsive">
      <table class="table table-sm table-striped align-middle">
        <thead>
          <tr>
            <th>Documento</th>
            <th>Vencimiento</th>
            <th>Estado</th>
            <th class="text-center">Archivos</th>
          </tr>
        </thead>
        <tbody>
          @for (r of renglones; track r.idCategoria) {
            <tr>
              <td>{{ r.titulo }}</td>
              <td class="text-nowrap">{{ fechaLegible(r.documento?.fechaVto) }}</td>
              <td>
                <span class="badge" [ngClass]="claseEstado[estadoDe(r)]">{{ etiquetaEstado[estadoDe(r)] }}</span>
              </td>
              <td class="text-center">
                @if (r.documento) {
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-primary"
                    [disabled]="r.documento.imagenes.length === 0"
                    (click)="verArchivos(r)">
                    Ver ({{ r.documento.imagenes.length }})
                  </button>
                } @else {
                  —
                }
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  }
}
```

1.11 NUEVO `src/app/servicios/ficha-entidad/ficha-entidad.service.ts`
```
import { inject, Injectable } from '@angular/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { FichaEntidadComponent } from 'src/app/shared/ficha-entidad/ficha-entidad.component';
import { TipoFicha } from 'src/app/shared/ficha-entidad/ficha-entidad.util';

/**
 * Punto de entrada único de la Ficha de entidad (carpeta de SOLO LECTURA de
 * un chofer, proveedor o cliente). Lo usan Legajos y, más adelante, los
 * listados de entidades. La edición sigue en el modal de alta de cada entidad.
 *
 * Importa solo el componente de Shared: nunca componentes declarados en
 * módulos de feature (eso los arrastraría al chunk común de todos los que
 * usan la ficha — ver VisualizadorObjetoService en CLAUDE.md).
 */
@Injectable({ providedIn: 'root' })
export class FichaEntidadService {
  private modalService = inject(NgbModal);

  abrir(tipo: TipoFicha, id: string): NgbModalRef {
    const modalRef = this.modalService.open(FichaEntidadComponent, {
      windowClass: 'myCustomModalClass',
      centered: true,
      scrollable: true,
      size: 'xl',
    });
    const ficha = modalRef.componentInstance as FichaEntidadComponent;
    ficha.tipo = tipo;
    ficha.id = id;
    modalRef.result.then(() => {}, () => {});
    return modalRef;
  }
}
```

## PASO 2 — F10: `fechaNac` como string

2.1 `src/app/interfaces/chofer.ts` — tipo de la fecha de nacimiento (F10). BUSCAR:
```
    fechaNac: Date;
```
REEMPLAZAR:
```
    fechaNac: string; // 'YYYY-MM-DD' del input de fecha (fecha de negocio, ver fecha.util)
```

2.2 `src/app/servicios/choferes/chofer-factory.service.ts` — mismo tipo en el form data. BUSCAR:
```
  fechaNac: Date;
```
REEMPLAZAR:
```
  fechaNac: string; // 'YYYY-MM-DD' del input de fecha
```

2.3 `src/app/servicios/informes/excel/excel.service.ts` — import de fechaLegible. BUSCAR:
```
import { anioDe, hoyNegocio } from "src/app/shared/utils/fecha.util";
```
REEMPLAZAR:
```
import { anioDe, fechaLegible, hoyNegocio } from "src/app/shared/utils/fecha.util";
```

2.4 `src/app/servicios/informes/excel/excel.service.ts` — Excel de choferes: fecha de nacimiento sin pasar por Date. BUSCAR:
```
  private formatearFecha(fecha: Date): string {
    if (!fecha) return "";
    const d = new Date(fecha);
    return d.toLocaleDateString("es-AR");
```
REEMPLAZAR:
```
  /** 'YYYY-MM-DD' → 'DD/MM/AAAA' sin construir un objeto fecha: antes salía
   *  un día antes (D6 del frente Lazy loading + fechas; corregido en FI1). */
  private formatearFecha(fecha: string): string {
    return fechaLegible(fecha, "");
```

## PASO 3 — src/app/shared/shared.module.ts

3.1 `src/app/shared/shared.module.ts` — imports de los componentes de la ficha. BUSCAR:
```
import { AcortarNombreArchivoPipe } from './pipes/acortar-nombre-archivo.pipe';
```
REEMPLAZAR:
```
import { AcortarNombreArchivoPipe } from './pipes/acortar-nombre-archivo.pipe';
import { FichaEntidadComponent } from './ficha-entidad/ficha-entidad.component';
import { FichaChoferDatosComponent } from './ficha-entidad/ficha-chofer-datos/ficha-chofer-datos.component';
import { FichaVehiculosComponent } from './ficha-entidad/ficha-vehiculos/ficha-vehiculos.component';
import { FichaLegajoComponent } from './ficha-entidad/ficha-legajo/ficha-legajo.component';
```

3.2 `src/app/shared/shared.module.ts` — declaraciones (no se exportan: la ficha se abre por servicio). BUSCAR:
```
    AcortarNombreArchivoPipe,

  ],
  imports: [
```
REEMPLAZAR:
```
    AcortarNombreArchivoPipe,
    FichaEntidadComponent,      // modal (FichaEntidadService.abrir), no se exporta
    FichaChoferDatosComponent,  // pestañas de la ficha, solo las usa FichaEntidadComponent
    FichaVehiculosComponent,
    FichaLegajoComponent,

  ],
  imports: [
```

## PASO 4 — Tablero de Legajos: el nombre abre la ficha

4.1 `src/app/raiz/legajos/tablero-legajos/tablero-legajos.component.ts` — import del servicio. BUSCAR:
```
import { GestionCategoriasDocumentacionComponent } from 'src/app/raiz/legajos/gestion-categorias-documentacion/gestion-categorias-documentacion.component';
```
REEMPLAZAR:
```
import { GestionCategoriasDocumentacionComponent } from 'src/app/raiz/legajos/gestion-categorias-documentacion/gestion-categorias-documentacion.component';
import { FichaEntidadService } from 'src/app/servicios/ficha-entidad/ficha-entidad.service';
```

4.2 `src/app/raiz/legajos/tablero-legajos/tablero-legajos.component.ts` — inyección. BUSCAR:
```
    public usuarioSesion: UsuarioSesionService,
```
REEMPLAZAR:
```
    public usuarioSesion: UsuarioSesionService,
    private fichaEntidad: FichaEntidadService,
```

4.3 `src/app/raiz/legajos/tablero-legajos/tablero-legajos.component.ts` — método que abre la ficha. BUSCAR:
```
  abrirGestionCategorias(): void {
```
REEMPLAZAR:
```
  /** Abre la ficha (solo lectura) del chofer del legajo. */
  abrirFicha(idChofer: string): void {
    this.fichaEntidad.abrir('chofer', idChofer);
  }

  abrirGestionCategorias(): void {
```

4.4 `src/app/raiz/legajos/tablero-legajos/tablero-legajos.component.html` — el nombre del chofer abre la ficha. BUSCAR:
```
                        <td class="">{{ getChofer(legajo.idChofer) }}</td>
```
REEMPLAZAR:
```
                        <td class="">
                          <a class="enlace-ficha" role="link" tabindex="0" title="Ver ficha del chofer"
                            (click)="abrirFicha(legajo.idChofer)" (keydown.enter)="abrirFicha(legajo.idChofer)">{{ getChofer(legajo.idChofer) }}</a>
                        </td>
```

4.5 `src/app/raiz/legajos/tablero-legajos/tablero-legajos.component.scss` — estilo del nombre clickeable (al final del archivo). BUSCAR:
```
.btn-group.dropup .dropdown-menu {
  z-index: 1030;
}
```
REEMPLAZAR:
```
.btn-group.dropup .dropdown-menu {
  z-index: 1030;
}

// Ficha de entidad (FI1): el nombre del chofer abre su ficha, sin el estilo de
// link clásico (mismo criterio que .enlace-entidad de Finanzas).
.enlace-ficha {
  color: inherit;
  text-decoration: none;
  cursor: pointer;
}

.enlace-ficha:hover {
  text-decoration: underline;
}
```

## Verificación

1. Comandos (reportá la salida):
```
grep -rn "fechaNac: Date" src/app
grep -n "new Date(fecha)" src/app/servicios/informes/excel/excel.service.ts
grep -c "Ficha" src/app/shared/shared.module.ts
git add -N src/app/shared/ficha-entidad src/app/servicios/ficha-entidad
git diff --numstat
git diff -U0 | grep "^+" | grep -v "^+++" | grep -c " $"
npx tsc -p tsconfig.app.json --noEmit
```
Esperado:
- (a) nada.
- (b) nada.
- (c) 8.
- (d) sin salida (marca los archivos nuevos para que entren en el numstat; no es un
  commit ni un stage del contenido).
- (e) 18 archivos:
  - `src/app/interfaces/chofer.ts` `1 1`;
  - `src/app/raiz/legajos/tablero-legajos/tablero-legajos.component.html` `4 1`;
  - `src/app/raiz/legajos/tablero-legajos/tablero-legajos.component.scss` `12 0`;
  - `src/app/raiz/legajos/tablero-legajos/tablero-legajos.component.ts` `7 0`;
  - `src/app/servicios/choferes/chofer-factory.service.ts` `1 1`;
  - `src/app/servicios/ficha-entidad/ficha-entidad.service.ts` `32 0`;
  - `src/app/servicios/informes/excel/excel.service.ts` `5 5`;
  - `src/app/shared/ficha-entidad/ficha-chofer-datos/ficha-chofer-datos.component.html` `6 0`;
  - `src/app/shared/ficha-entidad/ficha-chofer-datos/ficha-chofer-datos.component.ts` `42 0`;
  - `src/app/shared/ficha-entidad/ficha-entidad.component.html` `86 0`;
  - `src/app/shared/ficha-entidad/ficha-entidad.component.scss` `14 0`;
  - `src/app/shared/ficha-entidad/ficha-entidad.component.ts` `141 0`;
  - `src/app/shared/ficha-entidad/ficha-entidad.util.ts` `77 0`;
  - `src/app/shared/ficha-entidad/ficha-legajo/ficha-legajo.component.html` `50 0`;
  - `src/app/shared/ficha-entidad/ficha-legajo/ficha-legajo.component.ts` `54 0`;
  - `src/app/shared/ficha-entidad/ficha-vehiculos/ficha-vehiculos.component.html` `34 0`;
  - `src/app/shared/ficha-entidad/ficha-vehiculos/ficha-vehiculos.component.ts` `27 0`;
  - `src/app/shared/shared.module.ts` `8 0`.
- (f) 0 (sin espacios finales en lo agregado).
- (g) sin errores.

2. `npm run build:demo`: las mismas 9 advertencias; main ≈ 1,11 MB; Initial total
   ≈ 1,54 MB; el chunk `legajos-legajos-module` grande ≈ 165 kB (antes ≈ 150 kB).

## Pruebas manuales en demo (las hace Nico)

1. **Legajos → Tablero:** el nombre de cada chofer se ve igual que antes (sin azul ni
   subrayado) y se subraya al pasar el mouse. Clic → se abre la ficha. Con Tab hasta el
   nombre + Enter, también.
2. **Chofer directo:**
   - encabezado: apellido y nombre, CUIT con guiones, condición fiscal, "Chofer directo"
     y el estado del legajo con el mismo color que en el tablero;
   - Datos personales completos; la fecha de nacimiento como DD/MM/AAAA y en el día
     correcto (comparar con el alta del chofer en modo vista);
   - Vehículos: los del chofer, con categoría y datos.
3. **Chofer de proveedor:** badge "Chofer de proveedor: …"; la pestaña Vehículos muestra
   "Vehículos del proveedor …" con la lista del proveedor.
4. **Legajo:**
   - legajo con documentos vencidos / por vencer / sin vencimiento: cada uno con su
     badge; "Ver (n)" abre el carrusel encima de la ficha, y al cerrarlo la ficha sigue;
   - las categorías activas sin documento aparecen como "Falta cargar";
   - un chofer sin documentos: estado "Sin documentación" y todas las categorías como
     "Falta cargar".
5. **Datos vivos:** con la ficha abierta, en otra pestaña del navegador editá el celular
   del chofer o cargá un documento en su legajo → la ficha se actualiza sola.
6. **Oculto:** un chofer con visible = false muestra "Oculto en listados".
7. **Ancho chico** (ventana angosta o zoom 150 %): la ficha ocupa el ancho, las pestañas
   y las tablas se desplazan horizontalmente si no entran, y el modal queda por encima
   del sidebar.
8. **Rol demo y rol user:** abren la ficha igual (solo lectura).
9. **Excel de choferes** (Choferes → Descargar Choferes): la fecha de nacimiento sale en
   el día correcto (antes, un día antes).
10. **Alta y edición de un chofer:** siguen funcionando igual (fecha de nacimiento
    incluida).

## Mensaje de commit

```
FI1: ficha de entidad (chofer) desde el tablero de Legajos

- FichaEntidadService.abrir(tipo, id) + FichaEntidadComponent (shared): modal xl de
  solo lectura con pestañas, encabezado fijo y datos vivos (servicios en memoria, sin
  lecturas nuevas; NgZone.run para emisiones fuera de la zona).
- Pestañas del chofer: Datos personales, Vehículos (los del proveedor si es de
  proveedor) y Legajo (estado, documentos con carrusel, categorías sin cargar).
- ficha-entidad.util: cuitLegible, direccionLegible, estados del legajo,
  renglonesLegajo.
- Tablero de Legajos: el nombre del chofer abre la ficha.
- F10: Chofer.datosPersonales.fechaNac y ChoferFormData.fechaNac pasan a string
  ('YYYY-MM-DD'); el Excel de choferes la formatea con fechaLegible (antes salía un día
  antes, D6).
```

FIN DE LA INSTRUCCIÓN FI1
````

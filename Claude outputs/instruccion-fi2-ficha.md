````
Si no ves la línea FIN DE LA INSTRUCCIÓN FI2 al final, el texto llegó cortado: leé el archivo completo.

INSTRUCCIÓN FI2 — Ficha de entidad: proveedor + navegación entre fichas (ApLog, rama refactor)
=============================================================================================

## Contexto y razonamiento

Segundo bloque del frente "Ficha de entidad" (diseño: `claude/diseno-ficha-entidad.md`, plan
revisado §9). Suma la ficha del PROVEEDOR y la navegación chofer ↔ proveedor dentro del mismo
modal. Todavía no hay accesos nuevos desde los listados (FI5): en este bloque, a la ficha del
proveedor se llega desde la ficha de uno de sus choferes (tablero de Legajos).

**Ficha del proveedor** (pestañas, todas de solo presentación):
- **Datos de la empresa** (`FichaEmpresaDatosComponent`, nuevo): razón social, CUIT, condición
  fiscal, dirección fiscal y operativa. Recibe `EmpresaFicha` (los 5 campos que comparten
  `Proveedor` y `Cliente`): el cliente la reutiliza en FI3.
- **Contactos** (`FichaContactosComponent`, nuevo, también para FI3): puesto, apellido y
  nombre, teléfono y email.
- **Choferes** (`FichaChoferesComponent`, nuevo): los choferes del proveedor por apellido, con
  CUIT, celular, "Oculto" si corresponde y el estado del legajo (mismos badges que el
  encabezado del chofer). El nombre abre la ficha del chofer, con el mismo estilo de enlace que
  el tablero de Legajos (sin azul ni subrayado; subrayado al pasar el mouse; Enter con el
  teclado). La pestaña emite el id (`@Output() abrir`); la navegación la hace el contenedor.
- **Vehículos**: `FichaVehiculosComponent` de FI1, con los vehículos del proveedor.
- **Encabezado**: razón social, CUIT · condición fiscal, badge "Proveedor" y "Oculto en
  listados" si `visible === false`.

**Chofer de proveedor:** su ficha suma la pestaña **Proveedor** (razón social, CUIT, condición
fiscal y contacto principal = el primero de la lista, en una línea) con el botón "Abrir ficha
del proveedor". Si el proveedor se dio de baja, lo avisa. El chofer directo no tiene esta
pestaña.

**Navegación (decisión de §3.4):** todo dentro del MISMO modal; no se abre otro encima
(NgbModal apilado se ve mal y duplica el fondo). `FichaEntidadComponent` guarda una pila
(`anteriores`) con tipo, id, nombre y pestaña de cada ficha visitada:
- `abrirFicha(tipo, id)`: apila la actual y muestra la nueva en "Datos";
- "← Volver a <nombre>" (arriba del título, solo si hay anteriores): vuelve a la ficha
  anterior EN LA PESTAÑA en la que estaba (ej.: proveedor → chofer → Volver deja la pestaña
  Choferes del proveedor abierta).
Cerrar (X, botón, Esc o fondo) cierra todo el modal.

**Cambio interno del contenedor:** en FI1 la suscripción era solo del chofer. Ahora hay UNA
suscripción a los 5 observables (choferes, vehículos, proveedores, legajos, categorías) que
guarda la última emisión y arma la ficha del tipo actual; al navegar se rearma con esos datos,
sin volver a suscribirse. Siguen siendo datos vivos y sin lecturas nuevas a Firestore: si el
proveedor se edita en otra pestaña, la ficha se actualiza; si se da de baja, lo avisa (igual
que el chofer). FI3 (cliente) solo suma `clientes$` a esa suscripción.

`ficha-entidad.component.ts` y `.html` se REEMPLAZAN completos (cambian casi todas las
líneas: header por tipo, pila, pestañas del proveedor). El PASO 0 verifica con
`git hash-object` que estén exactamente como quedaron en FI1b/FI1c. `ficha-entidad.util.ts`
suma `nombreChofer`, `contactoLegible`, `FilaChoferFicha` y `filasChoferesDeProveedor`
(puros).

Sin escrituras, sin permisos nuevos (ver la ficha = leer entidades y legajos, que tienen
todos los roles que usan Legajos).

**Verificación previa (sobre una copia del repo en el commit de FI1c, aplicando esta
instrucción con un script):**
- cada BUSCAR encontrado una sola vez; el resultado coincide byte a byte con la referencia;
- `tsc` limpio (también `--noUnusedLocals` en lo tocado);
- pruebas de render con Karma + Chromium (4 casos):
  - ficha del proveedor: encabezado, 4 pestañas con sus contadores, direcciones, contactos,
    choferes ordenados (con acento: Álvarez antes que Pérez), solo los del proveedor, "Oculto"
    y estado del legajo, vehículos;
  - navegación chofer (pestaña Proveedor) → proveedor → otro chofer → Volver → Volver,
    con la pestaña correcta en cada vuelta y sin "Volver" al final;
  - chofer directo sin pestaña Proveedor; chofer cuyo proveedor se da de baja;
  - datos vivos en la ficha del proveedor (un chofer menos) y baja del proveedor;
- `build:demo` con las mismas 9 advertencias; inicial 1,53 MB (sin cambio); chunk de
  Legajos 165,6 → 177,5 kB.

## Reglas

- Hacé SOLO lo indicado. NO deploy. NO commit.
- NO corras `npm run deploy:*`, `npm run build` ni `node set-version.js`. Para compilar
  usá `npm run build:demo`.
- Aplicá los pasos EN ORDEN.
- Si un texto a BUSCAR no está o aparece más de una vez: detenete y reportá. Los BUSCAR
  son líneas completas.
- Editá cada archivo en el lugar (leer, reemplazar, escribir); nunca abras un archivo
  para escritura antes de haber leído su contenido. Los archivos de REEMPLAZO COMPLETO se
  escriben con el contenido dado, solo si el PASO 0 confirmó su hash.
- Archivos NUEVOS: crealos exactamente con el contenido dado. Finales de línea LF.
- No toques CLAUDE.md ni CHANGELOG.md (se actualizan al cierre del frente).
- Conviene validar todos los BUSCAR antes de escribir el primero.

## PASO 0 — Verificación (sin modificar nada)

```
git status --short
git log --oneline -1
git hash-object src/app/shared/ficha-entidad/ficha-entidad.component.ts src/app/shared/ficha-entidad/ficha-entidad.component.html
grep -n "^import { Direccion }\|^import { CategoriaDocumentacion, Documentacion\|a.titulo.localeCompare(b.titulo)," src/app/shared/ficha-entidad/ficha-entidad.util.ts
grep -n "FichaLegajoComponent" src/app/shared/shared.module.ts
grep -rln "ficha-empresa-datos\|ficha-contactos\|ficha-choferes\|FichaChoferes\|filasChoferesDeProveedor" src
wc -l src/app/shared/ficha-entidad/ficha-entidad.util.ts src/app/shared/shared.module.ts src/app/shared/ficha-entidad/ficha-entidad.component.ts src/app/shared/ficha-entidad/ficha-entidad.component.html
```
Esperado:
1. Nada (FI1c ya commiteado; si aparece algo de `Claude outputs/`, no importa).
2. El commit de FI1c.
3. Exactamente:
   - `2d2b45e21b99e3c04431499f8de6a71c8d222fd0` (el `.ts`);
   - `e9efbc1fab31d2bbf45fc0cfaf192b8bf2b9390b` (el `.html`).
   Si no coincide, NO sigas: esos dos archivos se reemplazan completos y un cambio que no
   está en la referencia se perdería. Reportá el `git diff` de FI1c a hoy de esos archivos.
4. 1, 2 y 75.
5. 57 y 106.
6. Nada.
7. 77, 157, 141 y 95.

Si algo no coincide, detenete y reportá.

## PASO 1 — Archivos NUEVOS (7)

1.1 NUEVO `src/app/shared/ficha-entidad/ficha-empresa-datos/ficha-empresa-datos.component.ts`
```
import { Component, Input, OnChanges } from '@angular/core';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { cuitLegible, direccionLegible } from '../ficha-entidad.util';

/** Datos de empresa que comparten Proveedor y Cliente (el cliente usa la
 *  misma pestaña en FI3). */
export type EmpresaFicha = Pick<Proveedor, 'razonSocial' | 'cuit' | 'condFiscal' | 'direccionFiscal' | 'direccionOperativa'>;

interface DatoFicha {
  etiqueta: string;
  valor: string;
}

/** Pestaña "Datos de la empresa" de la ficha (proveedor; cliente en FI3). Solo presentación. */
@Component({
  selector: 'app-ficha-empresa-datos',
  standalone: false,
  templateUrl: './ficha-empresa-datos.component.html',
})
export class FichaEmpresaDatosComponent implements OnChanges {

  @Input({ required: true }) empresa!: EmpresaFicha;

  datos: DatoFicha[] = [];

  ngOnChanges(): void {
    const e = this.empresa;
    const texto = (v: string | null | undefined) => (v ?? '').trim() || '—';
    this.datos = [
      { etiqueta: 'Razón social', valor: texto(e.razonSocial) },
      { etiqueta: 'CUIT', valor: cuitLegible(e.cuit) },
      { etiqueta: 'Condición fiscal', valor: texto(e.condFiscal) },
      { etiqueta: 'Dirección fiscal', valor: direccionLegible(e.direccionFiscal) },
      { etiqueta: 'Dirección operativa', valor: direccionLegible(e.direccionOperativa) },
    ];
  }
}
```

1.2 NUEVO `src/app/shared/ficha-entidad/ficha-empresa-datos/ficha-empresa-datos.component.html`
```
<dl class="row mb-0">
  @for (dato of datos; track dato.etiqueta) {
    <dt class="col-sm-4 col-lg-3 text-muted fw-normal">{{ dato.etiqueta }}</dt>
    <dd class="col-sm-8 col-lg-9">{{ dato.valor }}</dd>
  }
</dl>
```

1.3 NUEVO `src/app/shared/ficha-entidad/ficha-contactos/ficha-contactos.component.ts`
```
import { Component, Input } from '@angular/core';
import { Contacto } from 'src/app/interfaces/proveedor';

/** Pestaña "Contactos" de la ficha (proveedor; cliente en FI3). Solo presentación. */
@Component({
  selector: 'app-ficha-contactos',
  standalone: false,
  templateUrl: './ficha-contactos.component.html',
})
export class FichaContactosComponent {

  @Input() contactos: Contacto[] = [];

  texto(v: string | number | null | undefined): string {
    const t = String(v ?? '').trim();
    return t || '—';
  }

  nombre(c: Contacto): string {
    return [c.apellido, c.nombre].map(p => String(p ?? '').trim()).filter(p => p !== '').join(' ') || '—';
  }
}
```

1.4 NUEVO `src/app/shared/ficha-entidad/ficha-contactos/ficha-contactos.component.html`
```
@if (contactos.length === 0) {
  <p class="text-muted">No hay contactos cargados.</p>
} @else {
  <div class="table-responsive">
    <table class="table table-sm table-striped align-middle">
      <thead>
        <tr>
          <th>Puesto</th>
          <th>Apellido y nombre</th>
          <th>Teléfono</th>
          <th>Email</th>
        </tr>
      </thead>
      <tbody>
        @for (c of contactos; track $index) {
          <tr>
            <td>{{ texto(c.puesto) }}</td>
            <td>{{ nombre(c) }}</td>
            <td class="text-nowrap">{{ texto(c.telefono) }}</td>
            <td>{{ texto(c.email) }}</td>
          </tr>
        }
      </tbody>
    </table>
  </div>
}
```

1.5 NUEVO `src/app/shared/ficha-entidad/ficha-choferes/ficha-choferes.component.ts`
```
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CLASE_ESTADO_LEGAJO, ETIQUETA_ESTADO_LEGAJO, FilaChoferFicha } from '../ficha-entidad.util';

/** Pestaña "Choferes" de la ficha de un proveedor: el nombre de cada chofer
 *  abre su ficha (en el mismo modal, ver FichaEntidadComponent.abrirFicha).
 *  Solo presentación. */
@Component({
  selector: 'app-ficha-choferes',
  standalone: false,
  templateUrl: './ficha-choferes.component.html',
  styleUrl: './ficha-choferes.component.scss',
})
export class FichaChoferesComponent {

  @Input() choferes: FilaChoferFicha[] = [];
  /** id del chofer elegido. */
  @Output() abrir = new EventEmitter<string>();

  readonly etiquetaEstado = ETIQUETA_ESTADO_LEGAJO;
  readonly claseEstado = CLASE_ESTADO_LEGAJO;
}
```

1.6 NUEVO `src/app/shared/ficha-entidad/ficha-choferes/ficha-choferes.component.html`
```
@if (choferes.length === 0) {
  <p class="text-muted">El proveedor no tiene choferes cargados.</p>
} @else {
  <div class="table-responsive">
    <table class="table table-sm table-striped align-middle">
      <thead>
        <tr>
          <th>Chofer</th>
          <th>CUIT</th>
          <th>Celular</th>
          <th>Legajo</th>
        </tr>
      </thead>
      <tbody>
        @for (c of choferes; track c.id) {
          <tr>
            <td>
              <a class="enlace-ficha" role="link" tabindex="0" title="Ver ficha del chofer"
                (click)="abrir.emit(c.id)" (keydown.enter)="abrir.emit(c.id)">{{ c.nombre }}</a>
              @if (!c.visible) {
                <span class="badge bg-light text-dark border ms-1">Oculto</span>
              }
            </td>
            <td class="text-nowrap">{{ c.cuit }}</td>
            <td class="text-nowrap">{{ c.celular }}</td>
            <td>
              @if (c.estadoLegajo) {
                <span class="badge" [ngClass]="claseEstado[c.estadoLegajo]">{{ etiquetaEstado[c.estadoLegajo] }}</span>
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
```

1.7 NUEVO `src/app/shared/ficha-entidad/ficha-choferes/ficha-choferes.component.scss`
```
// El nombre se ve como el resto del texto y se subraya al pasar el mouse, como
// en el tablero de Legajos (mismo criterio que .enlace-entidad de Finanzas).
.enlace-ficha {
  color: inherit;
  text-decoration: none;
  cursor: pointer;
}

.enlace-ficha:hover {
  text-decoration: underline;
}
```

## PASO 2 — REEMPLAZO COMPLETO (solo si el PASO 0 confirmó el hash)

2.1 REEMPLAZO COMPLETO `src/app/shared/ficha-entidad/ficha-entidad.component.ts` (todo el contenido del archivo pasa a ser este)
```
import { Component, Input, NgZone, OnDestroy, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, combineLatest, takeUntil } from 'rxjs';
import { Chofer, Vehiculo } from 'src/app/interfaces/chofer';
import { ConIdType } from 'src/app/interfaces/conId';
import { CategoriaDocumentacion, EstadoDocumentacion, Legajo, estadoGeneralDeLegajo } from 'src/app/interfaces/legajo';
import { Contacto, Proveedor } from 'src/app/interfaces/proveedor';
import { CategoriaDocumentacionService } from 'src/app/servicios/categoria-documentacion/categoria-documentacion.service';
import { ChoferService } from 'src/app/servicios/choferes/chofer.service';
import { LegajoService } from 'src/app/servicios/legajos/legajo.service';
import { ProveedorService } from 'src/app/servicios/proveedores/proveedor.service';
import {
  CLASE_ESTADO_LEGAJO, ETIQUETA_ESTADO_LEGAJO, FilaChoferFicha, TipoFicha, contactoLegible, cuitLegible,
  filasChoferesDeProveedor, nombreChofer,
} from './ficha-entidad.util';

/** Una ficha anterior en la navegación dentro del modal (FI2). */
interface FichaAnterior {
  tipo: TipoFicha;
  id: string;
  /** Texto del botón "← Volver a …". */
  titulo: string;
  /** Pestaña en la que estaba, para volver a ella. */
  pestana: string;
}

type DatosFicha = [
  ConIdType<Chofer>[],
  ConIdType<Vehiculo>[],
  ConIdType<Proveedor>[],
  ConIdType<Legajo>[],
];

/**
 * Ficha de entidad: carpeta de SOLO LECTURA con los datos administrativos de
 * un chofer o un proveedor (el cliente viene en FI3). Se abre con
 * FichaEntidadService.abrir(tipo, id), que setea `tipo` e `id` antes del
 * primer ciclo de detección.
 *
 * Datos VIVOS: se suscribe a los observables de los servicios (ya cargados
 * desde HomeComponent, sin lecturas nuevas a Firestore). Si la entidad se
 * edita en otra pestaña, la ficha se actualiza; si se da de baja, lo avisa.
 * Las emisiones pueden llegar fuera de la zona de Angular (aviso "Firebase
 * API called outside injection context"): se reingresa con NgZone.run para
 * que la vista se refresque.
 *
 * Navegación (FI2): de un chofer a su proveedor y de un proveedor a sus
 * choferes, dentro del MISMO modal (no se abre otro encima). `anteriores` es
 * la pila de fichas visitadas; "← Volver" retoma la anterior en la pestaña
 * en la que estaba. Una sola suscripción para todos los tipos: al navegar se
 * rearma con la última emisión guardada.
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
  anteriores: FichaAnterior[] = [];

  // Chofer
  chofer: ConIdType<Chofer> | null = null;
  /** Vehículos asignados al chofer (directo; de un chofer de proveedor, si tuviera). */
  vehiculosPropios: ConIdType<Vehiculo>[] = [];
  legajo: ConIdType<Legajo> | null = null;
  categoriasActivas: ConIdType<CategoriaDocumentacion>[] = [];
  estadoLegajo: EstadoDocumentacion | 'vacio' | null = null;

  /** Ficha de proveedor: el proveedor. Ficha de chofer de proveedor: su proveedor (null si se dio de baja). */
  proveedor: ConIdType<Proveedor> | null = null;
  /** Vehículos del proveedor (en las dos fichas). */
  vehiculosProveedor: ConIdType<Vehiculo>[] = [];
  /** Ficha de proveedor: sus choferes. */
  choferesProveedor: FilaChoferFicha[] = [];

  readonly etiquetaEstado = ETIQUETA_ESTADO_LEGAJO;
  readonly claseEstado = CLASE_ESTADO_LEGAJO;
  readonly cuitLegible = cuitLegible;
  readonly contactoLegible = contactoLegible;

  private ultimosDatos: DatosFicha | null = null;
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
    combineLatest([
      this.choferService.choferes$,
      this.choferService.vehiculos$,
      this.proveedorService.proveedores$,
      this.legajoService.legajos$,
      this.categoriaDocumentacionService.categorias$,
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([choferes, vehiculos, proveedores, legajos]) =>
        this.zone.run(() => {
          this.ultimosDatos = [choferes, vehiculos, proveedores, legajos];
          this.armar();
        }),
      );
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

  /** Contactos del proveedor (un doc viejo puede no tener la lista). */
  get contactosProveedor(): Contacto[] {
    return this.proveedor?.contactos ?? [];
  }

  /** Contacto principal del proveedor (el primero de la lista). */
  get contactoPrincipal(): Contacto | null {
    return this.contactosProveedor[0] ?? null;
  }

  /** Nombre de la ficha actual (encabezado y botón "Volver"). */
  get titulo(): string {
    if (this.tipo === 'chofer' && this.chofer) return nombreChofer(this.chofer);
    if (this.tipo === 'proveedor' && this.proveedor) return this.proveedor.razonSocial;
    return `Ficha de ${this.tipo}`;
  }

  /** Abre otra ficha en el mismo modal y guarda la actual para volver. */
  abrirFicha(tipo: TipoFicha, id: string): void {
    if (tipo === this.tipo && id === this.id) return;
    this.anteriores.push({ tipo: this.tipo, id: this.id, titulo: this.titulo, pestana: this.pestana });
    this.mostrar(tipo, id, 'datos');
  }

  volver(): void {
    const anterior = this.anteriores.pop();
    if (anterior) this.mostrar(anterior.tipo, anterior.id, anterior.pestana);
  }

  cerrar(): void {
    this.activeModal.dismiss();
  }

  private mostrar(tipo: TipoFicha, id: string, pestana: string): void {
    this.tipo = tipo;
    this.id = id;
    this.pestana = pestana;
    this.armar();
  }

  private armar(): void {
    this.limpiar();
    if (!this.ultimosDatos) return;
    this.cargado = true;
    const [choferes, vehiculos, proveedores, legajos] = this.ultimosDatos;
    if (this.tipo === 'chofer') {
      this.armarChofer(choferes, vehiculos, proveedores, legajos);
    } else if (this.tipo === 'proveedor') {
      this.armarProveedor(choferes, vehiculos, proveedores, legajos);
    }
  }

  private limpiar(): void {
    this.chofer = null;
    this.vehiculosPropios = [];
    this.legajo = null;
    this.estadoLegajo = null;
    this.proveedor = null;
    this.vehiculosProveedor = [];
    this.choferesProveedor = [];
  }

  private armarChofer(
    choferes: ConIdType<Chofer>[],
    vehiculos: ConIdType<Vehiculo>[],
    proveedores: ConIdType<Proveedor>[],
    legajos: ConIdType<Legajo>[],
  ): void {
    const chofer = choferes.find(c => c.id === this.id) ?? null;
    this.chofer = chofer;
    if (!chofer) return;

    const contratacion = chofer.contratacion;
    const idProveedor = contratacion.tipo === 'proveedor' ? contratacion.idProveedor : null;

    this.proveedor = idProveedor ? proveedores.find(p => p.idProveedor === idProveedor) ?? null : null;
    this.vehiculosPropios = vehiculos
      .filter(v => v.asignadoA.tipo === 'chofer' && v.asignadoA.idChofer === chofer.id)
      .sort(porDominio);
    this.vehiculosProveedor = idProveedor ? vehiculosDeProveedor(vehiculos, idProveedor) : [];
    this.legajo = legajos.find(l => l.idChofer === chofer.id) ?? null;
    this.categoriasActivas = this.categoriaDocumentacionService.getCategoriasActivas();
    this.estadoLegajo = this.legajo ? estadoGeneralDeLegajo(this.legajo) : null;
  }

  private armarProveedor(
    choferes: ConIdType<Chofer>[],
    vehiculos: ConIdType<Vehiculo>[],
    proveedores: ConIdType<Proveedor>[],
    legajos: ConIdType<Legajo>[],
  ): void {
    const proveedor = proveedores.find(p => p.idProveedor === this.id) ?? null;
    this.proveedor = proveedor;
    if (!proveedor) return;
    this.choferesProveedor = filasChoferesDeProveedor(choferes, legajos, proveedor.idProveedor);
    this.vehiculosProveedor = vehiculosDeProveedor(vehiculos, proveedor.idProveedor);
  }
}

function porDominio(a: Vehiculo, b: Vehiculo): number {
  return a.dominio.localeCompare(b.dominio);
}

function vehiculosDeProveedor(vehiculos: ConIdType<Vehiculo>[], idProveedor: string): ConIdType<Vehiculo>[] {
  return vehiculos
    .filter(v => v.asignadoA.tipo === 'proveedor' && v.asignadoA.idProveedor === idProveedor)
    .sort(porDominio);
}
```

2.2 REEMPLAZO COMPLETO `src/app/shared/ficha-entidad/ficha-entidad.component.html` (todo el contenido del archivo pasa a ser este)
```
<div class="modal-header">
  <div>
    @if (anteriores.length > 0) {
      <button type="button" class="btn btn-sm btn-outline-secondary mb-2" (click)="volver()">
        ← Volver a {{ anteriores[anteriores.length - 1].titulo }}
      </button>
    }
    @if (tipo === 'chofer' && chofer) {
      <h4 class="modal-title">{{ titulo }}</h4>
      <div class="text-muted">
        CUIT {{ cuitLegible(chofer.datosPersonales.cuit) }}
        @if (chofer.condFiscal) {
          · {{ chofer.condFiscal }}
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
        @if (chofer.visible === false) {
          <span class="badge bg-light text-dark border">Oculto en listados</span>
        }
        @if (estadoLegajo) {
          <span class="badge" [ngClass]="claseEstado[estadoLegajo]">Legajo: {{ etiquetaEstado[estadoLegajo] }}</span>
        }
      </div>
    } @else if (tipo === 'proveedor' && proveedor) {
      <h4 class="modal-title">{{ titulo }}</h4>
      <div class="text-muted">
        CUIT {{ cuitLegible(proveedor.cuit) }}
        @if (proveedor.condFiscal) {
          · {{ proveedor.condFiscal }}
        }
      </div>
      <div class="d-flex flex-wrap gap-1 mt-1">
        <span class="badge bg-secondary">Proveedor</span>
        @if (proveedor.visible === false) {
          <span class="badge bg-light text-dark border">Oculto en listados</span>
        }
      </div>
    } @else {
      <h4 class="modal-title">{{ titulo }}</h4>
    }
  </div>
  <button type="button" class="btn-close" aria-label="Cerrar" (click)="cerrar()"></button>
</div>

<div class="modal-body">
  <!-- Pestañas con las clases de Bootstrap, sin ngbNav: ng-bootstrap 15 (hecho
       para Angular 16) aplica NgbNavLinkBase dos veces en button/a[ngbNavLink] y
       Angular 20 lo rechaza (NG0309). -->
  @switch (tipo) {
    @case ('chofer') {
      @if (chofer; as ch) {
        <ul class="nav nav-tabs flex-nowrap overflow-auto" role="tablist">
          <li class="nav-item" role="presentation">
            <button type="button" class="nav-link" role="tab" [class.active]="pestana === 'datos'"
              [attr.aria-selected]="pestana === 'datos'" (click)="pestana = 'datos'">Datos personales</button>
          </li>
          <li class="nav-item" role="presentation">
            <button type="button" class="nav-link" role="tab" [class.active]="pestana === 'vehiculos'"
              [attr.aria-selected]="pestana === 'vehiculos'" (click)="pestana = 'vehiculos'">
              Vehículos <span class="badge rounded-pill bg-secondary">{{ cantidadVehiculos }}</span>
            </button>
          </li>
          <li class="nav-item" role="presentation">
            <button type="button" class="nav-link" role="tab" [class.active]="pestana === 'legajo'"
              [attr.aria-selected]="pestana === 'legajo'" (click)="pestana = 'legajo'">Legajo</button>
          </li>
          @if (esChoferDeProveedor) {
            <li class="nav-item" role="presentation">
              <button type="button" class="nav-link" role="tab" [class.active]="pestana === 'proveedor'"
                [attr.aria-selected]="pestana === 'proveedor'" (click)="pestana = 'proveedor'">Proveedor</button>
            </li>
          }
        </ul>
        <div class="mt-3" role="tabpanel">
          @switch (pestana) {
            @case ('datos') {
              <app-ficha-chofer-datos [chofer]="ch"></app-ficha-chofer-datos>
            }
            @case ('vehiculos') {
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
            }
            @case ('legajo') {
              <app-ficha-legajo [legajo]="legajo" [categoriasActivas]="categoriasActivas"></app-ficha-legajo>
            }
            @case ('proveedor') {
              @if (proveedor; as prov) {
                <dl class="row">
                  <dt class="col-sm-4 col-lg-3 text-muted fw-normal">Razón social</dt>
                  <dd class="col-sm-8 col-lg-9">{{ prov.razonSocial }}</dd>
                  <dt class="col-sm-4 col-lg-3 text-muted fw-normal">CUIT</dt>
                  <dd class="col-sm-8 col-lg-9">{{ cuitLegible(prov.cuit) }}</dd>
                  <dt class="col-sm-4 col-lg-3 text-muted fw-normal">Condición fiscal</dt>
                  <dd class="col-sm-8 col-lg-9">{{ prov.condFiscal || '—' }}</dd>
                  <dt class="col-sm-4 col-lg-3 text-muted fw-normal">Contacto principal</dt>
                  <dd class="col-sm-8 col-lg-9">{{ contactoLegible(contactoPrincipal) }}</dd>
                </dl>
                <button type="button" class="btn btn-outline-primary" (click)="abrirFicha('proveedor', prov.idProveedor)">
                  Abrir ficha del proveedor
                </button>
              } @else {
                <div class="alert alert-secondary mb-0">
                  El proveedor de este chofer ya no existe: se dio de baja.
                </div>
              }
            }
          }
        </div>
      } @else if (cargado) {
        <div class="alert alert-secondary mb-0">
          El chofer ya no existe: se dio de baja. Su información está en Ajustes → Papelera.
        </div>
      }
    }
    @case ('proveedor') {
      @if (proveedor; as prov) {
        <ul class="nav nav-tabs flex-nowrap overflow-auto" role="tablist">
          <li class="nav-item" role="presentation">
            <button type="button" class="nav-link" role="tab" [class.active]="pestana === 'datos'"
              [attr.aria-selected]="pestana === 'datos'" (click)="pestana = 'datos'">Datos de la empresa</button>
          </li>
          <li class="nav-item" role="presentation">
            <button type="button" class="nav-link" role="tab" [class.active]="pestana === 'contactos'"
              [attr.aria-selected]="pestana === 'contactos'" (click)="pestana = 'contactos'">
              Contactos <span class="badge rounded-pill bg-secondary">{{ contactosProveedor.length }}</span>
            </button>
          </li>
          <li class="nav-item" role="presentation">
            <button type="button" class="nav-link" role="tab" [class.active]="pestana === 'choferes'"
              [attr.aria-selected]="pestana === 'choferes'" (click)="pestana = 'choferes'">
              Choferes <span class="badge rounded-pill bg-secondary">{{ choferesProveedor.length }}</span>
            </button>
          </li>
          <li class="nav-item" role="presentation">
            <button type="button" class="nav-link" role="tab" [class.active]="pestana === 'vehiculos'"
              [attr.aria-selected]="pestana === 'vehiculos'" (click)="pestana = 'vehiculos'">
              Vehículos <span class="badge rounded-pill bg-secondary">{{ vehiculosProveedor.length }}</span>
            </button>
          </li>
        </ul>
        <div class="mt-3" role="tabpanel">
          @switch (pestana) {
            @case ('datos') {
              <app-ficha-empresa-datos [empresa]="prov"></app-ficha-empresa-datos>
            }
            @case ('contactos') {
              <app-ficha-contactos [contactos]="contactosProveedor"></app-ficha-contactos>
            }
            @case ('choferes') {
              <app-ficha-choferes [choferes]="choferesProveedor" (abrir)="abrirFicha('chofer', $event)"></app-ficha-choferes>
            }
            @case ('vehiculos') {
              <app-ficha-vehiculos
                [vehiculos]="vehiculosProveedor"
                mensajeVacio="El proveedor no tiene vehículos cargados.">
              </app-ficha-vehiculos>
            }
          }
        </div>
      } @else if (cargado) {
        <div class="alert alert-secondary mb-0">
          El proveedor ya no existe: se dio de baja. Su información está en Ajustes → Papelera.
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

## PASO 3 — `ficha-entidad.util.ts`: helpers del proveedor

3.1 `src/app/shared/ficha-entidad/ficha-entidad.util.ts` — imports. BUSCAR:
```
import { Direccion } from 'src/app/interfaces/chofer';
import { CategoriaDocumentacion, Documentacion, EstadoDocumentacion } from 'src/app/interfaces/legajo';
```
REEMPLAZAR:
```
import { Chofer, Direccion } from 'src/app/interfaces/chofer';
import { ConIdType } from 'src/app/interfaces/conId';
import { CategoriaDocumentacion, Documentacion, EstadoDocumentacion, Legajo, estadoGeneralDeLegajo } from 'src/app/interfaces/legajo';
import { Contacto } from 'src/app/interfaces/proveedor';
```

3.2 `src/app/shared/ficha-entidad/ficha-entidad.util.ts` — helpers nuevos al final del archivo. BUSCAR:
```
    (a, b) => posicion(a) - posicion(b) || a.titulo.localeCompare(b.titulo),
  );
}
```
REEMPLAZAR:
```
    (a, b) => posicion(a) - posicion(b) || a.titulo.localeCompare(b.titulo),
  );
}

/** "Apellido Nombre" de un chofer (encabezado de la ficha, "Volver" y tablas). */
export function nombreChofer(chofer: Chofer): string {
  const d = chofer.datosPersonales;
  return `${d.apellido ?? ''} ${d.nombre ?? ''}`.trim() || '—';
}

/** Contacto en una línea: "Apellido Nombre (puesto) · teléfono · email",
 *  sin las partes vacías. */
export function contactoLegible(contacto: Contacto | null | undefined): string {
  if (!contacto) return '—';
  const texto = (v: string | number | null | undefined) => String(v ?? '').trim();
  const nombre = [texto(contacto.apellido), texto(contacto.nombre)].filter(p => p !== '').join(' ');
  const puesto = texto(contacto.puesto);
  const partes = [
    puesto ? (nombre ? `${nombre} (${puesto})` : puesto) : nombre,
    texto(contacto.telefono),
    texto(contacto.email),
  ].filter(p => p !== '');
  return partes.length ? partes.join(' · ') : '—';
}

/** Renglón de la pestaña "Choferes" de la ficha de un proveedor. */
export interface FilaChoferFicha {
  id: string;
  nombre: string;
  cuit: string;
  celular: string;
  /** Estado general del legajo; null si el chofer no tiene legajo. */
  estadoLegajo: EstadoDocumentacion | 'vacio' | null;
  /** false = oculto en los listados. */
  visible: boolean;
}

/** Choferes de un proveedor, por apellido y nombre, con el estado de su legajo. */
export function filasChoferesDeProveedor(
  choferes: ConIdType<Chofer>[],
  legajos: Legajo[],
  idProveedor: string,
): FilaChoferFicha[] {
  return choferes
    .filter(c => c.contratacion.tipo === 'proveedor' && c.contratacion.idProveedor === idProveedor)
    .map(c => {
      const legajo = legajos.find(l => l.idChofer === c.id);
      const celular = String(c.datosPersonales.celularContacto ?? '').trim();
      return {
        id: c.id,
        nombre: nombreChofer(c),
        cuit: cuitLegible(c.datosPersonales.cuit),
        celular: celular || '—',
        estadoLegajo: legajo ? estadoGeneralDeLegajo(legajo) : null,
        visible: c.visible !== false,
      };
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}
```

## PASO 4 — `shared.module.ts`: declarar las pestañas nuevas

4.1 `src/app/shared/shared.module.ts` — imports de las pestañas nuevas. BUSCAR:
```
import { FichaLegajoComponent } from './ficha-entidad/ficha-legajo/ficha-legajo.component';
```
REEMPLAZAR:
```
import { FichaLegajoComponent } from './ficha-entidad/ficha-legajo/ficha-legajo.component';
import { FichaEmpresaDatosComponent } from './ficha-entidad/ficha-empresa-datos/ficha-empresa-datos.component';
import { FichaContactosComponent } from './ficha-entidad/ficha-contactos/ficha-contactos.component';
import { FichaChoferesComponent } from './ficha-entidad/ficha-choferes/ficha-choferes.component';
```

4.2 `src/app/shared/shared.module.ts` — declaración (sin exportar, como las demás pestañas). BUSCAR:
```
    FichaLegajoComponent,
```
REEMPLAZAR:
```
    FichaLegajoComponent,
    FichaEmpresaDatosComponent,
    FichaContactosComponent,
    FichaChoferesComponent,
```

## Verificación

1. Comandos (reportá la salida):
```
grep -c "abrirFicha\|volver()" src/app/shared/ficha-entidad/ficha-entidad.component.html
grep -c "Ficha.*Component" src/app/shared/shared.module.ts
git add -N src/app/shared/ficha-entidad/ficha-empresa-datos src/app/shared/ficha-entidad/ficha-contactos src/app/shared/ficha-entidad/ficha-choferes
git diff --numstat
git diff -U0 | grep "^+" | grep -v "^+++" | grep -c " $"
npx tsc -p tsconfig.app.json --noEmit
```
Esperado:
- (a) 3.
- (b) 14.
- (c) sin salida (marca los archivos nuevos para que entren en el numstat; no es un
  commit ni un stage del contenido).
- (d) 11 archivos:
  - `src/app/shared/ficha-entidad/ficha-choferes/ficha-choferes.component.html` `38 0`;
  - `src/app/shared/ficha-entidad/ficha-choferes/ficha-choferes.component.scss` `11 0`;
  - `src/app/shared/ficha-entidad/ficha-choferes/ficha-choferes.component.ts` `21 0`;
  - `src/app/shared/ficha-entidad/ficha-contactos/ficha-contactos.component.html` `26 0`;
  - `src/app/shared/ficha-entidad/ficha-contactos/ficha-contactos.component.ts` `22 0`;
  - `src/app/shared/ficha-entidad/ficha-empresa-datos/ficha-empresa-datos.component.html` `6 0`;
  - `src/app/shared/ficha-entidad/ficha-empresa-datos/ficha-empresa-datos.component.ts` `37 0`;
  - `src/app/shared/ficha-entidad/ficha-entidad.component.html` `107 10`;
  - `src/app/shared/ficha-entidad/ficha-entidad.component.ts` `133 36`;
  - `src/app/shared/ficha-entidad/ficha-entidad.util.ts` `60 2`;
  - `src/app/shared/shared.module.ts` `6 0`.
- (e) 0 (sin espacios finales en lo agregado).
- (f) sin errores.

2. `npm run build:demo`: las mismas 9 advertencias; main ≈ 1,10 MB; Initial total
   ≈ 1,53 MB; el chunk `legajos-legajos-module` ≈ 177 kB (antes ≈ 166 kB).

## Pruebas manuales en demo (las hace Nico)

1. **Chofer de proveedor** (Legajos → Tablero, clic en el nombre): aparece la pestaña
   **Proveedor** con razón social, CUIT, condición fiscal y contacto principal en una línea.
   "Abrir ficha del proveedor" → la misma ventana pasa al proveedor, con "← Volver a <chofer>"
   arriba del título.
2. **Ficha del proveedor:**
   - encabezado: razón social, CUIT con guiones, condición fiscal, badge "Proveedor" (y
     "Oculto en listados" si corresponde);
   - Datos de la empresa: las dos direcciones en una línea cada una;
   - Contactos: todos, con "—" en lo vacío; un proveedor sin contactos muestra "No hay
     contactos cargados.";
   - Choferes: solo los de ese proveedor, por apellido, con el estado del legajo; el nombre se
     subraya al pasar el mouse;
   - Vehículos: los del proveedor.
   Los contadores de las pestañas coinciden con las filas.
3. **Ida y vuelta:** desde Choferes, abrí otro chofer → "← Volver a <proveedor>" → vuelve a
   la pestaña Choferes → "← Volver a <primer chofer>" → vuelve a su pestaña Proveedor y ya no
   hay botón Volver.
4. **Chofer directo:** sin pestaña Proveedor (como antes).
5. **Datos vivos:** con la ficha del proveedor abierta, en otra pestaña del navegador editá
   un contacto del proveedor → se actualiza solo.
6. **Cerrar** con la X, el botón o Esc estando en una ficha "navegada": se cierra el modal
   entero.
7. **Ancho chico** (ventana angosta o zoom 150 %): las 4 pestañas del proveedor se desplazan
   horizontalmente si no entran.
8. Rol **user** y rol **demo**: abren la ficha y navegan igual.

## Mensaje de commit

```
FI2: ficha del proveedor y navegación entre fichas

- Ficha del proveedor: Datos de la empresa, Contactos, Choferes (con estado del legajo; el
  nombre abre la ficha del chofer) y Vehículos. Encabezado con razón social, CUIT y
  condición fiscal.
- Pestañas reutilizables para el cliente (FI3): FichaEmpresaDatos (EmpresaFicha) y
  FichaContactos.
- Chofer de proveedor: pestaña Proveedor con contacto principal y "Abrir ficha del
  proveedor".
- Navegación dentro del mismo modal: pila de fichas con "← Volver a …", que retoma la
  pestaña en la que estaba.
- FichaEntidadComponent: una sola suscripción para todos los tipos; al navegar se rearma
  con la última emisión.
- ficha-entidad.util: nombreChofer, contactoLegible, filasChoferesDeProveedor.
```

FIN DE LA INSTRUCCIÓN FI2
````

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

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

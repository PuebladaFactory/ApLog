import { Component, Input, NgZone, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, combineLatest, takeUntil } from 'rxjs';
import { Chofer, Vehiculo } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { ConIdType } from 'src/app/interfaces/conId';
import { CategoriaDocumentacion, EstadoDocumentacion, Legajo, estadoGeneralDeLegajo } from 'src/app/interfaces/legajo';
import { Contacto, Proveedor } from 'src/app/interfaces/proveedor';
import { CategoriaDocumentacionService } from 'src/app/servicios/categoria-documentacion/categoria-documentacion.service';
import { ChoferService } from 'src/app/servicios/choferes/chofer.service';
import { ClienteService } from 'src/app/servicios/clientes/cliente.service';
import { LegajoService } from 'src/app/servicios/legajos/legajo.service';
import { ProveedorService } from 'src/app/servicios/proveedores/proveedor.service';
import { TarifarioService } from 'src/app/servicios/tarifario/tarifario.service';
import { PermisosService } from 'src/app/servicios/permisos/permisos.service';
import { EdicionEntidadService, EntidadEditable } from 'src/app/servicios/ficha-entidad/edicion-entidad.service';
import { nivelesHabilitados } from 'src/app/interfaces/tarifa-habilitada';
import { TarifasFicha, filaTarifaFicha, filasTarifasFicha } from './ficha-tarifas/ficha-tarifas.util';
import {
  CLASE_ESTADO_LEGAJO, ETIQUETA_ESTADO_LEGAJO, FilaChoferFicha, MODULO_FICHA, TipoFicha, contactoLegible, cuitLegible,
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
  ConIdType<Cliente>[],
];

/**
 * Ficha de entidad: carpeta de SOLO LECTURA con los datos administrativos de
 * un chofer, un proveedor o un cliente. Se abre con
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

  /** Ficha de cliente: el cliente. */
  cliente: ConIdType<Cliente> | null = null;

  /** Pestaña Tarifas (las tres fichas); null si la entidad no existe. */
  tarifas: TarifasFicha | null = null;

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
    private clienteService: ClienteService,
    private tarifarioService: TarifarioService,
    private router: Router,
    private permisos: PermisosService,
    private edicionEntidad: EdicionEntidadService,
    private zone: NgZone,
  ) {}

  ngOnInit(): void {
    combineLatest([
      this.choferService.choferes$,
      this.choferService.vehiculos$,
      this.proveedorService.proveedores$,
      this.legajoService.legajos$,
      this.categoriaDocumentacionService.categorias$,
      this.clienteService.clientes$,
      // Solo para refrescar: la pestaña Tarifas lee los vigentes con los
      // getters de TarifarioService (misma regla que la pantalla de Tarifas).
      this.tarifarioService.tarifas$,
      this.tarifarioService.tarifasEspeciales$,
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([choferes, vehiculos, proveedores, legajos, , clientes]) =>
        this.zone.run(() => {
          this.ultimosDatos = [choferes, vehiculos, proveedores, legajos, clientes];
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

  /** Contactos del cliente (un doc viejo puede no tener la lista). */
  /** La entidad de la ficha que se está mostrando; null si no existe (baja). */
  get entidadActual(): EntidadEditable | null {
    if (this.tipo === 'chofer') return this.chofer;
    if (this.tipo === 'proveedor') return this.proveedor;
    return this.cliente;
  }

  /** "Editar": con permiso de edición de esa entidad (demo no lo tiene). */
  get puedeEditar(): boolean {
    return this.entidadActual !== null && this.permisos.puede(MODULO_FICHA[this.tipo], 'editar');
  }

  /** "Ver cuenta": con lectura de Finanzas (user no la tiene). Un chofer de
   *  proveedor no tiene cuenta propia (se le paga al proveedor). */
  get puedeVerCuenta(): boolean {
    return this.entidadActual !== null && !(this.tipo === 'chofer' && this.esChoferDeProveedor)
      && this.permisos.puede('finanzas', 'ver');
  }

  get contactosCliente(): Contacto[] {
    return this.cliente?.contactos ?? [];
  }

  /** Contacto principal del proveedor (el primero de la lista). */
  get contactoPrincipal(): Contacto | null {
    return this.contactosProveedor[0] ?? null;
  }

  /** Nombre de la ficha actual (encabezado y botón "Volver"). */
  get titulo(): string {
    if (this.tipo === 'chofer' && this.chofer) return nombreChofer(this.chofer);
    if (this.tipo === 'proveedor' && this.proveedor) return this.proveedor.razonSocial;
    if (this.tipo === 'cliente' && this.cliente) return this.cliente.razonSocial;
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

  /** "Ver en Tarifas": cierra la ficha y va a la pestaña del módulo Tarifas
   *  (no hay enlace directo a una tarifa puntual). */
  irATarifas(pestana: string): void {
    this.activeModal.dismiss();
    this.router.navigate(['/tarifas', pestana]);
  }

  /** Cierra la ficha y abre el modal de edición de la entidad mostrada (el
   *  mismo de los listados). */
  editar(): void {
    const entidad = this.entidadActual;
    if (!entidad || !this.puedeEditar) return;
    this.activeModal.dismiss();
    this.edicionEntidad.editar(this.tipo, entidad);
  }

  /** Cierra la ficha y va a la cuenta de la entidad en Finanzas. */
  verCuenta(): void {
    if (!this.puedeVerCuenta) return;
    this.activeModal.dismiss();
    this.router.navigate(['/finanzas', 'cuenta', this.tipo, this.id]);
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
    const [choferes, vehiculos, proveedores, legajos, clientes] = this.ultimosDatos;
    if (this.tipo === 'chofer') {
      this.armarChofer(choferes, vehiculos, proveedores, legajos);
    } else if (this.tipo === 'proveedor') {
      this.armarProveedor(choferes, vehiculos, proveedores, legajos);
    } else if (this.tipo === 'cliente') {
      this.cliente = clientes.find(c => c.idCliente === this.id) ?? null;
    }
    this.tarifas = this.armarTarifas();
  }

  /**
   * Niveles habilitados y tarifas vigentes HOY de la entidad (sin valores).
   * Chofer: los niveles salen de ProveedorService.resolverTarifasHabilitadasChofer
   * (regla del proyecto: un chofer de proveedor hereda los del proveedor) y, si
   * es de proveedor, las especiales son las del proveedor. Personalizadas: solo
   * clientes.
   */
  private armarTarifas(): TarifasFicha | null {
    const nombreCliente = (id: string) => this.clienteService.getClientePorId(id)?.razonSocial;
    let idDueño: string | null = null;
    let niveles: TarifasFicha['niveles'] = [];
    let heredadoDe: string | null = null;
    let personalizadas: TarifasFicha['personalizadas'] = [];

    if (this.tipo === 'chofer' && this.chofer) {
      niveles = nivelesHabilitados(this.proveedorService.resolverTarifasHabilitadasChofer(this.chofer));
      const contratacion = this.chofer.contratacion;
      if (contratacion.tipo === 'proveedor') {
        idDueño = contratacion.idProveedor;
        heredadoDe = this.proveedor?.razonSocial ?? '(dado de baja)';
      } else {
        idDueño = this.chofer.id;
      }
    } else if (this.tipo === 'proveedor' && this.proveedor) {
      idDueño = this.proveedor.idProveedor;
      niveles = nivelesHabilitados(this.proveedor.tarifasHabilitadas);
    } else if (this.tipo === 'cliente' && this.cliente) {
      idDueño = this.cliente.idCliente;
      niveles = nivelesHabilitados(this.cliente.tarifasHabilitadas);
      personalizadas = filasTarifasFicha(this.tarifarioService.getTarifasPersonalizadasVigentes(idDueño), nombreCliente);
    }
    if (!idDueño) return null;

    const general = this.tarifarioService.getTarifaGeneralVigente();
    return {
      niveles,
      heredadoDe,
      general: general ? filaTarifaFicha(general, nombreCliente) : null,
      personalizadas,
      especiales: filasTarifasFicha(this.tarifarioService.getTarifasEspecialesVigentes(idDueño), nombreCliente),
    };
  }

  private limpiar(): void {
    this.chofer = null;
    this.vehiculosPropios = [];
    this.legajo = null;
    this.estadoLegajo = null;
    this.proveedor = null;
    this.vehiculosProveedor = [];
    this.choferesProveedor = [];
    this.cliente = null;
    this.tarifas = null;
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

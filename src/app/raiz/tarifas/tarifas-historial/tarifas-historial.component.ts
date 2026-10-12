import { Component, OnDestroy, OnInit } from '@angular/core';
import { merge, Subject, takeUntil } from 'rxjs';
import { ConIdType } from 'src/app/interfaces/conId';
import { Cliente } from 'src/app/interfaces/cliente';
import { Chofer } from 'src/app/interfaces/chofer';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { EntidadTipo, Tarifa } from 'src/app/interfaces/tarifa';
import { TarifaEspecial } from 'src/app/interfaces/tarifa-especial';
import { ClienteService } from 'src/app/servicios/clientes/cliente.service';
import { ChoferService } from 'src/app/servicios/choferes/chofer.service';
import { ProveedorService } from 'src/app/servicios/proveedores/proveedor.service';
import { TarifarioService } from 'src/app/servicios/tarifario/tarifario.service';
import { deltaTarifa, deltaTarifaEspecial, textoAumentoTarifa } from 'src/app/shared/utils/historial-tarifa.util';

interface EntidadOpcion {
  id: string;
  nombre: string;
}

interface ConLinaje {
  idTarifa: string;
  versionAnteriorId: string | null;
  vigenciaDesde: string;
}

@Component({
  selector: 'app-tarifas-historial',
  templateUrl: './tarifas-historial.component.html',
  styleUrls: ['./tarifas-historial.component.scss'],
  standalone: false,
})
export class TarifasHistorialComponent implements OnInit, OnDestroy {

  entidadTipo: EntidadTipo = 'cliente';
  clientes: ConIdType<Cliente>[] = [];
  choferes: ConIdType<Chofer>[] = [];
  proveedores: ConIdType<Proveedor>[] = [];

  entidadSeleccionada: EntidadOpcion | null = null;
  linajesPersonalizada: ConIdType<Tarifa>[][] = [];
  linajesEspecial: ConIdType<TarifaEspecial>[][] = [];

  tarifaSeleccionada: ConIdType<Tarifa> | null = null;
  tarifaEspecialSeleccionada: ConIdType<TarifaEspecial> | null = null;

  private destroy$ = new Subject<void>();
  private cambioEntidad$ = new Subject<void>();

  constructor(
    private clienteService: ClienteService,
    private choferService: ChoferService,
    private proveedorService: ProveedorService,
    private tarifarioService: TarifarioService,
  ) {}

  ngOnInit(): void {
    this.clienteService.getActivos()
      .pipe(takeUntil(this.destroy$))
      .subscribe(clientes => { this.clientes = clientes; });

    this.choferService.getActivos()
      .pipe(takeUntil(this.destroy$))
      .subscribe(choferes => { this.choferes = choferes; });

    this.proveedorService.getActivos()
      .pipe(takeUntil(this.destroy$))
      .subscribe(proveedores => { this.proveedores = proveedores; });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.cambioEntidad$.complete();
  }

  get mostrarPersonalizada(): boolean {
    return this.entidadTipo === 'cliente';
  }

  /** Sin filtrar por tarifasHabilitadas — mismo criterio que Eventual: cualquier
   *  entidad puede tener historial sin importar su configuración actual. */
  get opcionesEntidad(): EntidadOpcion[] {
    if (this.entidadTipo === 'cliente') {
      return [...this.clientes]
        .sort((a, b) => a.razonSocial.localeCompare(b.razonSocial, 'es', { sensitivity: 'base' }))
        .map(c => ({ id: c.idCliente, nombre: c.razonSocial }));
    }
    if (this.entidadTipo === 'chofer') {
      return [...this.choferes]
        .sort((a, b) => {
          const porApellido = a.datosPersonales.apellido.localeCompare(b.datosPersonales.apellido, 'es', { sensitivity: 'base' });
          if (porApellido !== 0) return porApellido;
          return a.datosPersonales.nombre.localeCompare(b.datosPersonales.nombre, 'es', { sensitivity: 'base' });
        })
        .map(c => ({ id: c.idChofer, nombre: `${c.datosPersonales.apellido}, ${c.datosPersonales.nombre}` }));
    }
    return [...this.proveedores]
      .sort((a, b) => a.razonSocial.localeCompare(b.razonSocial, 'es', { sensitivity: 'base' }))
      .map(p => ({ id: p.idProveedor, nombre: p.razonSocial }));
  }

  onCambioEntidadTipo(e: any): void {
    this.entidadTipo = e.target.value as EntidadTipo;
    this.entidadSeleccionada = null;
    this.cambioEntidad$.next();
    this.linajesPersonalizada = [];
    this.linajesEspecial = [];
    this.tarifaSeleccionada = null;
    this.tarifaEspecialSeleccionada = null;
  }

  seleccionarEntidad(e: any): void {
    const id: string = e.target.value;
    const entidad = this.opcionesEntidad.find(o => o.id === id) ?? null;
    this.entidadSeleccionada = entidad;
    this.cambioEntidad$.next();
    this.tarifaSeleccionada = null;
    this.tarifaEspecialSeleccionada = null;

    if (!entidad) {
      this.linajesPersonalizada = [];
      this.linajesEspecial = [];
      return;
    }

    this.tarifarioService.tarifas$
      .pipe(takeUntil(merge(this.destroy$, this.cambioEntidad$)))
      .subscribe(() => {
        const propias = this.tarifarioService.getTarifasActuales()
          .filter(t => t.nivel === 'personalizada' && t.idEntidadDueño === entidad.id);
        this.linajesPersonalizada = this.agruparLinajes(propias);
      });

    this.tarifarioService.tarifasEspeciales$
      .pipe(takeUntil(merge(this.destroy$, this.cambioEntidad$)))
      .subscribe(() => {
        const propias = this.tarifarioService.getTarifasEspecialesActuales()
          .filter(t => t.idEntidadDueño === entidad.id);
        this.linajesEspecial = this.agruparLinajes(propias);
      });
  }

  /** Reconstruye cadenas de versiones siguiendo versionAnteriorId. Cada raíz
   *  (sin predecesor DENTRO del set filtrado) arranca un linaje independiente
   *  — cubre tanto tarifas creadas antes de este campo (versionAnteriorId
   *  ausente, tratado como null) como linajes genuinamente distintos de la
   *  misma entidad (ej. dos personalizadas con nombres distintos). Devuelve
   *  los linajes ordenados por fecha de la versión más reciente primero, cada
   *  uno internamente de más nueva a más vieja (índice 0 = versión vigente o
   *  más reciente del linaje). */
  private agruparLinajes<T extends ConLinaje>(tarifas: T[]): T[][] {
    const porId = new Map(tarifas.map(t => [t.idTarifa, t]));
    const hijosDe = new Map<string, T[]>();
    const raices: T[] = [];

    tarifas.forEach(t => {
      const anteriorId = t.versionAnteriorId ?? null;
      if (anteriorId && porId.has(anteriorId)) {
        if (!hijosDe.has(anteriorId)) hijosDe.set(anteriorId, []);
        hijosDe.get(anteriorId)!.push(t);
      } else {
        raices.push(t);
      }
    });

    return raices
      .map(raiz => {
        const cadena: T[] = [raiz];
        let actual = raiz;
        while (true) {
          const hijos = hijosDe.get(actual.idTarifa) ?? [];
          if (hijos.length === 0) break;
          const siguiente = hijos.length === 1
            ? hijos[0]
            : [...hijos].sort((a, b) => b.vigenciaDesde.localeCompare(a.vigenciaDesde))[0];
          cadena.push(siguiente);
          actual = siguiente;
        }
        return cadena.reverse();
      })
      .sort((a, b) => b[0].vigenciaDesde.localeCompare(a[0].vigenciaDesde));
  }

  /** Helpers del historial (shared/utils/historial-tarifa.util — TC-P1),
   *  expuestos para el template. */
  readonly deltaPersonalizada = deltaTarifa;
  readonly deltaEspecial = deltaTarifaEspecial;
  readonly textoAumento = textoAumentoTarifa;

  /** Para resolver el nombre del cliente en el alcance de una Especial —
   *  mismo criterio que TarifasEspecialComponent.nombreClientePorId. */
  nombreClientePorId(idCliente: string): string | null {
    return this.clientes.find(c => c.idCliente === idCliente)?.razonSocial ?? null;
  }

  verPersonalizada(t: ConIdType<Tarifa>): void {
    this.tarifaSeleccionada = t;
  }

  volverPersonalizada(): void {
    this.tarifaSeleccionada = null;
  }

  verEspecial(t: ConIdType<TarifaEspecial>): void {
    this.tarifaEspecialSeleccionada = t;
  }

  volverEspecial(): void {
    this.tarifaEspecialSeleccionada = null;
  }
}

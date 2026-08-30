import { Component, OnDestroy, OnInit } from '@angular/core';
import { merge, Subject, takeUntil } from 'rxjs';
import { ConIdType } from 'src/app/interfaces/conId';
import { Cliente } from 'src/app/interfaces/cliente';
import { Chofer } from 'src/app/interfaces/chofer';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { EntidadTipo, MetadataAumento, Tarifa } from 'src/app/interfaces/tarifa';
import { TarifaEspecial } from 'src/app/interfaces/tarifa-especial';
import { ClienteService } from 'src/app/servicios/clientes/cliente.service';
import { ChoferService } from 'src/app/servicios/choferes/chofer.service';
import { ProveedorService } from 'src/app/servicios/proveedores/proveedor.service';
import { TarifarioService } from 'src/app/servicios/tarifario/tarifario.service';

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
    if (this.entidadTipo === 'cliente') return this.clientes.map(c => ({ id: c.idCliente, nombre: c.razonSocial }));
    if (this.entidadTipo === 'chofer') return this.choferes.map(c => ({ id: c.idChofer, nombre: `${c.datosPersonales.nombre} ${c.datosPersonales.apellido}` }));
    return this.proveedores.map(p => ({ id: p.idProveedor, nombre: p.razonSocial }));
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
   *  uno internamente de más vieja a más nueva. */
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
        return cadena;
      })
      .sort((a, b) => b[b.length - 1].vigenciaDesde.localeCompare(a[a.length - 1].vigenciaDesde));
  }

  /** % de variación aproximado contra la versión inmediata anterior del mismo
   *  linaje — suma de todas las categorías, no por categoría individual (el
   *  detalle real se ve entrando a "Ver" en cada versión). null si no hay
   *  anterior o si la base es 0. */
  deltaPersonalizada(actual: ConIdType<Tarifa>, anterior?: ConIdType<Tarifa>): { cobrar: number | null; pagar: number | null } {
    if (!anterior) return { cobrar: null, pagar: null };
    const sumar = (t: ConIdType<Tarifa>, campo: 'aCobrar' | 'aPagar') =>
      t.secciones.flatMap(s => s.categorias).reduce((acc, c) => acc + c[campo], 0);
    const calc = (campo: 'aCobrar' | 'aPagar'): number | null => {
      const base = sumar(anterior, campo);
      if (base === 0) return null;
      return ((sumar(actual, campo) - base) / base) * 100;
    };
    return { cobrar: calc('aCobrar'), pagar: calc('aPagar') };
  }

  deltaEspecial(actual: ConIdType<TarifaEspecial>, anterior?: ConIdType<TarifaEspecial>): number | null {
    if (!anterior) return null;
    const sumar = (t: ConIdType<TarifaEspecial>) =>
      t.secciones.flatMap(s => s.categorias).reduce((acc, c) => acc + c.valor, 0);
    const base = sumar(anterior);
    if (base === 0) return null;
    return ((sumar(actual) - base) / base) * 100;
  }

  /** Texto descriptivo de metadataAumento para el historial, o null si la
   *  versión no vino de la herramienta de aumento (edición manual, o versión
   *  anterior a este campo). Mismo criterio que TarifasGeneralComponent. */
  textoAumento(t: { metadataAumento?: MetadataAumento }): string | null {
    const m = t.metadataAumento;
    if (!m) return null;
    const redondeo = m.redondeo ? `, redondeo ${m.redondeo}` : '';
    if (m.modo === 'manual') return `Aumento manual${redondeo}`;
    if (m.modo === 'unico') return `Aumento único +${m.porcentajeUnico}%${redondeo}`;
    const partes = [
      m.porcentajeCobrar !== undefined ? `cobrar +${m.porcentajeCobrar}%` : null,
      m.porcentajePagar !== undefined ? `pagar +${m.porcentajePagar}%` : null,
      m.porcentajeProveedor !== undefined ? `proveedor +${m.porcentajeProveedor}%` : null,
    ].filter((p): p is string => p !== null);
    return `Aumento segmentado — ${partes.join(', ')}${redondeo}`;
  }

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

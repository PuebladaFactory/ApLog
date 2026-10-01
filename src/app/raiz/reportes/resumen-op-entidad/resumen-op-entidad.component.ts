import { Component, OnInit } from "@angular/core";
import { Observable, map, of, tap } from "rxjs";
import { PeriodoFiltro } from "src/app/interfaces/periodo-filtro";
import { TipoEntidadResumen } from "src/app/interfaces/resumen-op-nuevo";
import { ClienteService } from "src/app/servicios/clientes/cliente.service";
import { ChoferService } from "src/app/servicios/choferes/chofer.service";
import { ProveedorService } from "src/app/servicios/proveedores/proveedor.service";
import {
  DatosTablaResumen,
  ResumenOpConsultaService,
} from "src/app/servicios/reportes/resumenes-op/resumen-op-consulta.service";
import { errorPeriodoReporte, tituloPeriodo, ultimos12Meses } from "src/app/shared/utils/periodo.util";

interface OpcionEntidad {
  id: string;
  nombre: string;
}

@Component({
  selector: "app-resumen-op-entidad",
  standalone: false,
  templateUrl: "./resumen-op-entidad.component.html",
  styleUrl: "./resumen-op-entidad.component.scss",
})
export class ResumenOpEntidadComponent implements OnInit {
  tipoEntidad: TipoEntidadResumen = "cliente";
  entidades$: Observable<OpcionEntidad[]> = of([]);
  entidadSeleccionada?: string;

  periodo!: PeriodoFiltro;
  tituloPeriodo = "";
  errorPeriodo = "";
  datos$: Observable<DatosTablaResumen | null> | null = null;

  private nombres = new Map<string, string>();

  constructor(
    private consulta: ResumenOpConsultaService,
    private clienteService: ClienteService,
    private choferService: ChoferService,
    private proveedorService: ProveedorService,
  ) {}

  ngOnInit(): void {
    this.periodo = ultimos12Meses();
    this.tituloPeriodo = tituloPeriodo(this.periodo);
    this.cargarEntidades();
  }

  get razonSocial(): string {
    return this.entidadSeleccionada ? this.nombres.get(this.entidadSeleccionada) ?? "" : "";
  }

  onTipoEntidadChange(tipo: TipoEntidadResumen): void {
    this.tipoEntidad = tipo;
    this.entidadSeleccionada = undefined;
    this.datos$ = null;
    this.cargarEntidades();
  }

  onEntidadChange(id: string | undefined): void {
    this.entidadSeleccionada = id;
    this.cargarDatos();
  }

  onPeriodoChange(p: PeriodoFiltro): void {
    this.periodo = p;
    this.tituloPeriodo = tituloPeriodo(p);
    this.cargarDatos();
  }

  /** Lista del tipo elegido desde los servicios de entidad (ids string).
   *  Choferes de proveedor excluidos: su operación cuenta para el
   *  proveedor (decisión R4). Inactivos con "(inactivo)". */
  private cargarEntidades(): void {
    let fuente$: Observable<OpcionEntidad[]>;
    if (this.tipoEntidad === "cliente") {
      fuente$ = this.clienteService.clientes$.pipe(
        map(cs => cs.map(c => this.opcion(c.id, c.razonSocial, c.activo))),
      );
    } else if (this.tipoEntidad === "chofer") {
      fuente$ = this.choferService.choferes$.pipe(
        map(cs => cs
          .filter(c => c.contratacion?.tipo !== "proveedor")
          .map(c => this.opcion(
            c.id,
            `${c.datosPersonales?.apellido ?? ""} ${c.datosPersonales?.nombre ?? ""}`.trim(),
            c.activo,
          ))),
      );
    } else {
      fuente$ = this.proveedorService.proveedores$.pipe(
        map(ps => ps.map(p => this.opcion(p.id, p.razonSocial, p.activo))),
      );
    }
    this.entidades$ = fuente$.pipe(
      map(os => [...os].sort((a, b) => a.nombre.localeCompare(b.nombre))),
      tap(os => {
        this.nombres = new Map(os.map(o => [o.id, o.nombre] as [string, string]));
      }),
    );
  }

  private opcion(id: string, nombre: string, activo: boolean): OpcionEntidad {
    return { id, nombre: activo ? nombre : `${nombre} (inactivo)` };
  }

  private cargarDatos(): void {
    if (!this.entidadSeleccionada) {
      this.datos$ = null;
      return;
    }
    this.errorPeriodo = errorPeriodoReporte(this.periodo, ResumenOpConsultaService.MAX_MESES) ?? "";
    if (this.errorPeriodo) {
      this.datos$ = null;
      return;
    }
    this.datos$ = this.consulta
      .observarEntidad(this.periodo, this.tipoEntidad, this.entidadSeleccionada)
      .pipe(map(rs => this.consulta.armarTabla(rs)));
  }
}

import { Component, OnInit } from "@angular/core";
import { Observable, of } from "rxjs";
import { PeriodoFiltro } from "src/app/interfaces/periodo-filtro";
import { ResumenOpBase } from "src/app/interfaces/resumen-op-base";
import { ReportesOpService } from "src/app/servicios/reportes/reportes-op/reportes-op.service";
import { StorageService } from "src/app/servicios/storage/storage.service";
import Swal from "sweetalert2";

@Component({
  selector: "app-resumen-op-entidad",
  standalone: false,
  templateUrl: "./resumen-op-entidad.component.html",
  styleUrl: "./resumen-op-entidad.component.scss",
})
export class ResumenOpEntidadComponent implements OnInit {
  tipoEntidad: "cliente" | "chofer" | "proveedor" = "cliente";

  entidades: any[] = [];
  entidadSeleccionada?: number;

  periodo!: PeriodoFiltro;

  resumenes$!: Observable<ResumenOpBase[]> | null;

  tipo: "general" | "entidad" = 'entidad';
  entidadId?: number;

  tituloPeriodo: string = "";

  razonSocial:string = "";

  constructor(
    private storageService: StorageService,
    private reportesOp: ReportesOpService,
  ) {}

  ngOnInit(): void {
    this.periodo = this.getUltimos12Meses();
    this.tituloPeriodo = this.armarTitulo(this.periodo);
    this.cargarEntidades();
    this.cargarDatos();
  }

  cargarEntidades() {
    if (this.tipoEntidad === "cliente") {
      this.entidades = this.storageService.loadInfo("clientes") || [];
      this.entidades = this.entidades.sort((a, b) =>
      a.razonSocial.localeCompare(b.razonSocial),
    );
    }

    if (this.tipoEntidad === "chofer") {
      this.entidades = this.storageService.loadInfo("choferes") || [];
      this.entidades = this.entidades.sort((a, b) =>
      a.apellido.localeCompare(b.apellido),
    );
    }

    if (this.tipoEntidad === "proveedor") {
      this.entidades = this.storageService.loadInfo("proveedores") || [];
      this.entidades = this.entidades.sort((a, b) =>
      a.razonSocial.localeCompare(b.razonSocial),
    );
    }
    console.log("this.entidades: ", this.entidades);
    
  }
 

  onTipoEntidadChange() {
    this.cargarEntidades();
    this.entidadSeleccionada = undefined;
  }

  onEntidadChange() {
    if (!this.entidadSeleccionada) return;
    this.resumenes$ = null;
    this.cargarDatos();
  }

  cargarDatos() {
    if (!this.entidadSeleccionada) return;
    console.log("this.periodo: ", this.periodo);
    console.log("this.tipo: ", this.tipo);
    console.log("this.entidadSeleccionada: ", this.entidadSeleccionada);

    this.resumenes$ = this.reportesOp.getResumen(
      this.periodo,
      this.tipo,
      this.entidadSeleccionada,
      this.tipoEntidad
    );
  }

  private getUltimos12Meses(): PeriodoFiltro {
    const hoy = new Date();

    const hasta = {
      anio: hoy.getFullYear(),
      mes: hoy.getMonth() + 1,
    };

    const desdeDate = new Date(hoy);
    desdeDate.setMonth(desdeDate.getMonth() - 11);

    const desde = {
      anio: desdeDate.getFullYear(),
      mes: desdeDate.getMonth() + 1,
    };

    return {
      tipo: "ultimos-12",
      desde,
      hasta,
    };
  }

  armarTitulo(p: PeriodoFiltro): string {
    if (p.tipo === "ultimos-12") {
      return "Últimos 12 meses";
    }

    if (p.tipo === "anio") {
      return `Año ${p.anio}`;
    }

    if (p.tipo === "rango" && p.desde && p.hasta) {
      const desde = `${p.desde.mes.toString().padStart(2, "0")}-${p.desde.anio}`;
      const hasta = `${p.hasta.mes.toString().padStart(2, "0")}-${p.hasta.anio}`;

      return `${desde} → ${hasta}`;
    }

    return "";
  }

  private periodoValido(p: PeriodoFiltro): boolean {
    return p.desde.anio * 100 + p.desde.mes <= p.hasta.anio * 100 + p.hasta.mes;
  }

  mensajesError(msj: string, resultado: boolean) {
    Swal.fire({
      icon: !resultado ? "error" : "success",
      //title: "Oops...",
      text: `${msj}`,
      //footer: `${msj}`
    });
  }

  getRazonSocial(id:number): string{
    this.razonSocial = ""; 
    let entidad:any
    switch(this.tipoEntidad){
      case 'cliente': {
        entidad = this.entidades.find(e=> e.idCliente === id);
        if(entidad) this.razonSocial = entidad.razonSocial;
        break
      }
      case 'chofer': {
        entidad = this.entidades.find(e=> e.idChofer === id);
        if(entidad) this.razonSocial = entidad.apellido + " " + entidad.nombre;
        break
      }
      case 'proveedor': {
        entidad = this.entidades.find(e=> e.idProveedor === id);
        if(entidad) this.razonSocial = entidad.razonSocial;
        break
      }
      default:{
        entidad = null;
        break
      }
    }

    return this.razonSocial;

    }

  
}

import { AfterViewInit, Component, Input, OnInit } from "@angular/core";

import { NgbActiveModal, NgbModal } from "@ng-bootstrap/ng-bootstrap";
import Swal from "sweetalert2";
import { DescuentosComponent } from "../descuentos/descuentos.component";

import { ConId } from "src/app/interfaces/conId";
import { InformeOpNuevo } from "src/app/interfaces/informe-op-nuevo";
import { RefCliente, RefChofer, RefProveedor } from "src/app/interfaces/operacion";
import { Descuento, InformeLiq } from "src/app/interfaces/informe-liq";
import { PeriodoModalComponent } from "../periodo-modal/periodo-modal.component";
import { FormatoNumericoService } from "src/app/servicios/formato-numerico/formato-numerico.service";

@Component({
  selector: "app-resumen-op-liquidadas",
  templateUrl: "./resumen-op-liquidadas.component.html",
  styleUrls: ["./resumen-op-liquidadas.component.scss"],
  standalone: false,
})
export class ResumenOpLiquidadasComponent implements OnInit, AfterViewInit {
  @Input() fromParent: any;

  facturaCliente!: InformeLiq;
  facturaChofer!: InformeLiq;
  facturaProveedor!: InformeLiq;
  modo: string = "vista";
  mes: string = "";
  periodo: string = "";
  periodoBoolean: boolean = true;

  columnas = [
    { nombre: "Fecha", propiedad: "fecha", seleccionada: true },
    { nombre: "Quincena", propiedad: "quincena", seleccionada: true },
    { nombre: "Chofer", propiedad: "chofer", seleccionada: true },
    { nombre: "Cliente", propiedad: "cliente", seleccionada: true },
    { nombre: "Patente", propiedad: "patente", seleccionada: false },
    { nombre: "Concepto", propiedad: "conceptoCliente", seleccionada: true },
    { nombre: "Observaciones", propiedad: "obs", seleccionada: false },
    { nombre: "Hoja de Ruta", propiedad: "hojaRuta", seleccionada: false },
    { nombre: "Km", propiedad: "km", seleccionada: true },
    { nombre: "Jornada", propiedad: "jornada", seleccionada: true },
    { nombre: "Ad Km", propiedad: "adicionalKm", seleccionada: true },
    { nombre: "Ad Acomp", propiedad: "adAcomp", seleccionada: true },
    { nombre: "Extra", propiedad: "adExtra", seleccionada: true },
    { nombre: "A Cobrar", propiedad: "aCobrar", seleccionada: true },
  ];
  operaciones: any[] = [];
  columnasSeleccionadas: any[] = [];
  tieneDescuentos: boolean = false;
  descuentosAplicados: Descuento[] = [];
  totalDescuento: number = 0;
  ////////////////////////////////////////////
  titulo!: string;
  facLiquidadas: ConId<InformeOpNuevo>[] = [];
  total!: number;
  subtotal!: number;
  totalContraParte: number = 0;
  columnasVisibles: any[] = [];
  factura!: any;
  obsInterna: string = "";

  constructor(
    public activeModal: NgbActiveModal,
    private modalService: NgbModal,
    private formNumServ: FormatoNumericoService,
  ) {}

  ngOnInit(): void {
    this.facLiquidadas = this.fromParent.facturas;
    this.facLiquidadas = this.facLiquidadas.sort((a, b) => {
      return new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
    });
    this.total = this.fromParent.total;
    this.subtotal = this.fromParent.total;
    this.mes = this.fromParent.mesPeriodo;

    this.facLiquidadas.forEach((f) => {
      this.totalContraParte += f.contraParte.monto;
    });

    switch (this.fromParent.origen) {
      case "cliente":
      case "chofer":
      case "proveedor": {
        this.titulo = this.nombreEntidad(this.facLiquidadas[0].entidad);
        this.actualizarColumnasSeleccionadas();
        break;
      }
      default: {
        this.mensajesError("error en el modo");
        break;
      }
    }
  }

  ngAfterViewInit(): void {
    this.abrirModalPeriodo();
  }

  ngOnDestroy(): void {}

  private nombreEntidad(entidad: RefCliente | RefChofer | RefProveedor): string {
    return 'apellido' in entidad
      ? `${entidad.apellido} ${entidad.nombre}`
      : entidad.razonSocial;
  }

  getQuincena(fecha: any | Date): string {
    const [year, month, day] = fecha.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    if (day <= 15) {
      return "1<sup> ra</sup>";
    } else {
      return "2<sup> da</sup>";
    }
  }

  closeModal() {
    let respuesta = {
      columnas: "",
      accion: "",
    };
    this.activeModal.close(respuesta);
  }

  limpiarValorFormateado(valorFormateado: string): number {
    return parseFloat(valorFormateado.replace(/\./g, "").replace(",", "."));
  }

  onSubmit(accion: string) {
    let colSel: string[] = [];
    this.columnasSeleccionadas.forEach((c) => colSel.push(c.nombre));
    if (this.facLiquidadas.length > 0) {
      Swal.fire({
        title:
          accion === "factura"
            ? "¿Desea generar la liquidación de las operaciones seleccionadas?"
            : "¿Desea generar la proforma de las operaciones seleccionadas?",
        text: "Esta acción no se podrá revertir",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Guardar",
        cancelButtonText: "Cancelar",
      }).then((result) => {
        if (result.isConfirmed) {
          Swal.fire({
            title: "Confirmado",
            icon: "success",
          }).then((result) => {
            this.periodo = this.periodoBoolean
              ? "mes"
              : this.getQuincenaLiq(this.facLiquidadas[0].fecha);
            let respuesta = {
              columnas: colSel,
              accion: accion,
              descuentos: this.descuentosAplicados,
              periodo: this.periodo,
              obsInterna: this.obsInterna,
            };
            this.activeModal.close(respuesta);
          });
        }
      });
    } else {
      this.mensajesError("No hay facturas seleccionadas");
    }
  }

  mensajesError(msj: string) {
    Swal.fire({
      icon: "error",
      text: `${msj}`,
    });
  }

  actualizarColumnasSeleccionadas(): void {
    switch (this.fromParent.origen) {
      case "cliente": {
        this.columnasVisibles = this.columnas.filter(
          (col) => col.nombre !== "Cliente",
        );
        break;
      }
      case "chofer": {
        this.columnasVisibles = this.columnas.filter(
          (col) => col.nombre !== "Chofer",
        );
        break;
      }
      case "proveedor": {
        this.columnasVisibles = this.columnas;
        break;
      }
      default: {
        this.mensajesError("error en actualizar columnas");
        break;
      }
    }

    this.columnasSeleccionadas = this.columnasVisibles.filter(
      (col) => col.seleccionada,
    );
  }

  obtenerDatoColumna(facOp: InformeOpNuevo, col: any) {
    switch (col.nombre) {
      case "Fecha": {
        return facOp.fecha;
      }
      case "Quincena": {
        return this.getQuincena(facOp.fecha);
      }
      case "Chofer": {
        return `${facOp.datosOperacion.chofer.apellido} ${facOp.datosOperacion.chofer.nombre}`;
      }
      case "Cliente": {
        return this.nombreEntidad(facOp.contraParte.entidad);
      }
      case "Patente": {
        return facOp.datosOperacion.vehiculo.dominio;
      }
      case "Concepto": {
        return facOp.datosOperacion.vehiculo.categoria.nombre;
      }
      case "Observaciones": {
        return facOp.datosOperacion.observaciones;
      }
      case "Hoja de Ruta": {
        return facOp.datosOperacion.hojaRuta;
      }
      case "Km": {
        return facOp.datosOperacion.km;
      }
      case "Jornada": {
        return `$ ${this.formNumServ.convertirAValorFormateado(facOp.valores.tarifaBase)}`;
      }
      case "Ad Km": {
        return `$ ${this.formNumServ.convertirAValorFormateado(facOp.valores.kmMonto)}`;
      }
      case "Ad Acomp": {
        return `$ ${this.formNumServ.convertirAValorFormateado(facOp.valores.acompaniante)}`;
      }
      case "Extra": {
        return `$ ${this.formNumServ.convertirAValorFormateado(facOp.valores.adExtra ?? 0)}`;
      }
      case "A Cobrar": {
        return `$ ${this.formNumServ.convertirAValorFormateado(facOp.valores.total)}`;
      }
      default: {
        return "";
      }
    }
  }

  abrirModalDescuentos() {
    {
      const modalRef = this.modalService.open(DescuentosComponent, {
        windowClass: "myCustomModalClass",
        centered: true,
        size: "md",
      });

      let info = {
        descuentos: this.descuentosAplicados,
      };

      modalRef.componentInstance.fromParent = info;
      modalRef.result.then(
        (result) => {
          if (result.descuentos.length > 0) {
            this.descuentosAplicados = result.descuentos;
            this.tieneDescuentos = true;
            this.totalDescuento = result.total;
          }
        },
        (reason) => {},
      );
    }
  }

  getQuincenaLiq(fecha: any): string {
    const [year, month, day] = fecha.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return day <= 15 ? "1° quincena" : "2° quincena";
  }

  abrirModalPeriodo(): void {
    const modalRef = this.modalService.open(PeriodoModalComponent, {
      size: "sm",
      backdrop: "static",
      keyboard: false,
      centered: true,
    });

    modalRef.result.then(
      (resultado: boolean) => {
        this.periodoBoolean = resultado;
      },
      () => {},
    );
  }
}

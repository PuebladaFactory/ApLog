import {
  Component,
  inject,
  OnDestroy,
  OnInit,
  TemplateRef,
} from "@angular/core";
import {
  NgbCalendar,
  NgbDate,
  NgbDateStruct,
  NgbModal,
} from "@ng-bootstrap/ng-bootstrap";
import { distinctUntilChanged, Subject, takeUntil } from "rxjs";
import { Chofer } from "src/app/interfaces/chofer";
import { Cliente } from "src/app/interfaces/cliente";
import { ConId } from "src/app/interfaces/conId";
import { Proveedor } from "src/app/interfaces/proveedor";
import { OpVenta, ResumenVenta } from "src/app/interfaces/resumen-venta";
import { Vendedor } from "src/app/interfaces/vendedor";
import { StorageService } from "src/app/servicios/storage/storage.service";
import Swal from "sweetalert2";
import { ResumenVentaDetalleComponent } from "../resumen-venta-detalle/resumen-venta-detalle.component";
import { ExcelService } from "src/app/servicios/informes/excel/excel.service";
import { PdfService } from "src/app/servicios/informes/pdf/pdf.service";
import { DbFirestoreService } from "src/app/servicios/database/db-firestore.service";

@Component({
  selector: "app-vendedor-historial",
  standalone: false,
  templateUrl: "./vendedor-historial.component.html",
  styleUrl: "./vendedor-historial.component.scss",
})
export class VendedorHistorialComponent implements OnInit, OnDestroy {
  vendedores!: ConId<Vendedor>[];
  clientes!: ConId<Cliente>[];
  choferes!: ConId<Chofer>[];
  proveedores!: ConId<Proveedor>[];
  private destroy$ = new Subject<void>(); // Subject para manejar la destrucción
  vendSeleccionado: ConId<Vendedor> | null = null;
  idVendedorSeleccionado: number | null = null;
  resumenVentas: ConId<ResumenVenta>[] = [];
  limite: number = 12;
  isLoading: boolean = false;
  resumenDetalle!: ConId<ResumenVenta>;

  /* fechas consultas */
  // Fecha seleccionada en modo manual
  fechaDesdeManual!: NgbDateStruct;
  fechaHastaManual!: NgbDateStruct;
  // Para mostrar el rango de fechas en el template
  fechaDesdeString!: string;
  fechaHastaString!: string;
  fechaManualDesdeString!: string;
  fechaManualHastaString!: string;
  calendar = inject(NgbCalendar);
  hoveredDate: NgbDate | null = null;
  fromDate: NgbDate = this.calendar.getToday();
  toDate: NgbDate | null = this.calendar.getNext(this.fromDate, "d", 10);
  sortColumn: string | null = null;
  sortDirection: "asc" | "desc" = "asc";
  fechasConsulta: any = {
    fechaDesde: "",
    fechaHasta: "",
  };

  constructor(
    private storageService: StorageService,
    private modalService: NgbModal,
    private excelServica: ExcelService,
    private pdfService: PdfService,
    private dbFirebase: DbFirestoreService,
  ) {}

  ngOnInit(): void {
    /// CHOFERES/CLIENTES/PROVEEDORES
    this.choferes = this.storageService.loadInfo("choferes");
    this.choferes = this.choferes.sort((a, b) =>
      a.apellido.localeCompare(b.apellido),
    ); // Ordena por el nombre del chofer
    this.clientes = this.storageService.loadInfo("clientes");
    this.clientes = this.clientes.sort((a, b) =>
      a.razonSocial.localeCompare(b.razonSocial),
    ); // Ordena por el nombre del chofer
    this.proveedores = this.storageService.loadInfo("proveedores");
    this.proveedores = this.proveedores.sort((a, b) =>
      a.razonSocial.localeCompare(b.razonSocial),
    ); // Ordena por el nombre del chofer
    this.vendedores = this.storageService.loadInfo("vendedores");
    this.vendedores = this.vendedores.sort((a, b) =>
      a.datosPersonales.apellido.localeCompare(b.datosPersonales.apellido),
    ); // Ordena por el nombre del chofer
    this.storageService
      .getObservable<ConId<ResumenVenta>>("resumenVenta")
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.resumenVentas = data;
        if (this.resumenVentas) {
          console.log("resumenVentas: ", this.resumenVentas);
          // 👉 REARMAR LOS GRUPOS
        } else {
          this.mensajesError("error: resumenVentas", false);
        }
      });

    this.calcularDiaActual();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  changeVendedor(e: any) {
    //////////console.log()(e.target.value);
    this.vendSeleccionado = null;
    this.idVendedorSeleccionado = Number(e.target.value);
    this.resumenVentas = [];
    let vendedorFiltrado = this.vendedores.find((v) => {
      return v.idVendedor === this.idVendedorSeleccionado;
    });
    //////////console.log()(chofer);
    if (vendedorFiltrado) {
      this.vendSeleccionado = vendedorFiltrado;
      //console.log("vendSeleccionado: ", this.vendSeleccionado);
      this.consultarResumenVenta();
    } else {
      this.idVendedorSeleccionado = null;
      this.vendSeleccionado = null;
      this.isLoading = false;
      this.mensajesError(
        "Error: no se encontro el vendendor seleccionado",
        false,
      );
    }
  }

  consultarResumenVenta() {
    this.isLoading = true;
    if (this.vendSeleccionado) {
      this.storageService.getAllSortedIdLimit<ResumenVenta>(
        "resumenVenta",
        "idVendedor",
        this.vendSeleccionado.idVendedor,
        "idResumen",
        "desc",
        this.limite,
        "resumenVenta",
      );
      this.isLoading = false;
    } else {
      this.isLoading = false;
      this.mensajesError("Error: Vendedor no seleccionado", false);
    }
  }

  mensajesError(msj: string, resultado: boolean) {
    Swal.fire({
      icon: !resultado ? "error" : "success",
      //title: "Oops...",
      text: `${msj}`,
      //footer: `${msj}`
    });
  }

  getCliente(id: number) {
    let cliente;
    cliente = this.clientes.find((c) => c.idCliente === id);
    if (cliente) {
      return cliente.razonSocial;
    } else {
      return "";
    }
  }

  abrirDetalle(resumen: ConId<ResumenVenta>, modalRef: TemplateRef<any>) {
    //console.log("chofer: ", chofer);
    //if(this.tablero?.asignado) this.mensajesError("No se puede editar una asiganción que ya fue dada de alta")
    this.resumenDetalle = resumen;

    const modal = this.modalService.open(modalRef, { centered: true });

    // Limpiar referencias al cerrar o cancelar el modal
    /* modal.result.finally(() => {
      this.choferEditable = null;
      this.choferSeleccionadoOriginal = null;
    }); */
  }

  getVendedor(id: number) {
    let vendedor;
    vendedor = this.vendedores.find((v) => v.idVendedor === id);
    if (vendedor) {
      return (
        vendedor.datosPersonales.apellido +
        " " +
        vendedor.datosPersonales.nombre
      );
    } else {
      return "";
    }
  }

  abrirModalDetalle(resumen: ConId<ResumenVenta>) {
    {
      const modalRef = this.modalService.open(ResumenVentaDetalleComponent, {
        windowClass: "modal-facturacion-xxl",
        centered: true,
        size: "lg",
        //backdrop:"static"
      });

      modalRef.componentInstance.resumenVenta = resumen;
    }
  }

  descargarResumen(resumen: ConId<ResumenVenta>) {}

  getOpCliente(id: number, resumen: ConId<ResumenVenta>): OpVenta[] {
    let opCliente: OpVenta[] = resumen.operaciones.filter(
      (r) => r.idCliente === id,
    );
    opCliente.sort((a, b) => a.fecha.localeCompare(b.fecha));
    return opCliente;
  }

  getTotalOpCliente(
    id: number,
    comision: number,
    resumen: ConId<ResumenVenta>,
  ): number {
    let opCliente: OpVenta[] = resumen.operaciones.filter(
      (r) => r.idCliente === id,
    );
    let total = opCliente.reduce(
      (acc, obj) => acc + (obj.totalCliente * comision) / 100,
      0,
    );
    return total;
  }

  async preguntarDescarga(resumen: ConId<ResumenVenta>) {
    const result = await Swal.fire({
      title: "¿Desea descargar el informe?",
      text: "Seleccione el formato",
      icon: "question",

      showCancelButton: true,
      showDenyButton: true,

      confirmButtonText: "Excel",
      denyButtonText: "PDF",
      cancelButtonText: "No descargar",
    });

    if (result.isConfirmed) {
      //console.log("Descargar Excel");
      this.reimprimir(resumen, "excel");
    }

    if (result.isDenied) {
      //console.log("Descargar PDF");
      this.reimprimir(resumen, "pdf");
    }

    if (result.isDismissed) {
      //console.log("No descargar");
    }
  }

  reimprimir(resumen: ConId<ResumenVenta>, modo: string) {
    if (modo === "excel") {
      this.excelServica.exportarResumenVentaExcel(resumen);
    } else {
      this.pdfService.exportarResumenVentaPDF(resumen);
    }
  }

  ///////////////////////////
  /* CONSULTAR POR FECHAS */
  ///////////////////////////

  calcularDiaActual() {
    const today = new Date();
    this.fechasConsulta.fechaDesde = today.toISOString().split("T")[0];
    const tomorrow = new Date(today);
    // Incrementar un día al objeto "tomorrow"
    tomorrow.setDate(tomorrow.getDate() + 1);

    this.fechasConsulta.fechaHasta = tomorrow.toISOString().split("T")[0];

    this.actualizarFechasString();
    //this.consultarRegistro()
  }

  onDateSelection(date: NgbDate) {
    if (!this.fromDate && !this.toDate) {
      ////console.log("1");
      this.fromDate = date;
    } else if (this.fromDate && !this.toDate && date.after(this.fromDate)) {
      ////console.log("2");
      this.toDate = date;
    } else {
      ////console.log("3");
      this.toDate = null;
      this.fromDate = date;
    }
    console.log("this.fromDate", this.fromDate);

    this.fechasConsulta.fechaDesde = new Date(
      this.fromDate.year,
      this.fromDate.month - 1,
      this.fromDate.day,
    )
      .toISOString()
      .split("T")[0];
    if (this.toDate !== null) {
      this.fechasConsulta.fechaHasta = new Date(
        this.toDate.year,
        this.toDate.month - 1,
        this.toDate.day,
      )
        .toISOString()
        .split("T")[0];
    }
    console.log("this.fechasConsulta", this.fechasConsulta);

    this.actualizarFechasString();

    ////console.log("desde: ", this.fechaDesdeManual, " hasta: ", this.fechaHastaManual);
  }

  isHovered(date: NgbDate) {
    return (
      this.fromDate &&
      !this.toDate &&
      this.hoveredDate &&
      date.after(this.fromDate) &&
      date.before(this.hoveredDate)
    );
  }

  isInside(date: NgbDate) {
    return this.toDate && date.after(this.fromDate) && date.before(this.toDate);
  }

  isRange(date: NgbDate) {
    return (
      date.equals(this.fromDate) ||
      (this.toDate && date.equals(this.toDate)) ||
      this.isInside(date) ||
      this.isHovered(date)
    );
  }

  actualizarFechasString() {
    //console.log("consulta: ", this.fechasConsulta);
    this.fechaDesdeString = this.fechasConsulta.fechaDesde;
    this.fechaHastaString = this.fechasConsulta.fechaHasta;
  }

  consultarRegistro() {
    let desde = new Date(this.fechasConsulta.fechaDesde).getTime();
    let hasta = new Date(this.fechasConsulta.fechaHasta).getTime();
    this.dbFirebase
      .getAllByDateValueField<ResumenVenta>(
        "resumenVenta",
        "fecha",
        this.fechasConsulta.fechaDesde,
        this.fechasConsulta.fechaHasta,
        "idVendedor",
        this.idVendedorSeleccionado,
      )
      .pipe(
        takeUntil(this.destroy$),
        distinctUntilChanged(
          (prev, curr) => JSON.stringify(prev) === JSON.stringify(curr),
        ), // Emitir solo si hay cambios reales
      )
      .subscribe((data) => {
        //console.log("data registro", data);

        if (data) {
          this.resumenVentas = data;
          /* this.resumenVentas = this.resumenVentas.sort(
            (a, b) => a.timestamp - b.timestamp,
          ); */
          //console.log("this.resgistro: ", this.registros);
        }
      });
  }

  consultarRangoManual() {
    this.actualizarFechasString();
    this.consultarRegistro();
  }
}

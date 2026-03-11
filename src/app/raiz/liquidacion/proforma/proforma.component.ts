import { Component, OnInit } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { Subject, take, takeUntil } from "rxjs";
import { ConId, ConIdType } from "src/app/interfaces/conId";

import { StorageService } from "src/app/servicios/storage/storage.service";

import { DbFirestoreService } from "src/app/servicios/database/db-firestore.service";
import { InformeLiqDetalleComponent } from "src/app/shared/modales/informe-liq-detalle/informe-liq-detalle.component";
import Swal from "sweetalert2";
import { Cliente } from "src/app/interfaces/cliente";
import { Chofer } from "src/app/interfaces/chofer";
import { Proveedor } from "src/app/interfaces/proveedor";
import { ExcelService } from "src/app/servicios/informes/excel/excel.service";
import { LogService } from "src/app/servicios/log/log.service";
import { Operacion } from "src/app/interfaces/operacion";
import { PdfService } from "src/app/servicios/informes/pdf/pdf.service";
import { InformeOp } from "src/app/interfaces/informe-op";
import { InformeLiq } from "src/app/interfaces/informe-liq";
import { NumeradorService } from "src/app/servicios/numerador/numerador.service";
import { CrearLiquidacionParams } from "src/app/servicios/liquidaciones/liquidacion-builder.service";
import {
  AnularParams,
  LiquidacionService,
  ProcesarParams,
} from "src/app/servicios/liquidaciones/liquidacion.service";
import { toISODateString } from "src/app/servicios/fechas/date-range.service";

@Component({
  selector: "app-proforma",
  templateUrl: "./proforma.component.html",
  styleUrls: ["./proforma.component.scss"],
  standalone: false,
})
export class ProformaComponent implements OnInit {
  proformasTodas!: any;
  proformasClientes!: ConIdType<InformeLiq>[];
  proformasChoferes!: ConIdType<InformeLiq>[];
  proformasProveedores!: ConIdType<InformeLiq>[];
  private destroy$ = new Subject<void>();
  filtroCliente: string = "";
  filtroChofer: string = "";
  filtroProveedor: string = "";
  isLoading: boolean = false;
  informesOp: ConIdType<InformeOp>[] = [];
  coleccionOrigen: string = "";
  coleccionDestino: string = "";
  coleccionInformeLiq: string = "";
  usuario: any;
  informeLiq!: InformeLiq;
  choferes!: ConId<Chofer>[];
  clientes!: ConId<Cliente>[];
  proveedores!: ConId<Proveedor>[];
  informesEditados: ConId<InformeLiq>[] = [];

  constructor(
    private storageService: StorageService,
    private modalService: NgbModal,
    private dbFirebase: DbFirestoreService,
    private excelServ: ExcelService,
    private logService: LogService,
    private pdfServ: PdfService,

    private liquidacionService: LiquidacionService,
  ) {}

  ngOnInit(): void {
    this.storageService.listenForChanges<any>("proforma");
    this.storageService
      .getObservable<ConIdType<any>>("proforma")
      .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
      .subscribe((data) => {
        if (data) {
          this.proformasTodas = data;
          //console.log("proformasTodas", this.proformasTodas);

          this.separarFacturas();
        }
      });
    let usuario = this.storageService.loadInfo("usuario");
    this.usuario = usuario[0];
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
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  separarFacturas() {
    this.proformasClientes = [];
    this.proformasChoferes = [];
    this.proformasProveedores = [];

    this.proformasTodas.forEach((factura: ConIdType<InformeLiq>) => {
      if (factura.tipo === "cliente") {
        this.proformasClientes.push(factura as ConIdType<InformeLiq>);
      } else if (factura.tipo === "chofer") {
        this.proformasChoferes.push(factura as ConIdType<InformeLiq>);
      } else if (factura.tipo === "proveedor") {
        this.proformasProveedores.push(factura as ConIdType<InformeLiq>);
      }
    });
    //console.log("this.proformasClientes", this.proformasClientes);
    //console.log("this.proformasChoferes", this.proformasChoferes);
    //console.log("this.proformasProveedores", this.proformasProveedores);

    this.proformasClientes = this.proformasClientes.sort((a, b) =>
      a.entidad.razonSocial.localeCompare(b.entidad.razonSocial),
    );
    this.proformasChoferes = this.proformasChoferes.sort((a, b) =>
      a.entidad.razonSocial.localeCompare(b.entidad.razonSocial),
    );
    this.proformasProveedores = this.proformasProveedores.sort((a, b) =>
      a.entidad.razonSocial.localeCompare(b.entidad.razonSocial),
    );
  }

  async obtenerFacturasOp(
    proforma: ConIdType<InformeLiq>,
    origen: string,
    accion: string,
  ) {
    this.isLoading = true;
    await this.consultarOperacionesSeleccionadas(proforma, origen); //acá se obtienen los informesOp

    if (accion === "reimpresion") {
      this.preguntarDescarga(proforma, accion);
    } else if (accion === "vista") {
      this.openModalDetalleFactura(proforma, this.informesOp, origen);
    } else {
      this.procesarProforma(proforma, origen, accion);
    }
  }

  async consultarOperacionesSeleccionadas(
    proforma: ConId<InformeLiq>,
    origen: string,
  ) {
    /*     if (!this.operaciones || this.operaciones.length === 0) {
      Swal.fire('Error', 'No hay operaciones seleccionadas.', 'error');
      return;
    } */
    //console.log("origen", origen);

    let componente: string =
      origen === "cliente"
        ? "informesOpClientes"
        : origen === "chofer"
          ? "informesOpChoferes"
          : "informesOpProveedores";
    try {
      const consulta = await this.dbFirebase.obtenerDocsPorIdsOperacion(
        componente, // nombre de la colección
        proforma.operaciones, // array de idsOperacion
      );
      //console.log("consulta", consulta);

      this.informesOp = consulta.encontrados;

      if (consulta.idsFaltantes.length) {
        Swal.fire({
          icon: "warning",
          title: "Atención",
          text: `Se encontraron ${consulta.encontrados.length} informes, pero faltan ${consulta.idsFaltantes.length}.`,
          footer: `IDs faltantes: ${consulta.idsFaltantes.join(", ")}`,
        });
      } else {
        //Swal.fire('Éxito', 'Se encontraron todas las operaciones.', 'success');
      }
    } catch (error) {
      console.error("'Error al consultar por los informes", error);
      Swal.fire("Error", "Falló la consulta de los informes.", "error");
    } finally {
      //this.isLoading = false;
    }
  }

  openModalDetalleFactura(
    factura: any,
    facturasOp: InformeOp[],
    origen: string,
  ) {
    ////console.log("lega??");
    this.isLoading= false;
    {
      const modalRef = this.modalService.open(InformeLiqDetalleComponent, {
        windowClass: "myCustomModalClass",
        centered: true,
        scrollable: true,
        size: "lg",
      });
      //////console.log("factura",factura);
      let info = {
        modo: "proforma",
        item: factura,
        tipo: origen,
        facOp: facturasOp,
      };

      modalRef.componentInstance.fromParent = info;

      modalRef.result.then(
        (result) => {},
        (reason) => {},
      );
    }
  }

  async procesarProforma(
    proforma: ConIdType<InformeLiq>,
    origen: string,
    accion: string,
  ) {    
    let titulo: string =
      proforma.tipo.charAt(0).toUpperCase() + proforma.tipo.slice(1);

    let proceso: string =
      accion === "baja" ? "anular" : "generar la liquidación de";
    //////console.log("proceso", proceso);

    this.isLoading = false;
    Swal.fire({
      title: `¿Desea ${proceso} la proforma N° ${proforma.idInfLiq} del ${titulo} ${proforma.entidad.razonSocial}?`,
      text: `${accion === "baja" ? "Esta acción revertirá las operaciones al modulo Liquidación" : ""}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Confirmar",
      cancelButtonText: "Cancelar",
    }).then((result) => {
      if (result.isConfirmed) {
        this.isLoading= true;
        if (accion === "baja") {                    
          this.anularProforma(proforma);
        } else if (accion === "factura") {          
          this.liquidarProforma(proforma);
        }
      }
    });
  }

  getCliente(idCliente: number) {
    let clientes: ConIdType<Cliente>[] =
      this.storageService.loadInfo("clientes");
    let cliente: ConIdType<Cliente>[];
    cliente = clientes.filter((cliente: ConIdType<Cliente>) => {
      return cliente.idCliente === idCliente;
    });
    if (cliente[0]) {
      return cliente[0].razonSocial;
    } else {
      return `Cliente dado de baja. idChofer ${idCliente}`;
    }
  }

  getChofer(idChofer: number) {
    let choferes: ConIdType<Chofer>[] =
      this.storageService.loadInfo("choferes");
    let chofer: ConIdType<Chofer>[];
    chofer = choferes.filter((chofer: Chofer) => {
      return chofer.idChofer === idChofer;
    });
    if (chofer[0]) {
      return chofer[0].apellido + " " + chofer[0].nombre;
    } else {
      return `Chofer dado de baja. idChofer ${idChofer}`;
    }
  }

  getProveedor(idProveedor: number) {
    let proveedores: ConIdType<Proveedor>[] =
      this.storageService.loadInfo("proveedores");
    let proveedor: Proveedor[];
    proveedor = proveedores.filter((proveedor: Proveedor) => {
      return proveedor.idProveedor === idProveedor;
    });
    if (proveedor[0]) {
      return proveedor[0].razonSocial;
    } else {
      return `Proveedor dado de baja. idChofer ${idProveedor}`;
    }
  }

  editarOperacionesFac(factura: InformeOp, componente: string) {
    let op: ConId<Operacion>;
    this.dbFirebase
      .obtenerTarifaIdTarifa("operaciones", factura.idOperacion, "idOperacion")
      .pipe(take(1)) // Asegúrate de que la suscripción se complete después de la primera emisión
      .subscribe((data) => {
        op = data;
        //////console.log("OP LIQUIDADA: ", op);
        op.estado = {
          abierta: false,
          cerrada: false,
          facCliente:
            componente === "facturaOpCliente" ? true : op.estado.facCliente,
          facChofer:
            componente === "facturaOpChofer" ||
            componente === "facturaOpProveedor"
              ? true
              : op.estado.facChofer,
          facturada:
            componente === "facturaOpCliente" && op.estado.facChofer
              ? true
              : componente === "facturaOpChofer" && op.estado.facCliente
                ? true
                : componente === "facturaOpProveedor" && op.estado.facCliente
                  ? true
                  : false,
          proformaCl: op.estado.proformaCl,
          proformaCh: op.estado.proformaCh,
        };
        let { id, ...opp } = op;
        this.storageService.updateItem(
          "operaciones",
          opp,
          op.idOperacion,
          "LIQUIDAR",
          `Operación de Cliente ${op.cliente.razonSocial} Liquidada`,
          op.id,
        );
        this.removeItem(factura, componente);
      });
  }

  removeItem(item: any, componente: string) {
    //////console.log("llamada al storage desde liq-cliente, deleteItem", item);
    this.storageService.deleteItem(
      componente,
      item,
      item.idFacturaOp,
      "INTERNA",
      "",
    );
  }

  async liquidarProforma(proforma: ConId<InformeLiq>) {
    
    await this.consultarOperacionesSeleccionadas(proforma, proforma.tipo);

    let parametros: CrearLiquidacionParams = {
      tipo: proforma.tipo,
      informesOp: this.informesOp,
      entidad: proforma.entidad,
      descuentos: proforma.descuentos,
      columnas: proforma.columnas,
      mes: proforma.mes,
      periodo: proforma.periodo,
      modo: "factura",
      anio: 2026,
      obsInterna: proforma.observaciones ?? "",
    };

    console.log("parametros: ", parametros);
    console.log("this.usuario.emial: ", this.usuario.email);

    const operatoria = await this.liquidacionService.crearLiquidacion(
      parametros,
      this.usuario.email,
      proforma,
      true,
    );
    console.log("operatoria: ", operatoria);

    if (operatoria.informe) this.informeLiq = operatoria.informe;
    if (operatoria.exito) {
      this.storageService.logMultiplesOp(
        this.informeLiq.operaciones,
        "LIQUIDAR",
        "operaciones",
        `Operación del ${this.informeLiq.tipo} ${this.informeLiq.entidad.razonSocial} Liquidada`,
        operatoria.exito,
      );
      this.storageService.logSimple(
        this.informeLiq.entidad.id,
        "ALTA",
        this.coleccionInformeLiq,
        `Alta de Factura del ${this.informeLiq.tipo} ${this.informeLiq.entidad.razonSocial}`,
        operatoria.exito,
      );
      this.isLoading = false;      
      Swal.fire({
        icon: "success",
        //title: "Oops...",
        text: "La liquidación se procesó con éxito.",
        confirmButtonColor: "#3085d6",
        confirmButtonText: "Confirmar",
        //footer: `${msj}`
      }).then(() => {
        this.preguntarDescarga(this.informeLiq, "factura");
      });
    } else {
      this.isLoading = false;
      this.storageService.logMultiplesOp(
        proforma.operaciones,
        "LIQUIDAR",
        "operaciones",
        `Error al liquidar las operaciones del ${proforma.tipo} ${proforma.entidad.razonSocial}`,
        operatoria.exito,
      );
      this.storageService.logSimple(
        proforma.entidad.id,
        "ALTA",
        this.coleccionInformeLiq,
        `Error en el alta del Informe de liquidación del ${proforma.tipo} ${proforma.entidad.razonSocial}`,
        operatoria.exito,
      );

      this.mensajesError(
        `Ocurrió un error al procesar la liquidación: ${operatoria.mensaje}`,
        "error",
      );
    }
  }

  async anularProforma(proforma: ConId<InformeLiq>) {    
    let fechaAnul = new Date();
    let fechaStr = toISODateString(fechaAnul);

    const parametros: AnularParams = {
      informesOp: this.informesOp,
      tipo: proforma.tipo,
      informeLiq: proforma,
      modo: "proforma",
      anuladoMotivo: "Anulación de proforma",
      anuladoPor: this.usuario.email,
      fechaAnulacion: fechaStr,
    };

    const operatoria =
      await this.liquidacionService.anularLiquidacion(parametros);

    if (operatoria.exito) {      
      this.storageService.logSimple(
        proforma.idInfLiq,
        "BAJA",
        "proforma",
        `Baja de proforma N° ${proforma.idInfLiq} del Cliente ${this.getCliente(proforma.entidad.id)}`,
        operatoria.exito,
      );
      this.isLoading = false;
      Swal.fire({
        icon: "success",
        //title: "Oops...",
        text: "La proforma se anuló con éxito.",
        confirmButtonColor: "#3085d6",
        confirmButtonText: "Confirmar",
        //footer: `${msj}`
      });
    } else {
      this.isLoading = false;
      this.mensajesError(
        `error en anular proforma: ${operatoria.mensaje}`,
        "error",
      );
    }
  }

  mensajesError(msj: string, resultado: string) {
    Swal.fire({
      icon: resultado === "error" ? "error" : "success",
      //title: "Oops...",
      text: `${msj}`,
      //footer: `${msj}`
    });
  }

  async preguntarDescarga(informeLiq: InformeLiq, accion: string) {
    this.isLoading = false;
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
      this.descargarInforme(informeLiq, accion, "excel");
    }

    if (result.isDenied) {
      //console.log("Descargar PDF");      
      this.descargarInforme(informeLiq, accion, "pdf");
    }

    if (result.isDismissed) {      
      //console.log("No descargar");
    }
    
  }

  descargarInforme(informeLiq: InformeLiq, accion: string, formato: string) {
    //console.log("accion: ", accion);
    //console.log("factura: ", informeLiq);

    if (formato === "excel") {
      this.excelServ.exportToExcelInforme(
        informeLiq,
        this.informesOp,
        this.clientes,
        this.choferes,
        accion,
      );
    } else if (formato === "pdf") {
      this.pdfServ.exportToPdfInforme(
        informeLiq,
        this.informesOp,
        this.clientes,
        this.choferes,
        accion,
      );
    }
  }

  /* METODOS PARA AGREGAR EL AÑO A LOS INFORMES-LIQ */
  async editarInformesLiq() {
    this.informesEditados = structuredClone(this.proformasTodas);
    await this.calcularAnios(this.informesEditados);

    console.log("informesEditados: ", this.informesEditados);
  }

  async actualizarInformesLiq() {
    this.isLoading = true;
    const resultado = await this.dbFirebase.actualizarMultiple(
      this.informesEditados,
      "proforma",
    );
    this.isLoading = false;
    console.log(resultado);
    
  }

  async calcularAnios(informesLiq: ConId<InformeLiq>[]) {
    for (const informe of informesLiq) {
      await this.consultarOperacionesSeleccionadas(informe, informe.tipo);

      if (this.informesOp.length > 0) {
        const fecha = this.informesOp[0].fecha;
        informe.anio = this.getAnio(fecha);
      }
    }
  }

  getAnio(fechaString: any): number {
    return new Date(fechaString).getFullYear();
  }
}

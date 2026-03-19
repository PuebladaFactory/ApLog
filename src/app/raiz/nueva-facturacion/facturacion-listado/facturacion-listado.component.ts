import {
  Component,
  OnDestroy,
  OnInit,
  TemplateRef,
  ViewChild,
} from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { LogoutComponent } from "src/app/appLogin/logout/logout.component";
import { ConId } from "src/app/interfaces/conId";
import { InformeLiq } from "src/app/interfaces/informe-liq";
import { DbFirestoreService } from "src/app/servicios/database/db-firestore.service";
import { ExcelService } from "src/app/servicios/informes/excel/excel.service";
import { PdfService } from "src/app/servicios/informes/pdf/pdf.service";
import { LogService } from "src/app/servicios/log/log.service";
import { NumeradorService } from "src/app/servicios/numerador/numerador.service";
import { StorageService } from "src/app/servicios/storage/storage.service";
import Swal from "sweetalert2";
import { ModalDetalleComponent } from "../modal-detalle/modal-detalle.component";
import { InformeLiqDetalleComponent } from "src/app/shared/modales/informe-liq-detalle/informe-liq-detalle.component";
import { InformeOp } from "src/app/interfaces/informe-op";
import { Cliente } from "src/app/interfaces/cliente";
import { Chofer } from "src/app/interfaces/chofer";
import { Proveedor } from "src/app/interfaces/proveedor";
import { BajaObjetoComponent } from "src/app/shared/modales/baja-objeto/baja-objeto.component";
import { ModalVincularFacturaComponent } from "../modal-vincular-factura/modal-vincular-factura.component";
import { SupabaseStorageService } from "src/app/servicios/supabase/supabase-storage.service";
import {
  AccionInformeLiq,
  puedeEjecutarAccion,
} from "src/app/reglas/informe-liq.rules";
import { ColumnaTabla, OrdenTabla } from "src/app/interfaces/tablas";
import {
  AnularParams,
  LiquidacionService,
} from "src/app/servicios/liquidaciones/liquidacion.service";
import { toISODateString } from "src/app/servicios/fechas/date-range.service";

@Component({
  selector: "app-facturacion-listado",
  standalone: false,
  templateUrl: "./facturacion-listado.component.html",
  styleUrl: "./facturacion-listado.component.scss",
})
export class FacturacionListadoComponent implements OnInit {
  informesLiq: ConId<InformeLiq>[] = [];
  informesFiltrados: ConId<InformeLiq>[] = [];
  informesOp: ConId<InformeOp>[] = [];
  filtroTipo: string = "todos";
  filtroRazonSocial: string = "";
  fechaDesde: string = "";
  fechaHasta: string = "";
  coleccion: string = "resumenLiq";
  date: any = new Date();
  primerDia: any = new Date(this.date.getFullYear(), this.date.getMonth() - 3)
    .toISOString()
    .split("T")[0];
  ultimoDia: any = new Date(
    this.date.getFullYear(),
    this.date.getMonth() + 1,
    0,
  )
    .toISOString()
    .split("T")[0];
  primerDiaAnio: any = new Date(this.date.getFullYear(), 0, 1)
    .toISOString()
    .split("T")[0];
  ultimoDiaAnio: any = new Date(this.date.getFullYear(), 11, 31)
    .toISOString()
    .split("T")[0];
  cargando = false;
  ///////
  facturasDuplicadas: InformeLiq[] = [];
  clientes: ConId<Cliente>[] = [];
  choferes: ConId<Chofer>[] = [];
  proveedores: ConId<Proveedor>[] = [];
  ordenColumna: string = "";
  ordenAsc: boolean = true;

  columnas: ColumnaTabla<InformeLiq>[] = [
    {
      key: "fecha",
      label: "Fecha Inf",
      sortable: true,
    },
    {
      key: "tipo",
      label: "Tipo",
      sortable: true,
    },
    {
      key: "numInterno",
      label: "N° Informe",
      sortable: true,
      value: (inf) => inf.numeroInterno ?? 0,
    },
/*     {
      key: "id",
      label: "Id",
      sortable: true,
      value: (inf) => inf.idInfLiq ?? 0,
    }, */
    {
      key: "mes",
      label: "Mes",
      sortable: true,
      value: (inf) => inf.mes ?? "",
    },
    {
      key: "periodo",
      label: "Periodo Liq",
      sortable: true,
      value: (inf) => inf.periodo ?? "",
    },
    {
      key: "anio",
      label: "Año",
      sortable: true,
      value: (inf) => inf.anio ?? 0,
    },
    {
      key: "razonSocial",
      label: "Razón Social",
      sortable: true,
      value: (inf) => inf.entidad?.razonSocial ?? "",
    },
    {
      key: "cantOp",
      label: "Cant Op",
      sortable: true,
      align: "center",
      value: (inf) => inf.operaciones?.length ?? 0,
    },
    {
      key: "total",
      label: "Total",
      sortable: true,
      align: "end",
      value: (inf) =>
        this.formatearValor(inf.valores?.total) ?? this.formatearValor(0),
      cellClass: "table-success",
    },

    // acciones ↓
    {
      key: "detalle",
      label: "Detalle",
      align: "center",
      acciones: ["detalle"],
    },
    { key: "editar", label: "Editar", align: "center", acciones: ["editar"] },
    {
      key: "descargar",
      label: "Descargar",
      align: "center",
      acciones: ["reimprimir"],
    },
    {
      key: "fElectrónica",
      label: "F. Electrónica",
      align: "center",
      acciones: ["factura"],
    },
    { key: "anular", label: "Anular", align: "center", acciones: ["anular"] },
  ];

  meses = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Noviembre",
    "Diciembre",
  ];
  periodo!:
    | "Enero"
    | "Febrero"
    | "Marzo"
    | "Abril"
    | "Mayo"
    | "Junio"
    | "Julio"
    | "Agosto"
    | "Septiembre"
    | "Noviembre"
    | "Diciembre";
  consultaPeriodo: boolean = false;
  anio!: number;
  informesEditados: ConId<InformeLiq>[] = [];
  periodos: { label: string; valor: string }[] = [];
  periodoSeleccionado: string | null = null;
  tipoConsulta: 'periodo' | 'fechas' = 'periodo';
  filtroEstado: "facturado" | "anulado" | "cobrado" = "facturado";

  constructor(
    private dbService: DbFirestoreService,
    private storageService: StorageService,
    private excelServ: ExcelService,
    private pdfServ: PdfService,
    private modalService: NgbModal,
    private supabaseStorageService: SupabaseStorageService,
    private liquidacionService: LiquidacionService,
  ) {}

  ngOnInit(): void {
    this.fechaDesde = this.primerDiaAnio;
    this.fechaHasta = this.ultimoDiaAnio;
    this.cargarInformes(this.primerDiaAnio, this.ultimoDiaAnio);
    this.clientes = this.storageService.loadInfo("clientes");
    this.choferes = this.storageService.loadInfo("choferes");
    this.proveedores = this.storageService.loadInfo("proveedores");
    this.generarPeriodos(60);
  }

  async cargarInformes(desde: string, hasta: string) {
    this.cargando = true;

    console.log();

    try {
      this.informesLiq = await this.dbService.getInformesLiqPorTipoYFechas(
        this.filtroTipo as any,
        desde,
        hasta,
        "emitido",
      );
      this.aplicarFiltros();
    } catch (error) {
      console.error(error);
      Swal.fire("Error", "No se pudieron obtener los informes.", "error");
    } finally {
      this.cargando = false;
      this.periodoSeleccionado = null
    }
  }

  async cargarInformesPorPeriodo() {
    this.cargando = true;

    console.log(this.periodoSeleccionado);

    const periodo = this.getPeriodoObjeto();
    if (periodo) {
      try {
        this.informesLiq = await this.dbService.getInformesLiqPorPeriodo(
          this.filtroTipo as any,
          periodo,
          "emitido",
        );
        this.aplicarFiltros();
      } catch (error) {
        console.error(error);
        Swal.fire("Error", "No se pudieron obtener los informes.", "error");
      } finally {
        this.cargando = false;
      }
    }
  }

  getPeriodoObjeto(): { mes: string; anio: number } | null {
    if (!this.periodoSeleccionado) return null;

    const [anioStr, mesStr] = this.periodoSeleccionado.split("-");

    const fecha = new Date(Number(anioStr), Number(mesStr) - 1);

    const mes = fecha.toLocaleDateString("es-AR", { month: "long" });

    return {
      mes: mes.charAt(0).toUpperCase() + mes.slice(1),
      anio: Number(anioStr),
    };
  }

  generarPeriodos(cantidadMeses: number) {
    const hoy = new Date();

    for (let i = 0; i < cantidadMeses; i++) {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);

      const anio = fecha.getFullYear();
      const mes = (fecha.getMonth() + 1).toString().padStart(2, "0");

      this.periodos.push({
        valor: `${anio}-${mes}`,
        label: fecha.toLocaleDateString("es-AR", {
          month: "long",
          year: "numeric",
        }),
      });
    }
  }

  aplicarFiltros() {
    const textoBusqueda = this.filtroRazonSocial.toLowerCase().trim();

    this.informesFiltrados = this.informesLiq.filter((inf) => {
      const coincideTipo =
        this.filtroTipo === "todos" || inf.tipo === this.filtroTipo;

      const coincideRazon = inf.entidad?.razonSocial
        ?.toLowerCase()
        .includes(textoBusqueda);

      const coincideNumero = inf.numeroInterno
        ?.toLowerCase()
        .includes(textoBusqueda);

      const coincideFecha = inf.fecha
        .toLocaleString()
        ?.toLowerCase()
        .includes(textoBusqueda);

      const coincideMes = inf.mes
        ?.toLocaleString()
        ?.toLowerCase()
        .includes(textoBusqueda);

      return (
        coincideTipo &&
        (coincideRazon || coincideNumero || coincideFecha || coincideMes)
      );
    });
  }

  ////// MODAL PARA LA VISTA Y LA EDICION
  async verDetalle(informesLiq: ConId<InformeLiq>, accion: string) {
    await this.obtenerInformesOp(informesLiq);
    {
      const modalRef = this.modalService.open(InformeLiqDetalleComponent, {
        windowClass: "myCustomModalClass",
        centered: true,
        scrollable: true,
        size: "lg",
      });
      console.log("informesLiq", informesLiq);
      let info = {
        modo: "facturacion",
        item: informesLiq,
        tipo: informesLiq.tipo,
        facOp: this.informesOp,
        accion: accion,
      };

      modalRef.componentInstance.fromParent = info;

      modalRef.result.then(
        (result) => {},
        (reason) => {},
      );
    }
  }

  async obtenerInformesOp(informesLiq: ConId<InformeLiq>) {
    this.cargando = true;
    let coleccion: string =
      informesLiq.tipo === "cliente"
        ? "infOpLiqClientes"
        : informesLiq.tipo === "chofer"
          ? "infOpLiqChoferes"
          : "infOpLiqProveedores";
    try {
      const consulta = await this.dbService.obtenerDocsPorIdsOperacion(
        coleccion, // nombre de la colección
        informesLiq.operaciones, // array de idsOperacion
      );
      console.log("consulta", consulta);

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
      this.cargando = false;
    }
  }

  async reimprimirLiq(inf: ConId<InformeLiq>, tipo: string) {
    const respuesta = await Swal.fire({
      title: `¿Desea descargar el detalle de la liquidación?`,
      //text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Confirmar",
      cancelButtonText: "Cancelar",
    });

    if (respuesta.isConfirmed) {
      await this.obtenerInformesOp(inf);
      if (tipo === "excel") {
        this.excelServ.exportToExcelInforme(
          inf,
          this.informesOp,
          this.clientes,
          this.choferes,
          "factura",
        );
      } else if (tipo === "pdf") {
        this.pdfServ.exportToPdfInforme(
          inf,
          this.informesOp,
          this.clientes,
          this.choferes,
          "factura",
        );
      }
    }
  }

  async anularInfLiq(infLiq: ConId<InformeLiq>) {
    const respuesta = await Swal.fire({
      title: `¿Desea anular el informe de liquidación?`,
      text: "Esta acción no se podra revertir",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Confirmar",
      cancelButtonText: "Cancelar",
    });
    if (respuesta.isConfirmed) {
      this.openModalBaja(infLiq);
    }
  }

  ////// MODAL PARA ANULAR UN INFORME DE LIQUIDACION
  async openModalBaja(informeLiq: ConId<InformeLiq>) {
    await this.obtenerInformesOp(informeLiq);
    {
      const modalRef = this.modalService.open(BajaObjetoComponent, {
        windowClass: "myCustomModalClass",
        centered: true,
        scrollable: true,
        size: "sm",
      });
      console.log("informesLiq", informeLiq);
      let info = {
        modo: "facturacion",
        item: informeLiq,
      };

      modalRef.componentInstance.fromParent = info;
      try {
        let usuario = this.storageService.loadInfo("usuario");
        const motivo = await modalRef.result;
        console.log("motivo", motivo);

        if (!motivo) return;
        this.cargando = true;
        let fechaAnul = new Date();
        let fechaStr = toISODateString(fechaAnul);
        const parametrosAnulacion: AnularParams = {
          informesOp: this.informesOp,
          tipo: informeLiq.tipo,
          informeLiq: informeLiq,
          modo: "factura",
          anuladoMotivo: motivo, //motivo de anulacion
          anuladoPor: usuario[0].email, //usuario que realizó la anulación
          fechaAnulacion: fechaStr,
        };
        console.log("informesLiq anulado", informeLiq);
        const operatoria =
          await this.liquidacionService.anularLiquidacion(parametrosAnulacion);

        if (operatoria.exito) {
          //this.storageService.updateItem(this.coleccion,informeLiq, informeLiq.idInfLiq, "ANULACION", `Anulación de informe de liquidación N° ${informeLiq.numeroInterno}`, informeLiq.id)
          this.storageService.logSimple(
            informeLiq.idInfLiq,
            "ANULACION",
            this.coleccion,
            `Anulación de informe de liquidación N° ${informeLiq.numeroInterno}`,
            operatoria.exito,
          );
          this.cargando = false;
          const respuesta = await Swal.fire({
            icon: "success",
            title: "El informe de liquidación fue anulado",
            //          text: 'La operación fue dada de baja y se actualizó el tablero.'
          });
          if (respuesta.isConfirmed) {
            this.ngOnInit();
          }
        } else {
          const respuesta = await Swal.fire({
            icon: "error",
            title: `${operatoria.mensaje}`,
            //          text: 'La operación fue dada de baja y se actualizó el tablero.'
          });
          if (respuesta.isConfirmed) {
            this.ngOnInit();
          }
        }
      } catch (e) {
        console.warn("El modal fue cancelado o falló:", e);
      }
    }
  }

  async vincularFacElec(infLiq: ConId<InformeLiq>) {
    const modalRef = this.modalService.open(ModalVincularFacturaComponent, {
      windowClass: "myCustomModalClass",
      centered: true,
      scrollable: true,
      size: "md",
    });

    modalRef.componentInstance.fromParent = infLiq;

    try {
      const respuesta = await modalRef.result;
      if (respuesta) {
        const { infLiq, facElectronica } = respuesta;

        if (facElectronica) {
          this.cargando = true; // 🔹 Activo spinner
          try {
            infLiq.estado = "facturado";
            const nombreArchivo = `${infLiq.numeroInterno}_${Date.now()}.pdf`;

            const path = await this.supabaseStorageService.uploadFactura(
              facElectronica,
              nombreArchivo,
            );

            if (path) {
              infLiq.facturaUrl = path;

              await this.storageService.updateItem(
                "resumenLiq",
                infLiq,
                infLiq.idInfLiq,
                "VINCULAR FACTURA",
                `Vinculación de factura electrónica al informe ${infLiq.numeroInterno}`,
                infLiq.id,
              );

              Swal.fire({
                icon: "success",
                title: "Éxito",
                text: `La factura fue vinculada correctamente al informe ${infLiq.numeroInterno}`,
                timer: 2500,
                showConfirmButton: false,
              });
              // 🔹 Vuelvo a consultar informes;
              if(this.periodoSeleccionado){
                this.cargarInformesPorPeriodo()
              } else {
                this.cargarInformes(this.fechaDesde, this.fechaHasta);
              }
              
            } else {
              Swal.fire({
                icon: "error",
                title: "Error",
                text: "No se pudo subir el archivo PDF de la factura.",
              });
            }
          } catch (err) {
            console.error("Error vinculando factura:", err);
            Swal.fire({
              icon: "error",
              title: "Error inesperado",
              text: "Ocurrió un error al intentar vincular la factura. Intente nuevamente.",
            });
          } finally {
            this.cargando = false; // 🔹 Siempre desactivo spinner
          }
        }
      }
    } catch (error) {
      // El modal se cerró sin guardar → no hago nada
      console.log("Modal cerrado sin guardar", error);
    }
  }

  async verPdf(infLiq: ConId<InformeLiq>) {
    if (!infLiq.facturaUrl) return;
    const signedUrl = await this.supabaseStorageService.verFactura(
      infLiq.facturaUrl,
    );
    if (signedUrl) {
      window.open(signedUrl, "_blank");
    }
  }

  private obtenerValorOrden(obj: any, columna: string) {
    switch (columna) {
      case "fecha":
        return new Date(obj.fecha).getTime();
      case "total":
        return obj.valores.total;
      case "razonSocial":
        return obj.entidad.razonSocial.toLowerCase();
      case "cantOp":
        return obj.operaciones.length;
      case "cantOp":
        return obj.operaciones.length;
      case "numInterno":
        return obj.numeroInterno;
      case "id":
        return obj.idInfLiq;
      default:
        return obj[columna];
    }
  }

  puede(inf: InformeLiq, accion: AccionInformeLiq): boolean {
    return puedeEjecutarAccion(inf.estado, accion);
  }

  puedeVincularFactura(inf: InformeLiq): boolean {
    return inf.estado === "emitido";
  }

  puedeAnular(inf: InformeLiq): boolean {
    return inf.estado === "emitido";
  }

  onAccion(e: { accion: string; item: ConId<InformeLiq> }) {
    switch (e.accion) {
      case "detalle":
        this.verDetalle(e.item, "vista");
        break;
      case "editar":
        this.verDetalle(e.item, "edicion");
        break;
      case "excel":
      case "pdf":
        this.reimprimirLiq(e.item, e.accion);
        break;
      case "factura":
        this.vincularFacElec(e.item);
        break;
      case "anular":
        this.anularInfLiq(e.item);
        break;
    }
  }

  onOrdenar(event: { key: string; asc: boolean }) {
    const { key, asc } = event;

    this.informesFiltrados = [...this.informesFiltrados].sort((a, b) => {
      const valA = this.obtenerValorOrden(a, key);
      const valB = this.obtenerValorOrden(b, key);

      if (valA == null || valB == null) return 0;

      if (typeof valA === "number" && typeof valB === "number") {
        return asc ? valA - valB : valB - valA;
      }

      return asc
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }

  formatearValor(valor: number): any {
    let nuevoValor = new Intl.NumberFormat("es-ES", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(valor);
    //////////console.log(nuevoValor);
    //   `$${nuevoValor}`
    return `$ ${nuevoValor}`;
  }

  
  mensajesError(msj: string, resultado: string) {
    Swal.fire({
      icon: resultado === "error" ? "error" : "success",
      //title: "Oops...",
      text: `${msj}`,
      //footer: `${msj}`
    });
  }

  ////////////////////////// METODOS INTERNOS DE CONTROL Y CORRECCION ////////////////////////

  /*   verificarFacturasDuplicados() {
    this.facturasDuplicadas=[]
    const seenIds = new Set<number>();

    this.informesLiq = this.informesLiq.filter((factura:InformeLiq) => {
        if (seenIds.has(factura.idInfLiq)) {
            this.facturasDuplicadas.push(factura);
            return false; // Eliminar del array original
        } else {
            seenIds.add(factura.idInfLiq);
            return true; // Mantener en el array original
        }
    });    
    console.log("datosOrigen", this.informesLiq);
    console.log("duplicadas", this.facturasDuplicadas);
    //this.verificarDuplicadosFacturadas()
  }

  eliminarObjeto(){
    this.cargando = true
    this.dbService.eliminarMultiple(this.facturasDuplicadas, 'resumenLiq').then((result)=>{
      this.cargando = false
      if(result.exito){
        alert("eliminado correctamente")
      } else {
        alert(`error eliminado. errr: ${result.mensaje}`)
      }
    })
  }

  editarObjetos(){
    this.informesLiq = this.editarCampo(this.informesLiq);
    this.aplicarFiltros();
    console.log("informesLiq: ", this.informesLiq);
    
  }

  editarCampo(informes: ConId<InformeLiq>[]): ConId<InformeLiq>[] {
    return informes.map(inf => {
        inf.numeroInterno = "";
        return inf
    });
  }

  actualizarObjetos(){
    this.cargando = true
    this.dbService.actualizarMultiple(this.informesLiq, 'resumenLiq').then((result)=>{
      this.cargando = false
      if(result.exito){
        alert("actualizado correctamente")
      } else {
        alert(`error actualizando. errr: ${result.mensaje}`)
      }
    })
  }

  async asignarNumerosInternosFaltantes(): Promise<void> {
    this.cargando = true;
    await this.dbService.asignarNumerosInternosFaltantes();
    this.cargando = false;    
  } */

  /* METODOS PARA AGREGAR EL AÑO A LOS INFORMES-LIQ */
  async editarInformesLiq(){
      this.informesEditados = structuredClone(this.informesLiq);
      this.cargando = true;
      await this.calcularAnios(this.informesEditados)
      this.cargando = false;
      
      console.log("informesEditados: ", this.informesEditados);
      
    }

    async actualizarInformesLiq(){
      this.cargando = true;
      const resul = await this.dbService.actualizarMultiple(this.informesEditados, "resumenLiq")
      if(resul.exito){
        this.cargando = false;
        this.mensajesError(resul.mensaje,"success");
      } else {
        this.cargando = false;
        this.mensajesError(resul.mensaje,"error");
      }
      
    }

    async calcularAnios(informesLiq: ConId<InformeLiq>[]) {
  for (const informe of informesLiq) {

    await this.obtenerInformesOp(informe);

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

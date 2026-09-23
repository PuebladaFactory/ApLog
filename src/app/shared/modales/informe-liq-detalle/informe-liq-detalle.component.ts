import { Component, Input, OnInit, TemplateRef } from "@angular/core";
import { NgbActiveModal, NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { Subject } from "rxjs";
import { ConId, ConIdType } from "src/app/interfaces/conId";
import { Descuento, InformeLiq } from "src/app/interfaces/informe-liq";
import { InformeOpNuevo } from "src/app/interfaces/informe-op-nuevo";
import { RefCliente, RefChofer, RefProveedor } from "src/app/interfaces/operacion";
import { StorageService } from "src/app/servicios/storage/storage.service";
import { InformeOpService } from "src/app/servicios/informes-op/informe-op.service";
import { DescuentosComponent } from "../descuentos/descuentos.component";
import Swal from "sweetalert2";
import { PeriodoModalComponent } from "src/app/raiz/liquidacion/modales/periodo-modal/periodo-modal.component";
import { UsuarioSesionService } from "src/app/servicios/usuario-sesion/usuario-sesion.service";

/** Modal compartido de detalle de liquidación/proforma — lo abren Proforma,
 *  FacturacionListado y FacturacionHistorico. La edición individual de un
 *  InformeOp (botón "Editar" por fila) está deshabilitada temporalmente —
 *  vuelve en el chunk de edición, junto con EditarInfOpComponent. */
@Component({
  selector: "app-modal-factura",
  templateUrl: "./informe-liq-detalle.component.html",
  styleUrls: ["./informe-liq-detalle.component.scss"],
  standalone: false,
})
export class InformeLiqDetalleComponent implements OnInit {
  @Input() fromParent: any;
  titulo: string = "";
  informesOp!: ConId<InformeOpNuevo>[];
  informeLiq!: ConIdType<InformeLiq>;
  searchText: string = "";
  private destroy$ = new Subject<void>();
  descuentosEditar!: Descuento[];
  obsInterna: string = "";
  isLoading: boolean = false;
  periodoBoolean: boolean = true;
  periodo!: 'mes' | '1° quincena' | '2° quincena';
  tipoCliente!: boolean;
  /** Nombre de la contraparte por idInfOp — contraParte solo trae
   *  {idInfOp, monto}, no la identidad; se resuelve acá al abrir el modal. */
  contraparteNombres: Record<string, string> = {};

  constructor(
    public activeModal: NgbActiveModal,
    private storageService: StorageService,
    private modalService: NgbModal,
    private informeOpService: InformeOpService,
    public usuarioSesion: UsuarioSesionService,
  ) {}

  ngOnInit(): void {
    this.informesOp = this.fromParent.facOp;
    this.informeLiq = this.fromParent.item;
    this.titulo = this.fromParent.item.entidad.razonSocial;
    this.periodo = this.informeLiq.periodo ?? "mes";
    this.tipoCliente = this.fromParent.tipo === 'cliente' ? true : false;
    this.cargarContrapartes();
  }

  /** Un fetch por informeOp en paralelo (contraParte.idInfOp), cacheado en
   *  contraparteNombres. Fire-and-forget desde ngOnInit — cubierto por el
   *  spinner (isLoading) igual que el resto de las operaciones async del
   *  modal. */
  private async cargarContrapartes(): Promise<void> {
    this.isLoading = true;
    try {
      const fetches = this.informesOp.map(async (fac) => {
        if (!fac.contraParte?.idInfOp) return;
        const contraparte = await this.informeOpService.obtenerPorId(fac.contraParte.idInfOp);
        if (contraparte) {
          this.contraparteNombres[fac.idInfOp] = this.nombreEntidad(contraparte);
        }
      });
      await Promise.all(fetches);
    } finally {
      this.isLoading = false;
    }
  }

  private nombreEntidad(inf: ConId<InformeOpNuevo>): string {
    if (inf.tipo === 'chofer') {
      const ref = inf.entidad as RefChofer;
      return `${ref.apellido} ${ref.nombre}`;
    }
    return (inf.entidad as RefCliente | RefProveedor).razonSocial;
  }

  editarFacOp(facOp: ConId<InformeOpNuevo>) {
    Swal.fire({
      icon: "info",
      title: "Edición temporalmente deshabilitada",
      text: "La edición de informes individuales está en migración — vuelve a estar disponible en un próximo paso.",
    });
  }

  editarDesc() {
    //////console.log("facOp: ", facOp);
    this.descuentosEditar = this.informeLiq.descuentos;
    this.openModalDescuentos();
  }

  async openModalDescuentos() {
    {
      const modalRef = this.modalService.open(DescuentosComponent, {
        windowClass: "myCustomModalClass",
        centered: true,
        size: "md",
        //backdrop:"static"
      });

      let info = {
        descuentos: this.descuentosEditar,
      };

      modalRef.componentInstance.fromParent = info;
      const respuesta = await modalRef.result;
      console.log("respuesta modal: ", respuesta);
      if (respuesta && respuesta.cambios) {
        this.isLoading = true;
        console.log("total descuentos: ", respuesta.total);
        this.informeLiq.valores.descuentoTotal = respuesta.total;
        this.informeLiq.descuentos = respuesta.descuentos;
        this.actualizarInformeLiq();
        let coleccionInfLiq =
          this.fromParent.modo === "facturacion"
            ? "resumenLiq"
            : this.fromParent.modo === "proforma"
              ? "proforma"
              : "";
        this.actElementoUnico(coleccionInfLiq);
      }
    }
  }

  abrirModalObs(modalRef: TemplateRef<any>) {
    let obs: string = this.informeLiq.observaciones || "";
    this.obsInterna = structuredClone(obs);
    let componente: string =
      this.fromParent.modo === "proforma" ? "proforma" : "resumenLiq";
    const modal = this.modalService.open(modalRef, { centered: true });

    // Limpiar referencias al cerrar o cancelar el modal
    modal.result.finally(() => {
      this.actElementoUnico(componente);
    });
  }

  async guardarCambiosObs(modal: any) {
    const respuesta = await Swal.fire({
      title: "¿Desea guardar los cambios?",
      //text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Guardar",
      cancelButtonText: "Cancelar",
    });

    if (respuesta.isConfirmed) {
      this.isLoading = true;
      this.informeLiq.observaciones = this.obsInterna;
      modal.close(); // El finally del modal se encarga de limpiar
    } else if (respuesta.dismiss === Swal.DismissReason.cancel) {
    }
  }

  actElementoUnico(componente: string) {
    let mensaje: string =
      this.fromParent.modo === "proforma"
        ? "de la Proforma"
        : "del Resumen de Liquidación";
    this.storageService.updateItem(
      componente,
      this.informeLiq,
      this.informeLiq.idInfLiq,
      "EDICION",
      `Observaciones del informe ${this.informeLiq.idInfLiq}, editada`,
      this.informeLiq.id,
    );
    this.storageService.logSimple(
      this.informeLiq.idInfLiq,
      "EDICION",
      componente,
      `Edición ${mensaje} del ${this.fromParent.tipo} ${this.informeLiq.entidad.razonSocial}`,
      true,
    );
    this.isLoading = false;
  }

  actualizarInformeLiq() {
    //console.log("3)factura antes: ",this.informeLiq );

    let valores = {
      totalTarifaBase: 0,
      totalAcompaniante: 0,
      totalkmMonto: 0,
      total: 0,
      descuentoTotal: this.informeLiq.valores.descuentoTotal,
      totalContraParte: this.informeLiq.valores.totalContraParte,
      totalAdExtra: 0,
    };
    this.informesOp.forEach((f: InformeOpNuevo) => {
      valores.totalTarifaBase += f.valores.tarifaBase;
      valores.totalAcompaniante += f.valores.acompaniante;
      valores.totalkmMonto += f.valores.kmMonto;
      valores.totalAdExtra += f.valores.adExtra ?? 0;
      valores.total += f.valores.total;
    });

    valores.total += valores.descuentoTotal;
    this.informeLiq.valores = valores;
    this.informeLiq.valoresFinancieros = {
      total: this.informeLiq.valores.total,
      totalCobrado: 0,
      saldo: this.informeLiq.valores.total,
    };
    console.log("total de la liquidacion: ", this.informeLiq.valores.total);
  }

  async mensajesError(msj: string, resultado: string) {
    Swal.fire({
      icon: resultado === "error" ? "error" : "success",
      //title: "Oops...",
      text: `${msj}`,
      //footer: `${msj}`
    });
  }

  abrirModalPeriodo(): void {
      let componente: string =
      this.fromParent.modo === "proforma" ? "proforma" : "resumenLiq";
    const modalRef = this.modalService.open(PeriodoModalComponent, {
      size: "sm",
      backdrop: "static", // no cerrar al clickear afuera
      keyboard: false, // no cerrar con ESC
      centered: true,
    });

    modalRef.result.then(
      (resultado: boolean) => {
        // true = Mes | false = Quincena
        console.log("Periodo seleccionado:", resultado);

        // acá hacés lo que necesites:
        this.periodoBoolean = resultado;
        this.informeLiq.periodo= this.periodoBoolean
          ? "mes"
          : this.getQuincenaLiq(this.informesOp[0].fecha);
        this.actElementoUnico(componente)

      },
      () => {
        // No debería entrar nunca acá
      },
    );
  }

  getQuincenaLiq(fecha: any): '1° quincena' | '2° quincena' {
    console.log("fecha: ", fecha);

    // Dividir el string de la fecha en año, mes y día
    const [year, month, day] = fecha.split("-").map(Number);

    // Crear la fecha asegurando que tome la zona horaria local
    const date = new Date(year, month - 1, day); // mes - 1 porque los meses en JavaScript son 0-indexed
    console.log("dayv: ", day);
    // Determinar si está en la primera o segunda quincena
    return day <= 15 ? "1° quincena" : "2° quincena";
  }

  getEncabezados(accion:string):string{
    let respuesta = "";
    if(accion === 'entidadContraParte') respuesta = this.fromParent.tipo === 'cliente' ? 'Chofer' : 'Cliente';
    if(accion === 'accionContraParte') respuesta = this.fromParent.tipo === 'cliente' ? 'A Pagar' : 'A Cobrar';
    if(accion === 'accionPrincipal') respuesta = this.fromParent.tipo === 'cliente' ? 'A Cobrar' : 'A Pagar'
    return respuesta;
  }

  getEntidadContraParte(infOp: ConId<InformeOpNuevo>): string {
    return this.contraparteNombres[infOp.idInfOp] ?? '—';
  }

  getPorcentaje():boolean{
    if(this.fromParent.tipo === 'cliente'){
      return false;
    } else {
      return true;
    }
  }
}

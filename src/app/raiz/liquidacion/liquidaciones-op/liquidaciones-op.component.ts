import { Component, Input, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { filter, Observable, Subject, take, takeUntil } from "rxjs";
import { Chofer } from "src/app/interfaces/chofer";
import { Cliente } from "src/app/interfaces/cliente";
import { ConId, ConIdType } from "src/app/interfaces/conId";
import { InformeOpNuevo } from "src/app/interfaces/informe-op-nuevo";
import { Operacion, RefCliente, RefChofer, RefProveedor } from "src/app/interfaces/operacion";
import { DbFirestoreService } from "src/app/servicios/database/db-firestore.service";
import { ExcelService } from "src/app/servicios/informes/excel/excel.service";
import { PdfService } from "src/app/servicios/informes/pdf/pdf.service";
import { StorageService } from "src/app/servicios/storage/storage.service";
import Swal from "sweetalert2";
import { ResumenOpLiquidadasComponent } from "../modales/resumen-op-liquidadas/resumen-op-liquidadas.component";
import {
  Descuento,
  EntidadLiq,
  InformeLiq,
} from "src/app/interfaces/informe-liq";
import { TableroService } from "src/app/servicios/tablero/tablero.service";
import { DatePipe } from "@angular/common";
import {
  DateRange,
  DateRangeService,
  toISODateString,
} from "src/app/servicios/fechas/date-range.service";
import { CrearLiquidacionParams } from "src/app/servicios/liquidaciones/liquidacion-builder.service";
import { LiquidacionService } from "src/app/servicios/liquidaciones/liquidacion.service";
import { ChoferService } from "src/app/servicios/choferes/chofer.service";
import { UsuarioSesionService } from "src/app/servicios/usuario-sesion/usuario-sesion.service";
import { InformeOpService } from "src/app/servicios/informes-op/informe-op.service";

@Component({
  selector: "app-liquidaciones-op",
  standalone: false,
  templateUrl: "./liquidaciones-op.component.html",
  styleUrl: "./liquidaciones-op.component.scss",
})
export class LiquidacionesOpComponent implements OnInit {
  @Input() fechasConsulta?: any = {
    fechaDesde: 0,
    fechaHasta: 0,
  };

  llamadaOrigen!: any;
  compInformeLiquidacion: string = "resumenLiq";
  private destroy$ = new Subject<void>();
  choferes!: ConIdType<Chofer>[];
  clientes!: ConIdType<Cliente>[];
  informesOp: ConId<InformeOpNuevo>[] = [];
  datosTabla: any[] = [];
  opAbiertas!: ConId<Operacion>[];
  isLoading: boolean = false;
  informesDetalladoPorObjeto: Map<string, InformeOpNuevo[]> = new Map<
    string,
    InformeOpNuevo[]
  >();
  mostrarTabla: boolean[] = [];
  seleccionados: Set<string> = new Set<string>();
  informesLiquidados: ConId<InformeOpNuevo>[] = [];
  razonSocFac!: string;
  totalInformesLiquidados: number = 0;
  totalInformesLiquidadosContraParte: number = 0;
  indiceSeleccionado!: number;
  informeDeLiquidacion!: InformeLiq;
  ordenColumna: string = "";
  ordenAscendente: boolean = true;
  columnaOrdenada: string = "";
  searchText!: string;
  searchText2!: string;
  entidadSeleccionada!: EntidadLiq;
  mes!: any;
  usuario!: any;
  anio!: number;
  private STORAGE_RANGE_KEY = "liquidaciones_range_v1";

  constructor(
    private router: Router,
    private storageService: StorageService,
    private excelServ: ExcelService,
    private pdfServ: PdfService,
    private modalService: NgbModal,
    private dbFirebase: DbFirestoreService,
    private informeOpService: InformeOpService,
    private datePipe: DatePipe,
    private dateRangeService: DateRangeService,
    private liquidacionService: LiquidacionService,
    private choferService: ChoferService,
    public usuarioSesion: UsuarioSesionService,
  ) {}

  ngOnInit(): void {
    this.isLoading = true;
    const urlSegments = this.router.url.split("/");
    if (urlSegments.length > 1) {
      this.llamadaOrigen = urlSegments[2]; // 'cliente' | 'chofer' | 'proveedor'
    }

    // Se siguen cargando para el export Excel/Pdf (descargarInforme), que
    // los pasa al bridge any-tipado de 2b-3 — ver nota 10 del razonamiento.
    this.choferes = this.storageService.loadInfo("choferes");
    this.choferes = this.choferes.sort((a, b) =>
      a.datosPersonales?.apellido?.localeCompare(b.datosPersonales?.apellido),
    );
    this.clientes = this.storageService.loadInfo("clientes");
    this.clientes = this.clientes.sort((a, b) =>
      a.razonSocial.localeCompare(b.razonSocial),
    );

    this.restaurarRangoPropio();

    this.dateRangeService.range$
      .pipe(
        filter((r): r is DateRange => r !== null),
        takeUntil(this.destroy$),
      )
      .subscribe((r) => {
        this.isLoading = true;
        localStorage.setItem(
          this.STORAGE_RANGE_KEY,
          JSON.stringify({
            desde: r.desde.toISOString(),
            hasta: r.hasta.toISOString(),
            tipo: r.tipo,
          }),
        );
        const desde = toISODateString(r.desde);
        const hasta = toISODateString(r.hasta);
        this.fechasConsulta.fechaDesde = desde;
        this.fechasConsulta.fechaHasta = hasta;

        this.cargarOperacionesAbiertas()
          .pipe(take(1))
          .subscribe((opAbiertas) => {
            this.opAbiertas = opAbiertas;
            this.mostrarTabla = this.mostrarTabla.map(() => false);
            this.seleccionados.clear();

            this.informeOpService
              .observarPorPeriodo(desde, hasta, this.llamadaOrigen)
              .pipe(takeUntil(this.destroy$))
              .subscribe((data) => {
                this.informesOp = data;
                this.procesarDatosParaTabla();
                this.isLoading = false;
              });
          });
      });

    this.usuario = this.usuarioSesion.getUsuarioActual();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarOperacionesAbiertas(): Observable<ConId<Operacion>[]> {
    return this.dbFirebase.getAllByDateValueField<Operacion>(
      "operaciones",
      "fecha",
      this.fechasConsulta.fechaDesde,
      this.fechasConsulta.fechaHasta,
      "estado.abierta",
      true,
    );
  }

  procesarDatosParaTabla() {
    const informesMap = new Map<string, any>();

    if (this.informesOp) {
      this.informesOp.forEach((inf) => {
        const idObjeto = inf.entidad.id;
        if (!informesMap.has(idObjeto)) {
          informesMap.set(idObjeto, {
            id: idObjeto,
            entidad: inf.entidad,
            razonSocial: this.nombreEntidad(inf.entidad),
            opCerradas: 0,
            opAbiertas: 0,
            opSinFacturar: 0,
            opFacturadas: 0,
            total: 0,
            aPagar: 0,
            aCobrar: 0,
            ganancia: 0,
          });
        }

        const objInf = informesMap.get(idObjeto);
        objInf.opCerradas++;
        if (this.seleccionados.has(inf.idInfOp)) {
          objInf.opFacturadas += inf.valores.total;
        } else {
          objInf.opSinFacturar += inf.valores.total;
        }
        objInf.total += inf.valores.total;
        if (this.llamadaOrigen === "cliente") {
          objInf.aPagar += inf.contraParte.monto;
          objInf.ganancia = 100 - (objInf.aPagar * 100) / objInf.total;
        } else {
          objInf.aCobrar += inf.contraParte.monto;
          objInf.ganancia = 100 - (objInf.total * 100) / objInf.aCobrar;
        }
      });

      this.datosTabla = Array.from(informesMap.values());
      this.datosTabla.forEach((c) => {
        c.opAbiertas = this.getOpAbiertas(c.id);
      });
      this.datosTabla = this.datosTabla.sort((a, b) =>
        a.razonSocial.localeCompare(b.razonSocial),
      );
    }
  }

  getOpAbiertas(id: string) {
    if (this.opAbiertas !== undefined) {
      let cantOpAbiertas = this.opAbiertas.filter((op: Operacion) => {
        let idObjeto: string | undefined;
        if (this.llamadaOrigen === "cliente") {
          idObjeto = op.cliente.id;
        } else if (this.llamadaOrigen === "chofer") {
          idObjeto = op.chofer.id;
        } else {
          const contratacion = this.choferService.getContratacionChofer(op.chofer.id);
          idObjeto = contratacion?.tipo === 'proveedor' ? contratacion.idProveedor : undefined;
        }
        return idObjeto === id;
      });

      return cantOpAbiertas.length;
    } else {
      return 0;
    }
  }

  /** Nombre para mostrar de una entidad (informe.entidad o
   *  informe.contraParte.entidad) — se distingue chofer por estructura
   *  (RefChofer no tiene razonSocial) en vez de por tipo, porque en
   *  contraParte no siempre conocemos el tipo del otro lado explícito.
   *  Pública porque el template la llama directo para la columna Cliente. */
  nombreEntidad(entidad: RefCliente | RefChofer | RefProveedor): string {
    return 'apellido' in entidad
      ? `${entidad.apellido} ${entidad.nombre}`
      : entidad.razonSocial;
  }

  mostrarMasDatos(index: number) {
    this.mostrarTabla[index] = !this.mostrarTabla[index];
    const objId = this.datosTabla[index].id;
    const informesObjetoId = this.informesOp.filter(
      (inf) => inf.entidad.id === objId,
    );
    this.informesDetalladoPorObjeto.set(objId, informesObjetoId);
  }

  liquidarBoleano(informe: InformeOpNuevo) {
    if (this.seleccionados.has(informe.idInfOp)) {
      this.seleccionados.delete(informe.idInfOp);
    } else {
      this.seleccionados.add(informe.idInfOp);
    }
    this.procesarDatosParaTabla();
  }

  selectAllCheckboxes(event: any, id: string): void {
    const seleccion = event.target.checked;
    const informesObjeto = this.informesDetalladoPorObjeto.get(id);
    informesObjeto?.forEach((inf) => {
      if (inf.estado === "proforma" || inf.bloqueadoPorContraparte) return;
      if (seleccion) {
        this.seleccionados.add(inf.idInfOp);
      } else {
        this.seleccionados.delete(inf.idInfOp);
      }
    });
    this.procesarDatosParaTabla();
  }

  cerrarTabla(index: number) {
    this.mostrarTabla[index] = !this.mostrarTabla[index];
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

  liquidarInformesObjeto(objInf: any, index: number) {
    const informesSeleccionados = this.informesOp.filter(
      (inf) => inf.entidad.id === objInf.id,
    );

    this.getEntidad(objInf);

    const alertaProforma = informesSeleccionados.some(
      (f) => f.bloqueadoPorContraparte,
    );
    if (alertaProforma && this.llamadaOrigen === "cliente") {
      Swal.fire({
        icon: "warning",
        title: "¡Atención!",
        text: "El cliente tiene operaciones asignadas a una proforma de Chofer. Las mismas no se incluyen en la liquidación",
      });
    }

    if (objInf.opAbiertas > 0) {
      Swal.fire({
        icon: "warning",
        title: "¡Atención!",
        text: `El ${this.llamadaOrigen} tiene operaciones abiertas que corresponden al periodo que se esta facturando`,
      });
    }

    const informesIdObjeto: InformeOpNuevo[] =
      this.informesDetalladoPorObjeto.get(objInf.id) ?? [];
    this.razonSocFac = objInf.razonSocial;
    this.informesLiquidados = informesIdObjeto.filter(
      (informe) =>
        this.seleccionados.has(informe.idInfOp) && informe.estado !== "proforma",
    ) as ConId<InformeOpNuevo>[];

    if (this.informesLiquidados.length > 0) {
      this.totalInformesLiquidados = 0;
      this.informesLiquidados.forEach((informe) => {
        this.totalInformesLiquidados += informe.valores.total;
      });

      this.indiceSeleccionado = index;
      this.openModalLiquidacion();
    } else {
      this.mensajesError("Debe seleccionar una factura para liquidar", "error");
    }
  }

  openModalLiquidacion(): void {
    this.mes = this.getMesCapitalizado(this.fechasConsulta.fechaDesde);
    this.anio = this.getAnio(this.fechasConsulta.fechaDesde);

    const modalRef = this.modalService.open(ResumenOpLiquidadasComponent, {
      windowClass: "modal-facturacion-xxl",
      centered: true,
    });

    let info = {
      origen: this.llamadaOrigen,
      facturas: this.informesLiquidados,
      total: this.totalInformesLiquidados,
      mesPeriodo: this.mes,
    };

    modalRef.componentInstance.fromParent = info;
    modalRef.result.then(
      (result) => {
        if (result.accion === "factura" || result.accion === "proforma") {
          let accion = result.accion;
          let columnas = result.columnas;
          let descuentos = result.descuentos;
          let periodo = result.periodo;
          let obsInterna = result.obsInterna;
          this.procesarInformeLiq(
            accion,
            columnas,
            descuentos,
            periodo,
            obsInterna,
          );
        }
      },
      (reason) => {},
    );
  }

  async procesarInformeLiq(
    accion: "factura" | "proforma",
    columnas: string[],
    descuentos: Descuento[],
    periodo: "mes" | "1° quincena" | "2° quincena",
    obsInterna: string,
  ) {
    this.isLoading = true;
    const ids = this.informesLiquidados.map((infOp) => infOp.idOperacion);
    const idsDuplicados = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (idsDuplicados.length > 0) {
      return this.mensajesError(
        "Se encontraron informes con idOperacion duplicado:",
        "error",
      );
    }
    this.compInformeLiquidacion = accion === 'factura' ? 'resumenLiq' : 'proforma'
    let parametros: CrearLiquidacionParams = {
      tipo: this.llamadaOrigen,
      informesOp: this.informesLiquidados,
      entidad: this.entidadSeleccionada,
      descuentos: descuentos,
      columnas: columnas,
      mes: this.mes,
      anio: this.anio,
      periodo: periodo,
      modo: accion,
      obsInterna: obsInterna,
    };

    const operatoria = await this.liquidacionService.crearLiquidacion(
      parametros,
      this.usuario.email,
    );

    if (operatoria.informe) this.informeDeLiquidacion = operatoria.informe
    if (operatoria.exito) {
      this.isLoading = false;
      this.storageService.logMultiplesOp(
        this.informeDeLiquidacion.operaciones,
        "LIQUIDAR",
        "operaciones",
        `Operación del ${this.llamadaOrigen} ${this.informeDeLiquidacion.entidad.razonSocial} Liquidada`,
        operatoria.exito,
      );
      this.storageService.logSimple(
        this.informeDeLiquidacion.idInfLiq,
        "ALTA",
        this.compInformeLiquidacion,
        `Alta de Factura del ${this.llamadaOrigen} ${this.informeDeLiquidacion.entidad.razonSocial}`,
        operatoria.exito,
      );
      Swal.fire({
        icon: "success",
        text: "La liquidación se procesó con éxito.",
        confirmButtonColor: "#3085d6",
        confirmButtonText: "Confirmar",
      }).then(() => {
        this.preguntarDescarga(accion);
      });
      this.mostrarMasDatos(this.indiceSeleccionado);
      this.procesarDatosParaTabla();
    } else {
      this.isLoading = false;
      this.storageService.logMultiplesOp(
        ids,
        "LIQUIDAR",
        "operaciones",
        `Error: Operación del ${this.llamadaOrigen} ${this.entidadSeleccionada.razonSocial} no liquidadas`,
        operatoria.exito,
      );
      this.storageService.logSimple(
        0,
        "ALTA",
        this.compInformeLiquidacion,
        `Error: Alta de Factura del ${this.llamadaOrigen} ${this.entidadSeleccionada.razonSocial} fallada`,
        operatoria.exito,
      );
      this.mensajesError(
        `Ocurrió un error al procesar la facturación: ${operatoria.mensaje}`,
        "error",
      );
    }
  }

  async preguntarDescarga(accion: string) {
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
      this.descargarInforme(accion, "excel");
    }
    if (result.isDenied) {
      this.descargarInforme(accion, "pdf");
    }
  }

  descargarInforme(accion: string, formato: string) {
    if (formato === "excel") {
      this.excelServ.exportToExcelInforme(
        this.informeDeLiquidacion,
        this.informesLiquidados,
        this.clientes,
        this.choferes,
        accion,
      );
    } else if (formato === "pdf") {
      this.pdfServ.exportToPdfInforme(
        this.informeDeLiquidacion,
        this.informesLiquidados,
        this.clientes,
        this.choferes,
        accion,
      );
    }
  }

  editarInformeOp(informe: InformeOpNuevo, i: number) {
    Swal.fire({
      icon: "info",
      title: "Edición temporalmente deshabilitada",
      text: "La edición de informes de operación está en migración y no está disponible por el momento.",
    });
  }

  bajaInformeOp(informeOp: InformeOpNuevo, indice: number) {
    Swal.fire({
      icon: "info",
      title: "Baja temporalmente deshabilitada",
      text: "La baja de informes de operación está en migración y no está disponible por el momento.",
    });
  }

  ordenar(columna: string): void {
    if (this.ordenColumna === columna) {
      this.ordenAscendente = !this.ordenAscendente;
    } else {
      this.ordenColumna = columna;
      this.ordenAscendente = true;
    }
    this.datosTabla.sort((a, b) => {
      const valorA = a[columna];
      const valorB = b[columna];
      if (typeof valorA === "string") {
        return this.ordenAscendente
          ? valorA.localeCompare(valorB)
          : valorB.localeCompare(valorA);
      } else {
        return this.ordenAscendente ? valorA - valorB : valorB - valorA;
      }
    });
  }

  mensajesError(msj: string, resultado: string) {
    Swal.fire({
      icon: resultado === "error" ? "error" : "success",
      text: `${msj}`,
    });
  }

  private restaurarRangoPropio() {
    const s = localStorage.getItem(this.STORAGE_RANGE_KEY);
    if (!s) return;

    const r = JSON.parse(s);

    this.dateRangeService.setRange({
      desde: new Date(r.desde),
      hasta: new Date(r.hasta),
      tipo: r.tipo,
    });
  }

  getMesCapitalizado(fechaString: string): string {
    const mes = this.datePipe.transform(fechaString, "MMMM");
    return this.capitalizeFirst(mes);
  }

  getAnio(fechaString: string): number {
    return new Date(fechaString).getFullYear();
  }

  private capitalizeFirst(texto: string | null): string {
    if (!texto) return "";
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  getEntidad(objetoSeleccionado: any) {
    const entidad = objetoSeleccionado.entidad as RefCliente | RefChofer | RefProveedor;
    this.entidadSeleccionada = {
      // TODO: EntidadLiq.id sigue en number (Ref*.id es string) — migrar
      // ambos juntos cuando se encare el módulo de finanzas/cuenta
      // corriente, que también tipa entidadId como number en 5 interfaces
      // relacionadas (ver chunk 2b-4).
      id: Number(entidad.id),
      razonSocial: this.nombreEntidad(entidad),
      cuit: entidad.cuit,
    };
  }
}

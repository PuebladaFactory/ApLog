import { Component, OnInit } from "@angular/core";
import { NgbActiveModal, NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { Chofer } from "src/app/interfaces/chofer";
import { Cliente } from "src/app/interfaces/cliente";
import { ConId } from "src/app/interfaces/conId";
import { Operacion } from "src/app/interfaces/operacion";
import {
  TarifaGralCliente,
  TarifaTipo,
} from "src/app/interfaces/tarifa-gral-cliente";
import { StorageService } from "src/app/servicios/storage/storage.service";
import { TableroService } from "src/app/servicios/tablero/tablero.service";
import Swal from "sweetalert2";
import { ModalObjetosActivosComponent } from "../modal-objetos-activos/modal-objetos-activos.component";
import { Subject, takeUntil } from "rxjs";
import { ValoresOpService } from "src/app/servicios/valores-op/valores-op/valores-op.service";
import { ModalChoferesNoDisponiblesComponent } from "../modal-choferes-no-disponibles/modal-choferes-no-disponibles.component";
import { NoDisponibilidadChofer } from "src/app/interfaces/no-disponibilidad-chofer";
import { FormatoNumericoService } from "src/app/servicios/formato-numerico/formato-numerico.service";
import { LogService } from "src/app/servicios/log/log.service";

/* =========================
   Runtime types
========================= */

export type TarifaBase = "general" | "especial" | "personalizada";

export type OperacionRuntime = Operacion & {
  tarifaBase: TarifaBase;
  tarifaOverride: "eventual" | null;
};

type GrupoTabla = {
  clienteId: number;
  razonSocial: string;
  tipo: "eventual" | "personalizada" | "especial" | "general";
  operaciones: OperacionRuntime[];
};
type VistaTab = "seleccion" | "tabla";

@Component({
  selector: "app-carga-multiple",
  standalone: false,
  templateUrl: "./carga-multiple.component.html",
  styleUrls: ["./carga-multiple.component.scss"],
})
export class CargaMultipleComponent implements OnInit {
  /* =========================
     Data
  ========================= */

  clientes: ConId<Cliente>[] = [];
  choferes: ConId<Chofer>[] = [];

  choferesActivos: ConId<Chofer>[] = [];
  choferesInactivos: ConId<Chofer>[] = [];
  clientesInactivos: ConId<Cliente>[] = [];
  clientesActivos: ConId<Cliente>[] = [];
  clientesVisibles: ConId<Cliente>[] = [];

  fechaSeleccionada: string | null = null;
  clienteSeleccionado: Cliente | null = null;

  choferesSeleccionadosIds = new Set<number>();

  operaciones: OperacionRuntime[] = [];
  operacionesAgrupadas: GrupoTabla[] = [];
  operacionesFinales: Operacion[] = [];

    // No disponibilidad
    noDisponibilidades: NoDisponibilidadChofer[] = [];
    // Resultado por fecha
    choferesNoOperativos: Chofer[] = [];
    choferesDisponibles: Chofer[] = [];
    noOperativosSet = new Set<number>()

  tarifaGeneral!: TarifaGralCliente;

  nextTempId = -1;
  contadorInterno = 0;
  isLoading = false;

  vistaActiva: VistaTab = "seleccion";

  tabs: { id: VistaTab; name: string }[] = [
    { id: "seleccion", name: "Selección" },
    { id: "tabla", name: "Operaciones" },
  ];

  destroy$ = new Subject<void>();

  constructor(
    private storageService: StorageService,
    private tableroServ: TableroService,
    public activeModal: NgbActiveModal,
    private modalService: NgbModal,
    private valoresServ: ValoresOpService,
    private formNumServ: FormatoNumericoService,
  ) {}

  /* =========================
     Init
  ========================= */

  ngOnInit(): void {
    let storedTarifa = this.storageService.loadInfo("tarifasGralCliente");
    this.tarifaGeneral = storedTarifa[0];
    this.cargarClientes();
    this.cargarChoferes();
    this.cargarNoOperativos();
  }

  cargarClientes() {
    this.storageService
      .getObservable<ConId<Cliente>>("clientes")
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.clientes = data.sort((a, b) =>
          a.razonSocial.localeCompare(b.razonSocial),
        );

        this.clientesActivos = this.clientes.filter((c) => c.activo);
        this.clientesInactivos = this.clientes.filter((c) => !c.activo);
      });
  }

  cargarChoferes() {
    this.storageService
      .getObservable<ConId<Chofer>>("choferes")
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.choferes = data.sort((a, b) =>
          a.apellido.localeCompare(b.apellido),
        );
        this.choferesActivos = this.choferes.filter((c) => c.activo);
        this.choferesInactivos = this.choferes.filter((c) => !c.activo);        
        this.separarChoferes()
      });
  }

  cargarNoOperativos(){
     // 👇 Buscar tablero existente en base de datos
    //this.cargarTableroDiario();
    this.storageService
      .getObservable<NoDisponibilidadChofer>("noOperativo")
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        if (!data) return;

        // quedarnos solo con las activas
        this.noDisponibilidades = data
          .filter((n) => n.activa)
          .map((n) => {
            const { id, type, ...clean } = n as any;
            return clean as NoDisponibilidadChofer;
          });

        // Si ya hay fecha seleccionada, recalcular
        if (this.fechaSeleccionada) {
          this.calcularChoferesNoOperativosPorFecha();
        }
      });

  }

  selectTab(id: VistaTab) {
    if (id === "tabla" && this.operaciones.length === 0) return;
    this.vistaActiva = id;
  }

  /* =========================
     Chofer selection
  ========================= */

  toggleChofer(idChofer: number, checked: boolean) {
    if (checked) this.choferesSeleccionadosIds.add(idChofer);
    else this.choferesSeleccionadosIds.delete(idChofer);
  }

  get choferesSeleccionados(): Chofer[] {
    return this.choferes.filter((c) =>
      this.choferesSeleccionadosIds.has(c.idChofer),
    );
  }

  /* =========================
     Crear operaciones
  ========================= */

  crearOperaciones() {
    console.log("cliente: ", this.clienteSeleccionado);
    
    if (!this.fechaSeleccionada) {
      return this.error("Debe seleccionar una fecha");
    }

    if (!this.clienteSeleccionado) {
      return this.error("Debe seleccionar un cliente");
    }

    if (this.choferesSeleccionados.length === 0) {
      return this.error("Debe seleccionar al menos un chofer");
    }

    this.operaciones = this.choferesSeleccionados.map((ch) =>
      this.crearOperacionRuntime(this.clienteSeleccionado!, ch),
    );

    this.reagrupar();
    this.vistaActiva = "tabla";
  }

  /* =========================
     Factory OperacionRuntime
  ========================= */

  private crearOperacionRuntime(
    cliente: Cliente,
    chofer: Chofer,
  ): OperacionRuntime {
    const tarifaTipo = this.buildTarifaTipo(cliente, chofer);
    const tarifaBase = this.getTarifaBase(tarifaTipo);
    const override = tarifaTipo.eventual ? "eventual" : null;
    const timestamp = Date.now();
    const idOperacion = Number(
      `${timestamp}${(this.contadorInterno++).toString().padStart(3, "0")}`,
    );

    const op = {
      idOperacion: idOperacion,
      fecha: this.fechaSeleccionada,

      cliente,
      chofer,

      km: 0,
      observaciones: "",
      hojaRuta: "",
      acompaniante: false,
      acompanienteCant: 0,
      facturaCliente: 0,
      facturaChofer: 0,
      valores: {
        cliente: { acompValor: 0, kmAdicional: 0, tarifaBase: 0, aCobrar: 0 },
        chofer: { acompValor: 0, kmAdicional: 0, tarifaBase: 0, aPagar: 0 },
      },
      tarifaTipo,

      // flags legacy esperados por otros componentes
      tarifaPersonalizada: {
        seccion: 0,
        categoria: 0,
        nombre: "",
        aCobrar: 0,
        aPagar: 0,
      },
      tarifaEventual: {
        chofer: { concepto: "", valor: 0 },
        cliente: { concepto: "", valor: 0 },
      },
      patenteChofer:
        chofer.vehiculo.length === 1 ? chofer.vehiculo[0].dominio : "",
      estado: {
        abierta: true,
        cerrada: false,
        facCliente: false,
        facChofer: false,
        facturada: false,
        proformaCl: false,
        proformaCh: false,
      },
      multiplicadorCliente: 1,
      multiplicadorChofer: 1,
      // 🔹 runtime
      tarifaBase,
      tarifaOverride: override,
    } as unknown as OperacionRuntime;

    (op as any).originalEventual = tarifaTipo.eventual;

    this.syncFlags(op);

    return op;
  }

  /* =========================
     Tarifa helpers
  ========================= */

  private buildTarifaTipo(cliente: Cliente, chofer: Chofer): TarifaTipo {
    if (cliente.tarifaTipo?.eventual || chofer.tarifaTipo?.eventual) {
      return {
        general: false,
        especial: false,
        eventual: true,
        personalizada: false,
      };
    }

    if (cliente.tarifaTipo?.personalizada) {
      return {
        general: false,
        especial: false,
        eventual: false,
        personalizada: true,
      };
    }

    if (cliente.tarifaTipo?.especial || chofer.tarifaTipo?.especial) {
      return {
        general: false,
        especial: true,
        eventual: false,
        personalizada: false,
      };
    }

    return {
      general: true,
      especial: false,
      eventual: false,
      personalizada: false,
    };
  }

  private getTarifaBase(t: TarifaTipo): TarifaBase {
    if (t.personalizada) return "personalizada";
    if (t.especial) return "especial";
    return "general";
  }

  private syncFlags(op: OperacionRuntime) {
    const activa = this.getTarifaActiva(op);

    op.tarifaTipo.general = activa === "general";
    op.tarifaTipo.especial = activa === "especial";
    op.tarifaTipo.personalizada = activa === "personalizada";
    op.tarifaTipo.eventual = activa === "eventual";
  }

  getTarifaActiva(op: OperacionRuntime) {
    return op.tarifaOverride ?? op.tarifaBase;
  }

  /* =========================
     Agrupar para tabla
  ========================= */

  reagrupar() {
    if (!this.operaciones.length) {
      this.operacionesAgrupadas = [];
      return;
    }

    const cliente = this.operaciones[0].cliente;

    this.operacionesAgrupadas = [
      {
        clienteId: cliente.idCliente,
        razonSocial: cliente.razonSocial,
        tipo: this.getTarifaActiva(this.operaciones[0]),
        operaciones: this.operaciones,
      },
    ];

    console.log("operacionesAgrupadas: ", this.operacionesAgrupadas);
  }

  /* =========================
     Eliminar desde tabla
  ========================= */

  eliminarOperacion(op: OperacionRuntime) {
    this.operaciones = this.operaciones.filter(
      (o) => o.idOperacion !== op.idOperacion,
    );

    this.reagrupar();
  }

  /* =========================
     Guardar
  ========================= */

  async guardar() {
    if (this.operaciones.length === 0) {
      return this.error("No hay operaciones para guardar");
    }

    const errores = this.operaciones.flatMap((op) => this.validarOperacion(op));

    if (errores.length) {
      Swal.fire({
        icon: "error",
        title: "Validación",
        html: errores.join("<br>"),
      });
      return;
    }

    const confirm = await Swal.fire({
      title: "¿Confirmar el alta de las operaciones?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Guardar",
    });

    if (!confirm.isConfirmed) return;

    //this.isLoading = true;

    try {
      // sync runtime → legacy flags
      this.operaciones.forEach((op) => this.syncFlags(op));

      this.operaciones.forEach(op => {            
        delete (op as any).originalEventual;
      });

      // strip runtime props
      this.operacionesFinales = this.operaciones.map((op) => {
        const { tarifaBase, tarifaOverride, ...clean } = op;
        return clean as Operacion;
      });      

      

      this.operacionesFinales = this.operacionesFinales.map((op) => {
        return this.valoresIniciales(op);
      });

      console.log("persistibles: ", this.operacionesFinales);

      await this.tableroServ.altaMultipleOperacionesYActualizarTablero(
        this.operacionesFinales,
      );

      Swal.fire("OK", "Operaciones guardadas", "success");

      this.reset();

      this.activeModal.close();
    } catch (e) {
      Swal.fire("Error", "No se pudieron guardar", "error");
    }

    //this.isLoading = false;
  }

  valoresIniciales(op: Operacion): Operacion {
    if (op.tarifaTipo.general || op.tarifaTipo.especial) {
      op = this.valoresServ.valoresIniciales(op);
    }
    if (op.tarifaTipo.personalizada) {
      op.valores.cliente.aCobrar = op.tarifaPersonalizada.aCobrar;
      op.valores.chofer.aPagar = op.tarifaPersonalizada.aPagar;
    }
    if (op.tarifaTipo.eventual) {
      op.tarifaEventual.cliente.valor = this.formNumServ.convertirAValorNumerico(op.tarifaEventual.cliente.valor);
      op.tarifaEventual.chofer.valor = this.formNumServ.convertirAValorNumerico(op.tarifaEventual.chofer.valor);
      op.valores.cliente.aCobrar = op.tarifaEventual.cliente.valor;
      op.valores.chofer.aPagar = op.tarifaEventual.chofer.valor;
    }
    op.valores.cliente.tarifaBase = op.valores.cliente.aCobrar;
    op.valores.chofer.tarifaBase = op.valores.chofer.aPagar;

    if(op.acompaniante) {
      op = this.valoresServ.valoresOpAcompaniante(op);
    }
    op = this.valoresServ.recalcularValores(op);

    return op;
  }

  /* =========================
     Reset
  ========================= */

  reset() {
    this.operaciones = [];
    this.operacionesAgrupadas = [];
    this.choferesSeleccionadosIds.clear();
  }

  /* =========================
     Utils
  ========================= */

  private error(msg: string) {
    Swal.fire("Error", msg, "error");
  }

  /* =========================
     MODALES CLIENTES/CHOFERES ACTIVOS
  ========================= */

  openModalActivos(modo: string) {
    {
      const modalRef = this.modalService.open(ModalObjetosActivosComponent, {
        windowClass: "myCustomModalClass",
        centered: true,
        size: "lg",
      });
      modalRef.componentInstance.fromParent = {
        coleccion: modo,
        objetos: modo === "clientes" ? this.clientes : this.choferes,
        inactivos:
          modo === "clientes" ? this.clientesInactivos : this.choferesInactivos,
      };

      modalRef.result.then(
        (result) => {},
        (reason) => {},
      );
    }
  }
  /* =========================
     CHOFERES  NO OPERATIVOS 
  ========================= */


  openModalNoOperativos() {
    {
      const modalRef = this.modalService.open(
        ModalChoferesNoDisponiblesComponent,
        {
          windowClass: "myCustomModalClass",
          centered: true,
          size: "lg",
        },
      );
    }
  }

    public calcularChoferesNoOperativosPorFecha(): void {
    this.noOperativosSet.clear();
    this.choferesNoOperativos = [];
    this.choferesDisponibles = [];

    const fechaMs = new Date(this.fechaSeleccionada + "T00:00:00").getTime();

    // 1️⃣ Armar Set de ids no disponibles
    for (const nd of this.noDisponibilidades) {
      const desdeMs = new Date(nd.desde + "T00:00:00").getTime();
      const hastaMs = nd.hasta
        ? new Date(nd.hasta + "T23:59:59").getTime()
        : null;

      const estaEnRango =
        fechaMs >= desdeMs && (hastaMs === null || fechaMs <= hastaMs);

      if (estaEnRango) {
        this.noOperativosSet.add(nd.idChofer);
      }
    }

    this.separarChoferes()
  }

  separarChoferes(){
    if(this.fechaSeleccionada){
 // 2️⃣ Separar choferes activos
    for (const chofer of this.choferesActivos) {
      if (this.noOperativosSet.has(chofer.idChofer)) {
        this.choferesNoOperativos.push(chofer);
      } else {
        this.choferesDisponibles.push(chofer);
      }
    }
    } else {
      this.choferesDisponibles = this.choferesActivos
    }
   
  }


  /* =========================
     HELPERS UI
  ========================= */

  getClaseCategoria(catOrden: number): string {
    const orden = catOrden;

    if (orden === null) return "bg-light text-dark";

    const index = this.tarifaGeneral.cargasGenerales.findIndex(
      (cat) => cat.orden === orden,
    );

    return (
      this.sectionColorClasses[index % this.sectionColorClasses.length] ||
      "bg-light text-dark"
    );
  }

  sectionColorClasses: string[] = [
    "bg-primary text-white",
    "bg-success text-white",
    "bg-warning text-dark",
    "bg-info text-dark",
    "bg-danger text-white",
    "bg-secondary text-white",
    "bg-dark text-white",
  ];

  
  // =========================
  // VALIDACION (usa runtime)
  // =========================

  validarOperacion(op: OperacionRuntime): string[] {
    const errores: string[] = [];

    if (!op.patenteChofer?.trim()) {
      errores.push(`Debe seleccionar patente — ${op.chofer.apellido}`);
    }

    const activa = this.getTarifaActiva(op);

    if (activa === "eventual") {
      if (!op.tarifaEventual.chofer.concepto)
        errores.push("Concepto chofer eventual faltante");
      if (!op.tarifaEventual.cliente.concepto)
        errores.push("Concepto cliente eventual faltante");
    }

    if (activa === "personalizada") {
      if (op.tarifaPersonalizada.seccion <= 0)
        errores.push("Sección personalizada faltante");
      if (op.tarifaPersonalizada.categoria <= 0)
        errores.push("Categoría personalizada faltante");
    }

    if(op.acompaniante && op.acompanienteCant === 0){
      errores.push("La cantidad de acompañantes no puede ser 0")
    }

    return errores;
  }

  tieneErrores(op: OperacionRuntime) {
    return this.validarOperacion(op).length > 0;
  }
}

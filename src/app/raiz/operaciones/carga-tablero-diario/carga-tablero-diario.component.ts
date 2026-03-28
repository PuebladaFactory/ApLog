import {
  ChangeDetectorRef,
  Component,
  Input,
  OnDestroy,
  OnInit,
} from "@angular/core";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";
import { Cliente } from "src/app/interfaces/cliente";
import { Chofer } from "src/app/interfaces/chofer";
import { ConId, ConIdType } from "src/app/interfaces/conId";
import { StorageService } from "src/app/servicios/storage/storage.service";
import {
  Operacion,
  TarifaEventual,
  Valores,
} from "src/app/interfaces/operacion";
import {
  CategoriaTarifa,
  TarifaPersonalizadaCliente,
} from "src/app/interfaces/tarifa-personalizada-cliente";
import Swal from "sweetalert2";
import { FormatoNumericoService } from "src/app/servicios/formato-numerico/formato-numerico.service";
import { TarifaGralCliente } from "src/app/interfaces/tarifa-gral-cliente";
import { BuscarTarifaService } from "src/app/servicios/buscarTarifa/buscar-tarifa.service";
import { ChoferAsignadoBase } from "../tablero-diario/tablero-diario.component";
import { ValoresOpService } from "src/app/servicios/valores-op/valores-op/valores-op.service";

// 🔹 Tipo runtime SOLO para este componente — no rompe interfaz persistida
type OperacionRuntime = Operacion & {
  tarifaBase: "general" | "especial" | "personalizada";
  tarifaOverride: "eventual" | null;
};

type ChoferAsignado = ConId<Chofer> & {
  hojaDeRuta?: string;
  observaciones?: string;
  tEventual: boolean;
  categoriaAsignada?: any;
  conceptoChofer?: string;
  valorChofer?: number;
  conceptoCliente?: string;
  valorCliente?: number;
};

@Component({
  selector: "app-carga-tablero-diario",
  standalone: false,
  templateUrl: "./carga-tablero-diario.component.html",
  styleUrl: "./carga-tablero-diario.component.scss",
})
export class CargaTableroDiarioComponent implements OnInit, OnDestroy {
  @Input() fromParent!: { item: any[] };

  // 🔸 Se mantiene Operacion[] para no romper contrato externo
  operaciones: OperacionRuntime[] = [];

  operacionesAgrupadas: {
    clienteId: number;
    razonSocial: string;
    tipo: "eventual" | "personalizada" | "especial" | "general";
    operaciones: OperacionRuntime[];
  }[] = [];

  clientes: ConIdType<Cliente>[] = [];
  fecha: string = "";
  tarifasPersonalizadas: TarifaPersonalizadaCliente[] = [];
  tarifaGralCliente!: ConId<TarifaGralCliente>;
  tarifaEspCliente!: ConId<TarifaGralCliente>;
  tarifaPersCliente!: ConId<TarifaPersonalizadaCliente>;
  tarifaGralChofer!: ConId<TarifaGralCliente>;
  tarifaEspChofer!: ConId<TarifaGralCliente>;
  tarifaGralProveedor!: ConId<TarifaGralCliente>;
  tarifaEspProveedor!: ConId<TarifaGralCliente>;

  constructor(
    public activeModal: NgbActiveModal,
    private storageService: StorageService,
    private formNumServ: FormatoNumericoService,
    private buscarTarifaServ: BuscarTarifaService,
    private cdr: ChangeDetectorRef,
    private valoresServ: ValoresOpService,
  ) {}

  ngOnDestroy(): void {}

  ngOnInit(): void {
    const storedClientes = localStorage.getItem("clientes");
    this.clientes = storedClientes ? JSON.parse(storedClientes) : [];

    const entradas = this.fromParent.item;

    this.fecha = entradas[0]?.fecha || "";
    this.tarifasPersonalizadas =
      this.storageService.loadInfo("tarifasPersCliente") || [];

    const operacionesGeneradas: OperacionRuntime[] = [];
    let contadorInterno = 0;

    for (const entrada of entradas) {
      const clienteComp = this.clientes.find(
        (c) => c.idCliente === entrada.clienteId,
      );
      if (!clienteComp) continue;

      let { id, type, ...cliente } = clienteComp;

      for (const chofer of entrada.choferes as ChoferAsignado[]) {
        const tarifaTipo = this.getTarifaTipo(cliente, chofer);

        const timestamp = Date.now();
        const idOperacion = Number(
          `${timestamp}${(contadorInterno++).toString().padStart(3, "0")}`,
        );

        const op = {
          idOperacion,
          fecha: entrada.fecha,
          km: 0,
          cliente,
          chofer,
          observaciones: chofer.observaciones || "",
          hojaRuta: chofer.hojaDeRuta || "",
          acompaniante: false,
          acompanienteCant: 0,
          facturaCliente: 0,
          facturaChofer: 0,
          tarifaEventual: {
            chofer: { concepto: "", valor: 0 },
            cliente: { concepto: "", valor: 0 },
          },
          tarifaPersonalizada: {
            seccion: 0,
            categoria: 0,
            nombre: "",
            aCobrar: 0,
            aPagar: 0,
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
          tarifaTipo,
          valores: {
            cliente: {
              acompValor: 0,
              kmAdicional: 0,
              tarifaBase: 0,
              aCobrar: 0,
            },
            chofer: { acompValor: 0, kmAdicional: 0, tarifaBase: 0, aPagar: 0 },
          },
          multiplicadorCliente: 1,
          multiplicadorChofer: 1,

          // 🔹 runtime
          tarifaBase: this.calcularTarifaBase(tarifaTipo),
          tarifaOverride:
            chofer.tEventual || cliente.tarifaTipo?.eventual
              ? "eventual"
              : null,
        } as unknown as OperacionRuntime;

        // extras legacy
        (op as any).tarifaTipoOriginal = { ...op.tarifaTipo };
        (op as any).originalEventual = tarifaTipo.eventual;
        (op as any).categoriaAsignada = chofer.categoriaAsignada;

        this.syncTarifaFlags(op);
        operacionesGeneradas.push(op);
      }
    }

    this.operaciones = operacionesGeneradas;
    this.agruparOperacionesPorCliente();
  }

  // =========================
  // TARIFAS — MODELO RUNTIME
  // =========================

  calcularTarifaBase(
    t: Operacion["tarifaTipo"],
  ): OperacionRuntime["tarifaBase"] {
    if (t.personalizada) return "personalizada";
    if (t.especial) return "especial";
    return "general";
  }

  getTarifaActiva(op: OperacionRuntime) {
    return op.tarifaOverride ?? op.tarifaBase;
  }

  syncTarifaFlags(op: OperacionRuntime) {
    const activa = this.getTarifaActiva(op);

    op.tarifaTipo.general = activa === "general";
    op.tarifaTipo.especial = activa === "especial";
    op.tarifaTipo.personalizada = activa === "personalizada";
    op.tarifaTipo.eventual = activa === "eventual";
  }

  toggleEventual(op: OperacionRuntime, value: boolean) {
    op.tarifaOverride = value ? "eventual" : null;

    if (!value) {
      op.tarifaEventual.chofer = { concepto: "", valor: 0 };
      op.tarifaEventual.cliente = { concepto: "", valor: 0 };
    }

    this.syncTarifaFlags(op);
    this.cdr.detectChanges();
  }

  // =========================

  getTarifaTipo(cliente: Cliente, chofer: ConId<Chofer>) {
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

  agruparOperacionesPorCliente(): void {
    const mapa = new Map<number, OperacionRuntime[]>();

    for (const op of this.operaciones) {
      if (!mapa.has(op.cliente.idCliente)) mapa.set(op.cliente.idCliente, []);
      mapa.get(op.cliente.idCliente)!.push(op);
    }

    this.operacionesAgrupadas = Array.from(mapa.entries()).map(
      ([clienteId, operaciones]) => {
        const razonSocial = operaciones[0].cliente.razonSocial;
        const tipo = this.getTarifaActiva(operaciones[0]);
        return { clienteId, razonSocial, tipo, operaciones };
      },
    );
  }

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

  // =========================
  // GUARDAR — SIN ROMPER CONTRATO
  // =========================

  guardar(): void {
    for (const op of this.operaciones) {
      this.syncTarifaFlags(op);
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

    Swal.fire({
      title: `¿Desea dar de alta las operaciones con fecha ${this.fecha}?`,
      //text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Agregar",
      cancelButtonText: "Cancelar",
    }).then((result) => {
      if (result.isConfirmed) {

        const asignaciones: { [idCliente: number]: ChoferAsignadoBase[] } = {};

        for (const op of this.operaciones) {
          const idCliente = op.cliente.idCliente;

          const a: ChoferAsignadoBase = {
            idChofer: op.chofer.idChofer,
            categoriaAsignada: (op as any).categoriaAsignada,
            observaciones: op.observaciones,
            hojaDeRuta: op.hojaRuta,
            tEventual: op.tarifaTipo.eventual,
            idOperacion: op.idOperacion,
          };

          if (!asignaciones[idCliente]) asignaciones[idCliente] = [];
          asignaciones[idCliente].push(a);
        }

        this.operaciones.forEach(op => {
          delete (op as any).categoriaAsignada;
          delete (op as any).tarifaTipoOriginal;
          delete (op as any).originalEventual;
        });

        // 🔹 convertir a Operacion persistible

        const operacionesFinales: Operacion[] = this.operaciones.map((op) => {
          const { tarifaBase, tarifaOverride, ...persistible } = op;
          return persistible;
        });


        operacionesFinales.map((op) => {
          op = this.valoresIniciales(op);
        });

        this.limpiarPropiedadesChoferEnOperaciones(operacionesFinales);
        console.log("operacionesFinales: ", operacionesFinales);
        console.log("asignaciones: ", asignaciones);

        this.activeModal.close({
          operaciones: operacionesFinales,
          asignaciones,
        });
      }
    });
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

  
  private limpiarPropiedadesChoferEnOperaciones(operaciones: Operacion[]): void {
    operaciones.map(op => {
      const choferOriginal: Chofer = {
        idChofer: op.chofer.idChofer,
        nombre: op.chofer.nombre,
        apellido: op.chofer.apellido,
        cuit: op.chofer.cuit,
        celularContacto: op.chofer.celularContacto,
        celularEmergencia: op.chofer.celularEmergencia,
        contactoEmergencia: op.chofer.contactoEmergencia,
        direccion: op.chofer.direccion,
        email: op.chofer.email,
        fechaNac: op.chofer.fechaNac,
        vehiculo: op.chofer.vehiculo,
        condFiscal: op.chofer.condFiscal,
        idProveedor: op.chofer.idProveedor,
        tarifaTipo: op.chofer.tarifaTipo,
        tarifaAsignada: op.chofer.tarifaAsignada,
        idTarifa: op.chofer.idTarifa,
        activo: op.chofer.activo,
        visible: op.chofer.visible ?? false
      };

      op.chofer = choferOriginal;
    });
  }
}

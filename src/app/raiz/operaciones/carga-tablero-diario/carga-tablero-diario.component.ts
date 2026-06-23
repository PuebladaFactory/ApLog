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
  DatosTarifaEventual,
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
type OperacionRuntime = Omit<Operacion, 'chofer'> & {
  // TODO: refactor Carga/Tablero — runtime carga Chofer completo (legacy). El refactor migrará a RefChofer.
  chofer: Chofer;
  // TODO: refactor Carga/Tablero — campo legacy; la selección de vehículo debe migrar a op.vehiculo.
  patenteChofer?: string;
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
        const idOperacion = `${timestamp}${(contadorInterno++).toString().padStart(3, "0")}`;

        const op = {
          idOperacion,
          fecha: entrada.fecha,
          km: 0,
          cliente,
          chofer,
          observaciones: chofer.observaciones || "",
          hojaRuta: chofer.hojaDeRuta || "",
          acompaniante: false,
          acompanianteCant: 0,
          informeOpCliente: 0,
          informeOpChofer: 0,
          datosTarifaEventual: {
            chofer: { concepto: "", valor: 0 },
            cliente: { concepto: "", valor: 0 },
          },
          datosTarifaPersonalizada: {
            seccion: 0,
            categoria: 0,
            nombre: "",
            aCobrar: 0,
            aPagar: 0,
          },
          patenteChofer: "",
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
      // TODO: refactor Tarifas — datosTarifaEventual inicializado por la factory (nunca null en runtime).
      op.datosTarifaEventual!.chofer = { concepto: "", valor: 0 };
      op.datosTarifaEventual!.cliente = { concepto: "", valor: 0 };
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
    const mapa = new Map<string, OperacionRuntime[]>();

    for (const op of this.operaciones) {
      if (!mapa.has(op.cliente.id)) mapa.set(op.cliente.id, []);
      mapa.get(op.cliente.id)!.push(op);
    }

    this.operacionesAgrupadas = Array.from(mapa.entries()).map(
      ([clienteId, operaciones]) => {
        const razonSocial = operaciones[0].cliente.razonSocial;
        const tipo = this.getTarifaActiva(operaciones[0]);
        return { clienteId: Number(clienteId), razonSocial, tipo, operaciones }; // TODO: migrar a string cuando se refactorice este módulo
      },
    );
  }

  // =========================
  // VALIDACION (usa runtime)
  // =========================

  validarOperacion(op: OperacionRuntime): string[] {
    const errores: string[] = [];

    if (!op.patenteChofer?.trim()) {
      errores.push(`Debe seleccionar patente — ${op.chofer.datosPersonales.apellido}`);
    }

    const activa = this.getTarifaActiva(op);

    if (activa === "eventual") {
      if (!op.datosTarifaEventual!.chofer.concepto)
        errores.push("Concepto chofer eventual faltante");
      if (!op.datosTarifaEventual!.cliente.concepto)
        errores.push("Concepto cliente eventual faltante");
    }

    if (activa === "personalizada") {
      if (op.datosTarifaPersonalizada!.seccion <= 0)
        errores.push("Sección personalizada faltante");
      if (op.datosTarifaPersonalizada!.categoria <= 0)
        errores.push("Categoría personalizada faltante");
    }

    if(op.acompaniante && op.acompanianteCant === 0){
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

        const asignaciones: { [idCliente: string]: ChoferAsignadoBase[] } = {};

        for (const op of this.operaciones) {
          const idCliente = op.cliente.id;

          const a: ChoferAsignadoBase = {
            idChofer: (op.chofer as ConId<Chofer>).id,
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
          return persistible as unknown as Operacion;
        });


        operacionesFinales.map((op) => {
          op = this.valoresIniciales(op);
        });

        // TODO: refactor Tablero de asignaciones — método del modelo viejo (Chofer embebido).
        // Las ops ya llevan RefChofer; el componente destino guarda con ese snapshot. Sin propósito actual.
        // this.limpiarPropiedadesChoferEnOperaciones(operacionesFinales);
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
      // TODO: refactor Tarifas — invariante: personalizada ⟺ datosTarifaPersonalizada !== null
      op.valores.cliente.aCobrar = op.datosTarifaPersonalizada!.aCobrar;
      op.valores.chofer.aPagar = op.datosTarifaPersonalizada!.aPagar;
    }
    if (op.tarifaTipo.eventual) {
      // TODO: refactor Tarifas — invariante: eventual ⟺ datosTarifaEventual !== null
      op.datosTarifaEventual!.cliente.valor = this.formNumServ.convertirAValorNumerico(op.datosTarifaEventual!.cliente.valor);
      op.datosTarifaEventual!.chofer.valor = this.formNumServ.convertirAValorNumerico(op.datosTarifaEventual!.chofer.valor);
      op.valores.cliente.aCobrar = op.datosTarifaEventual!.cliente.valor;
      op.valores.chofer.aPagar = op.datosTarifaEventual!.chofer.valor;
    }
    op.valores.cliente.tarifaBase = op.valores.cliente.aCobrar;
    op.valores.chofer.tarifaBase = op.valores.chofer.aPagar;

    if(op.acompaniante) {
      op = this.valoresServ.valoresOpAcompaniante(op);
    }
    op = this.valoresServ.recalcularValores(op);

    return op;
  }

  
  // TODO: refactor Tablero de asignaciones — método del modelo viejo, reconstruía un Chofer
  // completo desde el snapshot. Las ops ahora llevan RefChofer; el método no tiene propósito y
  // accede a campos inexistentes en RefChofer. Comentado hasta el refactor del Tablero.
  // private limpiarPropiedadesChoferEnOperaciones(operaciones: Operacion[]): void {
  //   operaciones.map(op => {
  //     op.chofer = {
  //       idChofer: op.chofer.idChofer,
  //       datosPersonales: op.chofer.datosPersonales,
  //       condFiscal: op.chofer.condFiscal,
  //       contratacion: op.chofer.contratacion,
  //       tarifaTipo: op.chofer.tarifaTipo,
  //       tarifaAsignada: op.chofer.tarifaAsignada,
  //       idTarifa: op.chofer.idTarifa,
  //       activo: op.chofer.activo,
  //       visible: op.chofer.visible ?? false,
  //     };
  //   });
  // }
}

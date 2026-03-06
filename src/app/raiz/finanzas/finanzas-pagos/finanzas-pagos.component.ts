import { Component, numberAttribute, OnInit } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { ConId } from "src/app/interfaces/conId";
import { InformeLiq } from "src/app/interfaces/informe-liq";
import { MovimientoFinancieroComponent } from "../modales/movimiento-financiero/movimiento-financiero.component";
import { MovimientoFinancieroService } from "src/app/servicios/finanzas/movimiento-financiero.service";
import { StorageService } from "src/app/servicios/storage/storage.service";
import { Chofer } from "src/app/interfaces/chofer";
import { Proveedor } from "src/app/interfaces/proveedor";
import { MovimientoFormVM } from "src/app/interfaces/movimiento-form-v-m";
import Swal from "sweetalert2";

interface InformeSeleccionadoVM {
  id: string;
  numeroInterno: string;
  fecha: string;
  saldo: number;
  total: number;
  seleccionado: boolean;
}

@Component({
  selector: "app-finanzas-pagos",
  standalone: false,
  templateUrl: "./finanzas-pagos.component.html",
  styleUrl: "./finanzas-pagos.component.scss",
})
export class FinanzasPagosComponent implements OnInit {
  tipoEntidad: "chofer" | "proveedor" = "chofer";

  entidadSeleccionada: any = null;
  entidadesSeleccionadas: any[] = [null];
  entidadId: number | null = null;

  informes: ConId<InformeLiq>[] = [];

  informesVM: InformeSeleccionadoVM[] = [];

  informesPendientes: ConId<InformeLiq>[] = [];
  informesSeleccionados: ConId<InformeLiq>[] = [];

  cargando = false;

  choferes: ConId<Chofer>[] = [];
  proveedores: ConId<Proveedor>[] = [];

  constructor(
    private storageService: StorageService,
    private movFinancieroServ: MovimientoFinancieroService,
    private modal: NgbModal,
  ) {}

  ngOnInit(): void {
    this.choferes = this.storageService.loadInfo("choferes");
    this.choferes = this.choferes.sort((a, b) =>
      a.apellido.localeCompare(b.apellido),
    );
    this.proveedores = this.storageService.loadInfo("proveedores");
    this.proveedores = this.proveedores.sort((a, b) =>
      a.razonSocial.localeCompare(b.razonSocial),
    );
    this.onEntidades();
  }

  onEntidades() {
    this.entidadesSeleccionadas =
    this.tipoEntidad === "chofer" ? this.choferes : this.proveedores;
    this.informesPendientes = [];
    this.informesSeleccionados = [];
    //console.log(this.entidadesSeleccionadas);
  }

  getEntidad(ent: any): string {
    ////console.log("getEntidad: ",ent);    
    let razonSocial;
    let chofer;
    let proveedor;
    if (this.tipoEntidad === "chofer") {
      chofer = this.choferes.find((c) => c.idChofer === ent.idChofer);
      if (chofer) {
        razonSocial = chofer.apellido + " " + chofer.nombre;
      } else {
        razonSocial = "";
      }
    } else {
      proveedor = this.proveedores.find(
        (c) => c.idProveedor === ent.idProveedor,
      );
      if (proveedor) {
        razonSocial = proveedor.razonSocial;
      } else {
        razonSocial = "";
      }
    }
    return razonSocial;
  }

  // ============================
  // Buscar informes pendientes
  // ============================

  async buscarInformes() {
    if (!this.entidadSeleccionada) return;

    this.cargando = true;

    const informes =
      await this.movFinancieroServ.getInformesPendientesPorEntidad(
        this.entidadSeleccionada.id,
      );

    this.informes = informes;

    this.informesVM = informes.map((i) => ({
      id: i.id,
      numeroInterno: i.numeroInterno,
      fecha:
        typeof i.fecha === "string"
          ? i.fecha
          : i.fecha.toISOString().substring(0, 10),
      saldo: i.valoresFinancieros?.saldo ?? 0,
      total: i.valoresFinancieros?.total ?? 0,
      seleccionado: false,
    }));

    this.cargando = false;
  }

  // ============================
  // Selección de entidad & busqueda de informes pendientes
  // ============================

  async onEntidadSeleccionada(e: any) {
    console.log("e: ", e);
        if (!e || !this.tipoEntidad) {
      this.entidadId = null;
      return;
    }    
    this.entidadSeleccionada = e

    if (!this.entidadSeleccionada) return;
    this.informesPendientes = [];
    this.informesSeleccionados = [];

    // 🔹 resolver id según tipo (tu modelo actual)

    if (this.tipoEntidad === "chofer") {
      this.entidadId = e.idChofer;
    }

    if (this.tipoEntidad === "proveedor") {
      this.entidadId = e.idProveedor;
    }
    console.log("this.entidadId: ", this.entidadId);
    
     
    

    console.log("this.entidadSeleccionada: ", this.entidadSeleccionada);
    //console.log("aca?");
    this.informesPendientes = [];
    this.informesSeleccionados = [];

    
    this.cargando = true;
    try {
      // 🔜 reemplazar por query real
      const informes =
        await this.movFinancieroServ.getInformesPendientesPorEntidad(
          this.entidadId ?? 0,
        );
      //console.log("informes", informes);

      this.informesPendientes = informes.map((inf) =>
        this.normalizarValoresFinancieros(inf),
      );
      this.informesPendientes = this.informesPendientes.sort((a, b) =>
        a.numeroInterno.localeCompare(b.numeroInterno),
      );
      
      
      //console.log("this.informesPendientes: ", this.informesPendientes);
    } catch (error) {
      console.error("Error cargando informes pendientes", error);
    } finally {
      this.cargando = false;
    }
  }

  // ============================
  // Abrir registro de pago
  // ============================

  puedeRegistrarPago(): boolean {
    return (
      !!this.entidadId &&
      this.informesSeleccionados.length > 0 &&
      this.saldoSeleccionado > 0
    );
  }

  registrarPago() {
    if (!this.puedeRegistrarPago()) return;
    let usuario = this.storageService.loadInfo("usuario");
    //console.log("usuario: ", usuario);

    let razonSocial =
      this.tipoEntidad === "chofer"
        ? this.entidadSeleccionada.apellido +
          " " +
          this.entidadSeleccionada.nombre
        : this.entidadSeleccionada.razonSocial;

    const modalRef = this.modal.open(MovimientoFinancieroComponent, {
      size: "lg",
      backdrop: "static",
    });

    modalRef.componentInstance.tipo = "pago";

    modalRef.componentInstance.entidad = {
      id: this.entidadId,
      razonSocial: razonSocial,
      tipo: this.tipoEntidad,
    };

    modalRef.componentInstance.informes = this.informesSeleccionados;

    modalRef.result.then(
      async (form: MovimientoFormVM) => {
        try {
          console.log("form: ", form);
          // 🔥 acá va el service real
          const movimientoId =
            await this.movFinancieroServ.registrarMovimientoFinanciero(
              form,
              usuario[0].email,
            );
          Swal.fire("OK", "Pago registrado correctamente", "success");

          // refrescar informes
          await this.onEntidadSeleccionada(this.entidadSeleccionada);
          this.storageService.logSimple(
            movimientoId,
            "PAGO",
            "movimientos",
            `Pago del ${form.entidad.tipo} ${form.entidad.razonSocial} registrado`,
            true,
          );
        } catch (err) {
          console.error(err);
          Swal.fire("Error", "No se pudo registrar el cobro", "error");
        }
      },
      () => {
        // modal cancelado → no hacemos nada
      },
    );
  }

  /* ===============================
     NORMALIZACIÓN FINANCIERA
     =============================== */

  private normalizarValoresFinancieros(
    inf: ConId<InformeLiq>,
  ): ConId<InformeLiq> {
    if (!inf.valoresFinancieros) {
      return {
        ...inf,
        valoresFinancieros: {
          total: inf.valores.total,
          totalCobrado: 0,
          saldo: inf.valores.total,
        },
      };
    }

    return inf;
  }

  /* ===============================
     SELECCIÓN DE INFORMES
     =============================== */

  toggleSeleccion(inf: ConId<InformeLiq>, checked: boolean): void {
    if (checked) {
      this.informesSeleccionados.push(inf);
    } else {
      this.informesSeleccionados = this.informesSeleccionados.filter(
        (i) => i.id !== inf.id,
      );
    }
  }

  estaSeleccionado(inf: ConId<InformeLiq>): boolean {
    return this.informesSeleccionados.some((i) => i.id === inf.id);
  }

  /* ===============================
     TOTALES (DERIVADOS)
     =============================== */

  get totalSeleccionado(): number {
    return this.informesSeleccionados.reduce(
      (acc, inf) => acc + (inf.valoresFinancieros?.total ?? 0),
      0,
    );
  }

  get totalCobradoSeleccionado(): number {
    return this.informesSeleccionados.reduce(
      (acc, inf) => acc + (inf.valoresFinancieros?.totalCobrado ?? 0),
      0,
    );
  }

  get saldoSeleccionado(): number {
    return this.informesSeleccionados.reduce(
      (acc, inf) => acc + (inf.valoresFinancieros?.saldo ?? 0),
      0,
    );
  }
}

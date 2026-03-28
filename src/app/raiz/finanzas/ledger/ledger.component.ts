import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { Chofer } from "src/app/interfaces/chofer";
import { Cliente } from "src/app/interfaces/cliente";
import { ConId } from "src/app/interfaces/conId";
import { InformeLiq } from "src/app/interfaces/informe-liq";
import { InformeOp } from "src/app/interfaces/informe-op";
import { Ledger } from "src/app/interfaces/ledger";
import { Proveedor } from "src/app/interfaces/proveedor";
import { CuentaCorrienteService } from "src/app/servicios/cuenta-corriente/cuenta-corriente.service";
import { DbFirestoreService } from "src/app/servicios/database/db-firestore.service";
import { StorageService } from "src/app/servicios/storage/storage.service";
import { InformeLiqDetalleComponent } from "src/app/shared/modales/informe-liq-detalle/informe-liq-detalle.component";
import Swal from "sweetalert2";

@Component({
  selector: "app-ledger",
  standalone: false,
  templateUrl: "./ledger.component.html",
  styleUrl: "./ledger.component.scss",
})
export class LedgerComponent implements OnInit {
  tipoEntidad: "chofer" | "proveedor" | "cliente" | null = null;

  entidadSeleccionada: any = null;
  entidadesSeleccionadas: any[] = [null];
  entidadId: number | null = null;

  ledger: Ledger[] = [];

  clientes: ConId<Cliente>[] = [];
  choferes: ConId<Chofer>[] = [];
  proveedores: ConId<Proveedor>[] = [];
  usuario!: any;
  cargando: boolean = false;

  informesOp: ConId<InformeOp>[] = [];

  sort = {
    campo: "",
    direccion: "asc" as "asc" | "desc",
  };

  searchText: string = " ";


  constructor(
    private cuentaCorrienteService: CuentaCorrienteService,
    private storageService: StorageService,
    private router: Router,
    private dbService: DbFirestoreService,
    private modalService: NgbModal,
  ) {}

  ngOnInit() {
    this.clientes = this.storageService.loadInfo("clientes");
    this.clientes = this.clientes.sort((a, b) =>
      a.razonSocial.localeCompare(b.razonSocial),
    );
    this.choferes = this.storageService.loadInfo("choferes");
    this.choferes = this.choferes.filter((c) => c.idProveedor === 0);
    this.choferes = this.choferes.sort((a, b) =>
      a.apellido.localeCompare(b.apellido),
    );
    this.proveedores = this.storageService.loadInfo("proveedores");
    this.proveedores = this.proveedores.sort((a, b) =>
      a.razonSocial.localeCompare(b.razonSocial),
    );
    this.onEntidades();
    let user = this.storageService.loadInfo("usuario");
    this.usuario = user[0];
    //console.log("this.usuario: ", this.usuario);
  }

  async consultarDatos(id: number) {
    this.ledger = await this.cuentaCorrienteService.obtenerLedgerEntidad(id);
    this.cargando = false;
  }

  capitalizarPrimeraLetra(palabra: string): string {
    return palabra.charAt(0).toUpperCase() + palabra.slice(1);
  }

  onEntidades() {
    this.ledger = [];
    this.entidadSeleccionada = null;
    this.entidadesSeleccionadas =
      this.tipoEntidad === "cliente"
        ? this.clientes
        : this.tipoEntidad === "chofer"
          ? this.choferes
          : this.proveedores;
  }

  getEntidad(ent: any): string {
    //////console.log("getEntidad: ",ent);
    let razonSocial;
    let chofer;
    let proveedor;
    let cliente;
    if (this.tipoEntidad === "chofer") {
      chofer = this.choferes.find((c) => c.idChofer === ent.idChofer);
      if (chofer) {
        razonSocial = chofer.apellido + " " + chofer.nombre;
      } else {
        razonSocial = "";
      }
    } else if (this.tipoEntidad === "proveedor") {
      proveedor = this.proveedores.find(
        (c) => c.idProveedor === ent.idProveedor,
      );
      if (proveedor) {
        razonSocial = proveedor.razonSocial;
      } else {
        razonSocial = "";
      }
    } else {
      cliente = this.clientes.find((c) => c.idCliente === ent.idCliente);
      if (cliente) {
        razonSocial = cliente.razonSocial;
      } else {
        razonSocial = "";
      }
    }
    return razonSocial;
  }

  async onEntidadSeleccionada(e: any) {
    this.cargando = true;    
    //console.log("e: ", e);
    if (!e || !this.tipoEntidad) {
      this.entidadId = null;
      return;
    }
    this.entidadSeleccionada = e;

    // 🔹 resolver id según tipo (tu modelo actual)

    if (this.tipoEntidad === "chofer") {
      this.entidadId = e.idChofer;
    }

    if (this.tipoEntidad === "proveedor") {
      this.entidadId = e.idProveedor;
    }

    if (this.tipoEntidad === "cliente") {
      this.entidadId = e.idCliente;
    }
    //console.log("this.entidadId: ", this.entidadId);

    //console.log("this.entidadSeleccionada: ", this.entidadSeleccionada);
    ////console.log("aca?");

    if (this.entidadId) await this.consultarDatos(this.entidadId);
  }

  verInforme(item: Ledger) {
    if (item.accion === "cobro" || item.accion === "pago") {
      const url = this.router.serializeUrl(
        this.router.createUrlTree(["/raiz/finanzas/movimiento", item.id]),
      );

      window.open(url, "_blank");
    } else {
      this.verDetalle(item, "vista");
    }
  }

  async verDetalle(item: Ledger, accion: string) {
    this.cargando = true;
    const consulta = await this.cuentaCorrienteService.obtenerInformeLiq(
      item.id,
    );
    let informe: any = consulta?.data;
    if (informe) this.abrirModal(informe, accion);
  }

  async abrirModal(informe: ConId<InformeLiq>, accion: string) {
    await this.obtenerInformesOp(informe);
    {
      this.cargando = false;
      const modalRef = this.modalService.open(InformeLiqDetalleComponent, {
        windowClass: "myCustomModalClass",
        centered: true,
        scrollable: true,
        size: "lg",
      });
      //console.log("informesLiq", informe);
      let info = {
        modo: "facturacion",
        item: informe,
        tipo: informe.tipo,
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
      this.cargando = false;
    }
  }

  onSort(event: { campo: string; direccion: "asc" | "desc" }) {
    this.sort = event;
    this.aplicarOrden();
  }

  aplicarOrden() {
    const { campo, direccion } = this.sort;

    if (!campo) return;

    this.ledger = [...this.ledger].sort((a: any, b: any) => {
      const valorA = a[campo];
      const valorB = b[campo];

      if (typeof valorA === "string" && typeof valorB === "string") {
        return direccion === "asc"
          ? valorA.localeCompare(valorB)
          : valorB.localeCompare(valorA);
      }

      if (typeof valorA === "number" && typeof valorB === "number") {
        return direccion === "asc" ? valorA - valorB : valorB - valorA;
      }

      return 0;
    });
  }



  getBadgeClasesSaldo(total: number) {
    if (total === 0) {
      return "bg-success";
    } else {
      if (this.tipoEntidad === "cliente") {
        return "bg-info";
      } else {
        return "bg-danger";
      }
    }
  }

  getDescripcionSaldo(total: number): string {
    if (total === 0) {
      return "Saldado";
    } else {
      if (this.tipoEntidad === "cliente") {
        return "Deuda a favor";
      } else {
        return "Deuda en contra";
      }
    }
  }

  getSaldoTotal(): number{
    let total = 0
    this.ledger.map(l=>{
      total += l.impacto;
    })
    return total
  }

  getBadgeClasesAccion(item:Ledger){
    //console.log("item: ", item);
    
    if (item.saldo === 0) {
      return "bg-success";
    } else {
      if (item.accion === 'cobro' || item.accion === 'pago') {
        return "bg-danger";
      } else {
        return "bg-info";
      }
    }

  }

  getDescripcionAccion(item:Ledger){
    if (item.saldo === 0) {
      return "Deuda saldada";
    } else {
      if (item.accion === 'cobro' || item.accion === 'pago') {        
        return "Disminución de deuda";
      } else {
        return "Incremento de deuda";
      }
    }

  }
}

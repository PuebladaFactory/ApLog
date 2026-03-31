import { Component, OnInit } from '@angular/core';
import { AgingResumen } from 'src/app/interfaces/aging-resumen';
import { CuentaCorrienteService } from 'src/app/servicios/cuenta-corriente/cuenta-corriente.service';

@Component({
  selector: 'app-aging-listado',
  standalone: false,
  templateUrl: './aging-listado.component.html',
  styleUrl: './aging-listado.component.scss'
})
export class AgingListadoComponent implements OnInit {

aging: AgingResumen[] = [];

cargando: boolean = false;

constructor(
    private cuentaCorrienteService: CuentaCorrienteService,
    /* private storageService: StorageService,
    private router: Router,
    private dbService: DbFirestoreService,
    private modalService: NgbModal, */
  ) {}

  ngOnInit() {
/*     this.clientes = this.storageService.loadInfo("clientes");
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
    //console.log("this.usuario: ", this.usuario); */
    this.consultarDatos()
  }

  async consultarDatos() {
    this.cargando = true;
    this.aging = await this.cuentaCorrienteService.obtenerAgingGlobal();
    this.cargando = false;
  }

  capitalizarPrimeraLetra(palabra: string): string {
    return palabra.charAt(0).toUpperCase() + palabra.slice(1);
  }
/* 
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
  } */

}

import { Component, Input, OnDestroy, OnInit } from "@angular/core";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";
import { Subject, takeUntil } from "rxjs";
import { Chofer } from "src/app/interfaces/chofer";
import { Cliente } from "src/app/interfaces/cliente";
import { ConId } from "src/app/interfaces/conId";
import { Proveedor } from "src/app/interfaces/proveedor";
import { ChoferService } from "src/app/servicios/choferes/chofer.service";
import { StorageService } from "src/app/servicios/storage/storage.service";
import Swal from "sweetalert2";

@Component({
  selector: "app-visibilidad-listados",
  standalone: false,
  templateUrl: "./visibilidad-listados.component.html",
  styleUrl: "./visibilidad-listados.component.scss",
})
export class VisibilidadListadosComponent implements OnInit, OnDestroy {
  @Input() info!: {
    tipo: "choferes" | "clientes" | "proveedores" | "legajos";
    objetos: ConId<any>[];
  };
  searchText: string = "";
  choferes: ConId<Chofer>[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    public activeModal: NgbActiveModal,
    private storageService: StorageService,
    private choferService: ChoferService,
  ) {}

  ngOnInit(): void {
    console.log("this.objetos: ", this.info.objetos);
    console.log("this.tipo: ", this.info.tipo);
    this.choferService.choferes$
      .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
      .subscribe((data) => {
        this.choferes = data;
        this.choferes.sort((a, b) =>
          a.datosPersonales.apellido.localeCompare(b.datosPersonales.apellido),
        );
      });

    if (this.info.tipo === "legajos") {
      this.filtrarLegajosConChoferes();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  filtrarLegajosConChoferes(): void {
    const idsChoferes = this.choferes.map((c) => c.idChofer);

    this.info.objetos = this.info.objetos
      .filter((l) => idsChoferes.includes(l.idChofer))
      .sort((a, b) => {
        const choferA = this.choferes.find((c) => c.idChofer === a.idChofer);
        const choferB = this.choferes.find((c) => c.idChofer === b.idChofer);

        if (!choferA || !choferB) return 0;

        const nombreCompletoA =
          `${choferA.datosPersonales.apellido} ${choferA.datosPersonales.nombre}`.toLowerCase();
        const nombreCompletoB =
          `${choferB.datosPersonales.apellido} ${choferB.datosPersonales.nombre}`.toLowerCase();

        return nombreCompletoA.localeCompare(nombreCompletoB);
      });
  }

  getDatos(obj: any): string {
    switch (this.info.tipo) {
      case "choferes":
      case "legajos": {
        return this.getChofer(obj.idChofer);
      }
      case "clientes": {
        return this.getCliente(obj.idCliente);
      }
      case "proveedores": {
        return this.getProveedor(obj.idProveedor);
      }
      default:
        return "Sin Datos";
    }
  }

  getChofer(id: string): string {
    let chofer = this.choferes.find((ch: ConId<Chofer>) => {
      return ch.idChofer === id;
    });
    if (chofer) {
      return (
        chofer.datosPersonales.apellido + " " + chofer.datosPersonales.nombre
      );
    } else {
      return "Sin Datos";
    }
  }

  getCliente(id: number): string {
    let cliente: ConId<Cliente> = this.info.objetos.find(
      (cl: ConId<Cliente>) => {
        return cl.idCliente === String(id);
      },
    );
    return cliente.razonSocial;
  }

  getProveedor(id: string): string {
    let proveedor: ConId<Proveedor> = this.info.objetos.find(
      (pr: ConId<Proveedor>) => {
        return pr.idProveedor === id;
      },
    );
    return proveedor.razonSocial;
  }

  /*   getLegajo(id:number):ConIdType<Legajo> {
    let legajo: ConIdType<Legajo>[] = this.legajos.filter(l=> l.idChofer=== id);
    return legajo[0];
  }

  actualizarLegajo(legajo:ConIdType<Legajo>){
    console.log("legajo antes", legajo);
    legajo.visible = !legajo.visible;
    console.log("legajo desp", legajo);
    let {id, type, ...leg} = legajo
    this.storageService.updateItem("legajos", leg, legajo.idLegajo, "INTERNA", "", legajo.id);
  } */

  actualizarObjeto(obj: any) {
    obj.visible = !obj.visible;
    switch (this.info.tipo) {
      case "choferes": {
        this.updateItem(obj, this.info.tipo, obj.idChofer);
        break;
      }
      case "legajos": {
        this.updateItem(obj, this.info.tipo, obj.idLegajo);
        break;
      }
      case "clientes": {
        this.updateItem(obj, this.info.tipo, obj.idCliente);
        break;
      }
      case "proveedores": {
        this.updateItem(obj, this.info.tipo, obj.idProveedor);
        break;
      }
      default:
        this.mensajesError("Error en la actualización del objeto");
        break;
    }
  }

  updateItem(item: any, coleccion: string, idObj: number) {
    let { id, ...obj } = item;
    this.storageService.updateItem(
      coleccion,
      obj,
      idObj,
      "INTERNA",
      "",
      item.id,
    );
  }

  mensajesError(msj: string) {
    Swal.fire({
      icon: "error",
      //title: "Oops...",
      text: `${msj}`,
      //footer: `${msj}`
    });
  }
}

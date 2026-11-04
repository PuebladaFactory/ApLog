import { Component, Input, OnDestroy, OnInit } from "@angular/core";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";
import { Subject, takeUntil } from "rxjs";
import { Chofer } from "src/app/interfaces/chofer";
import { Cliente } from "src/app/interfaces/cliente";
import { ConId } from "src/app/interfaces/conId";
import { Proveedor } from "src/app/interfaces/proveedor";
import { ChoferService } from "src/app/servicios/choferes/chofer.service";
import { DbFirestoreService } from "src/app/servicios/database/db-firestore.service";
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
    private db: DbFirestoreService,
    private choferService: ChoferService,
  ) {}

  ngOnInit(): void {
    // Clon superficial: el switch invierte `visible` en el objeto que muestra; sin
    // clonar sería la misma referencia que emite el BehaviorSubject del servicio y
    // una escritura fallida dejaría la memoria invertida en silencio.
    this.info = { ...this.info, objetos: this.info.objetos.map((o) => ({ ...o })) };
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

  /** Visibilidad = preferencia de presentación: escritura parcial de `visible`,
   *  SIN log, en ninguna entidad (decisión deliberada, ver la skill
   *  subsistema-log). `obj` es un clon (ver ngOnInit): si la escritura falla se
   *  revierte el clon y se avisa; la memoria del servicio nunca se toca, el valor
   *  nuevo llega por su listener. El (click) corre antes que el (change) del
   *  ngModel, que después escribe el mismo valor: no hay doble cambio. */
  async actualizarObjeto(obj: any) {
    obj.visible = !obj.visible;
    const r = await this.db.updateConResultado(this.info.tipo, obj.id, { visible: obj.visible });
    if (!r.exito) {
      obj.visible = !obj.visible;
      this.mensajesError(r.mensaje);
    }
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

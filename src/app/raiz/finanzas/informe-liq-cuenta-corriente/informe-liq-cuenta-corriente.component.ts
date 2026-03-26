import { Component, inject, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { ConId } from "src/app/interfaces/conId";
import { InformeLiq } from "src/app/interfaces/informe-liq";
import { InformeOp } from "src/app/interfaces/informe-op";
import { CuentaCorrienteService } from "src/app/servicios/cuenta-corriente/cuenta-corriente.service";
import { DbFirestoreService } from "src/app/servicios/database/db-firestore.service";
import { InformeLiqDetalleComponent } from "src/app/shared/modales/informe-liq-detalle/informe-liq-detalle.component";
import Swal from "sweetalert2";

@Component({
  selector: "app-informe-liq-cuenta-corriente",
  standalone: false,
  templateUrl: "./informe-liq-cuenta-corriente.component.html",
  styleUrl: "./informe-liq-cuenta-corriente.component.scss",
})
export class InformeLiqCuentaCorrienteComponent implements OnInit {
  private route = inject(ActivatedRoute);

  imputaciones: any[] = [];
  cargando: boolean = false;
  informeId!: string;
  numeroInterno!: string;
  informe!: any;
  timeline: any[] = [];
  informesOp: ConId<InformeOp>[] = [];

  constructor(
    private cuentaCorrienteService: CuentaCorrienteService,
    private router: Router,
    private dbService: DbFirestoreService,
    private modalService: NgbModal,
  ) {}

  async ngOnInit() {
    this.cargando = true;
    let id = this.route.snapshot.paramMap.get("id");
    this.numeroInterno = id ?? "";
    console.log(this.numeroInterno);
    await this.cargarDetalle();
    this.cargando = false;
    /* 
    this.imputaciones =
      await this.cuentaCorrienteService.obtenerImputacionesPorInforme(
        this.informeId,
      );
    console.log("imputaciones: ", this.imputaciones);

    this.cargando = false; */
  }

  async cargarDetalle() {
    // 🔹 1. obtener informe
    const result = await this.cuentaCorrienteService.obtenerInformePorNumero(
      this.numeroInterno,
    );

    if (!result) return;

    this.informe = result.data;
    console.log("1) informe: ", this.informe);

    // 🔹 2. obtener imputaciones
    this.imputaciones =
      await this.cuentaCorrienteService.obtenerImputacionesPorInforme(
        this.numeroInterno,
      );

    console.log("2) imputaciones: ", this.imputaciones);

    // 🔥 3. armar timeline
    this.timeline = this.armarTimeline(this.informe, this.imputaciones);
    console.log("3) timeline: ", this.timeline);
  }

  verMovimiento(id: string) {
    const url = this.router.serializeUrl(
      this.router.createUrlTree(["/raiz/finanzas/movimiento", id]),
    );

    window.open(url, "_blank");
  }

  armarTimeline(informe: InformeLiq, imputaciones: any[]) {
    const timeline: any[] = [];

    const total = informe.valoresFinancieros.total;

    // 🟢 1. evento inicial (nace la deuda)
    timeline.push({
      fecha: informe.fecha,
      descripcion: "Informe de Liquidación",     
      id: informe.numeroInterno, 
      tipo: "alta",      
      medioPago: "-",
      monto: total,
      signo: +1,
      saldo: total,
      ruta:''
    });

    // 🔵 2. movimientos
    imputaciones.forEach((mov) => {
      //const signo = mov.tipo === "cobro" ? -1 : +1;
      const signo = -1;

      timeline.push({
        fecha: mov.fecha,
        descripcion: "Movimiento Financiero",
        id: mov.numeroComprobante,
        tipo: mov.tipo,        
        medioPago: mov.medioPago,
        monto: mov.montoImputado,
        signo,
        saldo: 0, // se calcula después
        ruta: mov.ruta
      });
    });

    // 🔥 3. ordenar por fecha
    timeline.sort(
      (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime(),
    );

    // 🧠 4. calcular saldo dinámico
    let saldo = 0;

    timeline.forEach((item, index) => {
      if (index === 0) {
        saldo = item.monto;
      } else {
        saldo += item.monto * item.signo;
      }

      item.saldo = saldo;
    });

    return timeline;
  }

  capitalizarPrimeraLetra(palabra: string): string {
    return palabra.charAt(0).toUpperCase() + palabra.slice(1);
  }

  verInforme(tipo: string, id:string){    
    
    if(tipo === 'cobro' || tipo === 'pago'){
      const url = this.router.serializeUrl(
        this.router.createUrlTree(
          ['/raiz/finanzas/movimiento', id]
        )
      );

      window.open(url, '_blank');
    } else {
      this.verDetalle(this.informe, "vista");
    }

  }

  async verDetalle(informesLiq: ConId<InformeLiq>, accion: string) {
      await this.obtenerInformesOp(informesLiq);
      {
        const modalRef = this.modalService.open(InformeLiqDetalleComponent, {
          windowClass: "myCustomModalClass",
          centered: true,
          scrollable: true,
          size: "lg",
        });
        console.log("informesLiq", informesLiq);
        let info = {
          modo: "facturacion",
          item: informesLiq,
          tipo: informesLiq.tipo,
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
          console.log("consulta", consulta);
    
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
}

import { Component, inject, Input, OnInit, Optional } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";

import { DbFirestoreService } from "src/app/servicios/database/db-firestore.service";
import { MovimientoFinancieroService } from "src/app/servicios/finanzas/movimiento-financiero.service";
import { PdfService } from "src/app/servicios/informes/pdf/pdf.service";
import { StorageService } from "src/app/servicios/storage/storage.service";

@Component({
  selector: "app-movimiento-detalle",
  standalone: false,
  templateUrl: "./movimiento-detalle.component.html",
  styleUrl: "./movimiento-detalle.component.scss",
})
export class MovimientoDetalleComponent implements OnInit {
  private route = inject(ActivatedRoute);

  @Input() movimientoId!: string;

  movimiento?: any;

  loading = true;

  modoModal = false;

  constructor(
    private movFinancieroServ: MovimientoFinancieroService,
    private storageService: StorageService,
    private router: Router,
    private pdfService: PdfService,
    @Optional() private activeModal?: NgbActiveModal,
  ) {}

  async ngOnInit() {
    const id = this.movimientoId ?? this.route.snapshot.paramMap.get("id");

    console.log(id);

    if (!id) return;

    this.movimiento = await this.movFinancieroServ.getMovimientoPorId(id);

    this.loading = false;
  }

  imprimir(): void {
    window.print();
  }

  descargarPdf() {
    const vm = this.movFinancieroServ.armarModeloImpresion(this.movimiento);

    this.pdfService.generarMovimientoPdf(vm);
  }

  get titulo(): string {
    if (!this.movimiento) return "";

    return this.movimiento.tipo === "cobro"
      ? "Recibo de Cobro"
      : "Orden de Pago";
  }

  cerrar() {
    this.router.navigate(["/finanzas/historial"]);
  }
}

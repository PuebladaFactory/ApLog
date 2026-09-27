import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import { ConId } from 'src/app/interfaces/conId';
import { FacturaVinculada, InformeLiqNuevo } from 'src/app/interfaces/informe-liq-nuevo';
import { FacturaQrService } from 'src/app/servicios/factura-qr/factura-qr.service';
import { InformeLiqConsultaService } from 'src/app/servicios/informes-liq/informe-liq-consulta.service';
import { InformeLiqService } from 'src/app/servicios/informes-liq/informe-liq.service';
import { InformeLiqFactoryService } from 'src/app/servicios/informes-liq/informe-liq-factory.service';
import { nombreEntidadRef } from 'src/app/shared/utils/entidad-informe.util';
import { FormatearValorPipe } from 'src/app/shared/pipes/formatear-valor.pipe';
import {
  DatosQrAfip, ValidacionFactura, claveComprobanteQr, decodificarQrAfip, descripcionTipoComprobante,
  fechaComprobanteLegible, listarDiscrepancias, numeroComprobante, validarFacturaContraInforme,
} from 'src/app/shared/utils/factura-electronica.util';

/** Facturación — vincular la factura electrónica (PDF con QR de AFIP) a un
 *  InformeLiqNuevo EMITIDO. Lee el QR al elegir el archivo, muestra factura
 *  vs liquidación, avisa si el comprobante ya está vinculado a otra
 *  liquidación y, al confirmar (con confirmación extra si hay
 *  discrepancias — D8), llama a InformeLiqService.vincularFactura (que
 *  revalida todo en su transacción). Cierra con `true` si vinculó.
 *  Camino paralelo a ModalVincularFacturaComponent (modelo viejo). */
@Component({
  selector: 'app-vincular-factura-liq',
  standalone: false,
  templateUrl: './vincular-factura-liq.component.html',
})
export class VincularFacturaLiqComponent {

  @Input() liq!: ConId<InformeLiqNuevo>;

  archivo: File | null = null;
  textoQr: string | null = null;
  qr: DatosQrAfip | null = null;
  validacion: ValidacionFactura | null = null;
  /** Si el comprobante ya está vinculado a otra liquidación (pre-chequeo). */
  vinculadaA: FacturaVinculada | null = null;
  error = '';
  leyendo = false;
  guardando = false;

  // Mismos límites que storage.rules (match /facturas/…).
  private readonly TAMANIO_MAXIMO = 10 * 1024 * 1024;
  private formato = new FormatearValorPipe();

  constructor(
    public activeModal: NgbActiveModal,
    private lectorQr: FacturaQrService,
    private consulta: InformeLiqConsultaService,
    private informeLiqServ: InformeLiqService,
    private factory: InformeLiqFactoryService,
  ) {}

  get nombreEntidad(): string {
    return nombreEntidadRef(this.liq.entidad);
  }

  get textoPeriodo(): string {
    return this.factory.textoPeriodo(this.liq.periodo);
  }

  get cuitEntidad(): string {
    const cuit = this.liq.entidad?.cuit;
    return cuit !== undefined && cuit !== null ? String(cuit) : '—';
  }

  get comprobante(): string {
    return this.qr
      ? `${descripcionTipoComprobante(this.qr.tipoCmp)} ${numeroComprobante({ puntoVenta: this.qr.ptoVta, numero: this.qr.nroCmp })}`
      : '';
  }

  get fechaFactura(): string {
    return this.qr ? fechaComprobanteLegible(this.qr.fecha) : '';
  }

  get discrepancias(): string[] {
    return this.validacion ? listarDiscrepancias(this.validacion) : [];
  }

  get puedeVincular(): boolean {
    return !!this.archivo && !!this.textoQr && !!this.qr && !this.vinculadaA && !this.leyendo && !this.guardando;
  }

  /** Al elegir el archivo: valida tipo y tamaño, lee y decodifica el QR,
   *  valida contra la liquidación y consulta si el comprobante ya está
   *  vinculado. Cualquier falla deja el mensaje en `error`. */
  async seleccionarArchivo(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.limpiar();
    if (!file) return;

    if (file.type !== 'application/pdf') {
      this.error = 'El archivo tiene que ser un PDF.';
      input.value = '';
      return;
    }
    if (file.size >= this.TAMANIO_MAXIMO) {
      this.error = 'El PDF supera los 10 MB.';
      input.value = '';
      return;
    }

    this.archivo = file;
    this.leyendo = true;
    try {
      const texto: string | null = await this.lectorQr.decodificarQRdesdePDF(file);
      if (!texto) {
        this.error = 'No se encontró un código QR en el PDF.';
        return;
      }
      const qr = decodificarQrAfip(texto);
      const vinculadaA = await this.consulta.obtenerFacturaVinculada(claveComprobanteQr(qr));
      this.textoQr = texto;
      this.qr = qr;
      this.validacion = validarFacturaContraInforme(qr, this.liq);
      this.vinculadaA = vinculadaA;
    } catch (e: any) {
      this.error = `No se pudo leer la factura: ${e?.message ?? e}`;
    } finally {
      this.leyendo = false;
    }
  }

  async vincular(): Promise<void> {
    if (!this.puedeVincular || !this.archivo || !this.textoQr || !this.qr || !this.validacion) return;

    if (this.discrepancias.length > 0) {
      const detalle: string[] = [];
      if (!this.validacion.importeOk) {
        detalle.push(
          `Importe: factura ${this.formato.transform(this.qr.importe, '$')} — ` +
          `liquidación ${this.formato.transform(this.liq.valores.total, '$')}`,
        );
      }
      if (!this.validacion.cuitOk) {
        const lado = this.liq.tipo === 'cliente' ? 'receptor' : 'emisor';
        const cuitFactura = this.liq.tipo === 'cliente' ? (this.qr.nroDocRec ?? '—') : this.qr.cuit;
        detalle.push(`CUIT ${lado}: factura ${cuitFactura} — entidad ${this.cuitEntidad}`);
      }
      const r = await Swal.fire({
        title: 'La factura no coincide con la liquidación',
        html:
          `<ul class="text-start">${detalle.map(d => `<li>${d}</li>`).join('')}</ul>` +
          `<p>¿Vincular igual? La discrepancia queda registrada en la factura y en el log.</p>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Vincular igual',
        cancelButtonText: 'Volver',
      });
      if (!r.isConfirmed) return;
    }

    this.guardando = true;
    try {
      const res = await this.informeLiqServ.vincularFactura(this.liq.idInfLiq, this.archivo, this.textoQr);
      if (res.exito) {
        Swal.fire({ icon: 'success', text: res.mensaje });
        this.activeModal.close(true);
      } else {
        // El modal queda abierto (ej. el comprobante se vinculó en otra
        // pestaña entre el pre-chequeo y la transacción).
        Swal.fire({ icon: 'error', text: res.mensaje });
      }
    } finally {
      this.guardando = false;
    }
  }

  cancelar(): void {
    if (this.guardando) return;
    this.activeModal.dismiss();
  }

  private limpiar(): void {
    this.archivo = null;
    this.textoQr = null;
    this.qr = null;
    this.validacion = null;
    this.vinculadaA = null;
    this.error = '';
  }
}

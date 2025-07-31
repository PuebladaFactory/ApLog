import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ConId } from 'src/app/interfaces/conId';
import { InformeLiq } from 'src/app/interfaces/informe-liq';
import { FacturaQrService } from 'src/app/servicios/factura-qr/factura-qr.service';

@Component({
  selector: 'app-modal-vincular-factura',
  standalone: false,
  templateUrl: './modal-vincular-factura.component.html',
  styleUrl: './modal-vincular-factura.component.scss'
})
export class ModalVincularFacturaComponent implements OnInit {
  @Input() fromParent!: any; // InformeLiq con ConId
  form!: FormGroup;
  pdfSeleccionado?: File;
  informeLiq!: ConId<InformeLiq>;

  constructor(
    public modal: NgbActiveModal,
    private fb: FormBuilder,
    private lectorQrService: FacturaQrService  // ✅ Agregalo
  ) {}

  ngOnInit() {
    this.informeLiq = this.fromParent
    this.form = this.fb.group({
      cae: ['', Validators.required],
      cuit: ['', Validators.required],
      numero: ['', Validators.required],
      puntoVenta: ['', Validators.required],
      tipoComprobante: ['', Validators.required],
      fecha: ['', Validators.required],
      importe: ['', Validators.required],
      qrData: ['']
    });    
  }

  seleccionarArchivo(event: any) {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      this.pdfSeleccionado = file;
    }
  }

  async cargarDesdeQR() {
    if (!this.pdfSeleccionado) return;

    // Aquí se llamará al servicio que decodifica el QR y llena el formulario
    // Simulación (lo completamos después con el servicio real)
    const datosFactura = await this.decodificarQRdesdePDF(this.pdfSeleccionado);
    //console.log("datosFactura: ", datosFactura);
    
    if (datosFactura) {
      this.form.patchValue({
        cae: datosFactura.codAut,
        cuit: datosFactura.cuit,
        numero: datosFactura.nroCmp,
        puntoVenta: datosFactura.ptoVta,
        tipoComprobante: datosFactura.tipoCmp,
        fecha: datosFactura.fecha,
        importe: datosFactura.importe,
        qrData: JSON.stringify(datosFactura)
      });
    }
  }

async decodificarQRdesdePDF(file: File): Promise<any> {
  try {
    const qrTexto = await this.lectorQrService.decodificarQRdesdePDF(file);
    console.log('Texto del QR:', qrTexto);

    const url = new URL(qrTexto);
    const base64 = url.searchParams.get("p");
    const decoded = JSON.parse(atob(base64!));

    console.log("Contenido decodificado del QR:", decoded);

    const datos = {
      cuit: decoded.cuit,
      ptoVta: decoded.ptoVta,
      tipoCmp: decoded.tipoCmp,
      nroCmp: decoded.nroCmp,
      fecha: decoded.fecha,
      codAut: decoded.codAut,
      importe: decoded.importe,
    };

    return datos;
  } catch (error) {
    console.error("Error al decodificar el QR:", error);
    return null;
  }
}

  guardar() {
    if (this.form.invalid) return;
    this.modal.close(this.form.value);
  }

  cancelar() {
    this.modal.dismiss();
  }

}

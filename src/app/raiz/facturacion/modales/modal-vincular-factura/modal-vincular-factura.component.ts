import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ConId } from 'src/app/interfaces/conId';
import { InformeLiq } from 'src/app/interfaces/informe-liq';
import { FacturaQrService } from 'src/app/servicios/factura-qr/factura-qr.service';
import Swal from 'sweetalert2';
import { TIPOS_COMPROBANTE } from 'src/app/constantes/tipos-comprobante';

export interface FacturaQRData {
  cuit: string;
  ptoVta: number;
  tipoCmp: number;
  nroCmp: number;
  fecha: string;
  codAut: string;
  importe: number;
  nroDocRec: string;
  qrData?: string;
}

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
  factura?: FacturaQRData;
  isLoading: boolean = false;
  validacionExitosa:boolean = false;
  tiposComprobante = TIPOS_COMPROBANTE;
  tipoComprobanteDesc!:string;
  tipoComprobanteOrd!:number;
  leido: boolean = false;

  constructor(
    public modal: NgbActiveModal,
    private fb: FormBuilder,
    private lectorQrService: FacturaQrService  // ✅ Agregalo
  ) {}

  ngOnInit() {
    this.informeLiq = structuredClone(this.fromParent);
    this.form = this.fb.group({
      cae: ['', [Validators.required, Validators.pattern(/^\d{14}$/)]],
      cuit: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
      nroDocRec: ['', [Validators.pattern(/^\d{11}$/)]],  // opcional según tipo
      numero: ['', [Validators.required]],
      puntoVenta: ['', [Validators.required, Validators.pattern(/^\d{4}$/)]],
      tipoComprobante: ['', [Validators.required, Validators.pattern(/^\d{1,2}$/)]],
      fecha: ['', Validators.required],
      importe: ['', [Validators.required, Validators.min(1)]],
      qrData: [''],
      observaciones: ['']
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
    this.leido = false;
    this.isLoading = true;
    // Aquí se llamará al servicio que decodifica el QR y llena el formulario
    // Simulación (lo completamos después con el servicio real)
    const datosFactura = await this.decodificarQRdesdePDF(this.pdfSeleccionado);
    console.log("datosFactura: ", datosFactura);
    if(!datosFactura) return;
    if (datosFactura) {
      this.form.patchValue({
        cae: datosFactura.codAut,
        cuit: datosFactura.cuit,
        numero: datosFactura.nroCmp,
        puntoVenta: datosFactura.ptoVta,
        tipoComprobante: datosFactura.tipoCmp,
        fecha: datosFactura.fecha,
        nroDocRec: datosFactura.nroDocRec,
        importe: datosFactura.importe,
        qrData: JSON.stringify(datosFactura),
      });
    }
    this.factura = datosFactura;
    const tipoComprobanteDescripcion = TIPOS_COMPROBANTE.find(tc => tc.codigo === datosFactura.tipoComprobante)?.descripcion || 'Desconocido';

    // Lo podés asignar a una propiedad para mostrar en la vista:
    this.tipoComprobanteDesc = tipoComprobanteDescripcion;
    this.tipoComprobanteOrd = datosFactura.tipoComprobante;

    this.validacionExitosa = this.validarFacturaConInforme(datosFactura, this.informeLiq)
    this.informeLiq.factura = datosFactura; // lo guardás dentro del informe
    /* if(this.validacionExitosa){
      
    } else{
      this.form.get('observaciones')?.setValidators([Validators.required]);
      this.form.get('observaciones')?.updateValueAndValidity();
      this.mensajesError("Los datos de la factura no coinciden con el informe.")   
    } */
    
    if(!this.validacionExitosa) this.mensajesError("Los datos de la factura no coinciden con el informe.");   
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
        nroDocRec: decoded.nroDocRec, // 👈 lo agregamos,
        qrData: qrTexto,
      };
      this.isLoading = false;
      this.leido = true; 
      return datos;
    } catch (error) {  
      this.leido = false;      
      this.mensajesError(`Error al leer el archivo pdf`)
      return null;
    }
  }

  async guardar() {   
    
/*     if (this.form.invalid) {
      this.form.markAllAsTouched(); // 👈 fuerza la visualización de errores
      this.mensajesError('Por favor, completá correctamente todos los campos.');
      return;
    }

    const factura = this.form.value;
    console.log();

    const cuitValido = /^\d{11}$/.test(factura.cuit);
    const nroDocRecValido = factura.nroDocRec
      ? /^\d{11}$/.test(factura.nroDocRec)
      : true;

    if (!cuitValido || !nroDocRecValido) {
      alert('CUIT o Nro. Doc. Receptor deben tener 11 dígitos numéricos.');
      return;
    } */

    let respuesta = {
      infLiq : this.informeLiq,
      facElectronica: this.pdfSeleccionado
    }
    
    if (!this.validacionExitosa){
      const confirmacion = await Swal.fire({
        title: `Los datos de la factura no coinciden con los datos del informe, ¿Desea continuar?`,
        //text: "You won't be able to revert this!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Confirmar",
        cancelButtonText: "Cancelar"
      })
      if(confirmacion.isConfirmed){
        this.modal.close(respuesta);    
      } else {
        //nada??
      }
    } else {
      this.modal.close(respuesta); 
    }
    
  }

  cancelar() {
    this.modal.dismiss();
  }

  validarFacturaConInforme(factura: FacturaQRData, informe: InformeLiq): boolean {
    const importeValido = Math.abs(factura.importe - informe.valores.total) < 0.01;

    const cuitValido = informe.tipo === 'cliente'
    ? factura.nroDocRec === String(informe.entidad.cuit)
    : factura.cuit === String(informe.entidad.cuit);

    return importeValido && cuitValido;
  }

  mensajesError(msj:string){
    Swal.fire({
      icon: "error",
      //title: "Oops...",
      text: `${msj}`
      //footer: `${msj}`
    });
  }
  

}

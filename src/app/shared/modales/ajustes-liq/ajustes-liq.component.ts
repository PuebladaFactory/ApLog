import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Descuento } from 'src/app/interfaces/informe-liq';

import { FormatoNumericoService } from 'src/app/servicios/formato-numerico/formato-numerico.service';

@Component({
    selector: 'app-ajustes-liq',
    templateUrl: './ajustes-liq.component.html',
    styleUrls: ['./ajustes-liq.component.scss'],
    standalone: false
})
/** Modal de ajustes (descuentos/recargos, +/-) de un InformeLiqNuevo — lo
 *  usan LiquidacionNuevaComponent, InformeLiqNuevoDetalleComponent y
 *  ResumenOpLiquidadasComponent (camino viejo). Muta el array que recibe en
 *  fromParent.descuentos (los callers pasan una copia). Devuelve
 *  {descuentos, total}. No confundir con shared/modales/descuentos
 *  (DescuentosComponent), que usa el InformeLiqDetalleComponent viejo. */
export class AjustesLiqComponent implements OnInit{
  
  @Input() fromParent: any;
  descuentos!: Descuento[];
  descuento: Descuento = {concepto:"", valor:0};
  totalDescuento: number = 0;

  constructor(public activeModal: NgbActiveModal, private formNumServ: FormatoNumericoService){}
  ngOnInit(): void {      
      this.descuentos = this.fromParent.descuentos;
      if(this.descuentos.length > 0){
        this.descuentos.map(d => this.totalDescuento += d.valor)
      }    
      console.log("descuentos: ", this.descuentos);
  }

  /** F23 (Frente Finanzas): el concepto parece un adelanto / préstamo. Esos
   *  se registran en Finanzas (pago con concepto anticipo o préstamo) y se
   *  descuentan como COMPENSACIÓN de la liquidación, no como ajuste. Solo
   *  avisa; no bloquea. */
  get pareceAdelanto(): boolean {
    const patron = /adelanto|anticipo|pr[eé]stamo/i;
    return patron.test(this.descuento?.concepto ?? '') || (this.descuentos ?? []).some(d => patron.test(d.concepto ?? ''));
  }

  formatearValor(valor: number) : any{
    let nuevoValor =  new Intl.NumberFormat('es-ES', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    }).format(valor);
   ////////console.log(nuevoValor);    
    //   `$${nuevoValor}`   
    return `$${nuevoValor}`
  }

  agregarDescuento(){        
    this.descuento.valor = this.formNumServ.convertirAValorNumerico(this.descuento.valor)
    this.descuentos.push(this.descuento);

    this.descuento = {concepto:"", valor:0};
    console.log("concepto: ", this.descuento?.concepto, "valor: ", this.descuento?.valor)
    console.log("descuentos: ", this.descuento);
    this.calcularTotal();
    
  }

  eliminarDescuento(index: number) {
    this.descuentos.splice(index, 1);
    this.calcularTotal();
  }

  calcularTotal(){
    this.totalDescuento = 0;
    this.descuentos.forEach((d:Descuento) => this.totalDescuento += d.valor)
  }

  aplicarDescuento(){
    let respuesta = {descuentos: this.descuentos, total: this.totalDescuento}
    console.log("respuesta: ", respuesta);
    
    this.activeModal.close(respuesta)
  }

}

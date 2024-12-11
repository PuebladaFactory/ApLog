import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Descuento } from 'src/app/interfaces/factura-chofer';

@Component({
  selector: 'app-descuentos',
  templateUrl: './descuentos.component.html',
  styleUrls: ['./descuentos.component.scss']
})
export class DescuentosComponent implements OnInit{
  
  @Input() fromParent: any;
  descuentos!: Descuento[];
  descuento: Descuento = {concepto:"", valor:0};
  totalDescuento: number = 0;

  constructor(public activeModal: NgbActiveModal){}
  ngOnInit(): void {      
      this.descuentos = this.fromParent.descuentos;    
      console.log("descuentos: ", this.descuentos);
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
    this.activeModal.close(respuesta)
  }

}

import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Descuento } from 'src/app/interfaces/informe-liq';
import { FormatoNumericoService } from 'src/app/servicios/formato-numerico/formato-numerico.service';
import Swal from 'sweetalert2';



@Component({
  selector: 'app-descuentos',
  standalone: false,
  templateUrl: './descuentos.component.html',
  styleUrl: './descuentos.component.scss'
})
export class DescuentosComponent implements OnInit {
  @Input() fromParent: any;
  descuentos!: Descuento[];
  descuentosOriginal!: Descuento[];
  descuento: Descuento = {concepto:"", valor:0};
  totalDescuento: number = 0;

  constructor(public activeModal: NgbActiveModal, private formNumServ: FormatoNumericoService){}
  
  ngOnInit(): void {      
      this.descuentosOriginal = this.fromParent.descuentos;
      this.descuentos = structuredClone(this.descuentosOriginal);
      this.calcularTotal()    
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

  async aplicarDescuento(){
    if (this.totalDescuento === 0){      
      const respuesta = await Swal.fire({
          title: "Los descuentos suman un total de $0 ¿Desea guardar igualmente?",
          //text: "You won't be able to revert this!",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#3085d6",
          cancelButtonColor: "#d33",
          confirmButtonText: "Guardar",
          cancelButtonText: "Cancelar"
        })

      if (respuesta.isConfirmed) {
        this.descuentosOriginal = this.descuentos;
        let respuesta = {descuentos: this.descuentosOriginal, total: this.totalDescuento, cambios:true}
        this.activeModal.close(respuesta)
      
      } else if (respuesta.dismiss === Swal.DismissReason.cancel) {        
        }  
    } else {
      this.descuentosOriginal = this.descuentos;
      let respuesta = {descuentos: this.descuentosOriginal, total: this.totalDescuento, cambios:true}
      this.activeModal.close(respuesta)
    }
    
  }

}

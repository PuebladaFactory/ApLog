import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Chofer } from 'src/app/interfaces/chofer';
import { FacturaChofer } from 'src/app/interfaces/factura-chofer';
import { FacturaOp } from 'src/app/interfaces/factura-op';
import { FacturaOpChofer } from 'src/app/interfaces/factura-op-chofer';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-liquidacion-op-chofer',
  templateUrl: './liquidacion-op-chofer.component.html',
  styleUrls: ['./liquidacion-op-chofer.component.scss']
})
export class LiquidacionOpChoferComponent implements OnInit {
  
  @Input() fromParent: any;
  form:any;
  facLiqChofer: FacturaOp[] = []; // Nuevo array para almacenar las facturas liquidadas
  totalFacLiqCliente: number = 0 ; // Variable para almacenar el total de las facturas liquidadas
  totalFacLiqChofer: number = 0 ; // Variable para almacenar el total de las facturas liquidadas
  facturaEditada!: FacturaOp;
  facturaChofer!: FacturaChofer;  
  idOperaciones: number [] = [];
  componente: string = "facturaChofer";
  mostrarTablaChofer: boolean[] = [];
  indiceSeleccionado!:number;
  edicion: boolean[] = [];
  $choferes!: Chofer[];
  choferSeleccionado!: Chofer;
  modo: string = "vista"

  constructor(private storageService: StorageService, private fb: FormBuilder, public activeModal: NgbActiveModal){
    
    
    this.form = this.fb.group({      
      detalle: [""],       
    });
    
  }
  ngOnInit(): void {
    console.log("0) ", this.fromParent);
    
    this.facLiqChofer = this.fromParent.facturas;
    console.log("1): ", this.facLiqChofer);    
    this.totalFacLiqChofer = this.fromParent.totalChofer;
    console.log("2): ", this.totalFacLiqChofer);
    this.facLiqChofer.forEach((factura:FacturaOp)=>{
      this.totalFacLiqCliente += factura.contraParteMonto
    })


    this.storageService.choferes$.subscribe(data => {
      this.$choferes = data;
      this.getChofer()
    }); 
  }

  getChofer(){
    let choferArray
    choferArray = this.$choferes.filter((c:Chofer)=>{
      return c.idChofer === this.facLiqChofer[0].idChofer;
    });
    this.choferSeleccionado = choferArray[0];
  }

   // Modifica la función getQuincena para que acepte una fecha como parámetro
   getQuincena(fecha: any | Date): string {
    // Convierte la fecha a objeto Date
    const [year, month, day] = fecha.split('-').map(Number);
  
    // Crear la fecha asegurando que tome la zona horaria local
    const date = new Date(year, month - 1, day); // mes - 1 porque los meses en JavaScript son 0-indexed
  
    // Determinar si está en la primera o segunda quincena
    if (day <= 15) {
      return '1<sup> ra</sup>';
    } else {
      return '2<sup> da</sup>';
    }
  }

  closeModal() {
    let respuesta = {
      factura: "",
      titulo: "",
      modo: this.modo
    }
    this.activeModal.close(respuesta);    
  }

  formatearValor(valor: number) : any{
    let nuevoValor =  new Intl.NumberFormat('es-ES', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    }).format(valor);
   ////////console.log(nuevoValor);    
    //   `$${nuevoValor}`   
    return nuevoValor
 }

 limpiarValorFormateado(valorFormateado: string): number {
  // Elimina el punto de miles y reemplaza la coma por punto para que sea un valor numérico válido
    return parseFloat(valorFormateado.replace(/\./g, '').replace(',', '.'));
  }

  guardarDetalle(i:number){    
    this.edicion[i] = false;
    //console.log()("1: ",this.form.value.detalle);
    this.facturaEditada.observaciones = this.form.value.detalle;
    //console.log()(this.facturaEditada.operacion.observaciones);
    console.log("llamada al storage desde liq modal-informes-chofer, updateItem");      
    this.storageService.updateItem("facturaOpChofer", this.facturaEditada);


  }

  editarDetalle(factura:FacturaOp, i:number){
    console.log("editar: ",factura, i);
    
    this.edicion[i] = true;
    this.facturaEditada = factura;
    console.log(this.facturaEditada);
    this.form.patchValue({
      detalle: factura.observaciones,      
    });    
  }

  onSubmit(titulo:string) {   
    if(this.facLiqChofer.length > 0){
      ////console.log()(this.facturasLiquidadasCliente);
      Swal.fire({
        title: "¿Desea generar la liquidación de las operaciones seleccionadas?",
        text: "Esta acción no se podrá revertir",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Guardar",
        cancelButtonText: "Cancelar"
      }).then((result) => {
        if (result.isConfirmed) {
          this.modo = "cerrar";
          this.facLiqChofer.forEach((factura: FacturaOp) => {
            /* idOperaciones.push(factura.operacion.idOperacion) */
            
            this.idOperaciones.push(factura.idOperacion)
          });
     
          ////console.log()("ID OPERACIONES: ", this.idOperaciones);
          //this.facturaChofer.operaciones = idOperaciones;
    
          this.facturaChofer = {
            id: null,
            fecha: new Date().toISOString().split('T')[0],
            idFacturaChofer: new Date().getTime(),
            idChofer: this.facLiqChofer[0].idCliente,
            //razonSocial: this.facLiqCliente[0].razonSocial,
            apellido: this.choferSeleccionado.apellido,
            nombre: this.choferSeleccionado.nombre,
            operaciones: this.idOperaciones,
            total: this.totalFacLiqChofer,
            cobrado:false,
            montoFacturaCliente: this.totalFacLiqCliente
          }
         
         
          
          Swal.fire({
            title: "Confirmado",
            //text: "Los cambios se han guardado.",
            icon: "success"
          }).then((result) => {
             //console.log()("FACTURA CLIENTE: ", this.facturaCliente);
            let respuesta = {
              factura: this.facturaChofer,
              titulo: titulo,
              modo: this.modo
            }
      
            this.activeModal.close(respuesta);
          });        
        }
      });   
    
    
    }else{
      this.mensajesError("no hay facturas")
    }
    
    

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

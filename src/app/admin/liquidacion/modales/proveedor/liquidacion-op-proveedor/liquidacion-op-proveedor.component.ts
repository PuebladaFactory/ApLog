import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { FacturaOp } from 'src/app/interfaces/factura-op';
import { FacturaOpProveedor } from 'src/app/interfaces/factura-op-proveedor';
import { FacturaProveedor } from 'src/app/interfaces/factura-proveedor';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-liquidacion-op-proveedor',
  templateUrl: './liquidacion-op-proveedor.component.html',
  styleUrls: ['./liquidacion-op-proveedor.component.scss']
})
export class LiquidacionOpProveedorComponent implements OnInit {

  @Input() fromParent: any;
  form:any;
  facLiqProveedor: FacturaOp[] = []; // Nuevo array para almacenar las facturas liquidadas
  totalFacLiqCliente: number = 0 ; // Variable para almacenar el total de las facturas liquidadas
  totalFacLiqProveedor: number = 0 ; // Variable para almacenar el total de las facturas liquidadas
  facturaEditada!: FacturaOp;
  facturaProveedor!: FacturaProveedor;  
  idOperaciones: number [] = [];
  componente: string = "facturaProveedor";
  mostrarTablaProveedor: boolean[] = [];
  indiceSeleccionado!:number;
  edicion: boolean[] = [];
  $choferes!: Chofer[];
  $clientes!: Cliente[];
  $proveedores!:Proveedor[]
  proveedorSeleccionado!: Proveedor;
  modo: string = "vista"

  constructor(private storageService: StorageService, private fb: FormBuilder, public activeModal: NgbActiveModal){
    
 
  }
  
  ngOnInit(): void {
    console.log("0) ", this.fromParent);
    
    this.facLiqProveedor = this.fromParent.facturas;
    console.log("1): ", this.facLiqProveedor);    
    this.totalFacLiqProveedor = this.fromParent.totalProveedor;
    console.log("2): ", this.totalFacLiqProveedor);
    this.facLiqProveedor.forEach((factura:FacturaOp)=>{
      this.totalFacLiqCliente += factura.contraParteMonto
    })

    this.storageService.choferes$.subscribe(data => {
      this.$choferes = data;      
    }); 
    this.storageService.clientes$.subscribe(data => {
      this.$clientes = data;      
    }); 
    this.storageService.proveedores$.subscribe(data => {
      this.$proveedores = data;
      this.getProveedor();
    }); 
  }

  getProveedor(){
    let proveedorArray
    proveedorArray = this.$proveedores.filter((p:Proveedor)=>{
      return p.idProveedor === this.facLiqProveedor[0].idProveedor;
    });
    this.proveedorSeleccionado = proveedorArray[0];
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
    this.activeModal.close();    
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
    ////console.log()(this.facturasLiquidadas);
    ////console.log()(this.form.value);
    if(this.facLiqProveedor.length > 0){

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
          this.facLiqProveedor.forEach((factura: FacturaOp) => {
            /* idOperaciones.push(factura.operacion.idOperacion) */
            
            this.idOperaciones.push(factura.idOperacion)
          });
     
          ////console.log()("ID OPERACIONES: ", this.idOperaciones);
          //this.facturaChofer.operaciones = idOperaciones;
    
          this.facturaProveedor = {
            id: null,
            fecha: new Date().toISOString().split('T')[0],
            idFacturaProveedor: new Date().getTime(),
            idProveedor: this.facLiqProveedor[0].idProveedor,
            //razonSocial: this.facLiqCliente[0].razonSocial,
            razonSocial: this.proveedorSeleccionado.razonSocial,        
            operaciones: this.idOperaciones,
            total: this.totalFacLiqProveedor,
            cobrado:false,
            montoFacturaCliente: this.totalFacLiqCliente
          }
    
          
          Swal.fire({
            title: "Confirmado",
            //text: "Los cambios se han guardado.",
            icon: "success"
          }).then((result) => {
             
              let respuesta = {
                factura: this.facturaProveedor,
                titulo: titulo,
              }
        
              this.activeModal.close(respuesta);      
            
          });        
        }
      });  

      ////console.log()(this.facturasLiquidadasCliente);
      
    
    
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

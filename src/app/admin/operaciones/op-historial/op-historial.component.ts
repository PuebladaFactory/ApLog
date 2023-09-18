import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { Operacion } from 'src/app/interfaces/operacion';
import { FacturacionOpService } from 'src/app/servicios/facturacion/facturacion-op/facturacion-op.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';

//ESTE COMPONENTE ES OPERACIONES ABIERTAS!!!!!!!!!!!!!!!!!!!!!


@Component({
  selector: 'app-op-historial',
  templateUrl: './op-historial.component.html',
  styleUrls: ['./op-historial.component.scss']
})
export class OpHistorialComponent implements OnInit {
   
  detalleOp!: Operacion;
  opCerradas$!:any;
  componente: string = "operacionesCerradas";
  public show: boolean = false;
  public buttonName: any = 'Consultar Operaciones';
  consultasOp$!:any;
  titulo: string = "consultasOpCerradas";
  btnConsulta:boolean = false;
  date:any = new Date();
  primerDia: any = new Date(this.date.getFullYear(), this.date.getMonth() , 1).toISOString().split('T')[0];
  ultimoDia:any = new Date(this.date.getFullYear(), this.date.getMonth() + 1, 0).toISOString().split('T')[0];
  searchText: string = "";
  $opCerradas: any;
  facturar: boolean = false;
  opForm: any;
  opCerrada!: Operacion;

  constructor(private fb: FormBuilder, private storageService: StorageService, private facturacionServ: FacturacionOpService) {
    this.opForm = this.fb.group({
        km: [''],       
        remito: [''],       
    });
   }
  
  ngOnInit(): void { 
    //this.opCerradas$ = this.storageService.opCerradas$ 
    //this.consultasOp$ = this.storageService.consultasOpCerradas$; 
    this.storageService.consultasOpCerradas$.subscribe(data=>{
      this.$opCerradas = data;
    })  
    this.consultaMes();
   
  }
  

  seleccionarOp(op:Operacion){
    this.detalleOp = op;
  }

  toggle() {
    this.show = !this.show;
    // Change the name of the button.
    if (this.show) this.buttonName = 'Cerrar';
    else this.buttonName = 'Consultar Operaciones';
  }

  consultaMes(){
    if(!this.btnConsulta){   
      console.log(this.primerDia, this.ultimoDia)         
      this.storageService.getByDateValue("operacionesActivas", "fecha", this.primerDia, this.ultimoDia, this.titulo);    
    }     
  }

  getMsg(msg: any) {
    this.btnConsulta = true;
  }

  mostrarRemito(documentacion:string){ 
    //aca leeria de la db para buscar el remito
    alert("aca iria la imagen")
  }

  facturarOp(op:Operacion){
    this.facturar = true;
    this.opCerrada = op
    this.seleccionarOp(op);

  }

  onSubmit(){
    //console.log(this.opForm.value);
    this.opCerrada.km = this.opForm.value.km;    
    //this.opCerrada.documentacion = this.opForm.remito;
    this.opCerrada.documentacion = "";                      //le asigno un string vacio pq sino tira error al cargar en firestore
    //console.log("chofer-op. esta es la operacion que se va a cerrar: ", this.opCerrada);    
    this.altaOperacionesCerradas();
    this.bajaOperacionesActivas()
    
  }

  altaOperacionesCerradas(){
    this.storageService.addItem("operacionesCerradas", this.opCerrada);    
    
    //this.router.navigate(['/op/op-diarias'])
  }

  bajaOperacionesActivas(){
    this.storageService.deleteItem("operacionesActivas", this.opCerrada);
    this.facturacionServ.facturacionOp(this.opCerrada)
    this.opForm.reset();
    this.facturar = false;
    this.ngOnInit();
  }

  facturarFalso(){
    this.facturar = false;
  }


}

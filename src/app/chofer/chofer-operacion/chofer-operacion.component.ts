import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Operacion } from 'src/app/interfaces/operacion';
import { FacturacionOpService } from 'src/app/servicios/facturacion/facturacion-op/facturacion-op.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-chofer-operacion',
  templateUrl: './chofer-operacion.component.html',
  styleUrls: ['./chofer-operacion.component.css']
})
export class ChoferOperacionComponent implements OnInit {

  componente:string = "operacionesActivas"
  form:any;
  opActivas$!: any;
  opCerrada!: Operacion;
  opForm: any;
  hoy: any = new Date().toISOString().split('T')[0];
  $opAct:any;

  constructor(private fb: FormBuilder, private storageService: StorageService, private facturacionServ: FacturacionOpService) {
    this.opForm = this.fb.group({
        km: [''],       
        remito: [''],       
    });
   }

  ngOnInit(): void {
    //console.log("esto es chofer-operacion");    
    this.opActivas$ = this.storageService.opActivas$ 
    //console.log(this.opActivas$.source._value);    
    //console.log(this.hoy);
    this.storageService.opActivas$.subscribe( data=>{
      this.$opAct = data
      this.$opAct.sort((x:Operacion, y:Operacion) => x.idOperacion - y.idOperacion);
      console.log(this.$opAct);

      
    })
    

    
    
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

  abrirOp(op: Operacion){
    this.opCerrada = op
    //console.log("chofer-op. esta es la operacion que se va a cerrar: ", this.opCerrada);    
  }

  altaOperacionesCerradas(){
    this.storageService.addItem("operacionesCerradas", this.opCerrada);    
    
    //this.router.navigate(['/op/op-diarias'])
  }

  bajaOperacionesActivas(){
    this.storageService.deleteItem("operacionesActivas", this.opCerrada);
    this.facturacionServ.facturacionOp(this.opCerrada)
    this.opForm.reset();
    this.ngOnInit();
  }



}

import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { take } from 'rxjs';
import { FacturaOp } from 'src/app/interfaces/factura-op';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-modal-objeto',
  templateUrl: './modal-objeto.component.html',
  styleUrls: ['./modal-objeto.component.scss']
})

export class ModalObjetoComponent implements OnInit {

  @Input() fromParent:any
  objeto!:any;
  arrayFacOp: FacturaOp[] =[];
  
  constructor(public activeModal: NgbActiveModal, private dbFirebase: DbFirestoreService){}

  ngOnInit(): void {  
    console.log("this.fromParent", this.fromParent);    
    this.objeto = this.fromParent.item;
    console.log("this.objeto", this.objeto);
    
    if(this.fromParent.modo === 'facturaCliente' || this.fromParent.modo === 'facturaChofer' || this.fromParent.modo === 'facturaProveedor'){
      this.buscarFacOp();
      console.log("this.arrayFacOp", this.arrayFacOp);
    }
  }

  buscarFacOp(){
    let coleccion:string = this.fromParent.modo === 'facturaCliente' ? "facOpLiqCliente" : this.fromParent.modo === 'facturaChofer' ? "facOpLiqChofer" : "facOpLiqProveedor";

    this.objeto.operaciones.forEach((op:number) => {
      this.dbFirebase.getOneElement<FacturaOp>(coleccion, "idOperacion", op)  
      .pipe(take(1))
      .subscribe(data => {
        if (data) {
          console.log("data", data);          
          this.arrayFacOp.push(data[0]);
        }
      });
    });

    
    
  }



}

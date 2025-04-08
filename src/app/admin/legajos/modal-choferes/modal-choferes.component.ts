import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Chofer } from 'src/app/interfaces/chofer';
import { Legajo } from 'src/app/interfaces/legajo';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-modal-choferes',
  templateUrl: './modal-choferes.component.html',
  styleUrls: ['./modal-choferes.component.scss']
})
export class ModalChoferesComponent implements OnInit {
  
  @Input() fromParent:any
  choferes!: Chofer[];
  legajos!: Legajo[];
  searchText: string = "";

  constructor(public activeModal: NgbActiveModal, private storageService: StorageService,){}
  
  ngOnInit(): void {
    this.choferes = this.fromParent.choferes
    this.legajos = structuredClone(this.fromParent.legajos);
    console.log("this.choferes", this.choferes);
    console.log("this.legajos", this.legajos);
    
  }

  getChofer(id:number):string {
    let chofer: Chofer[] = this.choferes.filter(c=> c.idChofer=== id);
    return chofer[0].apellido + " " + chofer[0].nombre;
  }

  getLegajo(id:number):Legajo {
    let legajo: Legajo[] = this.legajos.filter(l=> l.idChofer=== id);
    return legajo[0];
  }

  actualizarLegajo(legajo:Legajo){
    console.log("legajo antes", legajo);
    legajo.visible = !legajo.visible;
    console.log("legajo desp", legajo);
    this.storageService.updateItem("legajos", legajo, legajo.idLegajo, "INTERNA", "")
  }



}

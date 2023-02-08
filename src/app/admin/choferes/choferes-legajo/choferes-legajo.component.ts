import { Component, OnInit } from '@angular/core';
import { AnonymousSubject } from 'rxjs/internal/Subject';
import { Chofer } from 'src/app/interfaces/chofer';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-choferes-legajo',
  templateUrl: './choferes-legajo.component.html',
  styleUrls: ['./choferes-legajo.component.scss']
})
export class ChoferesLegajoComponent implements OnInit {
  
  choferes$!:any;
  legajos$!:any;
  perfilChofer$!:any;
  choferSeleccionado!: Chofer[];
  componente: string = "legajos"

  constructor(private storageService: StorageService){

  }
  
  ngOnInit(): void {
    this.choferes$ = this.storageService.choferes$;  
    this.legajos$ = this.storageService.legajos$;  
    this.perfilChofer$ = this.storageService.perfilChofer$
  }

  changeChofer(e: any) {    
    //console.log(e.target.value);
    let apellido = e.target.value.split(" ")[0];
    //console.log(apellido);
    
    
    this.choferSeleccionado = e.target.value;
    this.choferSeleccionado = this.choferes$.source._value.filter(function (chofer:any){
      return chofer.apellido === apellido
    })
    console.log("este es el chofer seleccionado: ", this.choferSeleccionado);
    this.obtenerLegajo();
  }

  obtenerLegajo() {
    this.storageService.getByFieldValue(this.componente, "idChofer", this.choferSeleccionado[0].idChofer)
    this.storageService.getByFieldValueTitle("choferes", "idChofer", this.choferSeleccionado[0].idChofer, "perfilChofer")
  }

}

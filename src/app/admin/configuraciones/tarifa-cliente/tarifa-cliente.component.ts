import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { take } from 'rxjs';
import { AdicionalTarifa, CargasGenerales, CategoriaTarifa, TarifaGralCliente, TarifaTipo } from 'src/app/interfaces/tarifa-gral-cliente';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';


@Component({
  selector: 'app-tarifa-cliente',
  templateUrl: './tarifa-cliente.component.html',
  styleUrls: ['./tarifa-cliente.component.scss']
})

export class TarifaClienteComponent implements OnInit {
  
  mostrarTarifa: boolean = true;
  mostrarHistorial: boolean = false;

    constructor() {      
    }
  
    ngOnInit() {      
    }
    
    mostrarTarifaGral(){
      this.mostrarTarifa = true;
      this.mostrarHistorial = false;
    }

    mostrarHistorialTarifas(){
      this.mostrarTarifa = false;
      this.mostrarHistorial = true;
    }
}

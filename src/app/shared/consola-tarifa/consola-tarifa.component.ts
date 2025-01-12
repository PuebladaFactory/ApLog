import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-consola-tarifa',
  templateUrl: './consola-tarifa.component.html',
  styleUrls: ['./consola-tarifa.component.scss']
})
export class ConsolaTarifaComponent implements OnInit {
  
  modoAutomatico = true;  // por defecto en modo automático
  porcentajeAumento: FormControl = new FormControl(0); // Para el aumento porcentual
  prueba: FormControl = new FormControl(0); // Para el aumento porcentual
  consolaTarifa: any = 0;
  modo: any = {
    manual: false,
    automatico: true,
  }
  private destroy$ = new Subject<void>(); // Subject para manejar la destrucción

  constructor(private storageService: StorageService){}
  
  ngOnInit(): void {    
    this.storageService.consolaTarifa$
    .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
    .subscribe(data =>{
      this.consolaTarifa = data;
      console.log("consola tarifa: ", this.consolaTarifa);   
      if(this.consolaTarifa === 0)  {
        this.porcentajeAumento.patchValue(0);
      } ;      
    });
  }

  ngOnDestroy(): void {
    // Completa el Subject para cancelar todas las suscripciones
    this.destroy$.next();
    this.destroy$.complete();
  }

  cambiarModo(modo: 'manual' | 'automatico'): void {
    this.modoAutomatico = modo === 'automatico';
    console.log(this.modoAutomatico)
    if(!this.modoAutomatico){
      this.modo ={
        manual: true,
        automatico: false,
      }
    } else {
      this.modo ={
        manual: false,
        automatico: true,
      }
    }
    console.log(this.modo);
    this.storageService.setInfo("modoTarifa",this.modo)
  }

  enviarValores(){
/*     if(this.modoAutomatico){
      
    } else {      
       
    } */
    this.consolaTarifa = this.porcentajeAumento.value / 100,
    console.log("A) ",this.prueba.value);
    /* let numero = parseFloat(new Intl.NumberFormat("de-DE").format(this.prueba.value))
    numero = parseFloat (numero.toFixed(2))
    console.log("B) ", numero) */
    console.log("B) ", new Intl.NumberFormat("de-DE").format(this.prueba.value));
    
    //console.log(this.consolaTarifa);    
    this.storageService.setInfo("consolaTarifa", this.consolaTarifa);
    
  }

}

import { Component, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { Chofer } from 'src/app/interfaces/chofer';
import { Documentacion, Legajo } from 'src/app/interfaces/legajo';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-tablero-legajos',
  templateUrl: './tablero-legajos.component.html',
  styleUrls: ['./tablero-legajos.component.scss']
})
export class TableroLegajosComponent implements OnInit {
  $choferes!: Chofer[];
  $legajos!: Legajo[];
  choferSeleccionado!: Chofer[];
  legajoSeleccionado!: Legajo[];
  legajo!: Legajo;
  titulos: string[] = [
    'DNI',
    'Antecedentes Penales',
    'Licencia',
    'LINTI',
    'Libreta Sanitaria',
    'ART/ACC. Personales',
    'Cedula',
    'Título',
    'Seguro',
    'VTV/RTO',
    'RUTA',
    'Senasa'
  ];
  private destroy$ = new Subject<void>(); // Subject para manejar la destrucción
  
  constructor(private storageService: StorageService){}  
  
  ngOnInit(): void {
    this.storageService.choferes$
    .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
    .subscribe(data => {
      this.$choferes = data;     
      this.$choferes = this.$choferes      
      .sort((a, b) => a.apellido.localeCompare(b.apellido)); // Ordena por el nombre del chofer
      //console.log("1)choferes especiales: ", this.$choferes);      
      
    })     
    this.storageService.legajos$
    .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
    .subscribe(data => {
      this.$legajos = data;     
    });
    console.log(this.$legajos);
    
    //this.crearLegajos()        
  }

  ngOnDestroy(): void {
    // Completa el Subject para cancelar todas las suscripciones
    this.destroy$.next();
    this.destroy$.complete();
  }

  getDocumento(documentacion: Documentacion[], titulo: string): Documentacion | undefined {
    return documentacion.find((doc) => doc.titulo === titulo);
  }

  /*  crearLegajos(){
    this.$choferes.forEach((chofer:Chofer)=>{
      this.legajo ={
        id: null,
        idLegajo:new Date().getTime(),
        idChofer: chofer.idChofer,
        estadoGral:{
          enFecha: false,
          porVencer: false,
          vencido: false,
          sinVto: false,
          vacio: true,
        },
        documentacion:[{
          titulo: "",
          fechaVto: 0,
          estado:{
            enFecha: false,
            porVencer: false,
            vencido: false,
            sinVto: false,
            vacio: true,
          }, 
          imagenes: [""]
        },          
        ]  
      };
      this.storageService.addItem("legajos", this.legajo)

    })
  }  */
  
    getChofer(id:number):string {
      let chofer: Chofer[] = this.$choferes.filter(c=> c.idChofer=== id);
      return chofer[0].apellido + " " + chofer[0].nombre;

    }

    obtenerFecha(vto: any){
    /*   if (!fechaVto || fechaVto === 0) {
        return 'Sin vencimiento';
      } */
    
      const fecha = new Date(vto);
      return fecha.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    }
}

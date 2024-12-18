import { Injectable } from '@angular/core';
import { Legajo } from 'src/app/interfaces/legajo';
import { StorageService } from '../storage/storage.service';
import { take } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LegajosService {

  legajo!: Legajo
  $legajos!: Legajo[];

  constructor(private storageService: StorageService) { }

  crearLegajo(idChofer:number){
    this.legajo ={
      id: null,
      idLegajo:new Date().getTime(),
      idChofer: idChofer,      
      estadoGral:{
        enFecha: false,
        porVencer: false,
        vencido: false,        
        vacio: true,
      },
      documentacion:[],  
    };
    this.storageService.addItem("legajos", this.legajo)
    
  }

  // Método para verificar y actualizar el estado de los documentos
  verificarEstadosLegajos(legajos: Legajo[]) {
    console.log("0) Legajo", legajos);
  
    try {
      // Recorrer cada legajo
      legajos.forEach((legajo: Legajo) => {
        let legajoModificado = false; // Flag para saber si se realizaron cambios en los documentos
  
        // Recorrer los documentos del legajo
        for (const documento of legajo.documentacion) {
          if (documento.fechaVto && !documento.sinVto) {
            const nuevoEstado = this.calcularEstado(documento.fechaVto);
            console.log("chofer legajo: ", legajo.idChofer, "estado: ", nuevoEstado);
            
            // Verificar si el estado general del documento cambió
            if (
              documento.estado.vencido !== nuevoEstado.vencido ||
              documento.estado.porVencer !== nuevoEstado.porVencer ||
              documento.estado.enFecha !== nuevoEstado.enFecha
            ) {
              console.log("1) Se modificó el estado del documento");
              documento.estado = nuevoEstado;
              legajoModificado = true; // Indicar que se realizaron cambios
            } else {
              console.log("2) No se modificó el estado del documento");
            }
          }
        }
  
        // Verificar el estado general del legajo
        const estadoGral = this.calcularEstadoGeneral(legajo);
  
        // Comparar si el estado general cambió
        if (
          legajo.estadoGral.vencido !== estadoGral.vencido ||
          legajo.estadoGral.porVencer !== estadoGral.porVencer ||
          legajo.estadoGral.enFecha !== estadoGral.enFecha ||
          legajo.estadoGral.vacio !== estadoGral.vacio
        ) {
          console.log("3) Se modificó el estado general del legajo");
          legajo.estadoGral = estadoGral;
          legajoModificado = true; // Indicar que se realizaron cambios
        } else {
          console.log("4) No se modificó el estado general del legajo");
        }
  
        // Si se modificó el legajo, actualizar en la base de datos
        if (legajoModificado) {
          this.storageService.updateItem("legajos", legajo);
          console.log(`Legajo actualizado: ${legajo.id}`);
        }
      });
    } catch (error) {
      console.error("Error al verificar estados de los legajos:", error);
    }
  }
  // Método auxiliar para calcular el estado del documento
  private calcularEstado(fechaVto: string): {
    vencido: boolean;
    porVencer: boolean;
    enFecha: boolean;
    vacio: boolean
  } {
    const fechaActual = new Date().getTime();
    const fechaVtoMillis = new Date(fechaVto).getTime();
    const diferenciaDias = Math.floor((fechaVtoMillis - fechaActual) / (1000 * 60 * 60 * 24));

    return {
      vencido: diferenciaDias < 0,
      porVencer: diferenciaDias >= 0 && diferenciaDias <= 30,
      enFecha: diferenciaDias > 30,
      vacio:false,
    };
  }

  // Método auxiliar para calcular el estado general del legajo
  private calcularEstadoGeneral(legajo: Legajo): {
    vencido: boolean;
    porVencer: boolean;
    enFecha: boolean;
    vacio: boolean;
  } {
    // Si no hay documentos, el legajo está vacío
    if (legajo.documentacion.length === 0) {
      return {
        vencido: false,
        porVencer: false,
        enFecha: false,
        vacio: true,
      };
    }
  
    let algunVencido = false;
    let algunPorVencer = false;
    let todosEnFecha = true;
  
    // Filtrar documentos que tienen fecha de vencimiento
    const documentosConFecha = legajo.documentacion.filter(doc => doc.fechaVto && !doc.sinVto);
  
    for (const doc of documentosConFecha) {
      if (doc.estado.vencido) {
        algunVencido = true;
      }
      if (doc.estado.porVencer) {
        algunPorVencer = true;
      }
      if (!doc.estado.enFecha) {
        todosEnFecha = false;
      }
    }
  
    return {
      vencido: algunVencido,
      porVencer: algunPorVencer,
      enFecha: documentosConFecha.length > 0 && todosEnFecha, // Excluir documentos sin vencimiento
      vacio: false, // Ya sabemos que no está vacío si llegamos aquí
    };
  }

  eliminarLegajo(idChofer:number){
    let legajo: Legajo[];
    this.storageService.legajos$
    .pipe(take(1))
    .subscribe(data=>{
      this.$legajos = data;
      if(this.$legajos.length > 0){
        legajo = this.$legajos.filter((l:Legajo)=>{
          return l.idChofer === idChofer;
        });
        console.log("legajo", legajo);
        this.storageService.deleteItem("legajos", legajo[0]);
      }
    })
  }
}



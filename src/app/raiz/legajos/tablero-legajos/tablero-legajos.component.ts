import { Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, takeUntil } from 'rxjs';
import { Chofer } from 'src/app/interfaces/chofer';
import { Documentacion, Estado, Legajo } from 'src/app/interfaces/legajo';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { ModalChoferesComponent } from '../modal-choferes/modal-choferes.component';
import { ConIdType } from 'src/app/interfaces/conId';

@Component({
    selector: 'app-tablero-legajos',
    templateUrl: './tablero-legajos.component.html',
    styleUrls: ['./tablero-legajos.component.scss'],
    standalone: false
})
export class TableroLegajosComponent implements OnInit {
  $choferes!: ConIdType<Chofer>[];
  $legajos!: ConIdType<Legajo>[];
  choferSeleccionado!:ConIdType<Chofer>[];
  legajoSeleccionado!: ConIdType<Legajo>[];
  legajo!: ConIdType<Legajo>;
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
    'Senasa',
    'Fotos Camioneta'
  ];
  private destroy$ = new Subject<void>(); // Subject para manejar la destrucción
  searchText: string = "";
  $proveedores!: Proveedor [];
  filtrosProveedores = '';
  $choferesFiltrados!: ConIdType<Chofer>[];
  $legajosFiltrados: ConIdType<Legajo>[] = [];
  isLoading: boolean = false;

  constructor(private storageService: StorageService, private modalService: NgbModal){}  
  
  ngOnInit(): void {
    this.storageService.listenForChanges<Legajo>("legajos");
    this.$choferes = this.storageService.loadInfo("choferes");
    this.$choferes = this.$choferes      
      .sort((a, b) => a.apellido.localeCompare(b.apellido)); // Ordena por el nombre del chofer
    this.$choferesFiltrados = structuredClone(this.$choferes);
      //console.log("1)choferes especiales: ", this.$choferes);
    this.$proveedores = this.storageService.loadInfo("proveedores");

    /* this.storageService.getObservable<ConIdType<Chofer>>("choferes")
    .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
    .subscribe(data => {
      this.$choferes = data;     
      this.$choferes = this.$choferes      
      .sort((a, b) => a.apellido.localeCompare(b.apellido)); // Ordena por el nombre del chofer
      this.$choferesFiltrados = structuredClone(this.$choferes);
      //console.log("1)choferes especiales: ", this.$choferes);      
      
    })      */
    this.storageService.getObservable<ConIdType<Legajo>>("legajos")
    .pipe(takeUntil(this.destroy$))
    .subscribe(data => {
      this.$legajos = [...data]; // aseguramos nuevo array
      this.filtrarLegajosConChoferes();
      this.verificarYActualizarEstadosLegajos(); // ← Aquí se ejecuta la verificación al iniciar
    });
    

    /* this.storageService.getObservable<ConIdType<Proveedor>>("proveedores")
    .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
    .subscribe(data => {
      this.$proveedores = data;      
    });
    console.log(this.$proveedores); */
    
    //this.crearLegajos()  
    //this.storageService.syncChanges("legajos");
  }

  ngOnDestroy(): void {
    // Completa el Subject para cancelar todas las suscripciones
    this.destroy$.next();
    this.destroy$.complete();
  }

  actualizarLegajo(idChofer: number){
    let legajo = this.getLegajo(idChofer);
    console.log("legajo antes", legajo);
    legajo = {
      ...legajo,
      visible: true
    }
    console.log("legajo desp", legajo);
    let{id,type,...leg} = legajo;
    this.storageService.updateItem("legajos", leg, legajo.idLegajo, "INTERNA", "", legajo.id)
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

    getLegajo(id:number):ConIdType<Legajo> {
      let legajo: ConIdType<Legajo>[] = this.$legajos.filter(l=> l.idChofer=== id);
      return legajo[0];
    }

    getProveedor(idProveedor:string):string {
      let id = Number(idProveedor);  
      let proveedor = this.$proveedores?.filter(p => p.idProveedor === id);  
      if(id === 0) {
        return "";
      } else {
        let proveedor: Proveedor[] = this.$proveedores.filter(p=> p.idProveedor=== id);
        return proveedor[0].razonSocial;
      }
      
    }

  filtrarChoferes(idProveedor: number, razonSocial:string) {   
    this.$choferesFiltrados = this.$choferes;

    if (idProveedor !== 0) {
      this.filtrosProveedores = razonSocial;
      this.$choferesFiltrados = this.$choferesFiltrados.filter(c => c.idProveedor === idProveedor);
    } else {
      this.filtrosProveedores = "";
    }

    this.filtrarLegajosConChoferes();
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

      openModalChoferes(): void {      
        {
          const modalRef = this.modalService.open(ModalChoferesComponent, {
            windowClass: 'myCustomModalClass',
            centered: true,
            size: 'md', 
            //backdrop:"static" 
          });      
    
        let info = {
            choferes: this.$choferes,
            legajos: this.$legajos
          } 
          //console.log()(info); */
          
          modalRef.componentInstance.fromParent = info;
          modalRef.result.then(
            (result) => {
            
            },
            (reason) => {}
          );
        }
      }

      

  private filtrarLegajosConChoferes(): void {
    const idsChoferes = this.$choferesFiltrados.map(c => c.idChofer);

    this.$legajosFiltrados = this.$legajos
      .filter(l => idsChoferes.includes(l.idChofer))
      .sort((a, b) => {
        const choferA = this.$choferes.find(c => c.idChofer === a.idChofer);
        const choferB = this.$choferes.find(c => c.idChofer === b.idChofer);

        if (!choferA || !choferB) return 0;

        const nombreCompletoA = `${choferA.apellido} ${choferA.nombre}`.toLowerCase();
        const nombreCompletoB = `${choferB.apellido} ${choferB.nombre}`.toLowerCase();

        return nombreCompletoA.localeCompare(nombreCompletoB);
      });
  }

  verificarInconsistenciasLegajos(): void {
    const legajosErroneos: ConIdType<Legajo>[] = [];

    for (const legajo of this.$legajos) {
      const docs = legajo.documentacion;

      const estadoCalculado: Estado = {
        enFecha: false,
        porVencer: false,
        vencido: false,
        vacio: false,
      };

      if (!docs || docs.length === 0) {
        estadoCalculado.vacio = true;
      } else {
        const docsConVto = docs.filter(doc => !doc.sinVto);

        const tieneVencido = docsConVto.some(doc => doc.estado.vencido);
        const tienePorVencer = docsConVto.some(doc => doc.estado.porVencer);
        const todosEnFecha = docsConVto.every(doc => doc.estado.enFecha);

        if (tieneVencido) {
          estadoCalculado.vencido = true;
        } else if (tienePorVencer) {
          estadoCalculado.porVencer = true;
        } else if (docsConVto.length > 0 && todosEnFecha) {
          estadoCalculado.enFecha = true;
        }
      }

      const estadoActual = legajo.estadoGral;

      const inconsistente =
        estadoActual.enFecha !== estadoCalculado.enFecha ||
        estadoActual.porVencer !== estadoCalculado.porVencer ||
        estadoActual.vencido !== estadoCalculado.vencido ||
        estadoActual.vacio !== estadoCalculado.vacio;

      if (inconsistente) {
        legajosErroneos.push(structuredClone(legajo));
      }
    }

    console.log(`Se encontraron ${legajosErroneos.length} legajos con inconsistencias.`);
    legajosErroneos.forEach((l, index) => {
      const chofer = this.getChofer(l.idChofer);
      console.log(`${index + 1}) Chofer: ${chofer} - ID Legajo: ${l.idLegajo}`, l);
    });
  }

  mostrarLegajo(legajo:ConIdType<Legajo>){
      console.log("legajo: ", legajo);
      
  }

  private verificarYActualizarEstadosLegajos(): void {
    this.isLoading = true;
    const hoy = new Date();
    const MILIS_DIA = 1000 * 60 * 60 * 24;

    const legajosModificados: ConIdType<Legajo>[] = [];

    for (let legajo of this.$legajos) {
      let modificado = false;

      // Copia de documentos para poder detectar cambios
      const docsActualizados = legajo.documentacion.map(doc => {
        if (!doc.sinVto && doc.fechaVto) {
          const fechaVto = new Date(doc.fechaVto);
          const diffDias = Math.floor((fechaVto.getTime() - hoy.getTime()) / MILIS_DIA);

          const nuevoEstado: Estado = {
            enFecha: false,
            porVencer: false,
            vencido: false,
            vacio: false
          };

          if (diffDias < 0) {
            nuevoEstado.vencido = true;
          } else if (diffDias <= 30) {
            nuevoEstado.porVencer = true;
          } else {
            nuevoEstado.enFecha = true;
          }

          // Detectar si cambió el estado del documento
          if (
            doc.estado.enFecha !== nuevoEstado.enFecha ||
            doc.estado.porVencer !== nuevoEstado.porVencer ||
            doc.estado.vencido !== nuevoEstado.vencido
          ) {
            modificado = true;
            doc = { ...doc, estado: nuevoEstado };
          }
        }
        return doc;
      });

      // Recalcular estadoGral
      const estadoCalculado: Estado = {
        enFecha: false,
        porVencer: false,
        vencido: false,
        vacio: false
      };

      if (!docsActualizados || docsActualizados.length === 0) {
        estadoCalculado.vacio = true;
      } else {
        const docsConVto = docsActualizados.filter(doc => !doc.sinVto);
        const tieneVencido = docsConVto.some(doc => doc.estado.vencido);
        const tienePorVencer = docsConVto.some(doc => doc.estado.porVencer);
        const todosEnFecha = docsConVto.every(doc => doc.estado.enFecha);

        if (tieneVencido) {
          estadoCalculado.vencido = true;
        } else if (tienePorVencer) {
          estadoCalculado.porVencer = true;
        } else if (docsConVto.length > 0 && todosEnFecha) {
          estadoCalculado.enFecha = true;
        }
      }

      // Si cambió el estado general
      if (
        legajo.estadoGral.enFecha !== estadoCalculado.enFecha ||
        legajo.estadoGral.porVencer !== estadoCalculado.porVencer ||
        legajo.estadoGral.vencido !== estadoCalculado.vencido ||
        legajo.estadoGral.vacio !== estadoCalculado.vacio
      ) {
        modificado = true;
      }

      if (modificado) {
        const legajoActualizado = {
          ...legajo,
          documentacion: docsActualizados,
          estadoGral: estadoCalculado
        };
        legajosModificados.push(legajoActualizado);
      }
    }

    // Si hay legajos modificados, actualizarlos en la base
    if (legajosModificados.length > 0) {
      console.log(`Se actualizarán ${legajosModificados.length} legajos.`);
      legajosModificados.forEach(l => {
        const { id, type, ...leg } = l;
        this.storageService.updateItem("legajos", leg, l.idLegajo, "INTERNA", "", l.id);
      });
    } else {
      console.log("No se encontraron legajos para actualizar.");
    }
    this.isLoading = false;
  }



}

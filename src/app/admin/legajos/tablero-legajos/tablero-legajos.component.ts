import { Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, takeUntil } from 'rxjs';
import { Chofer } from 'src/app/interfaces/chofer';
import { Documentacion, Legajo } from 'src/app/interfaces/legajo';
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
    'Senasa'
  ];
  private destroy$ = new Subject<void>(); // Subject para manejar la destrucción
  searchText: string = "";
  $proveedores!: Proveedor [];
  filtrosProveedores = '';
  $choferesFiltrados!: Chofer[];

  constructor(private storageService: StorageService, private modalService: NgbModal){}  
  
  ngOnInit(): void {
    this.storageService.listenForChanges<Legajo>("legajos");
    this.storageService.getObservable<ConIdType<Chofer>>("choferes")
    .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
    .subscribe(data => {
      this.$choferes = data;     
      this.$choferes = this.$choferes      
      .sort((a, b) => a.apellido.localeCompare(b.apellido)); // Ordena por el nombre del chofer
      this.$choferesFiltrados = structuredClone(this.$choferes);
      //console.log("1)choferes especiales: ", this.$choferes);      
      
    })     
    this.storageService.getObservable<ConIdType<Legajo>>("legajos")
    .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
    .subscribe(data => {
      this.$legajos = data;      
      console.log("tablero legajos: legajos: ", this.$legajos);
    });
    

    this.storageService.getObservable<ConIdType<Proveedor>>("proveedores")
    .pipe(takeUntil(this.destroy$)) // Toma los valores hasta que destroy$ emita
    .subscribe(data => {
      this.$proveedores = data;      
    });
    console.log(this.$proveedores);
    
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

    filtrarChoferes(idProveedor: number, razonSocial:string){   
      console.log("idProveedor", idProveedor, "razonSocial", razonSocial);
      this.$choferesFiltrados = this.$choferes
      if(idProveedor !== 0){      
        this.filtrosProveedores = razonSocial;
        this.$choferesFiltrados = this.$choferesFiltrados.filter(c => c.idProveedor === idProveedor);        
        //console.log("this.filtrosChoferes", this.filtrosChoferes);
      }else {     
        this.filtrosProveedores = ""; 
        this.$choferesFiltrados = this.$choferes;
      }
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
}

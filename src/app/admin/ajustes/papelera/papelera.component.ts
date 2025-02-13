import { Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { distinctUntilChanged, Subject, takeUntil } from 'rxjs';
import { LogDoc } from 'src/app/interfaces/log-doc';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { ModalObjetoComponent } from 'src/app/shared/modal-objeto/modal-objeto.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-papelera',
  templateUrl: './papelera.component.html',
  styleUrls: ['./papelera.component.scss']
})
export class PapeleraComponent implements OnInit {
  
  searchText: string = "";
  $usuariosTodos: any[] = [];
  $usuario!: any;
  limite:number = 100;
  papelera: LogDoc [] = [];
  private destroy$ = new Subject<void>();         
  
  constructor(private dbFirebase: DbFirestoreService, private storageService: StorageService, private modalService: NgbModal){}
  
  ngOnInit(): void {
      
      this.storageService.users$
        .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
        .subscribe(data => {
          if(data){ this.$usuariosTodos = data;}      
      });
      this.consultarPapelera();
      this.storageService.syncChangesLimit('papelera', "idDoc" , this.limite);
    }
  
    getUsuario(email:string){
      let usuario = this.$usuariosTodos.find(u => u.email === email)
      //console.log("usuario encontrado: ",usuario);
      return usuario ?  usuario.name !== '' ? usuario.name : usuario.email : ''      
    }
  
    getFecha(date:number){
      return new Date(date).toLocaleDateString(undefined, {year: 'numeric', month: '2-digit', day: '2-digit', weekday:"long", hour: '2-digit', hour12: false, minute:'2-digit', second:'2-digit'});
    }
    
    consultarPapelera(){
      
      this.dbFirebase.getMostRecentLimit<LogDoc>('papelera', "idDoc" , this.limite)
      .pipe(
        takeUntil(this.destroy$),
        distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)) // Emitir solo si hay cambios reales
      )
      .subscribe(data => {            
                        
        if(data){
          this.papelera = data;          
        }
      });
    }

    modalObjeto(p:LogDoc){
      {
          const modalRef = this.modalService.open(ModalObjetoComponent, {
            windowClass: 'myCustomModalClass',
            centered: true,
            scrollable: true, 
            size: p.logEntry.coleccion === 'operaciones' ? 'lg' : p.logEntry.coleccion === 'facturaCliente' || p.logEntry.coleccion === 'facturaChofer' || p.logEntry.coleccion === 'facturaProveedor' ? 'md' : 'lg',     
          });   
          
          

          let info = {
            modo: p.logEntry.coleccion,
            item: p.objeto,
          }  
          //////console.log()(info); */
          
          modalRef.componentInstance.fromParent = info;
          if(p.logEntry.coleccion === 'legajos'){
            modalRef.componentInstance.fromParentPapelera = this.papelera;
          }
        
          modalRef.result.then(
            (result) => {
              
            },
            (reason) => {}
          );
      }
    }

    restaurarObjeto(logDoc:LogDoc){
      console.log("objeto", logDoc);
      let id: number = 0;
      let titulo: string = ""
      switch(logDoc.logEntry.coleccion){
        case "operaciones":
          id = logDoc.objeto.idOperacion;
          titulo = "Operación";
          logDoc.objeto.estado = {abierta: true, cerrada: false, facturada: false}
          logDoc.objeto.km = 0;
          
          break;
        case "clientes":
          id = logDoc.objeto.idCliente;
          titulo = "Cliente";
          break;
        case "choferes":
          id = logDoc.objeto.idChofer;
          titulo = "Chofer";
          break;
        case "proveedores":
          id = logDoc.objeto.proveedor;
          titulo = "Proveedor";
          break;
        case "facturaCliente":
          id = logDoc.objeto.idFacturaCliente;
          titulo = "Factura Cliente";
          break;
        case "facturaChofer":
          id = logDoc.objeto.idFacturaChofer;
          titulo = "Factura Chofer";
          break;
        case "facturaProveedor":
          id = logDoc.objeto.idFacturaProveedor;
          titulo = "Factura Proveedor";
          break;
        case "legajos":
          id = logDoc.objeto.idLegajo;
          titulo = "Legajo";
          break;
        default:
          break;
      }
      console.log("id", id);
      delete logDoc.objeto.id
      
        Swal.fire({
              title: "¡Atención!",
              text: "A la hora de restaurar un objeto debe tener en cuento que algunos items trabajan en relación con otros objetos. Ej: un legajo esta asignado a un chofer, un chofer puede estar asignado a un proveedor. Tenga en cuenta estas relaciones y restaure todos los objetos relacionados entre si para un correcto funcionamiento de la app. ¿Desea restaurar este objeto?",
              icon: "warning",
              showCancelButton: true,
              confirmButtonColor: "#3085d6",
              cancelButtonColor: "#d33",
              confirmButtonText: "Confirmar",
              cancelButtonText: "Cancelar"
            }).then((result) => {
              if (result.isConfirmed) {
                console.log("RESTAURAR logDoc.objeto:", logDoc.objeto);
                
                this.storageService.addItem(logDoc.logEntry.coleccion, logDoc.objeto, id, "RESTAURAR", `${titulo} ${id} restaurado desde la Papelera`);   
                this.storageService.deleteItem("papelera", logDoc, logDoc.idDoc, "INTERNA", "" ) 
                Swal.fire({
                  title: "Confirmado",
                  text: "El Objeto ha sido restaurado",
                  icon: "success"
                });
              }
            });  
    }

    
  
   

}

import { Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { distinctUntilChanged, Subject, takeUntil } from 'rxjs';
import { LogDoc } from 'src/app/interfaces/log-doc';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { ModalObjetoComponent } from 'src/app/shared/modal-objeto/modal-objeto.component';

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

    
  
   

}

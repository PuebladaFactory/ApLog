import { Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { UsuariosEdicionComponent } from '../modales/usuarios-edicion/usuarios-edicion.component';
import { AnimationKeyframesSequenceMetadata } from '@angular/animations';
import Swal from 'sweetalert2';
import { Subject, takeUntil } from 'rxjs';

@Component({
    selector: 'app-ajustes-usuarios',
    templateUrl: './ajustes-usuarios.component.html',
    styleUrls: ['./ajustes-usuarios.component.scss'],
    standalone: false
})
export class AjustesUsuariosComponent implements OnInit {
  
  searchText: string = "";
  $usuariosTodos: any[] = [];
  $usuario!: any;
  private destroy$ = new Subject<void>();

  constructor(private storageService: StorageService, private modalService: NgbModal){}

  ngOnInit(): void {
    let usuarioLogueado = this.storageService.loadInfo("usuario");
    this.$usuario = structuredClone(usuarioLogueado[0]);
    console.log("this.usuario2: ", this.$usuario);
    this.storageService.users$
    .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
    .subscribe(data => {
      if(data){
        
        this.$usuariosTodos = data;
        console.log("usuarios todos: ", this.$usuariosTodos);        
      }      
    });

    this.storageService.syncChangesUsers("users");
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  eliminarUsuario(user:any){
    Swal.fire({
          title: "¿Eliminar el Usuario?",
          text: "No se podrá revertir esta acción",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#3085d6",
          cancelButtonColor: "#d33",
          confirmButtonText: "Confirmar",
          cancelButtonText: "Cancelar"
        }).then((result) => {
          if (result.isConfirmed) {
            this.storageService.deleteUser("users", user, "BAJA");
            Swal.fire({
              title: "Confirmado",
              text: "El Usuario ha sido borrado",
              icon: "success"
            });
          }
        });   
  }

  openModal(user:any){
      {
        const modalRef = this.modalService.open(UsuariosEdicionComponent, {
          windowClass: 'myCustomModalClass',
          centered: true,
          size: 'sm', 
          //backdrop:"static" 
        });      
  
       let info = {          
          item: user,
        } 
        ////console.log()(info); */
        
        modalRef.componentInstance.fromParent = info;
        modalRef.result.then(
          (result) => {
           
          },
          (reason) => {}
        );
      }
    }

  

}

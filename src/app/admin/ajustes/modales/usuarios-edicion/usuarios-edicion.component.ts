import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-usuarios-edicion',
  templateUrl: './usuarios-edicion.component.html',
  styleUrls: ['./usuarios-edicion.component.scss']
})
export class UsuariosEdicionComponent implements OnInit {
 
  @Input() fromParent:any
  usuario!: any;
  correoVerificado!: boolean;
  nombre:string = "";
  roles: any = {god:false, admin:false, manager:false, user:false}

  constructor(public activeModal: NgbActiveModal, private storageService: StorageService){}
  
  ngOnInit(): void {
    let user = this.fromParent.item;
    this.usuario = structuredClone(user);
    console.log("this.usuario: ", this.usuario);
    this.armarUsuario();
  }

  armarUsuario(): void {
    this.correoVerificado = this.usuario.emailVerified;
    this.nombre = this.usuario.name;
    this.roles = this.usuario.roles
  }

  verificarCorreo(e:any){
    this.correoVerificado = e.target.value.toLowerCase() == 'true';   
  }

  asignarRoles(e:any){
    //console.log("roles: ", e.target.value);
    switch(e.target.value){
      case 'admin' :{
        this.roles = {god:false, admin:true, manager: false, user: false};
        break;
      }
      case 'manager' :{
        this.roles = {god:false, admin:false, manager: true, user: false};
        break;
      }
      case 'user' :{
        this.roles = {god:false, admin:false, manager: false, user: true};
        break;
      }
      default:{
        console.log("error");        
        break
      }
    }
  }

  updateUser(){
    this.usuario.emailVerified = this.correoVerificado;
    this.usuario.name = this.nombre ? this.nombre : "";
    this.usuario.roles = this.roles;
    console.log("usuario a editar:", this.usuario);
    Swal.fire({
              title: "¿Desea guardar los cambios?",
              text: "No se podrá revertir esta acción",
              icon: "warning",
              showCancelButton: true,
              confirmButtonColor: "#3085d6",
              cancelButtonColor: "#d33",
              confirmButtonText: "Confirmar",
              cancelButtonText: "Cancelar"
            }).then((result) => {
              if (result.isConfirmed) {
                this.storageService.updateUser('users', this.usuario, "EDITAR");
                this.activeModal.close()
                Swal.fire({
                  title: "Confirmado",
                  text: "Los cambios han sido guardados",
                  icon: "success"
                });
              }
            });   





    
  }

}

import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-usuarios-edicion',
    templateUrl: './usuarios-edicion.component.html',
    styleUrls: ['./usuarios-edicion.component.scss'],
    standalone: false
})
export class UsuariosEdicionComponent implements OnInit {
 
  @Input() fromParent:any
  usuario!: any;
  correoVerificado!: boolean;
  nombre:string = "";

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
  }

  verificarCorreo(e:any){
    this.correoVerificado = e.target.value.toLowerCase() == 'true';
  }

  // TODO: refactor alta de usuarios (Bloque C) — este flujo armaba el viejo mapa
  // de booleanos { god, admin, manager, user }. Con role: string único, asignar
  // un rol a OTRO usuario desde esta pantalla necesita rediseño (no es un simple
  // cambio de sintaxis), así que queda sin efecto hasta ese frente.
  asignarRoles(e:any){
    console.log("asignarRoles: pendiente de rediseño (Bloque C), valor recibido:", e.target.value);
  }

  updateUser(){
    this.usuario.emailVerified = this.correoVerificado;
    this.usuario.name = this.nombre ? this.nombre : "";
    // TODO: refactor alta de usuarios (Bloque C) — no se reasigna this.usuario.role
    // acá; ver nota en asignarRoles().
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

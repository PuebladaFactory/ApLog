import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Legajo } from 'src/app/interfaces/legajo';
import { AuthService } from 'src/app/servicios/autentificacion/auth.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-admin-sidebar',
  templateUrl: './admin-sidebar.component.html',
  styleUrls: ['./admin-sidebar.component.css']
})
export class AdminSidebarComponent implements OnInit {

  $legajos!: Legajo[];
  alertaRoja: boolean = false;
  alertaAmarilla: boolean = false;
  $usuario!: any;

  constructor(private router: Router, private authService: AuthService, private storageService: StorageService) { }

  ngOnInit(): void {
    this.storageService.legajos$.subscribe(data => {
      this.$legajos = data;     
      this.buscarAlertas();
    });
    //this.$usuario = this.storageService.loadInfo("usuario")
    //console.log("this.usuario: ", this.$usuario);
    let usuarioLogueado = this.storageService.loadInfo("usuario");
    this.$usuario = structuredClone(usuarioLogueado[0]);
    
  }
  
  volverLogin(){
    Swal.fire({
      title: "¿Cerrar la sesión?",
      //text: "No se podrá revertir esta acción",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Confirmar",
      cancelButtonText: "Cancelar"
    }).then((result) => {
      if (result.isConfirmed) {
        this.authService.SignOut()
        //this.router.navigate(['login'])      
        /* Swal.fire({
          title: "Confirmado",
          text: "Los cambios se han guardado",
          icon: "success"
        }); */
      }
    });   
   }
    
  buscarAlertas(){
    //console.log("0)sidebar");
    
    this.$legajos.forEach((legajo:Legajo)=>{
      if(legajo.estadoGral.porVencer || legajo.estadoGral.vencido){
        if(legajo.estadoGral.vencido){
          this.alertaRoja = true;
          //console.log("alerta roja: ", this.alertaRoja);          
        } else{
          if(legajo.estadoGral.porVencer){
            this.alertaAmarilla = true;
            //console.log("alerta amarilla: ", this.alertaAmarilla);
          }          
        }
      }
    })
  }

  navegar(ruta:string){
    let rutaActual = this.storageService.loadInfo("ruta")
    console.log("rutaActual", rutaActual);
    if(rutaActual[0] !== ruta){
      this.storageService.setInfo("ruta", [ruta]);
      //this.storageService.updateObservable("ruta", [ruta]);
    } else {
      console.log("nada");
      
    }
    
  }

}

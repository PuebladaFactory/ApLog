import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/servicios/autentificacion/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-admin-sidebar',
  templateUrl: './admin-sidebar.component.html',
  styleUrls: ['./admin-sidebar.component.css']
})
export class AdminSidebarComponent implements OnInit {

  constructor(private router: Router, private authService: AuthService) { }

  ngOnInit(): void {
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
        this.router.navigate(['login'])      
        /* Swal.fire({
          title: "Confirmado",
          text: "Los cambios se han guardado",
          icon: "success"
        }); */
      }
    });   
   }
    
  

}

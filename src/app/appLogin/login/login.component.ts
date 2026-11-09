import { Component, OnInit } from '@angular/core';



import { AuthService } from 'src/app/servicios/autentificacion/auth.service';
import { TEXTO_AVISO_SESION, tomarMarcaAvisoSesion } from 'src/app/servicios/usuario-sesion/sesion-invalida.util';
import Swal from 'sweetalert2';


@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.css'],
    standalone: false
})
export class LoginComponent implements OnInit {
  // propiedades servicio modal


  hide = true;
  spinner: boolean = false;



  constructor(
    public authService: AuthService,
  ) {


  }

  ngOnInit(): void {
    // Eje de sesión, bloque 2c: la red de sesión inválida recarga /login y deja
    // la marca en sessionStorage. Se lee y se BORRA antes de mostrar, para que
    // una recarga posterior no repita el aviso.
    if (tomarMarcaAvisoSesion(sessionStorage)) {
      Swal.fire({ icon: 'warning', text: TEXTO_AVISO_SESION });
    }
  }


  /* accionAsincrona = async () => {
    console.log("pasa por aca 1?");
    this.spinner = true;
    return new Promise<void>((resolve, reject) => {
      console.log("pasa por aca 2?");
      setTimeout(() => {
        resolve();
      }, 3000);
    })

      .then(() => {
        console.log("pasa por aca 3?");
        this.spinner = false;
      });
  } */

      onKeydown(event: KeyboardEvent, username: string, password: string) {
        if (event.key === 'Enter') {
          this.authService.iniciarSesion(username, password);
        }
      }



}

import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';



import { AuthService } from 'src/app/servicios/autentificacion/auth.service';
import { TEXTO_AVISO_SESION, tomarMarcaAvisoSesion } from 'src/app/servicios/usuario-sesion/sesion-invalida.util';
import { UsuarioSesionService } from 'src/app/servicios/usuario-sesion/usuario-sesion.service';
import { Usuario } from 'src/app/interfaces/usuario';
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

  /** Eje de sesión, bloque 3: true hasta que la sesión quedó reconciliada con
   *  Firebase Auth. Arranca en true para que el formulario no aparezca un
   *  instante antes de saber si hay sesión. */
  resolviendo = true;
  /** La sesión viva, leída DESPUÉS de la reconciliación. */
  sesionViva: Usuario | null = null;



  constructor(
    public authService: AuthService,
    private usuarioSesion: UsuarioSesionService,
    private router: Router,
  ) {


  }

  async ngOnInit(): Promise<void> {
    // Eje de sesión, bloque 2c: la red de sesión inválida recarga /login y deja
    // la marca en sessionStorage. Se lee y se BORRA antes de mostrar, para que
    // una recarga posterior no repita el aviso. Sincrónico y antes de esperar:
    // no depende de la reconciliación ni la pisa.
    if (tomarMarcaAvisoSesion(sessionStorage)) {
      Swal.fire({ icon: 'warning', text: TEXTO_AVISO_SESION });
    }

    // Eje de sesión, bloque 3: la sesión se lee DESPUÉS de la reconciliación,
    // no de localStorage ni del getter a secas (eso sería otra mentira). Con
    // sesión viva se ofrece continuar o cerrarla; no se redirige sola: quien
    // entra a /login puede querer cambiar de usuario.
    this.resolviendo = true;
    await this.usuarioSesion.sesionResuelta();
    this.sesionViva = this.usuarioSesion.getUsuarioActual();
    this.resolviendo = false;
  }

  /** A la pantalla principal, directo: sin la espera de /carga. */
  continuar(): void {
    this.router.navigate(['/op']);
  }

  /** cerrarSesion termina en una carga completa de /login (bloque 2c): el
   *  componente nace de cero con la sesión limpia. No hay "después". */
  cerrarSesion(): void {
    this.authService.cerrarSesion();
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

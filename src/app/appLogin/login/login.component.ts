import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';



import { AuthService } from 'src/app/servicios/autentificacion/auth.service';
import { textoAvisoSesion, tomarMarcaAvisoSesion } from 'src/app/servicios/usuario-sesion/sesion-invalida.util';
import { UsuarioSesionService } from 'src/app/servicios/usuario-sesion/usuario-sesion.service';
import { SesionInvalidaService } from 'src/app/servicios/usuario-sesion/sesion-invalida.service';
import { leerUltimaActividad, marcaVencida } from 'src/app/servicios/usuario-sesion/inactividad.util';
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
    private sesionInvalida: SesionInvalidaService,
  ) {


  }

  async ngOnInit(): Promise<void> {
    // Eje de sesión, bloque 2c: la red de sesión inválida recarga /login y deja
    // la marca en sessionStorage. Se lee y se BORRA antes de mostrar, para que
    // una recarga posterior no repita el aviso. Sincrónico y antes de esperar:
    // no depende de la reconciliación ni la pisa.
    // Bloque 4: la marca trae el motivo (sesión vencida o inactividad) y el
    // texto se elige acá.
    const motivo = tomarMarcaAvisoSesion(sessionStorage);
    if (motivo !== null) {
      Swal.fire({ icon: 'warning', text: textoAvisoSesion(motivo) });
    }

    // Eje de sesión, bloque 3: la sesión se lee DESPUÉS de la reconciliación,
    // no de localStorage ni del getter a secas (eso sería otra mentira). Con
    // sesión viva se ofrece continuar o cerrarla; no se redirige sola: quien
    // entra a /login puede querer cambiar de usuario.
    this.resolviendo = true;
    await this.usuarioSesion.sesionResuelta();
    const sesion = this.usuarioSesion.getUsuarioActual();

    // Bloque 4: una sesión cuya marca de actividad ya venció (navegador
    // cerrado sin desloguearse, de un día para el otro) no se ofrece para
    // continuar. Se cierra acá, por la salida compartida y con el motivo de
    // inactividad (escribe LOGOUT y recarga /login con el aviso). Mientras
    // tanto queda el spinner: no hay botones que mostrar.
    if (sesion !== null && marcaVencida(leerUltimaActividad(localStorage), Date.now())) {
      this.sesionInvalida.cerrarSesionForzada('inactividad');
      return;
    }

    this.sesionViva = sesion;
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

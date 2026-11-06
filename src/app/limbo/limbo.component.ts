import { Component, OnInit } from '@angular/core';
import { AuthService } from '../servicios/autentificacion/auth.service';

@Component({
    selector: 'app-limbo',
    templateUrl: './limbo.component.html',
    styleUrls: ['./limbo.component.scss'],
    standalone: false
})
export class LimboComponent implements OnInit {

  constructor(private authService: AuthService){}

  ngOnInit(): void {}

  // cerrarSesion tolera llegar sin sesión de app ni usuario de Auth (ramas
  // sin documento / sin rol del login): el LOGOUT se loguea sólo con sesión
  // y signOut sobre null es inocuo. Navega a /login.
  volver(){this.authService.cerrarSesion();}

}

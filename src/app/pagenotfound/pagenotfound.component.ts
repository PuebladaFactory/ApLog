import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UsuarioSesionService } from '../servicios/usuario-sesion/usuario-sesion.service';

@Component({
    selector: 'app-pagenotfound',
    templateUrl: './pagenotfound.component.html',
    styleUrls: ['./pagenotfound.component.scss'],
    standalone: false
})
export class PagenotfoundComponent implements OnInit {

  constructor(private router: Router, private usuarioSesion: UsuarioSesionService) { }

  ngOnInit(): void {
  }

  volver() {
    if (this.usuarioSesion.getUsuarioActual() !== null) {
      this.router.navigate(['op']);
    } else {
      this.router.navigate(['login']);
    }

  }


}

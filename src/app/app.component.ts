import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './servicios/autentificacion/auth.service';
import { SwUpdate } from '@angular/service-worker';
import Swal from 'sweetalert2';




@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
    standalone: false
})
export class AppComponent implements OnInit {
  title = 'ApLog';
  // $estado;



constructor(private swUpdate: SwUpdate) {
    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates.subscribe(event => {
        if (event.type === 'VERSION_READY') {
          // Hay una nueva versión disponible
          Swal.fire({
            title: '¡Nueva versión disponible!',
            text: '¿Querés actualizar para ver los últimos cambios?',
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: 'Actualizar',
            cancelButtonText: 'Más tarde'
          }).then((result) => {
            if (result.isConfirmed) {
              location.reload();
            }
          });
        }
        
      });
    }
  }
  ngOnInit(): void {
    // this.$estado.subscribe;
  }
}

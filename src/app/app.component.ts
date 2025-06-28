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
      this.swUpdate.versionUpdates.subscribe((event) => {
        if (event.type === 'VERSION_READY') {
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

  verificarActualizaciones() {
    if (this.swUpdate.isEnabled) {
      this.swUpdate.checkForUpdate().then((hasUpdate) => {
        if (hasUpdate) {
          Swal.fire('✅ Hay una nueva versión disponible.');
        } else {
          Swal.fire('👍 Estás usando la última versión.');
        }
      }).catch((err) => {
        Swal.fire('❌ Error al verificar actualizaciones.', err.message, 'error');
      });
    } else {
      Swal.fire('ℹ️ El Service Worker no está habilitado.');
    }
  }
  ngOnInit(): void {
    // this.$estado.subscribe;
  }
}

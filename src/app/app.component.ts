import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './servicios/autentificacion/auth.service';
import { SwUpdate } from '@angular/service-worker';
import Swal from 'sweetalert2';
import { appVersion } from 'src/environments/version';
import { StorageService } from './servicios/storage/storage.service';
import { Cliente } from './interfaces/cliente';
import { Chofer } from './interfaces/chofer';
import { Proveedor } from './interfaces/proveedor';
import { TarifaGralCliente } from './interfaces/tarifa-gral-cliente';
import { TarifaPersonalizadaCliente } from './interfaces/tarifa-personalizada-cliente';

let version = 'v0.0.0'; // fallback por defecto

try {
  version = require('src/environments/version').appVersion;
} catch (e) {
  console.warn('⚠️ version.ts no encontrado, usando versión por defecto.');
}

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
    standalone: false
})
export class AppComponent implements OnInit {
  title = 'ApLog';
  // $estado;
  appVersion = version;


  constructor(private swUpdate: SwUpdate, private storageService: StorageService) {
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
    this.storageService.listenForChanges<Cliente>("clientes");
    this.storageService.listenForChanges<Chofer>("choferes");
    this.storageService.listenForChanges<Proveedor>("proveedores");
    this.storageService.listenForChanges<TarifaGralCliente>("tarifasGralCliente");
    this.storageService.listenForChanges<TarifaGralCliente>("tarifasEspCliente");
    this.storageService.listenForChanges<TarifaPersonalizadaCliente>('tarifasPersCliente');
    this.storageService.listenForChanges<TarifaGralCliente>("tarifasGralChofer");
    this.storageService.listenForChanges<TarifaGralCliente>("tarifasEspChofer");
    this.storageService.listenForChanges<TarifaGralCliente>("tarifasGralProveedor");
    this.storageService.listenForChanges<TarifaGralCliente>("tarifasEspProveedor");
  }
}

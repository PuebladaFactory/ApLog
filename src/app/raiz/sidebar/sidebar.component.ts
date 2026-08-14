import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Legajo, estadoGeneralDeLegajo } from 'src/app/interfaces/legajo';
import { ConIdType } from 'src/app/interfaces/conId';
import { AuthService } from 'src/app/servicios/autentificacion/auth.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { LegajoService } from 'src/app/servicios/legajos/legajo.service';
import { UsuarioSesionService } from 'src/app/servicios/usuario-sesion/usuario-sesion.service';
import Swal from 'sweetalert2';

let version = 'v0.0.0'; // fallback por defecto

try {
  version = require('src/environments/version').appVersion;
} catch (e) {
  console.warn('⚠️ version.ts no encontrado, usando versión por defecto.');
}


@Component({
    selector: 'app-sidebar',
    templateUrl: './sidebar.component.html',
    styleUrls: ['./sidebar.component.css'],
    standalone: false
})
export class SidebarComponent implements OnInit {

  $legajos!: ConIdType<Legajo>[];
  alertaRoja: boolean = false;
  alertaAmarilla: boolean = false;
  $usuario!: any;
  appVersion = version;
  private destroy$ = new Subject<void>(); // Subject para manejar la destrucción

  constructor(
    private authService: AuthService,
    private storageService: StorageService,
    private legajoService: LegajoService,
    public usuarioSesion: UsuarioSesionService,
  ) { }

  ngOnInit(): void {
    this.legajoService.legajos$
    .pipe(takeUntil(this.destroy$))
    .subscribe(data => {
      this.$legajos = data;
      this.buscarAlertas();
    });
    this.$usuario = this.usuarioSesion.getUsuarioActual();

  }

  ngOnDestroy(): void {
    // Completa el Subject para cancelar todas las suscripciones
    this.destroy$.next();
    this.destroy$.complete();
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
        this.authService.cerrarSesion()
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
    this.alertaRoja = false;
    this.alertaAmarilla = false;
    this.$legajos.forEach((legajo: ConIdType<Legajo>) => {
      const estado = estadoGeneralDeLegajo(legajo);
      if (estado === 'vencido') this.alertaRoja = true;
      else if (estado === 'porVencer') this.alertaAmarilla = true;
    });
  }

  navegar(ruta:string){
    let rutaActual = this.storageService.loadInfo("ruta")
    //console.log("rutaActual", rutaActual);
    if(rutaActual[0] !== ruta){
      this.storageService.setInfo("ruta", [ruta]);
      //this.storageService.updateObservable("ruta", [ruta]);
    } else {
      //console.log("nada");
      
    }
    
  }

}

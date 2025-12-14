import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subject, take, takeUntil } from 'rxjs';
import { Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { Legajo } from 'src/app/interfaces/legajo';
import { TarifaGralCliente } from 'src/app/interfaces/tarifa-gral-cliente';
import { TarifaPersonalizadaCliente } from 'src/app/interfaces/tarifa-personalizada-cliente';
import { Vendedor } from 'src/app/interfaces/vendedor';
import { LegajosService } from 'src/app/servicios/legajos/legajos.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';

let version = 'v0.0.0'; // fallback por defecto

try {
  version = require('src/environments/version').appVersion;
} catch (e) {
  console.warn('⚠️ version.ts no encontrado, usando versión por defecto.');
}


@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.css'],
    standalone: false
})
export class HomeComponent implements OnInit {

  appVersion = version;
  activo!:boolean;
  $legajos!:Legajo[];
  $usuario!: any;
  tarifas$!: Observable<any>;
  private destroy$ = new Subject<void>();
  
  constructor(private storageService: StorageService, private legajoServ: LegajosService, private router: Router) { }

  ngOnInit(): void {
    this.setInitialSidebarState();
    window.addEventListener('resize', this.onResize);
    this.storageService.legajos$
      .pipe(take(1))
      .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
      .subscribe(data => {
        this.$legajos = data;     
        if(this.$legajos.length > 0){
          this.legajoServ.verificarEstadosLegajos(this.$legajos);
        };        
        //this.router.navigate(['admin']);
        
      });
      let usuarioLogueado = this.storageService.loadInfo("usuario");
      this.$usuario = structuredClone(usuarioLogueado[0]);      
      this.storageService.listenForChanges<Cliente>("clientes");
      this.storageService.listenForChanges<Chofer>("choferes");
      this.storageService.listenForChanges<Chofer>("proveedores");
      this.storageService.listenForChanges<TarifaGralCliente>("tarifasGralCliente");
      this.storageService.listenForChanges<TarifaGralCliente>("tarifasEspCliente");
      this.storageService.listenForChanges<TarifaPersonalizadaCliente>('tarifasPersCliente');
      this.storageService.listenForChanges<TarifaGralCliente>("tarifasGralChofer");
      this.storageService.listenForChanges<TarifaGralCliente>("tarifasEspChofer");
      this.storageService.listenForChanges<TarifaGralCliente>("tarifasGralProveedor");
      this.storageService.listenForChanges<TarifaGralCliente>("tarifasEspProveedor");
      this.storageService.listenForChanges<Vendedor>("vendedores");
      
      

/*       this.storageService.getObservable("ruta")
      .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
      .subscribe(data=>{
        if(data){
          //console.log("ruta", data);
          this.router.navigate([data[0]]);    
        }
      })
      this.router.navigate(['op']); */
      //this.storageService.setInfo("ruta", ["op"])
      //this.storageService.syncChangesTarifasGral<TarifaGralCliente>('tarifasEspCliente');
      //this.storageService.syncChangesTarifasGral<TarifaPersonalizadaCliente>('tarifasPersCliente');
      //this.storageService.syncChangesTarifasEspCliente<TarifaPersonalizadaCliente>('tarifasPersCliente');
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.onResize);
    this.destroy$.next();
    this.destroy$.complete();
  }

  setInitialSidebarState(): void {
    this.activo = window.innerWidth >= 1600;
  }

  @HostListener('window:resize', ['$event'])
  onResize(event:any): void {
    this.setInitialSidebarState();
  }

  toogleSidebar(): void {
    this.activo = !this.activo;   
  }



}

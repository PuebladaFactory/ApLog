import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subject, takeUntil } from 'rxjs';
import { Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { NoDisponibilidadChofer } from 'src/app/interfaces/no-disponibilidad-chofer';
import { TarifaGralCliente } from 'src/app/interfaces/tarifa-gral-cliente';
import { TarifaPersonalizadaCliente } from 'src/app/interfaces/tarifa-personalizada-cliente';
import { Vendedor } from 'src/app/interfaces/vendedor';
import { CategoriaDocumentacionService } from 'src/app/servicios/categoria-documentacion/categoria-documentacion.service';
import { LegajoService } from 'src/app/servicios/legajos/legajo.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { ChoferService } from 'src/app/servicios/choferes/chofer.service';
import { ProveedorService } from 'src/app/servicios/proveedores/proveedor.service';
import { ClienteService } from 'src/app/servicios/clientes/cliente.service';
import { TarifarioService } from 'src/app/servicios/tarifario/tarifario.service';

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
  tarifas$!: Observable<any>;
  private destroy$ = new Subject<void>();

  constructor(private storageService: StorageService, private categoriaDocumentacionService: CategoriaDocumentacionService, private legajoService: LegajoService, private router: Router, private choferService: ChoferService, private proveedorService: ProveedorService, private clienteService: ClienteService, private tarifarioService: TarifarioService) { }

  ngOnInit(): void {
    this.choferService.init();
    this.proveedorService.init();
    this.clienteService.init();
    this.tarifarioService.init();
    this.categoriaDocumentacionService.init();
    this.legajoService.init();
    this.setInitialSidebarState();
    window.addEventListener('resize', this.onResize);
      //this.storageService.listenForChanges<Cliente>("clientes");
      //this.storageService.listenForChanges<Chofer>("choferes");
      //this.storageService.listenForChanges<Chofer>("proveedores");
      this.storageService.listenForChanges<TarifaGralCliente>("tarifasGralCliente");
      this.storageService.listenForChanges<TarifaGralCliente>("tarifasEspCliente");
      this.storageService.listenForChanges<TarifaPersonalizadaCliente>('tarifasPersCliente');
      this.storageService.listenForChanges<TarifaGralCliente>("tarifasGralChofer");
      this.storageService.listenForChanges<TarifaGralCliente>("tarifasEspChofer");
      this.storageService.listenForChanges<TarifaGralCliente>("tarifasGralProveedor");
      this.storageService.listenForChanges<TarifaGralCliente>("tarifasEspProveedor");
      this.storageService.listenForChanges<Vendedor>("vendedores");
      this.storageService.listenForChangesField<NoDisponibilidadChofer>("noOperativo", "activa", true);
      

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

import { Component, HostListener, OnInit } from '@angular/core';
import { Observable, take } from 'rxjs';
import { Cliente } from 'src/app/interfaces/cliente';
import { Legajo } from 'src/app/interfaces/legajo';
import { TarifaGralCliente } from 'src/app/interfaces/tarifa-gral-cliente';
import { TarifaPersonalizadaCliente } from 'src/app/interfaces/tarifa-personalizada-cliente';
import { LegajosService } from 'src/app/servicios/legajos/legajos.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-admin-home',
  templateUrl: './admin-home.component.html',
  styleUrls: ['./admin-home.component.css']
})
export class AdminHomeComponent implements OnInit {

  
  activo!:boolean;
  $legajos!:Legajo[];
  $usuario!: any;
  tarifas$!: Observable<any>;

  constructor(private storageService: StorageService, private legajoServ: LegajosService) { }

  ngOnInit(): void {
    this.setInitialSidebarState();
    window.addEventListener('resize', this.onResize);
    this.storageService.legajos$
      .pipe(take(1))
      .subscribe(data => {
        this.$legajos = data;     
        if(this.$legajos.length > 0){
          this.legajoServ.verificarEstadosLegajos(this.$legajos);
        };        
        //this.router.navigate(['admin']);
        
      });
      let usuarioLogueado = this.storageService.loadInfo("usuario");
      this.$usuario = structuredClone(usuarioLogueado[0]);      
      
      this.storageService.syncChangesTarifasGral<TarifaGralCliente>('tarifasGralCliente');
      this.storageService.syncChangesTarifasGral<TarifaGralCliente>('tarifasEspCliente');
      this.storageService.syncChangesTarifasGral<TarifaPersonalizadaCliente>('tarifasPersCliente');
      //this.storageService.syncChangesTarifasEspCliente<TarifaPersonalizadaCliente>('tarifasPersCliente');
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.onResize);
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

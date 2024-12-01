import { Component, HostListener, OnInit } from '@angular/core';
import { take } from 'rxjs';
import { Legajo } from 'src/app/interfaces/legajo';
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

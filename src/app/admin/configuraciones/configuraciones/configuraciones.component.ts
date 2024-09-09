import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-configuraciones',
  templateUrl: './configuraciones.component.html',
  styleUrls: ['./configuraciones.component.scss']
})
export class ConfiguracionesComponent implements OnInit {

  selectedTab: string = 'tab1';

  constructor(private router: Router) {
    
  }
  ngOnInit(): void {
    this.selectTab("tab1");
  }

  selectTab(tab: string) {
    this.selectedTab = tab;
    if (tab === 'tab1') {
      this.router.navigate(['ajustes/clientes']);
    } else if (tab === 'tab2') {
      this.router.navigate(['ajustes/choferes']);
    } else if (tab === 'tab3') {
      this.router.navigate(['ajustes/proveedores']);
    }
  }

}

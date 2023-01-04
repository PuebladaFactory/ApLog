import { Component, OnInit } from '@angular/core';
import { EstadoCajaService } from '../servicios/estado-caja.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit {
  title = 'LinkinPark';

  clientes!: any;
  vehiculos!: any;
  tarifas!: any;
  collapsed = true;

  constructor(private estadoCaja: EstadoCajaService) {}

  ngOnInit(): void {
    // chequea el estado de las cajas al abrr la app
     this.estadoCaja.getCajaAbierta()
  }
}

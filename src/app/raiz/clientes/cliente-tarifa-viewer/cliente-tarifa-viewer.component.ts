import { Component, Input, OnInit } from '@angular/core';
import { TarifaPersonalizadaCliente } from 'src/app/interfaces/tarifa-personalizada-cliente';

@Component({
  selector: 'app-cliente-tarifa-viewer',
  standalone: false,
  templateUrl: './cliente-tarifa-viewer.component.html',
  styleUrl: './cliente-tarifa-viewer.component.scss'
})
export class ClienteTarifaViewerComponent implements OnInit {
  
  @Input() tarifa!: TarifaPersonalizadaCliente;

  constructor(){}
  
  ngOnInit(): void {
    
  }

  

}

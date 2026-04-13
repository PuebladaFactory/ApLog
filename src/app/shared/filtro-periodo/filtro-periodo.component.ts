import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { PeriodoFiltro } from 'src/app/interfaces/resumen-op-base';

@Component({
  selector: 'app-filtro-periodo',
  standalone: false,
  templateUrl: './filtro-periodo.component.html',
  styleUrl: './filtro-periodo.component.scss'
})
export class FiltroPeriodoComponent implements OnInit {

  @Output() periodoChange = new EventEmitter<PeriodoFiltro>();
  
  ngOnInit(): void {
    
  }

}

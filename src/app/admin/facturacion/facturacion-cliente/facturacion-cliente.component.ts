import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-facturacion-cliente',
  templateUrl: './facturacion-cliente.component.html',
  styleUrls: ['./facturacion-cliente.component.scss']
})
export class FacturacionClienteComponent implements OnInit  {

  consultaTipo: 'anual' | 'mensual' = 'mensual'; // Inicialmente la consulta es anual
  aniosDisponibles: number[] = [2022, 2023, 2024]; // Lista de años disponibles
  mesSeleccionado: number = 1; // Inicialmente seleccionado el mes de enero
  mesesDisponibles: { nombre: string, numero: number }[] = [
    { nombre: 'Enero', numero: 1 },
    { nombre: 'Febrero', numero: 2 },
    { nombre: 'Marzo', numero: 3 },
    { nombre: 'Abril', numero: 4 },
    { nombre: 'Mayo', numero: 5 },
    { nombre: 'Junio', numero: 6 },
    { nombre: 'Julio', numero: 7 },
    { nombre: 'Agosto', numero: 8 },
    { nombre: 'Septiembre', numero: 9 },
    { nombre: 'Octubre', numero: 10 },
    { nombre: 'Noviembre', numero: 11 },
    { nombre: 'Diciembre', numero: 12 }
  ];
  anioSeleccionado!: number;

  constructor(){
    
  }

  ngOnInit(): void {
    
  }

  seleccionarConsulta(tipo: 'anual' | 'mensual'): void {
    this.consultaTipo = tipo;
  }

  // Método para ejecutar la consulta
  ejecutarConsulta(): void {
    if (this.consultaTipo === 'anual') {
      console.log('Consulta anual del año', this.anioSeleccionado);
      // Aquí puedes implementar la lógica para consultar datos anuales
    } else {
      console.log('Consulta mensual del mes', this.mesSeleccionado);
      // Aquí puedes implementar la lógica para consultar datos mensuales
    }
  }
}

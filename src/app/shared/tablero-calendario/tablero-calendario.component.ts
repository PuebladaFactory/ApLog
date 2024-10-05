import { Component, inject, OnInit } from '@angular/core';
import { NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { NgbCalendar, NgbDate, NgbDatepickerModule } from '@ng-bootstrap/ng-bootstrap';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-tablero-calendario',
  templateUrl: './tablero-calendario.component.html',
  styleUrls: ['./tablero-calendario.component.scss']
})
export class TableroCalendarioComponent implements OnInit {
   // Objeto de consulta de fechas
   fechasConsulta: any = {
    fechaDesde: '',
    fechaHasta: ''
  };
  
  // Variables para controlar el formato seleccionado
  formatoSeleccionado: string = 'Semana';
  
  // Fecha seleccionada en modo manual
  fechaDesdeManual!: NgbDateStruct;
  fechaHastaManual!: NgbDateStruct;
  
  // Para mostrar el rango de fechas en el template
  fechaDesdeString!: string;
  fechaHastaString!: string;

  fechaManualDesdeString!: string;
  fechaManualHastaString!: string;

  calendar = inject(NgbCalendar);

	hoveredDate: NgbDate | null = null;
	fromDate: NgbDate = this.calendar.getToday();
	toDate: NgbDate | null = this.calendar.getNext(this.fromDate, 'd', 10);

  constructor(private storageService: StorageService){

  }

  ngOnInit(): void {
    // Al iniciar, calcular la semana actual como rango por defecto
    this.calcularSemanaActual();
  }

  // Métodos para calcular los distintos formatos de consulta
  calcularDiaActual() {
    const today = new Date();
    this.fechasConsulta.fechaDesde = today.toISOString().split('T')[0];
    this.fechasConsulta.fechaHasta = today.toISOString().split('T')[0];
    this.formatoSeleccionado = 'Día';
    this.actualizarFechasString();
  }

  calcularSemanaActual() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)); // Lunes de la semana actual
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6); // Domingo de la semana actual
    this.fechasConsulta.fechaDesde = monday.toISOString().split('T')[0];
    this.fechasConsulta.fechaHasta = sunday.toISOString().split('T')[0];
    //console.log("fecha consulta: ", this.fechasConsulta);
    
    this.formatoSeleccionado = 'Semana';
    this.actualizarFechasString();
  }

  calcularQuincenaActual() {
    const now = new Date();
    const dia = now.getDate();
    if (dia <= 15) {
      this.fechasConsulta.fechaDesde = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      this.fechasConsulta.fechaHasta = new Date(now.getFullYear(), now.getMonth(), 15).toISOString().split('T')[0];
    } else {
      this.fechasConsulta.fechaDesde = new Date(now.getFullYear(), now.getMonth(), 16).toISOString().split('T')[0];
      this.fechasConsulta.fechaHasta = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    }
    this.formatoSeleccionado = 'Quincena';
    this.actualizarFechasString();
  }

  calcularMesActual() {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    this.fechasConsulta.fechaDesde = firstDay.toISOString().split('T')[0];
    this.fechasConsulta.fechaHasta = lastDay.toISOString().split('T')[0];
    this.formatoSeleccionado = 'Mes';
    this.actualizarFechasString();
  }

  calcularTrimestreActual() {
    const now = new Date();
    const trimestreInicio = Math.floor(now.getMonth() / 3) * 3;
    const firstDay = new Date(now.getFullYear(), trimestreInicio, 1);
    const lastDay = new Date(now.getFullYear(), trimestreInicio + 3, 0);
    this.fechasConsulta.fechaDesde = firstDay.toISOString().split('T')[0];
    this.fechasConsulta.fechaHasta = lastDay.toISOString().split('T')[0];
    this.formatoSeleccionado = 'Trimestre';
    this.actualizarFechasString();
  }

  // Método para cuando el usuario elige el formato manual
  establecerRangoManual() {
    this.formatoSeleccionado = 'Manual';  
    this.fechaDesdeString = "                ";
    this.fechaHastaString = "                ";     
  }

  consultarRangoManual(){
    if (this.fechaDesdeManual && this.fechaHastaManual) {
      const fechaDesde = new Date(this.fechaDesdeManual.year, this.fechaDesdeManual.month - 1, this.fechaDesdeManual.day);
      const fechaHasta = new Date(this.fechaHastaManual.year, this.fechaHastaManual.month - 1, this.fechaHastaManual.day);
      this.fechasConsulta.fechaDesde = fechaDesde.toISOString().split('T')[0];
      this.fechasConsulta.fechaHasta = fechaHasta.toISOString().split('T')[0];
      this.formatoSeleccionado = 'Manual';
      this.actualizarFechasString();
    } 
  }

  // Método para avanzar o retroceder el rango de la consulta
  cambiarRango(adelante: boolean) {
    let diff = 0;
    const factor = adelante ? 1 : -1;
    const desde = new Date(this.fechasConsulta.fechaDesde);
    const hasta = new Date(this.fechasConsulta.fechaHasta);
    //console.log("1) desde: ", this.fechasConsulta.fechaDesde, " y hasta: ", this.fechasConsulta.fechaHasta);
    

    switch (this.formatoSeleccionado) {
      case 'Día':
        diff = 1;        
        this.fechasConsulta.fechaDesde = new Date(desde.setDate(desde.getDate() + diff * factor)).toISOString().split('T')[0];
        this.fechasConsulta.fechaHasta = new Date(hasta.setDate(hasta.getDate() + diff * factor)).toISOString().split('T')[0];    
        break;
      case 'Semana':
        diff = 7;        
        this.fechasConsulta.fechaDesde = new Date(desde.setDate(desde.getDate() + diff * factor)).toISOString().split('T')[0];
        this.fechasConsulta.fechaHasta = new Date(hasta.setDate(hasta.getDate() + diff * factor)).toISOString().split('T')[0];    
        break;
      case 'Quincena':
        //this.fechasConsulta.fechaDesde = this.getPrimerDia(factor);
        this.calcularQuincena(adelante);
        //console.log("2) Quincena desde: ", this.fechasConsulta.fechaDesde, " y hasta: ", this.fechasConsulta.fechaHasta);
        diff = 15;
        break;
      case 'Mes':
        this.fechasConsulta.fechaDesde = this.getPrimerDia(factor);
        //console.log("fechaDesde", this.fechasConsulta.fechaDesde);
        this.fechasConsulta.fechaHasta =this.getUltimoDiaMes()
        //console.log("fechaHasta", this.fechasConsulta.fechaHasta);
        break;
      case 'Trimestre':
        this.calcularTrimestre(adelante)
        break;
      default:
        return;
    }    
    
    this.actualizarFechasString();
  }

  getPrimerDia(variacion: number): string {
    // Obtenemos la fecha como string en formato YYYY-MM-DD
    let desde = new Date(this.fechasConsulta.fechaDesde).toISOString().split('T')[0];

    // Dividimos la fecha en partes: año, mes y día
    let partesFecha = desde.split('-');

    // Convertimos el mes a número
    let mes: number = parseInt(partesFecha[1], 10);

    // Modificamos el mes con la variación
    mes += variacion;

    // Si el mes es mayor a 12, volvemos a enero y sumamos al año
    if (mes > 12) {
        mes = 1;
        partesFecha[0] = (parseInt(partesFecha[0], 10) + 1).toString(); // Aumentamos el año en 1
    }

    // Si el mes es menor que 1 (esto incluye cuando restas un mes a enero), volvemos a diciembre del año anterior
    if (mes < 1) {
        mes = 12;
        partesFecha[0] = (parseInt(partesFecha[0], 10) - 1).toString(); // Restamos un año
    }

    // Si el mes es menor que 10, añadimos un 0 delante para mantener el formato correcto
    partesFecha[1] = mes < 10 ? '0' + mes.toString() : mes.toString();

    // Volvemos a unir las partes para obtener la fecha modificada
    desde = partesFecha.join('-');

    return desde;
}

  getUltimoDiaMes(){
    // Supongamos que tienes la fecha como string
    let fecha: string = this.fechasConsulta.fechaDesde;
    ////console.log(fecha);

    // Dividimos la fecha en partes: año, mes y día
    let partesFecha = fecha.split('-');

    // Obtenemos el año y el mes
    let anio: number = parseInt(partesFecha[0], 10);
    let mes: number = parseInt(partesFecha[1], 10);

    // Creamos una fecha del primer día del siguiente mes
    let primerDiaSiguienteMes = new Date(anio, mes, 1); // El mes en JavaScript es base 0

    // Restamos un día a la fecha para obtener el último día del mes actual
    primerDiaSiguienteMes.setDate(primerDiaSiguienteMes.getDate() - 1);

    // Obtenemos el último día del mes
    let ultimoDiaDelMes: number = primerDiaSiguienteMes.getDate();

    // Reemplazamos el día en la cadena original
    partesFecha[2] = ultimoDiaDelMes < 10 ? '0' + ultimoDiaDelMes.toString() : ultimoDiaDelMes.toString(); // Ajustamos el formato para mantener el día con dos dígitos

    // Volvemos a unir las partes para reconstruir la fecha con el día modificado
    fecha = partesFecha.join('-');

    //console.log(fecha); // Imprime la nueva fecha con el último día del mes, por ejemplo "2024-10-31"
    return fecha
  }

  calcularQuincena(adelante: boolean) {
    //console.log(adelante);
    //console.log();
     // Convertimos la fecha actual almacenada en fechasConsulta a Date sin desajuste de zona horaria
  const partesFecha = this.fechasConsulta.fechaDesde.split('-');
  const anio = parseInt(partesFecha[0], 10);
  const mes = parseInt(partesFecha[1], 10) - 1; // El mes es base 0 en JavaScript
  const dia = parseInt(partesFecha[2], 10);

  // Creamos la fecha manualmente sin que JavaScript aplique el desfase horario
  let fechaActual = new Date(anio, mes, dia);
  console.log("1) Fecha actual sin desfase: ", fechaActual);

  // Obtener mes y día
  let nuevoAnio = fechaActual.getFullYear();
  let nuevoMes = fechaActual.getMonth();
  let nuevoDia = fechaActual.getDate();

  
  if (adelante) {
    // Calcular quincena siguiente
    if (nuevoDia <= 15) {
      this.fechasConsulta.fechaDesde = new Date(nuevoAnio, nuevoMes, 16).toISOString().split('T')[0];
      this.fechasConsulta.fechaHasta = new Date(nuevoAnio, nuevoMes + 1, 0).toISOString().split('T')[0]; // Último día del mes
    } else {
      nuevoMes += 1;
      if (nuevoMes > 11) {
        nuevoMes = 0;
        nuevoAnio += 1;
      }
      this.fechasConsulta.fechaDesde = new Date(nuevoAnio, nuevoMes, 1).toISOString().split('T')[0];
      this.fechasConsulta.fechaHasta = new Date(nuevoAnio, nuevoMes, 15).toISOString().split('T')[0];
    }
  } else {
    // Calcular quincena anterior
    if (nuevoDia <= 15) {
      nuevoMes -= 1;
      if (nuevoMes < 0) {
        nuevoMes = 11;
        nuevoAnio -= 1;
      }
      this.fechasConsulta.fechaDesde = new Date(nuevoAnio, nuevoMes, 16).toISOString().split('T')[0];
      this.fechasConsulta.fechaHasta = new Date(nuevoAnio, nuevoMes + 1, 0).toISOString().split('T')[0];
    } else {
      this.fechasConsulta.fechaDesde = new Date(nuevoAnio, nuevoMes, 1).toISOString().split('T')[0];
      this.fechasConsulta.fechaHasta = new Date(nuevoAnio, nuevoMes, 15).toISOString().split('T')[0];
    }
  }
  
    // Actualizamos la variable de formato si es necesario
    //this.formatoSeleccionado = 'Quincena';
    //this.actualizarFechasString(); // Si necesitas hacer alguna actualización adicional
  }

  calcularTrimestre(adelante: boolean) {
    // Tomamos la fecha actual o la que está en fechasConsulta
    const partesFecha = this.fechasConsulta.fechaDesde.split('-');
    const anio = parseInt(partesFecha[0], 10);
    const mes = parseInt(partesFecha[1], 10) - 1; // El mes es base 0 en JavaScript
  
    // Calculamos el trimestre actual
    let trimestreInicio = Math.floor(mes / 3) * 3;
    let nuevoAnio = anio;
  
    if (adelante) {
      // Calcular el trimestre siguiente
      trimestreInicio += 3;
      if (trimestreInicio > 11) {
        trimestreInicio = 0; // Pasamos al primer trimestre del siguiente año
        nuevoAnio += 1;
      }
    } else {
      // Calcular el trimestre anterior
      trimestreInicio -= 3;
      if (trimestreInicio < 0) {
        trimestreInicio = 9; // Pasamos al último trimestre del año anterior
        nuevoAnio -= 1;
      }
    }
  
    // Fecha del primer día del nuevo trimestre
    const firstDay = new Date(nuevoAnio, trimestreInicio, 1);
    // Fecha del último día del nuevo trimestre
    const lastDay = new Date(nuevoAnio, trimestreInicio + 3, 0);
  
    // Guardamos las fechas en el formato string "yyyy-mm-dd"
    this.fechasConsulta.fechaDesde = firstDay.toISOString().split('T')[0];
    this.fechasConsulta.fechaHasta = lastDay.toISOString().split('T')[0];
     
  }

  actualizarFechasString() {
    console.log("consulta: ", this.fechasConsulta);        
    this.fechaDesdeString = this.fechasConsulta.fechaDesde;
    this.fechaHastaString = this.fechasConsulta.fechaHasta;
    this.storageService.setInfo("fechasConsulta",this.fechasConsulta)

  }

  onDateSelection(date: NgbDate) {
		if (!this.fromDate && !this.toDate) {
      //console.log("1");      
			this.fromDate = date;
		} else if (this.fromDate && !this.toDate && date.after(this.fromDate)) {
      //console.log("2");
			this.toDate = date;
		} else {
      //console.log("3");
			this.toDate = null;
			this.fromDate = date;
		}
    this.fechaDesdeManual = this.fromDate;
    if(this.toDate !== null) {
      this.fechaHastaManual = this.toDate
    }
   
    
    //console.log("desde: ", this.fechaDesdeManual, " hasta: ", this.fechaHastaManual);
    
	}

	isHovered(date: NgbDate) {
		return (
			this.fromDate && !this.toDate && this.hoveredDate && date.after(this.fromDate) && date.before(this.hoveredDate)
		);
	}

	isInside(date: NgbDate) {
		return this.toDate && date.after(this.fromDate) && date.before(this.toDate);
	}

	isRange(date: NgbDate) {
		return (
			date.equals(this.fromDate) ||
			(this.toDate && date.equals(this.toDate)) ||
			this.isInside(date) ||
			this.isHovered(date)
		);
	}
}

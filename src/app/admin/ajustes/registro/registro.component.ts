import { Component, inject, OnInit } from '@angular/core';
import { NgbCalendar, NgbDate, NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { distinctUntilChanged, Subject, takeUntil } from 'rxjs';
import { LogEntry } from 'src/app/interfaces/log-entry';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-registro',
  templateUrl: './registro.component.html',
  styleUrls: ['./registro.component.scss']
})
export class RegistroComponent implements OnInit {
 
  searchText: string = "";
  $usuariosTodos: any[] = [];
  $usuario!: any;
  limite:number = 100;
  registros: LogEntry [] = [];
  private destroy$ = new Subject<void>();


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

  constructor(private dbFirebase: DbFirestoreService, private storageService: StorageService){}
  
  ngOnInit(): void {
    
      this.storageService.users$
      .pipe(takeUntil(this.destroy$)) // Detener la suscripción cuando sea necesario
      .subscribe(data => {
        if(data){
          
          this.$usuariosTodos = data;
          //console.log("usuarios REGISTRO todos: ", this.$usuariosTodos);        
        }      
    });
    this.calcularDiaActual()
    this.storageService.syncChangesUsers("users");
  }

  getUsuario(email:string){
    let usuario = this.$usuariosTodos.find(u => u.email === email)
    //console.log("usuario encontrado: ",usuario);
    return usuario ?  usuario.name !== '' ? usuario.name : usuario.email : ''
    
  }

  getFecha(date:number){
    return new Date(date).toLocaleDateString(undefined, {year: 'numeric', month: '2-digit', day: '2-digit', weekday:"long", hour: '2-digit', hour12: false, minute:'2-digit', second:'2-digit'});
  }

  consultarRegistro(){
    let desde = new Date(this.fechasConsulta.fechaDesde).getTime();
    let hasta = new Date(this.fechasConsulta.fechaHasta).getTime();
    this.dbFirebase.getAllColectionRangeLimit<LogEntry>('logs', desde, hasta, this.limite)
    .pipe(
      takeUntil(this.destroy$),
      distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)) // Emitir solo si hay cambios reales
    )
    .subscribe(data => {    
      console.log("data registro", data);
                      
      if(data){
        this.registros = data;
        console.log("this.resgistro: ", this.registros);
      }
    });
  }

  calcularDiaActual() {
    const today = new Date();
    this.fechasConsulta.fechaDesde = today.toISOString().split('T')[0];
    const tomorrow = new Date(today);
    // Incrementar un día al objeto "tomorrow"
    tomorrow.setDate(tomorrow.getDate() + 1);

    this.fechasConsulta.fechaHasta = tomorrow.toISOString().split('T')[0];
    
    this.actualizarFechasString();
    this.consultarRegistro()
  }

  actualizarFechasString() {
    //console.log("consulta: ", this.fechasConsulta);        
    this.fechaDesdeString = this.fechasConsulta.fechaDesde;
    this.fechaHastaString = this.fechasConsulta.fechaHasta;
    //this.storageService.setInfo("fechasConsulta",this.fechasConsulta)

  }

  consultarRangoManual(){
   /*  if (this.fechaDesdeManual && this.fechaHastaManual) {
      const fechaDesde = new Date(this.fechaDesdeManual.year, this.fechaDesdeManual.month - 1, this.fechaDesdeManual.day);
      const fechaHasta = new Date(this.fechaHastaManual.year, this.fechaHastaManual.month - 1, this.fechaHastaManual.day);
      this.fechasConsulta.fechaDesde = fechaDesde.toISOString().split('T')[0];
      this.fechasConsulta.fechaHasta = fechaHasta.toISOString().split('T')[0];
      this.formatoSeleccionado = 'Manual';
      
    }  */
      this.actualizarFechasString();
      this.consultarRegistro();
  }

  onDateSelection(date: NgbDate) {
		if (!this.fromDate && !this.toDate) {
      ////console.log("1");      
			this.fromDate = date;
		} else if (this.fromDate && !this.toDate && date.after(this.fromDate)) {
      ////console.log("2");
			this.toDate = date;
		} else {
      ////console.log("3");
			this.toDate = null;
			this.fromDate = date;
		}
    console.log("this.fromDate", this.fromDate);

    
    this.fechasConsulta.fechaDesde = new Date(this.fromDate.year, this.fromDate.month - 1, this.fromDate.day).toISOString().split('T')[0];
    if(this.toDate !== null) {
      this.fechasConsulta.fechaHasta = new Date(this.toDate.year, this.toDate.month - 1, this.toDate.day).toISOString().split('T')[0];
    }
    console.log("this.fechasConsulta", this.fechasConsulta);
    
    this.actualizarFechasString()
    
    ////console.log("desde: ", this.fechaDesdeManual, " hasta: ", this.fechaHastaManual);
    
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

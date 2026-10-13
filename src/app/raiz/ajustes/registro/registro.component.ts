import { Component, inject, OnInit } from '@angular/core';
import { NgbCalendar, NgbDate, NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { distinctUntilChanged, Subject, takeUntil } from 'rxjs';
import { LogEntry } from 'src/app/interfaces/log-entry';
import { fechaNegocioDe, hoyNegocio, sumarDias } from 'src/app/shared/utils/fecha.util';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
    selector: 'app-registro',
    templateUrl: './registro.component.html',
    styleUrls: ['./registro.component.scss'],
    standalone: false
})
export class RegistroComponent implements OnInit {
 
  searchText: string = "";
  $usuariosTodos: any[] = [];
  $usuario!: any;
  limite:number = 100;
  registros: LogEntry [] = [];
  registrosOrdenados: LogEntry [] = [];
  private destroy$ = new Subject<void>();
  idObjConsulta: any


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
  sortColumn: string | null = null;
  sortDirection: 'asc' | 'desc' = 'asc';


  constructor(private dbFirebase: DbFirestoreService, private storageService: StorageService){}
  
  ngOnInit(): void {
    
      this.$usuariosTodos = this.storageService.loadInfo('users')
      //console.log("usuarios REGISTRO todos: ", this.$usuariosTodos); 

    this.calcularDiaActual()
    //this.storageService.syncChangesUsers("users");
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
    // FE4 (lazy-fechas): los logs viejos guardan `timestamp` en ms. El rango va
    // de las 00:00 (hora local) de "desde" a las 00:00 del día siguiente a
    // "hasta", así incluye completo el último día. Antes se parseaba el string
    // solo-fecha, que da las 00:00 UTC (21:00 del día anterior en Argentina).
    let desde = new Date(this.fechasConsulta.fechaDesde + 'T00:00:00').getTime();
    let hasta = new Date(sumarDias(this.fechasConsulta.fechaHasta, 1) + 'T00:00:00').getTime();
    this.dbFirebase.getAllColectionRangeLimit<LogEntry>('logs', desde, hasta, this.limite)
    .pipe(
      takeUntil(this.destroy$),
      distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)) // Emitir solo si hay cambios reales
    )
    .subscribe(data => {    
      //console.log("data registro", data);
                      
      if(data){
        this.registros = data;
        this.registrosOrdenados = this.registros.sort((a,b)=> a.timestamp - b.timestamp);        
        //console.log("this.resgistro: ", this.registros);
      }
    });
  }

  calcularDiaActual() {
    // FE4: hoy de Argentina. "hasta" es hoy: la consulta ya incluye el día
    // completo (antes se ponía mañana para compensar).
    const hoy = hoyNegocio();
    this.fechasConsulta.fechaDesde = hoy;
    this.fechasConsulta.fechaHasta = hoy;
    
    this.actualizarFechasString();
    //this.consultarRegistro()
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
      this.idObjConsulta = ""
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

    
    this.fechasConsulta.fechaDesde = fechaNegocioDe(new Date(this.fromDate.year, this.fromDate.month - 1, this.fromDate.day));
    if(this.toDate !== null) {
      this.fechasConsulta.fechaHasta = fechaNegocioDe(new Date(this.toDate.year, this.toDate.month - 1, this.toDate.day));
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

  consultarId(){
    
    this.idObjConsulta = Number(this.idObjConsulta)
    console.log(this.idObjConsulta);
    let respuesta
    this.dbFirebase.getObjIdg<any>("logs", "idObjet", this.idObjConsulta).subscribe((data)=>{
      console.log(data);
      if(data){
        this.registros = data;
        this.registrosOrdenados = this.registros.sort((a,b)=> a.timestamp - b.timestamp);
      } 
     
    });
   
    
  }

  ordenarPor(columna: string) {

    if (this.sortColumn === columna) {
      // invertir dirección
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = columna;
      this.sortDirection = 'asc';
    }

    const dir = this.sortDirection === 'asc' ? 1 : -1;

    this.registrosOrdenados.sort((a, b) => {

      let valA: any;
      let valB: any;

      switch (columna) {

        case 'fecha':
          valA = a.timestamp;
          valB = b.timestamp;
          break;

        case 'usuario':
          valA = a.userEmail;
          valB = b.userEmail;
          break;

        case 'accion':
          valA = a.action;
          valB = b.action;
          break;

        case 'coleccion':
          valA = a.coleccion;
          valB = b.coleccion;
          break;

        case 'detalle':
          valA = a.details;
          valB = b.details;
          break;

        case 'idObjet':
          valA = a.idObjet;
          valB = b.idObjet;
          break;

        case 'status':
          valA = a.idObjet;
          valB = b.idObjet;
          break;
          

        default:
          return 0;
      }

      // ---- comparar ----

      if (typeof valA === 'number' && typeof valB === 'number') {
        return (valA - valB) * dir;
      }

      return valA.toString().localeCompare(valB.toString()) * dir;

    });
  }



}

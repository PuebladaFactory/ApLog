import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-facturacion-consulta',
  templateUrl: './facturacion-consulta.component.html',
  styleUrls: ['./facturacion-consulta.component.scss']
})
export class FacturacionConsultaComponent implements OnInit {

  @Output() newItemEvent = new EventEmitter<any>();
  @Input() fechasConsulta: any = {
    fechaDesde: 0,
    fechaHasta: 0,
  };
  @Input() componenteConsulta!: string;
  
  
  consultaTipo: 'anual' | 'mensual' = 'mensual'; // Inicialmente la consulta es anual
  aniosDisponibles: number[] = []; // Lista de años disponibles
  mesSeleccionado!: {nombre:string, numero:number} ; // Inicialmente seleccionado el mes de enero
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
  hoy: any = new Date().toISOString().split('T')[0];
  mesActual: any = new Date().getMonth() + 1;
  anioActual: any = new Date().getFullYear();
  


  ngOnInit(): void {
    //console.log("mes actual: ", this.mesActual);
    //console.log("anio actual: ", this.anioActual);
    this.seleccionarMes(this.mesActual);
    this.seleccionarAnio()
  }

  seleccionarConsulta(tipo: 'anual' | 'mensual'): void {
    this.consultaTipo = tipo;
    //console.log("tipo de consulta: ", this.consultaTipo);
    
  }

  changeMes(e: any) {
    //console.log(e.target.value);
    this.seleccionarMes(+e.target.value);    
  }

  changeAnio(e: any) {
    //console.log(e.target.value);
    this.anioSeleccionado = e.target.value;    
    //console.log("año seleccionado: ", this.anioSeleccionado);    
  }

  seleccionarMes(numero: number){        
    let mes
    mes =this.mesesDisponibles.filter((meses:{nombre:string, numero:number})=>{
       return meses.numero === numero;       
    })
    //console.log("MES LPM: ", mes);
    this.mesSeleccionado = mes[0];    
    //console.log("mes seleccionado: ", this.mesSeleccionado);        
  }

  seleccionarAnio(){
    const anioActual = new Date().getFullYear()-1;
    const anioMinimo = anioActual - 9;

    for (let i = anioActual; i >= anioMinimo; i--) {
      this.aniosDisponibles.push(i);
    }  
    
  }

  // Método para ejecutar la consulta
  ejecutarConsulta(): void {
    if (this.consultaTipo === 'anual') {
      if(this.anioSeleccionado !== undefined){
        //console.log('Consulta anual del año', this.anioSeleccionado);
        this.consultaAnio(this.anioSeleccionado)
      }else{
        //console.log('Consulta anual del año', this.anioActual);
        this.consultaAnio(this.anioActual)
      }
      
      // Aquí puedes implementar la lógica para consultar datos anuales
    } else {
      //console.log('Consulta mensual del mes', this.mesSeleccionado);
      this.consultaMes()
      // Aquí puedes implementar la lógica para consultar datos mensuales
    }
  }

  consultaAnio(anio:number){
    //console.log('Consulta anual del año', anio);
    this.fechasConsulta.fechaDesde = new Date(
      anio,
      0,
      1,      
    ).toISOString().split('T')[0];
    //console.log("desde: ",this.fechasConsulta.fechaDesde);

    this.fechasConsulta.fechaHasta = new Date(
      anio,
      11,
      31,      
    ).toISOString().split('T')[0];
    //console.log("hasta: ",this.fechasConsulta.fechaHasta);
    this.msgBack(this.fechasConsulta)

  }

  consultaMes(){
    //console.log('Consulta mensual del mes', this.mesSeleccionado);
    this.fechasConsulta.fechaDesde = new Date(
      this.anioActual,
      this.mesSeleccionado.numero - 1,
      1,      
    ).toISOString().split('T')[0];
    //console.log("desde: ",this.fechasConsulta.fechaDesde);
 
    let ultimoDia:any = new Date(this.anioActual, this.mesSeleccionado.numero, 0).toISOString().split('T')[0];
      //console.log("ultimo dia", ultimoDia);
      

    this.fechasConsulta.fechaHasta = new Date(
      ultimoDia
    ).toISOString().split('T')[0];
    //console.log("hasta: ",this.fechasConsulta.fechaHasta); 
    this.msgBack(this.fechasConsulta)
  }

  msgBack(fechasConsulta: any) {
    this.newItemEvent.emit(fechasConsulta);    
  }

}

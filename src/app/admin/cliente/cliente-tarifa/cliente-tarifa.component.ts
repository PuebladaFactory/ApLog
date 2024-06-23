import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Cliente } from 'src/app/interfaces/cliente';

import { AdicionalKm, AdicionalTarifa, CargasGenerales, TarifaCliente, TarifaEspecial } from 'src/app/interfaces/tarifa-cliente';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { ModalAltaTarifaComponent } from '../modal-alta-tarifa/modal-alta-tarifa.component';
import Swal from 'sweetalert2';
import { ColumnMode, SelectionType, SortType } from '@swimlane/ngx-datatable';

@Component({
  selector: 'app-cliente-tarifa',
  templateUrl: './cliente-tarifa.component.html',
  styleUrls: ['./cliente-tarifa.component.scss']
})
export class ClienteTarifaComponent implements OnInit {

  componente:string = "tarifasCliente";  
  $clientes!: any;
  clienteSeleccionado!: Cliente[];
  cargasGeneralesForm: any;
  cargasGeneralesEditForm: any; 
  adicionalKmForm: any;
  adicionalKmEditForm: any;
  tarifa!:TarifaCliente;  
  cargasGenerales!: CargasGenerales;  
  adicionales!: AdicionalTarifa;
  historialTarifas$!: any;
  $ultimaTarifaAplicada!:any;
  $tarifasCliente!:TarifaCliente[];
  tarifaEspecialForm:any;
  tarifaEspecialEditForm:any;  
  acompanianteForm:any;
  acompanianteEditForm:any;  
  adicionalKm: AdicionalKm [] = [];
  tarifasEspeciales!: TarifaEspecial;  
  tarifaEditar!: TarifaCliente;
  asignarTarifa: boolean = false

  ////////////////////////////////////////////////////////////////////////////////////////
columns: any[] = [];
rows: any[] = [];
filteredRows: any[] = [];
paginatedRows: any[] = [];
allColumns = [
//    { prop: '', name: '', selected: true, flexGrow:1  },
  { prop: 'fecha', name: 'Fecha', selected: true, flexGrow:4 },  
  { prop: 'idTarifa', name: 'Id Tarifa', selected: false, flexGrow:2 },  
  { prop: 'utilitario', name: 'Utilitario', selected: true, flexGrow:2  },          
  { prop: 'furgon', name: 'furgon', selected: true, flexGrow:2  },
  { prop: 'furgonGrande', name: 'Furgon Grande', selected: true, flexGrow:2 },
  { prop: 'chasisLiviano', name: 'Chasis Liviano', selected: true, flexGrow:2 },
  { prop: 'chasis', name: 'Chasis', selected: true, flexGrow:2  },    
  { prop: 'balancin', name: 'Balancin', selected: true, flexGrow:2  },    
  { prop: 'semiRemolqueLocal', name: 'Semi Remolque Local', selected: true, flexGrow:2 },    
  { prop: 'portacontenedores', name: 'Portacontenedores', selected: true, flexGrow:2  },    
  { prop: 'acompaniante', name: 'Acompañante', selected: true, flexGrow:2  },  
  { prop: 'primerSectorKm', name: 'Km 1er Sector Distancia', selected: false, flexGrow:2  },  
  { prop: 'primerSectorValor', name: 'Km 1er Sector Valor', selected: true, flexGrow:2  },  
  { prop: 'intervalosKm', name: 'Km Intervalos Distancia', selected: false, flexGrow:2 },     
  { prop: 'intervalosValor', name: 'Km Intervalos Valor', selected: true, flexGrow:2 },  
  { prop: 'tEspecialConcepto', name: 'T.E. Concepto', selected: true, flexGrow:4  },  
  { prop: 'tEspecialValor', name: 'T.E. Valor', selected: true, flexGrow:2 },  
  
];
visibleColumns = this.allColumns.filter(column => column.selected);
selected = [];
count = 0;
limit = 20;
offset = 0;
sortType = SortType.multi; // Aquí usamos la enumeración SortType
selectionType = SelectionType.checkbox; // Aquí usamos la enumeración SelectionType
ColumnMode = ColumnMode;  
encapsulation!: ViewEncapsulation.None;
ajustes: boolean = false;
firstFilter = '';
secondFilter = '';

//////////////////////////////////////////////////////////////////////////////////////////

  constructor(private fb: FormBuilder, private storageService: StorageService, private dbFirebase: DbFirestoreService, private modalService: NgbModal){
    
   this.cargasGeneralesEditForm = this.fb.group({                    //formulario para la carga general      
    utilitario:[""],
    furgon:[""],
    furgonGrande:[""],
    chasisLiviano:[""],
    chasis:[""],
    balancin:[""],
    semiRemolqueLocal:[""],    
    portacontenedores:[""],    
});

this.tarifaEspecialEditForm = this.fb.group({                    //formulario para los extras de la carga general
    concepto:[""],
    valor:[""],
});

this.acompanianteEditForm = this.fb.group({
  acompaniante: [""],
})

 this.adicionalKmEditForm = this.fb.group({                  //formulario para los adicionales de la jornada
  distanciaPrimerSector: [""],
  valorPrimerSector:[""],
  distanciaIntervalo:[""],
  valorIntervalo:[""],
});
   }
   
   ngOnInit(): void {        
     this.historialTarifas$ = this.storageService.historialTarifasClientes$;   
     this.storageService.clientes$.subscribe(data => {
      this.$clientes = data;
    })          
   }

   changeCliente(e: any) {    
    ////console.log()(e.target.value);
    let id = Number(e.target.value);
    ////console.log()("1)",id);
    
    this.clienteSeleccionado = this.$clientes.filter((cliente:Cliente)=>{
      ////console.log()("2", cliente.idCliente, id);
      return cliente.idCliente === id
    })
   
    this.asignarTarifa = true
    ////console.log()("este es el cliente seleccionado: ", this.clienteSeleccionado);
    this.buscarTarifas();
  }
  
  buscarTarifas(){
    console.log(this.clienteSeleccionado[0].idCliente);    
    this.storageService.getByFieldValueLimit(this.componente, "idCliente", this.clienteSeleccionado[0].idCliente,5);
    this.storageService.historialTarifasClientes$.subscribe(data =>{
      console.log("1) data:",data);
      this.$tarifasCliente = data;
      //console.log()(this.$tarifasCliente);
      this.$tarifasCliente.sort((x:TarifaCliente, y:TarifaCliente) => y.idTarifaCliente - x.idTarifaCliente);
      console.log("2) tarifas del Cliente", this.$tarifasCliente);
      this.armarTabla()
    })   
  }

  
  addItem(item:any): void {   
    this.storageService.addItem(this.componente, item); 
    //this.adicionalKmForm.reset();
    //this.tarifaForm.reset();
    this.cargasGeneralesForm.reset();
    this.tarifaEspecialForm.reset();
    this.acompanianteForm.reset();
    this.adicionalKmForm.reset();
    //this.tarifasEspeciales = null;
    //this.adicionalesUnidadesConFrio = [];
    this.adicionalKm = [];
    //this.ngOnInit();
  }  

  seleccionarTarifa(row:any){
    let seleccion = this.$tarifasCliente.filter((tarifa:TarifaCliente)=>{
      return tarifa.idTarifaCliente === row.idTarifa
    })
    this.tarifaEditar = seleccion[0];   
  }

  editarTarifa(row:any){
    console.log(row);
    
    this.seleccionarTarifa(row);
    //this.tarifaEditar = tarifa;  
    //console.log()(this.tarifaEditar);
    this.armarTarifaEditar();
  }

  eliminarTarifa(row:any){    
    this.seleccionarTarifa(row);
    Swal.fire({
      title: "¿Eliminar la tarifa?",
      text: "No se podrá revertir esta acción",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Confirmar",
      cancelButtonText: "Cancelar"
    }).then((result) => {
      if (result.isConfirmed) {
        this.storageService.deleteItem(this.componente, this.tarifaEditar);
        Swal.fire({
          title: "Confirmado",
          text: "La tarifa ha sido borrada",
          icon: "success"
        });
      }
    });   
    this.armarTabla()
  }

  armarTarifaEditar(){
    this.cargasGeneralesEditForm.patchValue({
      utilitario:this.tarifaEditar.cargasGenerales.utilitario,
      furgon:this.tarifaEditar.cargasGenerales.furgon,
      furgonGrande:this.tarifaEditar.cargasGenerales.furgonGrande,
      chasisLiviano:this.tarifaEditar.cargasGenerales.chasisLiviano,
      chasis:this.tarifaEditar.cargasGenerales.chasis,
      balancin:this.tarifaEditar.cargasGenerales.balancin,
      semiRemolqueLocal:this.tarifaEditar.cargasGenerales.semiRemolqueLocal,    
      portacontenedores:this.tarifaEditar.cargasGenerales.portacontenedores,    
    });
    this.adicionalKmEditForm.patchValue({
      distanciaPrimerSector: this.tarifaEditar.adicionales.adicionalKm.primerSector.distancia,
      valorPrimerSector:this.tarifaEditar.adicionales.adicionalKm.primerSector.valor,
      distanciaIntervalo:this.tarifaEditar.adicionales.adicionalKm.sectoresSiguientes.intervalo,
      valorIntervalo:this.tarifaEditar.adicionales.adicionalKm.sectoresSiguientes.valor,
    });
    this.tarifaEspecialEditForm.patchValue({
      concepto:this.tarifaEditar.tarifaEspecial?.concepto,
      valor:this.tarifaEditar.tarifaEspecial?.valor,
    });
    this.acompanianteEditForm.patchValue({
      acompaniante: this.tarifaEditar.adicionales.acompaniante,
    });
  }

  onSubmitEdit(){
    Swal.fire({
      title: "¿Guardar los cambios?",
      text: "No se podrá revertir esta acción",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Confirmar",
      cancelButtonText: "Cancelar"
    }).then((result) => {
      if (result.isConfirmed) {
        this.armarTarifaModificada();
        Swal.fire({
          title: "Confirmado",
          text: "Los cambios se han guardado",
          icon: "success"
        });
      }
    }); 
    
  }

  armarTarifaModificada(){
    this.tarifaEditar.adicionales.acompaniante = this.acompanianteEditForm.value.acompaniante;
    this.tarifaEditar.adicionales.adicionalKm = {
      primerSector: {
        distancia: this.adicionalKmEditForm.value.distanciaPrimerSector,
        valor: this.adicionalKmEditForm.value.valorPrimerSector,
    },
    sectoresSiguientes:{
        intervalo: this.adicionalKmEditForm.value.distanciaIntervalo,
        valor: this.adicionalKmEditForm.value.valorIntervalo,
    }
    }; 
    this.tarifaEditar.cargasGenerales = this.cargasGeneralesEditForm.value;
    this.tarifaEditar.tarifaEspecial ={
      concepto: this.tarifaEspecialEditForm.value.concepto,
      valor: this.tarifaEspecialEditForm.value.valor
    }
    
    //console.log()(this.tarifaEditar);
    this.updateTarifa();
  }

  updateTarifa(){
    console.log("tarifa cliente editada");
    
    this.storageService.updateItem(this.componente,this.tarifaEditar);
  }

  openModal(): void {   
    if(this.clienteSeleccionado.length > 0){
      {
        const modalRef = this.modalService.open(ModalAltaTarifaComponent, {
          windowClass: 'myCustomModalClass',
          centered: true,
          size: 'md', 
          //backdrop:"static" 
        });
        let info={
          cliente: this.clienteSeleccionado[0],
          tarifas: this.$tarifasCliente,
        }
        
        modalRef.componentInstance.fromParent = info,
        modalRef.result.then(
          (result) => {
            ////console.log()("ROOWW:" ,row);
            
  //        this.selectCrudOp(result.op, result.item);
          //this.mostrarMasDatos(row);
          },
          (reason) => {}
        );
      }
    }
    
  }

    ////////////////////////////////////////////////////////////////////////////////////
    armarTabla() {
      let indice = 0
      this.rows = this.$tarifasCliente.map((tarifa: TarifaCliente) => ({
        indice: indice ++,
        fecha: tarifa.fecha,
        idTarifa: tarifa.idTarifaCliente,
        utilitario: tarifa.cargasGenerales.utilitario,
        furgon: tarifa.cargasGenerales.furgon,
        furgonGrande: tarifa.cargasGenerales.furgonGrande,
        chasisLiviano: tarifa.cargasGenerales.chasisLiviano,
        chasis: tarifa.cargasGenerales.chasis,
        balancin: tarifa.cargasGenerales.balancin,
        semiRemolqueLocal: tarifa.cargasGenerales.semiRemolqueLocal,
        portacontenedores: tarifa.cargasGenerales.portacontenedores,
        acompaniante: tarifa.adicionales.acompaniante,
        primerSectorKm: tarifa.adicionales.adicionalKm.primerSector.distancia,
        primerSectorValor: tarifa.adicionales.adicionalKm.primerSector.valor,
        intervalosKm: tarifa.adicionales.adicionalKm.sectoresSiguientes.intervalo,
        intervalosValor: tarifa.adicionales.adicionalKm.sectoresSiguientes.valor,
        tEspecialConcepto: tarifa.tarifaEspecial.concepto === "" ? "Sin datos" : tarifa.tarifaEspecial.concepto , 
        tEspecialValor: typeof tarifa.tarifaEspecial.valor === 'number'? tarifa.tarifaEspecial.valor : 0,
      }));
/*       const headers = [
        'fecha', 'idTarifa', 'utilitario', 'furgon', 'furgonGrande', 'chasisLiviano', 'chasis', 
        'balancin', 'semiRemolqueLocal', 'portacontenedores','acompaniante', 'primerSectorKm', 'primerSectorValor', 
        'intervalosKm', 'intervalosValor','tEspecialConcepto', 'tEspecialValor'
      ];
  
      const transformedData = headers.map(header => {
        const row: any = { header };
        this.$tarifasCliente.forEach((tarifa: TarifaCliente, index: number) => {
          row[`tarifa${index}`] = this.getValueByHeader(tarifa, header);
        });
        return row;
      });
  
      this.rows = transformedData;
      this.columns = [
        { prop: 'header', name: 'Header', width: 100 },
        ...this.$tarifasCliente.map((_, index) => ({ prop: `tarifa${index}`, name: `Tarifa ${index + 1}`, width: 50 }))
      ];*/
  
      this.applyFilters();

    }
  
  /*   getValueByHeader(tarifa: TarifaCliente, header: string): any {
      switch (header) {
        case 'fecha':
          return tarifa.fecha;
        case 'idTarifa':
          return tarifa.idTarifaCliente;
        case 'utilitario':
          return tarifa.cargasGenerales.utilitario;
        case 'furgon':
          return tarifa.cargasGenerales.furgon;
        case 'furgonGrande':
          return tarifa.cargasGenerales.furgonGrande;
        case 'chasisLiviano':
          return tarifa.cargasGenerales.chasisLiviano;
        case 'chasis':
          return tarifa.cargasGenerales.chasis;
        case 'balancin':
          return tarifa.cargasGenerales.balancin;
        case 'semiRemolqueLocal':
          return tarifa.cargasGenerales.semiRemolqueLocal;
        case 'portacontenedores':
          return tarifa.cargasGenerales.portacontenedores;
        case 'tEspecialConcepto':
          return tarifa.tarifaEspecial.concepto;
        case 'tEspecialValor':
          return tarifa.tarifaEspecial.valor;
        case 'acompaniante':
          return tarifa.adicionales.acompaniante;
        case 'primerSectorKm':
          return tarifa.adicionales.adicionalKm.primerSector.distancia;
        case 'primerSectorValor':
          return tarifa.adicionales.adicionalKm.primerSector.valor;
        case 'intervalosKm':
          return tarifa.adicionales.adicionalKm.sectoresSiguientes.intervalo;
        case 'intervalosValor':
          return tarifa.adicionales.adicionalKm.sectoresSiguientes.valor;
        default:
          return null;
      }
    } */
    
    setPage(pageInfo: any) {
      this.offset = pageInfo.offset;
      this.updatePaginatedRows();
    }
    
    updatePaginatedRows() {
      const start = this.offset * this.limit;
      const end = start + this.limit;
      this.paginatedRows = this.filteredRows.slice(start, end);
    }
    
    onSort(event:any) {
      // Implementa la lógica de ordenamiento
    }
    
    onActivate(event: any) {
      // Implementa la lógica de activación de filas
    }
    
    onSelect(event: any) {
      // Implementa la lógica de selección de filas
    }
    
    updateFilter(event: any, filterType: string) {
      const val = event.target.value.toLowerCase();
      if (filterType === 'first') {
        this.firstFilter = val;
      } else if (filterType === 'second') {
        this.secondFilter = val;
      }
      this.applyFilters();
    }
    
    applyFilters() {
      this.filteredRows = this.rows.filter(row => {
        const firstCondition = Object.values(row).some(value => 
          String(value).toLowerCase().includes(this.firstFilter)
        );
        const secondCondition = Object.values(row).some(value => 
          String(value).toLowerCase().includes(this.secondFilter)
        );
    
        return firstCondition && secondCondition;
      });
    
      this.count = this.filteredRows.length; // Actualiza el conteo de filas
      this.setPage({ offset: this.offset }); // Actualiza los datos para la página actual
    }
    
    toggleColumn(column: any) {
      if (column.prop !== '') { // Siempre muestra la columna del botón
        column.selected = !column.selected;
      }
      this.visibleColumns = this.allColumns.filter(col => col.selected);
    }
    
    toogleAjustes(){
      this.ajustes = !this.ajustes;
    }
}

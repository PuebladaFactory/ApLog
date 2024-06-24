import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Chofer, Vehiculo } from 'src/app/interfaces/chofer';
import { AdicionalKm, TarifaChofer, TarifaEspecial } from 'src/app/interfaces/tarifa-chofer';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { ModalAltaTarifaComponent } from '../modal-alta-tarifa/modal-alta-tarifa.component';
import Swal from 'sweetalert2';
import { ColumnMode, SelectionType, SortType } from '@swimlane/ngx-datatable';

@Component({
  selector: 'app-choferes-tarifa',
  templateUrl: './choferes-tarifa.component.html',
  styleUrls: ['./choferes-tarifa.component.scss']
})
export class ChoferesTarifaComponent implements OnInit {
  
  componente:string = "tarifasChofer";
  $choferes:any;
  choferSeleccionado!: any;
  tarifaForm: any;
  adicionalForm: any;
  tarifa!:TarifaChofer;
  vehiculo!:Vehiculo;
  adicionalKm!:AdicionalKm;  
  chofer!: Chofer;
  historialTarifas$!: any;
  $historialTarifas!: TarifaChofer [];
  $ultimaTarifaAplicada!:any;
  $tarifasChofer:any;
  tarifaProveedor!:boolean
  tarifaEspecialForm!:any;
  
  tarifaEspecial!: TarifaEspecial;
  tarifaEditForm!:any;
  adicionalEditForm!:any;
  tarifaEspecialEditForm!:any;
  tarifaEditar!:TarifaChofer;
  asignarTarifa: boolean = false;

    ////////////////////////////////////////////////////////////////////////////////////////
columns: any[] = [];
rows: any[] = [];
filteredRows: any[] = [];
paginatedRows: any[] = [];
allColumns = [
//    { prop: '', name: '', selected: true, flexGrow:1  },
  { prop: 'fecha', name: 'Fecha', selected: true, flexGrow:2 },  
  { prop: 'idTarifa', name: 'Id Tarifa', selected: false, flexGrow:2 },  
  { prop: 'jornada', name: 'Jornada', selected: true, flexGrow:2  },          
  { prop: 'publicidad', name: 'Publicidad', selected: true, flexGrow:2  },  
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

  constructor(private fb: FormBuilder, private storageService: StorageService, private modalService: NgbModal){
   
  this.tarifaEditForm = this.fb.group({                    //formulario para la jornada
    valorJornada: [""],            
    publicidad: [""], 
    acompaniante: [""] 
});

  this.adicionalEditForm = this.fb.group({                  //formulario para los adicionales de la jornada
    distanciaPrimerSector: [""],
    valorPrimerSector:[""],
    distanciaIntervalo:[""],
    valorIntervalo:[""],
});

this.tarifaEspecialEditForm = this.fb.group({                    //formulario para los extras de la carga general
  concepto:[""],
  valor:[""],
});
  }
  
  ngOnInit(): void {   
    this.storageService.choferes$.subscribe(data => {
      this.$choferes = data;
    });

    this.storageService.historialTarifas$.subscribe(data => {
      this.$historialTarifas = data;
    });
    
    //this.historialTarifas$ = this.storageService.historialTarifas$;   
    this.tarifaProveedor = false;     
  }

  changeChofer(e: any) {    
    this.tarifaProveedor = false;
    let id = Number(e.target.value);
    //console.log("1)",id);
    
    this.choferSeleccionado = this.$choferes.filter((chofer:Chofer)=>{
      //console.log("2", chofer.idChofer, id);
      return chofer.idChofer === id
    })
        
   //console.log("3) este es el chofer seleccionado: ", this.choferSeleccionado);
   if(this.choferSeleccionado[0].proveedor !== "monotributista" ){
    this.tarifaProveedor = true;
   } else{
    this.asignarTarifa = true
    this.buscarTarifas();
   }
  }
 

  buscarTarifas(){
    //console.log(this.choferSeleccionado[0].idChofer);    
    this.storageService.getByFieldValueLimit(this.componente, "idChofer", this.choferSeleccionado[0].idChofer, 5);
    this.storageService.historialTarifas$.subscribe(data =>{
      this.$tarifasChofer = data;
      console.log("1)",this.$tarifasChofer);
      this.$tarifasChofer.sort((x:TarifaChofer, y:TarifaChofer) => y.idTarifa - x.idTarifa);
      //console.log(this.$tarifasChofer);
      this.armarTabla()
    })
    
  }
    armarAdicionalKm(){
      this.adicionalKm = {
        primerSector:{
          distancia: this.adicionalForm.value.distanciaPrimerSector,
          valor:this.adicionalForm.value.valorPrimerSector,
        },
        sectoresSiguientes:{
          intervalo:this.adicionalForm.value.distanciaIntervalo,
          valor: this.adicionalForm.value.valorIntervalo,
        },
      };     
    }

    armarTarifaespecial(){
      this.tarifaEspecial = {
        concepto: this.tarifaEspecialForm.value.concepto,
        valor: this.tarifaEspecialForm.value.valor,
      };        
    }

    seleccionarTarifa(row:any){
      let seleccion = this.$tarifasChofer.filter((tarifa:TarifaChofer)=>{
        return tarifa.idTarifa === row.idTarifa
      })
      this.tarifaEditar = seleccion[0];   
    }

    editarTarifa(row:any){
      //console.log(tarifa);
      this.seleccionarTarifa(row);
      //this.tarifaEditar = tarifa;
      
      //console.log(this.tarifaEditar);
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
      
    }

    armarTarifaEditar(){
      this.tarifaEditForm.patchValue({
        valorJornada: this.tarifaEditar.valorJornada,            
        publicidad: this.tarifaEditar.publicidad,            
        acompaniante: this.tarifaEditar.acompaniante,            
      });
      this.adicionalEditForm.patchValue({
        distanciaPrimerSector: this.tarifaEditar.km.primerSector.distancia,
        valorPrimerSector:this.tarifaEditar.km.primerSector.valor,
        distanciaIntervalo:this.tarifaEditar.km.sectoresSiguientes.intervalo,
        valorIntervalo:this.tarifaEditar.km.sectoresSiguientes.valor,
      });
      this.tarifaEspecialEditForm.patchValue({
        concepto:this.tarifaEditar.tarifaEspecial?.concepto,
        valor: this.tarifaEditar.tarifaEspecial?.valor,
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
      this.tarifaEditar ={
        id:this.tarifaEditar.id,
        idTarifa:this.tarifaEditar.idTarifa,
        valorJornada: this.tarifaEditForm.value.valorJornada,
        km:{
          primerSector: {
            distancia: this.adicionalEditForm.value.distanciaPrimerSector,
            valor: this.adicionalEditForm.value.valorPrimerSector,
        },
        sectoresSiguientes:{
            intervalo: this.adicionalEditForm.value.distanciaIntervalo,
            valor: this.adicionalEditForm.value.valorIntervalo,
        }
        },
        publicidad: this.tarifaEditForm.value.publicidad,
        idChofer: this.tarifaEditar.idChofer,
        fecha: this.tarifaEditar.fecha,
        acompaniante: this.tarifaEditForm.value.acompaniante,        
        tarifaEspecial: {
          concepto: this.tarifaEspecialEditForm.value.concepto,
          valor: this.tarifaEspecialEditForm.value.valor,
        }
        
      } 
      
      this.updateTarifa();
      
    }

    updateTarifa(){
      this.storageService.updateItem(this.componente,this.tarifaEditar);
    }

    openModal(): void {   
      if(this.choferSeleccionado.length > 0){
        {
          const modalRef = this.modalService.open(ModalAltaTarifaComponent, {
            windowClass: 'myCustomModalClass',
            centered: true,
            size: 'md', 
            //backdrop:"static" 
          });
          //console.log("choferSeleccionado: ",this.choferSeleccionado[0]);
          let info={
            chofer: this.choferSeleccionado[0],
            tarifas: this.$tarifasChofer,
          }
          
          modalRef.componentInstance.fromParent = info;
          modalRef.result.then(
            (result) => {
              //console.log("ROOWW:" ,row);
              
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
  this.rows = this.$tarifasChofer.map((tarifa: TarifaChofer) => ({
    indice: indice ++,
    fecha: tarifa.fecha,
    idTarifa: tarifa.idTarifa,
    jornada: tarifa.valorJornada,
    publicidad: tarifa.publicidad,
    acompaniante: tarifa.acompaniante,    
    primerSectorKm: tarifa.km.primerSector.distancia,
    primerSectorValor: tarifa.km.primerSector.valor,
    intervalosKm: tarifa.km.sectoresSiguientes.intervalo,
    intervalosValor: tarifa.km.sectoresSiguientes.valor,
    tEspecialConcepto: tarifa.tarifaEspecial.concepto === "" ? "Sin datos" : tarifa.tarifaEspecial.concepto , 
    tEspecialValor: typeof tarifa.tarifaEspecial.valor === 'number'? tarifa.tarifaEspecial.valor : 0,
  }));

  this.applyFilters();
}


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

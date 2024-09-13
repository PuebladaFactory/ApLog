import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Chofer, SeguimientoSatelital, Vehiculo } from 'src/app/interfaces/chofer';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { AdicionalKm, TarifaChofer } from 'src/app/interfaces/tarifa-chofer';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { ChoferesAltaComponent } from '../choferes-alta/choferes-alta.component';
import Swal from 'sweetalert2';
import { ColumnMode, SelectionType, SortType } from '@swimlane/ngx-datatable';


@Component({
  selector: 'app-choferes-listado',
  templateUrl: './choferes-listado.component.html',
  styleUrls: ['./choferes-listado.component.scss']
})
export class ChoferesListadoComponent implements OnInit {
  
  choferes!: any;
  $choferes!: any;
  $proveedores!: any;
  form:any;
  vehiculoForm:any;
  seguimientoForm:any;
  jornadaForm:any;
  adicionalForm:any;
  categorias = [
    { id: 0, categoria: 'mini', },
    { id: 1, categoria: 'maxi', },
    { id: 2, categoria: 'furgon grande', },
    { id: 3, categoria: 'camión liviano', },
    { id: 4, categoria: 'chasis', },
    { id: 5, categoria: 'balancin', },
    { id: 6, categoria: 'semi remolque local', },
    { id: 7, categoria: 'portacontenedores', },
    ];
  categoriaSeleccionada!:string;
  choferEditar!: Chofer;
  componente:string = "choferes";
  jornadas$:any;
  jornadaChofer!: TarifaChofer;
  jornadaEditar!: TarifaChofer;
  adicionalKm!: AdicionalKm;
  tipoCombustible!:string;
  tarjetaCombustible!:boolean;  
  vehiculo!:Vehiculo;
  seguimiento: boolean = false;
  satelital!: any;
  edicion:boolean = false;
  refrigeracion!:boolean; 
  proveedorSeleccionado!: any;
  soloVista:boolean = false;
  searchText!: string;
  publicidad!: boolean;

////////////////////////////////////////////////////////////////////////////////////////
//@ViewChild('tablaClientes') table: any;  
rows: any[] = [];
filteredRows: any[] = [];
paginatedRows: any[] = [];
allColumns = [
//    { prop: '', name: '', selected: true, flexGrow:1  },
  { prop: 'idChofer', name: 'Id Chofer', selected: false, flexGrow:2  },  
  { prop: 'apellido', name: 'Apellido', selected: true, flexGrow:2  },          
  { prop: 'nombre', name: 'Nombre', selected: true, flexGrow:2  },
  { prop: 'celular', name: 'Celular', selected: true, flexGrow:2  },
  { prop: 'celularEmergencia', name: 'Cel Emergencia', selected: false, flexGrow:2  },
  { prop: 'direccion', name: 'Direccion', selected: false, flexGrow:2  },
  { prop: 'cuit', name: 'CUIT', selected: false, flexGrow:2  },
  { prop: 'proveedor', name: 'Proveedor', selected: true, flexGrow:2  },
  { prop: 'dominio', name: 'Patente', selected: true, flexGrow:2 },
  { prop: 'categoria', name: 'Categoria', selected: true, flexGrow:2 },
  { prop: 'marca', name: 'Marca', selected: false, flexGrow:2 },
  { prop: 'modelo', name: 'Modelo', selected: false, flexGrow:2 },
  { prop: 'tarjCombustible', name: 'Tarj Combustible', selected: false, flexGrow:2  },    
  { prop: 'tipoCombustible', name: 'Tipo Combustible', selected: false, flexGrow:2  },    
  { prop: 'publicidad', name: 'Publicidad', selected: true, flexGrow:2  },    
  { prop: 'satelital', name: 'Satelital', selected: false, flexGrow:2  },    
  { prop: 'correo', name: 'Correo', selected: true, flexGrow:3  },  
  { prop: 'fechaNac', name: 'Fech Nac', selected: false, flexGrow:2  },  
  
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
    this.form = this.fb.group({                          //formulario para el perfil 
      nombre: [""], 
      apellido: [""], 
      cuit: [""],            
      fechaNac: [""],
      email: [""],
      celularContacto: [""],
      celularEmergencia: [""],
      domicilio: [""],     
    });

    this.vehiculoForm = this.fb.group({
      dominio: [""], 
      marca:[""], 
      modelo: [""],         
    })

    this.seguimientoForm = this.fb.group({
      proveedor: [""],
      marcaGps: [""],
    })

  
  }
  
  ngOnInit(): void { 
    this.storageService.choferes$.subscribe(data => {
      this.$choferes = data;
      this.armarTabla();
    });
    this.storageService.proveedores$.subscribe(data => {
      this.$proveedores = data;
    });
    //this.choferes$ = this.storageService.choferes$;     
    //this.jornadas$ = this.storageService.jornadas$
  }

  changeCategoria(e: any) {
    ////console.log()(e.target.value)  ;     
    this.categoriaSeleccionada = e.target.value
    ////console.log()(this.categoriaSeleccionada);    
  }


  //este es el metodo que arma el objeto (chofer) que muestra el modal para editar
  abrirEdicion(row:any):void {
    this.seleccionarChofer(row);
    this.soloVista = false;
    //this.choferEditar = chofer;    
    //console.log()("este es el chofer a editar: ", this.choferEditar);
    this.proveedorSeleccionado = this.choferEditar.proveedor
    this.armarForm();    
  }

  armarForm(){
    this.form.patchValue({
      nombre: this.choferEditar.nombre, 
      apellido: this.choferEditar.apellido, 
      cuit: this.choferEditar.cuit,            
      fechaNac: this.choferEditar.fechaNac,
      email: this.choferEditar.email,
      celularContacto: this.choferEditar.celularContacto,
      celularEmergencia: this.choferEditar.celularEmergencia,
      domicilio: this.choferEditar.domicilio,           
    });    
    this.armarVehiculo();   
  }

  armarVehiculo(){
    this.vehiculoForm.patchValue({
      dominio: this.choferEditar.vehiculo.dominio,
      marca:this.choferEditar.vehiculo.marca,
      modelo: this.choferEditar.vehiculo.modelo,
    });
    //this.categoriaSeleccionada = this.choferEditar.vehiculo.categoria; ///////////////////////////////////////////
    this.tipoCombustible = this.choferEditar.vehiculo.tipoCombustible;
    this.tarjetaCombustible = this.choferEditar.vehiculo.tarjetaCombustible;
    this.publicidad = this.choferEditar.vehiculo.publicidad;
  
    this.armarSeguimientoSatelital();
  }

  armarSeguimientoSatelital(){
    if(!this.choferEditar.vehiculo.satelital){      
      this.seguimiento = false;
      this.satelital = false;
    }else{
      this.seguimiento = true;
      this.satelital = this.choferEditar.vehiculo.satelital;
      //console.log()(this.satelital);
      this.seguimientoForm.patchValue({
        proveedor: this.satelital.proveedor,
        marcaGps: this.satelital.marcaGps
      })
  
    }
  }

  seleccionarChofer(row:any){ 
    let seleccion = this.$choferes.filter((chofer:Chofer)=>{
      return chofer.idChofer === row.idChofer
    })
    this.choferEditar = seleccion[0];    
  }

  editarPerfil(){
    this.edicion = true;
  }

  cerrarEdicion(){
    this.edicion = false;
    //this.borrarEdicion()
  }

  onSubmit(){ 
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
        this.update(this.choferEditar);    
        Swal.fire({
          title: "Confirmado",
          text: "Los cambios se han guardado",
          icon: "success"
        });
      }
    });   
    
    
   }

   update(item:any): void {
      this.datosPersonales();
      this.datosVehiculo();
      
      ////console.log()("este es el chofer editado: ", this.choferEditar);
      this.storageService.updateItem(this.componente, item);
      this.form.reset();
      this.vehiculoForm.reset();
      this.seguimientoForm.reset();
      this.edicion = false;
      //this.ngOnInit();
  }

  datosPersonales(){
    this.componente = "choferes";  
    this.choferEditar.proveedor = this.proveedorSeleccionado;
    this.choferEditar.nombre = this.form.value.nombre;
    this.choferEditar.apellido = this.form.value.apellido;
    this.choferEditar.cuit = this.form.value.cuit;    
    this.choferEditar.fechaNac = this.form.value.fechaNac;
    this.choferEditar.email = this.form.value.email;
    this.choferEditar.celularContacto = this.form.value.celularContacto;
    this.choferEditar.celularEmergencia = this.form.value.celularEmergencia;
    this.choferEditar.domicilio = this.form.value.domicilio;
  }

  datosVehiculo() {
    this.vehiculo = this.vehiculoForm.value;
    //this.vehiculo.categoria = this.categoriaSeleccionada;
    this.vehiculo.categoria = [];
    this.vehiculo.tipoCombustible = this.tipoCombustible;
    this.vehiculo.tarjetaCombustible = this.tarjetaCombustible;
    this.vehiculo.publicidad = this.publicidad
    this.vehiculo.refrigeracion = null;
    if(this.seguimiento){
      this.vehiculo.satelital = this.seguimientoForm.value;
    }else{
      this.vehiculo.satelital = false;
    }
    this.choferEditar.vehiculo = this.vehiculo;    
  }

 
  changeTipoCombustible(e: any) {    
    this.tipoCombustible = e.target.value   
  }

  changeTarjetaCombustible(e: any) {    
    if(e.target.value === "si"){
      this.tarjetaCombustible = true;   
    } else if (e.target.value === "no") {
      this.tarjetaCombustible = false;   
    } else{
      this.tarjetaCombustible = this.choferEditar.vehiculo.tarjetaCombustible;
    }      
  }

  changePublicidad(e: any) {    
    if(e.target.value === "si"){
      this.publicidad = true;   
    } else if (e.target.value === "no"){
      this.publicidad = false;   
    } else{
      this.publicidad = this.choferEditar.vehiculo.publicidad;
    }   
    
  }

  seguimientoSatelital(e:any){    
    switch (e.target.value) {
      case "si" :{
        this.seguimiento = true;
        break;
      }
      case "no":{
        this.seguimiento = false;
        this.satelital = e.target.value;
        break;
      }
      default:{
        break;
      }
    }
    
  }

  selectRefrigeracion(e:any){ 
    switch (e.target.value) {
      case "si":{
        this.refrigeracion = true;
        break;
      }
      case "no":{
        this.refrigeracion = false;
        break;
      }
      default:{
        break;
      }
    }
  }

  changeProveedor(e:any){
    //console.log()(e.target.value);
    //let razonSocial = e.target.value.split(" ")[0];
    ////console.log()(apellido);
    
    
    this.proveedorSeleccionado = e.target.value;
    /* this.clienteSeleccionado = this.clientes$.source._value.filter(function (cliente:any){
      return cliente.razonSocial === e.target.value
    }) */
   //console.log()("este es el proveedor seleccionado: ", this.proveedorSeleccionado);
    //this.buscarTarifas();
  }

  eliminarChofer(row:any){    
    this.seleccionarChofer(row)
    let chofer = this.choferEditar
    
    if(chofer.vehiculo.tarjetaCombustible  || chofer.vehiculo.satelital !== false){
       if (chofer.vehiculo.tarjetaCombustible  && chofer.vehiculo.satelital !== false){
        Swal.fire({
          title: "¿Eliminar el Chofer?",
          text: "No se podrá revertir esta acción",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#3085d6",
          cancelButtonColor: "#d33",
          confirmButtonText: "Confirmar",
          cancelButtonText: "Cancelar"
        }).then((result) => {
          if (result.isConfirmed) {
        /////
            Swal.fire({
              title: "El chofer que desea eliminar tiene asignada una tarjeta de combustible y seguimiento satelital",
              text: "¿Desea continuar?",
              icon: "warning",
              showCancelButton: true,
              confirmButtonColor: "#3085d6",
              cancelButtonColor: "#d33",
              confirmButtonText: "Confirmar",
              cancelButtonText: "Cancelar"
              }).then((result) => {
              if (result.isConfirmed) {                
                this.storageService.deleteItem(this.componente, chofer);
                Swal.fire({
                  title: "Confirmado",
                  text: "El Cliente ha sido borrado",
                  icon: "success"
                });
              }                   /////
              })
            };   
        
       })} else if (chofer.vehiculo.tarjetaCombustible  && chofer.vehiculo.satelital === false){
        Swal.fire({
          title: "¿Eliminar el Chofer?",
          text: "No se podrá revertir esta acción",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#3085d6",
          cancelButtonColor: "#d33",
          confirmButtonText: "Confirmar",
          cancelButtonText: "Cancelar"
        }).then((result) => {
          if (result.isConfirmed) {
        /////
            Swal.fire({
              title: "El chofer que desea eliminar tiene asignada una tarjeta de combustible",
              text: "¿Desea continuar?",
              icon: "warning",
              showCancelButton: true,
              confirmButtonColor: "#3085d6",
              cancelButtonColor: "#d33",
              confirmButtonText: "Confirmar",
              cancelButtonText: "Cancelar"
              }).then((result) => {
              if (result.isConfirmed) {                
                this.storageService.deleteItem(this.componente, this.choferEditar);
                Swal.fire({
                  title: "Confirmado",
                  text: "El Cliente ha sido borrado",
                  icon: "success"
                });
              }                   /////
              })
            };   
        
       })
            
          } else {
            if (!chofer.vehiculo.tarjetaCombustible  && chofer.vehiculo.satelital !== false){
              Swal.fire({
                title: "¿Eliminar el Chofer?",
                text: "No se podrá revertir esta acción",
                icon: "warning",
                showCancelButton: true,
                confirmButtonColor: "#3085d6",
                cancelButtonColor: "#d33",
                confirmButtonText: "Confirmar",
                cancelButtonText: "Cancelar"
              }).then((result) => {
                if (result.isConfirmed) {
              /////
                  Swal.fire({
                    title: "El chofer que desea eliminar tiene asignado seguimiento satelital",
                    text: "¿Desea continuar?",
                    icon: "warning",
                    showCancelButton: true,
                    confirmButtonColor: "#3085d6",
                    cancelButtonColor: "#d33",
                    confirmButtonText: "Confirmar",
                    cancelButtonText: "Cancelar"
                    }).then((result) => {
                    if (result.isConfirmed) {                
                      this.storageService.deleteItem(this.componente, this.choferEditar);
                      Swal.fire({
                        title: "Confirmado",
                        text: "El Cliente ha sido borrado",
                        icon: "success"
                      });
                    }                   /////
                    })
                  };   
              
             })
                
              }
    }
    
    
    
    /* this.ngOnInit();  */
    
  } else {
    Swal.fire({
      title: "¿Eliminar el Chofer?",
      text: "No se podrá revertir esta acción",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Confirmar",
      cancelButtonText: "Cancelar"
    }).then((result) => {
      if (result.isConfirmed) {
        this.storageService.deleteItem(this.componente, this.choferEditar);
        Swal.fire({
          title: "Confirmado",
          text: "El Chofer ha sido borrado",
          icon: "success"
        });
      }
    });   
  }
}

  abrirVista(row:any):void {
    this.seleccionarChofer(row)
    this.soloVista = true;
    //this.choferEditar = chofer;    
    ////console.log()("este es el cliente a editar: ", this.clienteEditar);
    this.armarForm();    
  }

  borrarForms(){
    this.form.reset();
    this.vehiculoForm.reset();
    this.seguimientoForm.reset();
  }

  openModal(): void {   
   
    {
      const modalRef = this.modalService.open(ChoferesAltaComponent, {
        windowClass: 'myCustomModalClass',
        centered: true,
        size: 'md', 
        //backdrop:"static" 
      });

    /*  let info = {
        modo: "clientes",
        item: facturaOp[0],
      }; 
      //console.log()(info); */
      
      //modalRef.componentInstance.fromParent = info;
      modalRef.result.then(
        (result) => {
          ////console.log()("ROOWW:" ,row);
          this.storageService.getAllSorted("choferes", 'idChofer', 'asc')
//        this.selectCrudOp(result.op, result.item);
        //this.mostrarMasDatos(row);
        },
        (reason) => {}
      );
    }
  }

  ////////////////////////////////////////////////////////////////////////////////////
  armarTabla() {
    //console.log("consultasOp: ", this.$consultasOp );
    let indice = 0
    this.rows = this.$choferes.map((chofer: Chofer) => ({
        indice: indice ++,
        idChofer: chofer.idChofer,
        apellido: chofer.apellido,
        nombre: chofer.nombre,
        celular: chofer.celularContacto,
        celularEmergencia: chofer.celularEmergencia,
        direccion: chofer.domicilio,
        cuit: chofer.cuit,
        proveedor: chofer.proveedor,
        dominio: chofer.vehiculo.dominio,
        categoria: chofer.vehiculo.categoria,
        marca: chofer.vehiculo.marca,
        modelo: chofer.vehiculo.modelo,
        tarjCombustible: chofer.vehiculo.tarjetaCombustible ? "Si" : "No",
        tipoCombustible: chofer.vehiculo.tipoCombustible,
        publicidad: chofer.vehiculo.publicidad ? "Si" : "No",
        satelital: !chofer.vehiculo.satelital ? "No" : "Si",
        correo: chofer.email,
        fechaNac: chofer.fechaNac,
        
      }));
    
    //console.log("Rows: ", this.rows); // Verifica que `this.rows` tenga datos correctos
    this.applyFilters(); // Aplica filtros y actualiza filteredRows
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

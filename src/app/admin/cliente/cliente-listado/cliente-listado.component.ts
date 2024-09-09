import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { LoginComponent } from 'src/app/appLogin/login/login.component';
import { Cliente, Contacto } from 'src/app/interfaces/cliente';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { OpAltaComponent } from '../../operaciones/op-alta/op-alta.component';
import { ClienteAltaComponent } from '../cliente-alta/cliente-alta.component';
import Swal from 'sweetalert2';
import { ColumnMode, SelectionType, SortType } from '@swimlane/ngx-datatable';


@Component({
  selector: 'app-cliente-listado',
  templateUrl: './cliente-listado.component.html',
  styleUrls: ['./cliente-listado.component.scss']
})
export class ClienteListadoComponent implements OnInit {
  
  searchText!:string;
  clientes$!: Cliente[];
  edicion:boolean = false;
  clienteEditar!: Cliente;
  form:any;
  componente:string ="clientes";
  //mostrar:boolean = false;
  formContacto: any;
  contactoEditar!: Contacto;
  indice!:number;
  $clientes:any;
  soloVista: boolean = false;
////////////////////////////////////////////////////////////////////////////////////////
//@ViewChild('tablaClientes') table: any;  
rows: any[] = [];
filteredRows: any[] = [];
paginatedRows: any[] = [];
allColumns = [
//    { prop: '', name: '', selected: true, flexGrow:1  },
  { prop: 'idCliente', name: 'Id Cliente', selected: false, flexGrow:2  },  
  { prop: 'razonSocial', name: 'Razon Social', selected: true, flexGrow:2  },          
  { prop: 'cuit', name: 'CUIT', selected: true, flexGrow:2  },
  { prop: 'direccion', name: 'Direccion', selected: true, flexGrow:2 },
  { prop: 'tarifa', name: 'Tarifa', selected: true, flexGrow: 2 },
  { prop: 'contacto', name: 'Contacto', selected: true, flexGrow:2  },    
  { prop: 'puesto', name: 'Puesto', selected: true, flexGrow:2  },    
  { prop: 'telefono', name: 'N° Contacto', selected: true, flexGrow:2  },    
  { prop: 'correo', name: 'Correo', selected: true, flexGrow:2  },  
  
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

  constructor(private fb: FormBuilder, private storageService: StorageService,  private modalService: NgbModal){
    this.form = this.fb.group({      
      razonSocial: [""], 
      direccion: [""],
      cuit: [""],    
      tarifaTipo: this.fb.group({
        general: [false], 
        especial: [false],
        eventual: [false]
      })      
    })

    this.formContacto = this.fb.group({
      puesto: ["", [Validators.required, Validators.maxLength(30)]],
      apellido: ["",[Validators.required, Validators.maxLength(30)]], 
      nombre: ["", [Validators.required, Validators.maxLength(30)]],
      telefono: ["",[Validators.required,Validators.minLength(10), Validators.maxLength(10)]], 
      email: ["",[Validators.required, Validators.email]],
      /*puesto:[""],
      apellido:[""],
      nombre: [""],
      telefono: [""],
      email:[""],*/
    });
  }
  
  ngOnInit(): void { 
    
    this.storageService.clientes$.subscribe(data => {
      this.$clientes = data;
      this.armarTabla();
    })
  }
  
  abrirEdicion(row:any):void {
    this.seleccionarCliente(row);
    this.soloVista = false;
    //this.clienteEditar = cliente;    
    ////console.log()("este es el cliente a editar: ", this.clienteEditar);
    this.armarForm();    
  }

  armarForm(){
    this.form.patchValue({
      razonSocial: this.clienteEditar.razonSocial,
      direccion: this.clienteEditar.direccion,
      cuit: this.clienteEditar.cuit,
      tarifaTipo: {
        general: this.clienteEditar.tarifaTipo.general, 
        especial: this.clienteEditar.tarifaTipo.especial,
        eventual: this.clienteEditar.tarifaTipo.eventual,
      }
    });
  }

  seleccionarCliente(row:any){ 
    let seleccion = this.$clientes.filter((cliente:Cliente)=>{
      return cliente.idCliente === row.idCliente
    })
    this.clienteEditar = seleccion[0];    
  }

  abrirVista(row:any):void {
    this.seleccionarCliente(row)
    this.soloVista = true;    
    ////console.log()("este es el cliente a editar: ", this.clienteEditar);
    this.armarForm();    
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
        this.update();            
        Swal.fire({
          title: "Confirmado",
          text: "Los cambios se han guardado",
          icon: "success"
        });
      }
    });    
    
   }

   update(): void {
    this.clienteEditar.razonSocial = this.form.value.razonSocial;
    this.clienteEditar.direccion = this.form.value.direccion;
    this.clienteEditar.cuit = this.form.value.cuit;
    this.clienteEditar.tarifaTipo = this.form.get('tarifaTipo')?.value; // Asigna el tipo de tarifa
    ////console.log()("estos son los contactos: ", this.formContacto.value);
    ////console.log()("estos es el clienteEditar: ", this.clienteEditar);    
    this.storageService.updateItem(this.componente, this.clienteEditar);
    this.borrarForms()
    this.edicion = false;
    //this.ngOnInit();
  }

  editarPerfil(){
    this.edicion = !this.edicion;
  }

  armarContacto(contacto: Contacto, i: number){
    //console.log()();
    
    //console.log()(i);
    this.indice = i;
    this.contactoEditar = contacto;
    this.formContacto.patchValue({
      puesto: contacto.puesto,
      apellido: contacto.apellido,
      nombre: contacto.nombre,
      telefono: contacto.telefono,
      email: contacto.email,
    })
  }

  guardarContacto(){
    ////console.log()(this.formContacto.value);
    //console.log()(this.clienteEditar.contactos);
    
    this.contactoEditar = this.formContacto.value;
    //console.log()(this.indice);
    if(this.indice === undefined){
      //console.log()(this.indice);
      //console.log()(this.contactoEditar);
      this.clienteEditar.contactos.push(this.contactoEditar)
    } else{
      //console.log()(this.contactoEditar);
      //console.log()(this.indice);
      
      this.clienteEditar.contactos[this.indice] = this.contactoEditar;
      //console.log()(this.clienteEditar);  
    }
    //console.log()(this.clienteEditar.contactos);
    
    
  }

  eliminarContacto(indice:number){
    this.clienteEditar.contactos.splice(indice, 1);    
  }
/* 
  agregarContacto(){
    //console.log()(this.clienteEditar.contactos);
    
  } */
  /* toogleMostrar(){
    this.mostrar = !this.mostrar;
  } */
  eliminarCliente(row:any){
    this.seleccionarCliente(row)
    Swal.fire({
      title: "¿Eliminar el Cliente?",
      text: "No se podrá revertir esta acción",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Confirmar",
      cancelButtonText: "Cancelar"
    }).then((result) => {
      if (result.isConfirmed) {
        this.storageService.deleteItem(this.componente, this.clienteEditar);
        Swal.fire({
          title: "Confirmado",
          text: "El Cliente ha sido borrado",
          icon: "success"
        });
      }
    });   
    
    /* this.ngOnInit(); */
    
  }

  borrarForms(){
    this.form.reset()
    this.formContacto.reset()
  }

  openModal(): void {   
   
    {
      const modalRef = this.modalService.open(ClienteAltaComponent, {
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
          this.storageService.getAllSorted("clientes", 'idCliente', 'asc')
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
    this.rows = this.$clientes.map((cliente: Cliente) => ({
        indice: indice ++,
        idCliente: cliente.idCliente,
        razonSocial: cliente.razonSocial,
        direccion: cliente.direccion,
        cuit: cliente.cuit,
        tarifa: cliente.tarifaTipo.general ? "General" : cliente.tarifaTipo.especial ? "Especial" : "Eventual",
        contacto: cliente.contactos.length > 0 ? cliente.contactos[0].apellido : "Sin Datos",
        puesto: cliente.contactos.length > 0 ? cliente.contactos[0].puesto : "Sin Datos" ,
        telefono: cliente.contactos.length > 0 ? cliente.contactos[0].telefono : "Sin Datos"  ,
        correo: cliente.contactos.length > 0 ? cliente.contactos[0].email : "Sin Datos",
        
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

  onTarifaTipoChange(tipo: string) {
    const tarifaTipoControl = this.form.get('tarifaTipo');
    if (tarifaTipoControl) {
      tarifaTipoControl.patchValue({
        general: tipo === 'general',
        especial: tipo === 'especial',
        eventual: tipo === 'eventual'
      });
    }
  }

}

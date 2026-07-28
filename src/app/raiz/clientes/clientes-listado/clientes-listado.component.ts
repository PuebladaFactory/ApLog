import { Component, OnDestroy, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, takeUntil } from 'rxjs';
import { Cliente } from 'src/app/interfaces/cliente';
import { ConId, ConIdType } from 'src/app/interfaces/conId';
import { ColumnaTabla, AccionTabla } from 'src/app/interfaces/tabla';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { ClienteService } from 'src/app/servicios/clientes/cliente.service';
import Swal from 'sweetalert2';
import { ClienteAltaComponent } from '../cliente-alta/cliente-alta.component';
import { BajaObjetoComponent } from 'src/app/shared/modales/baja-objeto/baja-objeto.component';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { ExcelService } from 'src/app/servicios/informes/excel/excel.service';
import { VisibilidadListadosComponent } from 'src/app/shared/modales/visibilidad-listados/visibilidad-listados.component';
import { UsuarioSesionService } from 'src/app/servicios/usuario-sesion/usuario-sesion.service';

@Component({
  selector: 'app-listado-nuevo',
  standalone: false,
  templateUrl: './clientes-listado.component.html',
  styleUrl: './clientes-listado.component.scss'
})
export class ClientesListadoComponent implements OnInit, OnDestroy {

  columnas: ColumnaTabla[] = [];
  filas: any[] = [];
  accionesTabla: AccionTabla[] = [];
  componente: string = 'clientes';
  $clientes: ConIdType<Cliente>[] = [];
  private destroy$ = new Subject<void>();
  clientesActivo: ConId<Cliente>[] = [];
  isLoading: boolean = false;
  clientesFiltrados: ConIdType<Cliente>[] = [];
  filtroEstado: 'visibles' | 'todos' = 'visibles';

  constructor(
    private storageService: StorageService,
    private modalService: NgbModal,
    private dbFirestore: DbFirestoreService,
    private excelServ: ExcelService,
    private clienteService: ClienteService,
    public usuarioSesion: UsuarioSesionService,
  ) {}

  ngOnInit(): void {
    this.clienteService.clientes$
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.$clientes = data.sort((a, b) =>
          a.razonSocial.localeCompare(b.razonSocial)
        );
        this.aplicarFiltro();
      });

    this.columnas = [
      { field: 'id', header: 'Id', visible: false, width: 110 },
      { field: 'razonSocial', header: 'Razón Social', visible: true, width: 200 },
      { field: 'cuit', header: 'CUIT', visible: true, width: 90 },
      { field: 'condFiscal', header: 'Cond. Fiscal', visible: false, width: 180 },
      { field: 'direccionFiscal', header: 'Dirección Fiscal', visible: true, width: 220 },
      { field: 'direccionOperativa', header: 'Dirección Operativa', visible: true, width: 220 },
      { field: 'tarifa', header: 'Tarifa', visible: true, width: 80 },
      { field: 'estado', header: 'Estado', visible: false, width: 80 },
      /* { field: 'contacto', header: 'Contacto', visible: false, width: 150 },
      { field: 'puesto', header: 'Puesto', visible: false, width: 120 },
      { field: 'telefono', header: 'Teléfono', visible: false, width: 120 },
      { field: 'correo', header: 'Correo', visible: true, width: 180 }, */
    ];

    this.accionesTabla = [
      { tipo: 'ver', handler: (fila) => this.abrirVista(fila._objeto) },
      { tipo: 'editar', handler: (fila) => this.abrirEdicion(fila._objeto) },
      { tipo: 'eliminar', handler: (fila) => this.eliminarCliente(fila._objeto) },
    ];
  }

  aplicarFiltro(): void {
    if (this.filtroEstado === 'visibles') {
      this.clientesFiltrados = this.$clientes.filter(c => c.visible === true);
    } else {
      this.clientesFiltrados = [...this.$clientes];
    }

    this.armarTabla();
  }

  armarTabla(): void {
    this.filas = this.clientesFiltrados.map(c => ({
      id: c.idCliente,
      razonSocial: c.razonSocial,
      cuit: this.formatCuit(c.cuit),
      condFiscal: c.condFiscal,
      direccionFiscal: `${c.direccionFiscal.domicilio}, ${c.direccionFiscal.municipio}, ${c.direccionFiscal.provincia}`,
      direccionOperativa: `${c.direccionOperativa.domicilio}, ${c.direccionOperativa.municipio}, ${c.direccionOperativa.provincia}`,
      tarifa: c.tarifaTipo.general ? 'General' : c.tarifaTipo.especial ? 'Especial' : c.tarifaTipo.personalizada ? 'Personalizada' : 'Eventual',
      estado: c.activo ? "Activo" : "Inactivo",
      /* contacto: c.contactos[0]?.apellido ?? 'Sin Datos',
      puesto: c.contactos[0]?.puesto ?? 'Sin Datos',
      telefono: c.contactos[0]?.telefono ?? 'Sin Datos',
      correo: c.contactos[0]?.email ?? 'Sin Datos', */
      _objeto: c,
    }));
  }

  cambiarFiltro(valor: 'visibles' | 'todos'): void {
    this.filtroEstado = valor;
    this.aplicarFiltro();
  }




  abrirVista(cliente: ConIdType<Cliente>): void {
    this.openModal('vista', cliente);
  }

  abrirEdicion(cliente: ConIdType<Cliente>): void {
    this.openModal('edicion', cliente);
  }

  eliminarCliente(cliente: ConIdType<Cliente>): void {
    Swal.fire({
      title: '¿Eliminar el Cliente?',
      text: 'No se podrá revertir esta acción',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        this.openModalBaja(cliente);
      }
    });
  }

  openModal(modo: string, cliente?: ConIdType<Cliente>): void {
    const modalRef = this.modalService.open(ClienteAltaComponent, {
      windowClass: 'myCustomModalClass',
      centered: true,
      size: 'lg',
    });
    modalRef.componentInstance.fromParent = {
      modo,
      item: cliente ?? null,
    };
  }

  openModalBaja(cliente: ConIdType<Cliente>): void {
    const modalRef = this.modalService.open(BajaObjetoComponent, {
      windowClass: 'myCustomModalClass',
      centered: true,
      scrollable: true,
      size: 'sm',
    });
    modalRef.componentInstance.fromParent = {
      modo: 'Cliente',
      item: cliente,
    };
    modalRef.result.then((motivo) => {
      if (motivo !== undefined) {
        this.isLoading = true;
        this.clienteService.eliminarCliente(cliente, motivo)
          .then(() => {
            this.isLoading = false;
            Swal.fire('Confirmado', 'El Cliente ha sido dado de baja', 'success');
          })
          .catch(e => {
            this.isLoading = false;
            Swal.fire('Error', `No se pudo dar de baja el cliente: ${e.message}`, 'error');
          });
      }
    });
  }

  formatCuit(cuitNumber: number | string): string {
    const cuitString = cuitNumber.toString();
    if (cuitString.length !== 11 || isNaN(Number(cuitString))) {
      return 'Formato inválido';
    }
    return `${cuitString.slice(0, 2)}-${cuitString.slice(2, 10)}-${cuitString.slice(10)}`;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  clientesActivos(){
    this.$clientes.map((c:ConId<Cliente>) => {
        c.activo = true;
        this.clientesActivo.push(c);
      })
    this.clientesActivo = this.clientesActivo.sort((a, b) =>
      a.razonSocial.localeCompare(b.razonSocial)
    );
    console.log("this.clientesActivo", this.clientesActivo);   
    
  }

  editarClientes(){
    this.clientesActivo = structuredClone(this.$clientes);
    this.clientesActivo = this.anonimizarClientes(this.clientesActivo);
   
    console.log("this.clientesActivo", this.clientesActivo);   
    
  }

  async actualizarActivos(){
    this.isLoading = true;    
    const resp = await this.dbFirestore.actualizarMultiple(this.clientesActivo, "clientes");
    if(resp){
      this.isLoading = false;
      this.mensajesError(resp.mensaje)
    }
    
  }

  mensajesError(msj:string){
    Swal.fire({
      icon: "error",
      //title: "Oops...",
      text: `${msj}`
      //footer: `${msj}`
    });
  }

  descargarClientes(){
    this.excelServ.exportarClientesTablaExcel(this.clientesFiltrados, 'Clientes')
  }

  visibilidadClientes(){
    {
      const modalRef = this.modalService.open(VisibilidadListadosComponent, {
        windowClass: 'myCustomModalClass',
        centered: true,
        size: 'md', 
        //backdrop:"static" 
      });      

    let info = {
        tipo: 'clientes',
        objetos: this.$clientes,
      } 
      //console.log()(info); */
      
      modalRef.componentInstance.info = info;
      modalRef.result.then(

        () => {
          // modal cancelado → no hacemos nada
        }
      );
    }
  }

  public anonimizarClientes(clientes: ConId<Cliente>[]): ConId<Cliente>[] {
  return clientes.map(cliente => ({
    ...cliente,

    cuit: this.randomNumber(11),

    direccionFiscal: {
      ...cliente.direccionFiscal,
      domicilio: this.randomString(10),
    },

    direccionOperativa: {
      ...cliente.direccionOperativa,
      domicilio: this.randomString(10),
    },

    contactos: cliente.contactos.map(contacto => ({
      ...contacto,
      puesto: this.randomString(10),
      apellido: this.randomString(10),
      telefono: this.randomNumber(10),
      email: this.randomEmail(10),
    }))
  }));
}

private randomString(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

private randomNumber(length: number): number {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

private randomEmail(length: number): string {
  return `${this.randomString(length)}@mail.com`;
}



}

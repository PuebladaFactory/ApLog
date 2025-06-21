import { Component, OnInit, OnDestroy, TemplateRef } from '@angular/core';
import { CdkDragDrop, transferArrayItem } from '@angular/cdk/drag-drop';
import { Subject, takeUntil } from 'rxjs';
import { Categoria, Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { ConId, ConIdType } from 'src/app/interfaces/conId';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2';
import { CategoriaTarifa, TarifaGralCliente } from 'src/app/interfaces/tarifa-gral-cliente';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CargaTableroDiarioComponent } from '../carga-tablero-diario/carga-tablero-diario.component';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { Operacion } from 'src/app/interfaces/operacion';
import { ExcelService } from 'src/app/servicios/informes/excel/excel.service';
type complementoChofer =  {
  categoriaAsignada: Categoria;
  observaciones: string;
  hojaDeRuta: string;
  tEventual:boolean;
};
type ChoferAsignado = ConIdType<Chofer> & {
  categoriaAsignada: Categoria;
  observaciones: string;
  hojaDeRuta: string;
  tEventual:boolean;
};

@Component({
  selector: 'app-tablero-diario',
  standalone:false,
  templateUrl: './tablero-diario.component.html',
  styleUrls: ['./tablero-diario.component.scss'],
})
export class TableroDiarioComponent implements OnInit, OnDestroy {
  clientes: ConIdType<Cliente>[] = [];
  choferes: ConIdType<Chofer>[] = [];
  asignaciones: { [idCliente: number]: ChoferAsignado[] } = {};
  connectedDropListsIds: string[] = [];
  destroy$ = new Subject<void>();
  hovering = false;
  fechaSeleccionada: string = '';
  choferesActivos: ConIdType<Chofer>[] = [];
  choferesInactivos: ConIdType<Chofer>[] = [];
  tarifaGeneral!: ConIdType<TarifaGralCliente>;
  choferesAgrupadosPorCategoria: { nombre: string; catOrden: number; choferes: ConId<Chofer>[] }[] = [];
  sectionColorClasses: string[] = [
    'bg-primary text-white',
    'bg-success text-white',
    'bg-warning text-dark',
    'bg-info text-dark',
    'bg-danger text-white',
    'bg-secondary text-white',
    'bg-dark text-white'
  ];
  choferSeleccionadoParaEditar: ChoferAsignado | null = null;
  choferSeleccionadoOriginal: ChoferAsignado | null = null;
  choferEditable: ChoferAsignado | null = null;
  isLoading: boolean = false;

  constructor(
    private storageService: StorageService,
    private modalService: NgbModal, 
    private dbFirestore: DbFirestoreService,
    private excelServ: ExcelService
  ) {}

  ngOnInit(): void {
    // 1. Obtener tarifa general del localStorage
    const storedTarifa = this.storageService.loadInfo("tarifasGralCliente")
    this.tarifaGeneral = storedTarifa[0];
    //console.log("tarifaGeneral", this.tarifaGeneral );


    // 2. Obtener choferes
    this.storageService
      .getObservable<ConIdType<Chofer>>('choferes')
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.choferes = data.sort((a, b) => a.apellido.localeCompare(b.apellido));
        this.choferesActivos = this.choferes.filter(c => c.activo);
        this.choferesInactivos = this.choferes.filter(c => !c.activo);

        this.agruparChoferesPorCategoria(); // 👈 agrupamos
    });

    this.storageService
      .getObservable<ConIdType<Cliente>>('clientes')
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.clientes = data.sort((a, b) =>
          a.razonSocial.localeCompare(b.razonSocial)
        );

        this.connectedDropListsIds = this.clientes.map(
          (c) => `cliente-drop-${c.idCliente}`
        );

        this.clientes.forEach((cliente) => {
          this.asignaciones[cliente.idCliente] = [];
        });
      });

      // Restaurar desde localStorage si hay datos guardados
      const asignacionesGuardadas = localStorage.getItem('asignacionesTemporal');
      if (asignacionesGuardadas) {
        const parsed = JSON.parse(asignacionesGuardadas);
        for (const clienteId of Object.keys(parsed)) {
          this.asignaciones[+clienteId] = parsed[clienteId];
        }
      }
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
     // Guardar las asignaciones en localStorage
    localStorage.setItem('asignacionesTemporal', JSON.stringify(this.asignaciones));
  }

  agruparChoferesPorCategoria() {
    const agrupados: { nombre: string; catOrden: number; choferes: ConId<Chofer>[] }[] = [];

    if (!this.tarifaGeneral?.cargasGenerales) return;

    for (const categoria of this.tarifaGeneral.cargasGenerales) {
      const catOrden = categoria.orden;
      const nombre = categoria.nombre;

      const choferesDeCategoria: ConId<Chofer>[] = [];

      for (const chofer of this.choferesActivos) {
        const tieneVehiculoDeCategoria = chofer.vehiculo?.some(
          (v) => v.categoria?.catOrden === catOrden
        );

        if (tieneVehiculoDeCategoria) {
          // Evitar duplicados en la misma categoría
          if (!choferesDeCategoria.some((c) => c.idChofer === chofer.idChofer)) {
            choferesDeCategoria.push(chofer);
          }
        }
      }

      agrupados.push({
        nombre,
        catOrden,
        choferes: choferesDeCategoria,
      });
    }

    this.choferesAgrupadosPorCategoria = agrupados;
  }


  onDropChoferEnCliente(event: CdkDragDrop<any>, clienteId: number): void {
    const data = event.item.data;
    const choferBase: ConIdType<Chofer> = data.chofer;

    const chofer: ChoferAsignado = {
      ...choferBase,
      categoriaAsignada: data.categoria, // o undefined, según tu lógica
      tEventual: !!choferBase.tarifaTipo?.eventual,
      observaciones:"",
      hojaDeRuta:""
    };
    console.log("1)chofer: ", chofer);

    if (!this.asignaciones[clienteId].some(c => c.idChofer === chofer.idChofer)) {
      // Guardamos la categoría con la que fue asignado
      this.asignaciones[clienteId].push(chofer);
    }

    
  }

  getColorClassForChoferAsignado(chofer: ChoferAsignado): string {
        
    const orden = chofer.categoriaAsignada?.catOrden ?? null;   
    
    if (orden === null) return 'bg-light text-dark';

    const index = this.tarifaGeneral.cargasGenerales.findIndex(cat => cat.orden === orden);
    
    return this.sectionColorClasses[index % this.sectionColorClasses.length] || 'bg-light text-dark';
  }


  onDropEnListaChoferes(event: CdkDragDrop<ConIdType<Chofer>[]>) {
    const data = event.item.data;
    const choferBase: ConIdType<Chofer> = data.chofer;

    const chofer: ChoferAsignado = {
      ...choferBase,
      categoriaAsignada: data.categoria, // o undefined, según tu lógica
      tEventual: !!choferBase.tarifaTipo?.eventual,
      observaciones:"",
      hojaDeRuta:""
    };
    console.log("1)chofer: ", chofer);
    
    if (event.previousContainer !== event.container) {
      const clienteId = +event.previousContainer.id.replace('cliente-drop-', '');

      // Lo quitamos de las asignaciones
      const index = this.asignaciones[clienteId].findIndex(c => c.idChofer === chofer.idChofer);
      if (index > -1) {
        this.asignaciones[clienteId].splice(index, 1);
      }

      // Si no está ya en la lista de choferes, lo agregamos
      const yaExiste = this.choferes.some(c => c.idChofer === chofer.idChofer);
      if (!yaExiste) {
        this.choferes.push(chofer); // 👈 importante
      }
    }
  }

  get dropListConnections(): string[] {
    return ['choferes', ...(this.connectedDropListsIds || [])];
  }

  estaAsignado(chofer: ConId<Chofer>): boolean {
    return Object.values(this.asignaciones).some(lista =>
      lista.some(asignado => asignado.idChofer === chofer.idChofer)
    );
  }

  quitarChoferDeCliente(idCliente: number, index: number): void {
    this.asignaciones[idCliente].splice(index, 1);
  }

  asignacionesMultiples(chofer: ConId<Chofer>): number {
    return this.clientesAsignados(chofer).length;
  }

  clientesAsignados(chofer: ConId<Chofer>): string[] {
    const nombresClientes: string[] = [];

    for (const cliente of this.clientes) {
      const lista = this.asignaciones[cliente.idCliente] || [];
      if (lista.some(c => c.idChofer === chofer.idChofer)) {
        nombresClientes.push(cliente.razonSocial);
      }
    }

    return nombresClientes;
  }

  guardarAsignaciones() {
    //console.log("this.asignaciones", this.asignaciones);
    const hayAsignaciones = Object.entries(this.asignaciones).filter(([_, choferes]) => choferes.length > 0)
    console.log("hayAsignaciones: ", hayAsignaciones);
    if(hayAsignaciones.length === 0){
      this.mensajesError("Debe asignar algun chofer para crear operaciones")
      return
    }
    
    
    if(this.fechaSeleccionada){
      const resultadoFinal = Object.entries(this.asignaciones)
      .filter(([_, choferes]) => choferes.length > 0)
      .map(([clienteId, choferes]) => ({
        fecha: this.fechaSeleccionada,
        clienteId: +clienteId,
        choferes: choferes.map(c => {
          let {categoriaAsignada, ...ch} = c;
          return ch
        })
      }))

      console.log('Asignaciones a guardar:', resultadoFinal);
      // Aquí podés guardar en Firebase
      // Acá podrías guardar en Firebase o backend si querés
      // console.log('Asignaciones guardadas:', this.asignaciones);

      
      this.openModal(resultadoFinal);
      
    } else {
      this.mensajesError("Debe seleccionar una fecha")
    }
    
  }

openModal(opMultiples: any[]): void {
  const modalRef = this.modalService.open(CargaTableroDiarioComponent, {
    windowClass: 'modal-super-xl',
    centered: true,
    size: 'xl',
  });

  const info = {
    item: opMultiples,
  };
  modalRef.componentInstance.fromParent = info;

  modalRef.result.then(
    async (result: Operacion[]) => {
      if (!result || result.length === 0) return;

      this.isLoading = true;

      const res = await this.dbFirestore.guardarOpMultiple(result);

      this.isLoading = false;

      if (res.exito) {
        this.limpiarAsignaciones();
        localStorage.removeItem('asignacionesTemporal');

        Swal.fire({
          icon: 'success',
          title: 'Operaciones guardadas',
          text: res.mensaje,
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error al guardar',
          text: res.mensaje,
        });
      }
    },
    (reason) => {
      // Usuario canceló o cerró el modal → no hacemos nada
    }
  );
}

  limpiarAsignaciones() {
    for (const key of Object.keys(this.asignaciones)) {
      this.asignaciones[+key] = [];
    }
    this.fechaSeleccionada = ''; // opcional
    localStorage.removeItem('asignacionesTemporal');
  }

  mensajesError(msj:string){
    Swal.fire({
      icon: "error",
      //title: "Oops...",
      text: `${msj}`
      //footer: `${msj}`
    });
  }

/*   get choferesActivos(): ConId<Chofer>[] {
    return this.choferes.filter(c => c.activo);
  } */

  toggleActivo(chofer: ConIdType<Chofer>) {
    chofer.activo = !chofer.activo;
    this.updateItem(chofer)
  }

  updateItem(chofer: ConIdType<Chofer>){
    let{id, type, ...ch} = chofer
    this.storageService.updateItem("choferes", chofer, chofer.idChofer, "INTERNA", "", chofer.id)
  }

  getColorClassForChofer(chofer: Chofer): string {
    const categoriasChofer = chofer.vehiculo.map(v => v.categoria.catOrden);
    // Buscar la primera categoría del chofer que esté en la tarifa
    for (let categoria of this.tarifaGeneral.cargasGenerales) {
      if (categoriasChofer.includes(categoria.orden)) {
        const index = this.tarifaGeneral.cargasGenerales.findIndex(c => c.orden === categoria.orden);
        return this.sectionColorClasses[index % this.sectionColorClasses.length];
      }
    }
    return 'bg-secondary text-white'; // fallback
  }

  getButtonClassForChofer(chofer: Chofer): string {
    const colorClass = this.getColorClassForChofer(chofer);

    if (colorClass.includes('bg-primary') || colorClass.includes('bg-dark') || colorClass.includes('bg-success') || colorClass.includes('bg-secondary')) {
      return 'btn-outline-light';
    } else {
      return 'btn-outline-dark';
    }
  }

async descargarOp() {
  console.log("this.fechaSeleccionada", this.fechaSeleccionada);
  console.log("this.asignaciones", this.asignaciones);


  await this.excelServ.generarInformeAsignaciones(
    this.asignaciones,
    this.clientes,
    this.choferesAgrupadosPorCategoria,
    this.choferesInactivos,
    this.fechaSeleccionada,
    this.sectionColorClasses
  );
}

  abrirEdicionChofer(chofer: ChoferAsignado, modalRef: TemplateRef<any>) {
    this.choferSeleccionadoOriginal = chofer;
    this.choferEditable = { ...chofer };

    const modal = this.modalService.open(modalRef, { centered: true });

    // Limpiar referencias al cerrar o cancelar el modal
    modal.result.finally(() => {
      this.choferEditable = null;
      this.choferSeleccionadoOriginal = null;
    });
  }


  guardarCambiosChofer(modal: any) {
    if (this.choferSeleccionadoOriginal && this.choferEditable) {
      this.choferSeleccionadoOriginal.observaciones = this.choferEditable.observaciones;
      this.choferSeleccionadoOriginal.hojaDeRuta = this.choferEditable.hojaDeRuta;
    }

    modal.close(); // El finally del modal se encarga de limpiar
  }


}

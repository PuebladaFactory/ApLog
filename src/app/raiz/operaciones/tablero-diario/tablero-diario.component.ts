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
import { BajaObjetoComponent } from 'src/app/shared/modales/baja-objeto/baja-objeto.component';
import { TableroService } from 'src/app/servicios/tablero/tablero.service';

type ChoferAsignado = ConIdType<Chofer> & {
  categoriaAsignada: Categoria;
  observaciones: string;
  hojaDeRuta: string;
  tEventual:boolean;
  idOperacion?: number; // 👈 NUEVO
};

export interface ChoferAsignadoBase {
  idChofer: number;
  tEventual: boolean;
  categoriaAsignada?: Categoria;
  observaciones?: string;
  hojaDeRuta?: string;  
  idOperacion?: number; // 👈 NUEVO
}

export interface TableroDiario {
  id: string;
  fecha: string; // formato "YYYY-MM-DD"
  asignaciones: { [idCliente: number]: ChoferAsignadoBase[] };
  timestamp: number; // nuevo: guarda el momento exacto del guardado
  asignado: boolean;
}

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
  fechaAnterior: string | null = null;
  tablero: TableroDiario | null = null;

  constructor(
    private storageService: StorageService,
    private modalService: NgbModal, 
    private dbFirestore: DbFirestoreService,
    private excelServ: ExcelService,
    private tableroServ: TableroService,
  ) {}

  ngOnInit(): void {
  
    // 1. Obtener tarifa general del localStorage
    const storedTarifa = this.storageService.loadInfo("tarifasGralCliente")
    this.tarifaGeneral = storedTarifa[0];
    ////////console.log("tarifaGeneral", this.tarifaGeneral );


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

      const fechaGuardada = localStorage.getItem('fechaTableroDiario');
      if (fechaGuardada) {
        const parsed = JSON.parse(fechaGuardada);
        this.fechaSeleccionada = parsed;
      }

      const tableroLocalStr = localStorage.getItem('tableroDiarioFirestore');
      if (tableroLocalStr) {
        this.tablero = JSON.parse(tableroLocalStr) as TableroDiario;
        this.fechaSeleccionada = this.tablero.fecha;
        this.reconstruirDesdeTablero(this.tablero);
      }

      // 👇 Buscar tablero existente en base de datos
     //this.cargarTableroDiario();
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
     // Guardar las asignaciones en localStorage
    localStorage.setItem('asignacionesTemporal', JSON.stringify(this.asignaciones));  
    localStorage.setItem('fechaTableroDiario', JSON.stringify(this.fechaSeleccionada))
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
    if(!this.fechaSeleccionada) return this.mensajesError("Antes debe seleccionar una fecha");
    if(this.tablero?.asignado) return this.mensajesError("El tablero ya fue dado de alta. Para agregar una operación debe hacerlo desde el Tablero de Operaciones");
    const data = event.item.data;
    ////console.log("drop cliente: data: ", data);    
    const choferBase: ConIdType<Chofer> = data.chofer;
    ////console.log("drop cliente: choferBase: ", choferBase);
    const categoria = data.categoria
    let {choferes, ...cat} = categoria

    const chofer: ChoferAsignado = {
      ...choferBase,
      categoriaAsignada: cat, // o undefined, según tu lógica
      tEventual: !!choferBase.tarifaTipo?.eventual,
      observaciones:"",
      hojaDeRuta:""
    };
    //console.log("1)chofer: ", chofer);

    /* if (!this.asignaciones[clienteId].some(c => c.idChofer === chofer.idChofer)) {
      // Guardamos la categoría con la que fue asignado
      this.asignaciones[clienteId].push(chofer);
    } */
    if (!this.asignaciones[clienteId]) {
      this.asignaciones[clienteId] = [];
    }

    this.asignaciones[clienteId].push(chofer);
    //////console.log("this.asignaciones;", this.asignaciones);
    
  }

  getColorClassForChoferAsignado(chofer: ChoferAsignado): string {
        
    const orden = chofer.categoriaAsignada?.catOrden ?? null;   
    
    if (orden === null) return 'bg-light text-dark';

    const index = this.tarifaGeneral.cargasGenerales.findIndex(cat => cat.orden === orden);
    
    return this.sectionColorClasses[index % this.sectionColorClasses.length] || 'bg-light text-dark';
  }


  onDropEnListaChoferes(event: CdkDragDrop<ConIdType<Chofer>[]>) {
    const data = event.item.data;
    ////console.log("drop choferes: data: ", data);
    
    const choferBase: ConIdType<Chofer> = data.chofer;
    ////console.log("drop choferes: choferBase: ", choferBase);
    const chofer: ChoferAsignado = {
      ...choferBase,
      categoriaAsignada: data.categoria, // o undefined, según tu lógica
      tEventual: !!choferBase.tarifaTipo?.eventual,
      observaciones:"",
      hojaDeRuta:""
    };
    //////console.log("1)chofer: ", chofer);
    
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

  async quitarChoferDeCliente(idCliente: number, index: number): Promise<void> {
    //console.log("this.tablero: ", this.tablero);
    
    const chofer = this.asignaciones[idCliente][index];
    //console.log("chofer: ", chofer);
    // 🔸 Caso 1: tablero aún no asignado
    if (!this.tablero?.asignado) {
      this.asignaciones[idCliente].splice(index, 1);
      return;
    }

    // 🔸 Caso 2: tablero ya asignado → buscar operación por ID
    if (!chofer.idOperacion) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se puede encontrar la operación asociada a esta asignación.'
      });
      return;
    }

    if (this.tablero.asignado && chofer.idOperacion) {
      const operacion = await this.dbFirestore.getItemByField<Operacion>('operaciones', 'idOperacion', chofer.idOperacion);
      //console.log("operacion", operacion);
      
      if (!operacion) return;

      // 🟡 Confirmación inicial
      const confirmacion = await Swal.fire({
        icon: 'warning',
        title: '¿Desea eliminar esta operación?',
        text: 'Esta acción eliminará la operación guardada y actualizará el tablero.',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
      });

      if (!confirmacion.isConfirmed) return;

      // 📋 Modal para ingresar motivo
      const modalRef = this.modalService.open(BajaObjetoComponent, {
        centered: true,
        size: 'sm'
      });

      const info = {
        modo: 'operaciones',
        item: operacion
      };

      modalRef.componentInstance.fromParent = info;

      try {
        const motivo = await modalRef.result;
        await this.tableroServ.anularOperacionYActualizarTablero(operacion, motivo, 'Baja de operación desde el tablero-diario');
        const nuevoTableroStr = localStorage.getItem('tableroDiarioFirestore');
        const nuevoTablero = nuevoTableroStr ? JSON.parse(nuevoTableroStr) as TableroDiario : null;
        //console.log("nuevoTablero", nuevoTablero);
        
        if (!nuevoTablero) {
          this.tablero = null;
          this.asignaciones = {};
          this.fechaSeleccionada = ''; // opcional: resetear la fecha si lo ves necesario

          Swal.fire({
            icon: 'info',
            title: 'Tablero eliminado',
            text: 'Se eliminó la última asignación y el tablero fue eliminado.'
          });
          return;
        }

        // 🟢 Si hay asignaciones restantes → actualizar tablero local
        this.tablero = nuevoTablero;
        this.reconstruirDesdeTablero(nuevoTablero);

        Swal.fire({
          icon: 'success',
          title: 'Operación eliminada',
          text: 'La operación fue dada de baja y se actualizó el tablero.'
        });

      } catch (e) {
        console.warn("El modal fue cancelado o falló:", e);
      }
    }

  }

  asignacionesMultiples(chofer: ConId<Chofer>): number {
    let contador = 0;

    for (const clienteId in this.asignaciones) {
      const lista = this.asignaciones[clienteId];
      contador += lista.filter(c => c.idChofer === chofer.idChofer).length;
    }

    return contador;
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

  async buscarTableroPorFecha(fecha: string): Promise<void> {
   
    
    this.isLoading = true;
    try {
      const tablero = await this.tableroServ.getTableroPorFecha(fecha); // nuevo método
      if (!tablero){
        this.asignaciones = {};
        localStorage.removeItem('asignacionesTemporal');
        localStorage.removeItem('tableroDiarioFirestore');
        this.tablero = null; // ← sin tablero cargado
        return 
      } 
      this.tablero = tablero; // ← guardás el tablero completo
      ////console.log("tablero: ", tablero);
      
      const tableroLocalStr = localStorage.getItem('tableroDiarioFirestore');
      const tableroLocal = tableroLocalStr ? JSON.parse(tableroLocalStr) as TableroDiario : null;

      if (tableroLocal?.timestamp === tablero.timestamp) return;

      localStorage.setItem('tableroDiarioFirestore', JSON.stringify(tablero));
      localStorage.setItem('fechaTableroDiario', JSON.stringify(fecha));

      this.fechaSeleccionada = tablero.fecha;
      this.reconstruirDesdeTablero(tablero);

      /* Swal.fire({
        icon: 'info',
        title: 'Tablero cargado',
        text: 'Se restauró un tablero guardado para esta fecha.'
      }); */
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: 'error',
        title: 'Error al cargar tablero',
        text: 'No se pudo recuperar el tablero de la base de datos.'
      });
    } finally {
      this.isLoading = false;
    }
  }

  private reconstruirDesdeTablero(tablero: TableroDiario): void {
    //console.log("tablero: ", tablero, "this.asignaciones", this.asignaciones);
    
    //this.asignaciones = {};

    for (const [idStr, choferesBase] of Object.entries(tablero.asignaciones)) {
      const idCliente = +idStr;
      const choferesCompletos: ChoferAsignado[] = [];

      for (const base of choferesBase) {
        const choferCompleto = this.choferes.find(c => c.idChofer === base.idChofer);
        ////console.log("choferCompleto: ", choferCompleto);
        if (!choferCompleto) continue;

        choferesCompletos.push({
          ...choferCompleto,
          categoriaAsignada: base.categoriaAsignada ?? { catOrden: 0, nombre: 'Sin categoría' },
          tEventual: base.tEventual,
          observaciones: base.observaciones ?? '',
          hojaDeRuta: base.hojaDeRuta ?? '',
          idOperacion: base.idOperacion ?? 0 // 👈 NUEVO
        });
        
        
      }
      ////console.log("TODOS choferesCompletos: ", choferesCompletos);
      this.asignaciones[idCliente] = choferesCompletos;
      
    }
    ////console.log("this.asignaciones", this.asignaciones);
    
  }



  altaOp() {
    ////////console.log("this.asignaciones", this.asignaciones);
    const hayAsignaciones = Object.entries(this.asignaciones).filter(([_, choferes]) => choferes.length > 0)
    //////console.log("hayAsignaciones: ", hayAsignaciones);
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
        choferes: choferes.map(c => ({ ...c }))
      }))

      //////console.log('Asignaciones a guardar:', resultadoFinal);
      // Aquí podés guardar en Firebase
      // Acá podrías guardar en Firebase o backend si querés
      // //////console.log('Asignaciones guardadas:', this.asignaciones);

      
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
    async (result: { operaciones: Operacion[]; asignaciones: { [idCliente: number]: ChoferAsignadoBase[] } }) => {
      if (!result || result.operaciones.length === 0) return;

      this.isLoading = true;

      const res = await this.dbFirestore.guardarOpMultiple(result.operaciones);

      this.isLoading = false;

      if (res.exito) {
        await this.generarInfDiario(); // ✅ Generar informe automáticamente

        this.tablero = {
          id: this.fechaSeleccionada,
          fecha: this.fechaSeleccionada,
          asignaciones: result.asignaciones, // ← asignaciones con idOperacion
          timestamp: Date.now(),
          asignado: true
        }
        await this.tableroServ.guardarTablero(this.tablero, "ALTA")
        /* await this.dbFirestore.setItem<TableroDiario>('tableroDiario', this.fechaSeleccionada, {
          id: this.fechaSeleccionada,
          fecha: this.fechaSeleccionada,
          asignaciones: result.asignaciones, // ← asignaciones con idOperacion
          timestamp: Date.now(),
          asignado: true
        }); */
        const arrayOp: number[] = result.operaciones.map((op) => op.idOperacion);
        this.storageService.logMultiplesOp(arrayOp, "ALTA", "operaciones", `Alta de Operación`, true);
        this.limpiarAsignaciones();
        localStorage.removeItem('asignacionesTemporal');
        localStorage.removeItem('tableroDiarioFirestore');

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
    this.tablero = null;
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
  

  onFechaSeleccionadaChange(): void {    
    if (!this.fechaSeleccionada || this.fechaSeleccionada === this.fechaAnterior) {
      return; // No hay cambio o fecha inválida
    }

    this.fechaAnterior = this.fechaSeleccionada;
    ////console.log("this.fechaSeleccionada", this.fechaSeleccionada);
    this.asignaciones = {}
    this.buscarTableroPorFecha(this.fechaSeleccionada);
  }

  async generarInfDiario(){
    ////console.log("this.asignaciones ", this.asignaciones,);
    ////console.log("this.sectionColorClasses ", this.sectionColorClasses,);
    ////console.log("this.asignaciones ", this.asignaciones,);
    
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
    //console.log("chofer: ", chofer);
    //if(this.tablero?.asignado) this.mensajesError("No se puede editar una asiganción que ya fue dada de alta")
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

async guardarTableroDiario(): Promise<void> {
  const hayAsignaciones = Object.entries(this.asignaciones).filter(([_, choferes]) => choferes.length > 0)
  if(!this.fechaSeleccionada) return this.mensajesError("Debe seleccionar una fecha");
  if(hayAsignaciones.length === 0) return this.mensajesError("Debe asignar algun chofer para poder descargar las asignaciones diarias");
  const { isConfirmed } = await Swal.fire({
    title: 'Guardar tablero actual',
    text: '¿Desea guardar este tablero para continuar luego?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Guardar',
    cancelButtonText: 'Cancelar'
  });

  if (!isConfirmed) return;  
  this.isLoading = true; // Activar spinner  

  this.tablero = {
    id: this.fechaSeleccionada, 
    fecha: this.fechaSeleccionada,
    asignaciones: {},
    timestamp: Date.now(), // nuevo
    asignado:false,
  };

  // Guardar solo clientes con choferes asignados
  for (const [idStr, lista] of Object.entries(this.asignaciones)) {
    if (lista.length === 0) continue;

    this.tablero.asignaciones[+idStr] = lista.map((c): ChoferAsignadoBase => ({
      idChofer: c.idChofer,
      categoriaAsignada: c.categoriaAsignada,
      tEventual: c.tEventual,
      observaciones: c.observaciones,
      hojaDeRuta: c.hojaDeRuta
    }));
  }

  try {
    await this.tableroServ.guardarTablero(this.tablero, "ALTA");

    localStorage.setItem('tableroDiarioFirestore', JSON.stringify(this.tablero));
    localStorage.setItem('asignacionesTemporal', JSON.stringify(this.asignaciones));
    //this.storageService.logSimple(tablero.timestamp, "ALTA", 'tableroDiario', `Tablero Diario del dia ${tablero.fecha}, guardado`,true)
    this.isLoading = false; // Desactivar spinner
    Swal.fire({
      icon: 'success',
      title: 'Tablero guardado',
      text: 'Podrá retomarlo más adelante desde esta misma pantalla.'
    });

  } catch (error) {
    console.error(error);
    this.isLoading = false; // Desactivar spinner
    Swal.fire({
      icon: 'error',
      title: 'Error al guardar',
      text: 'Ocurrió un problema al guardar el tablero.'
    });
  }
}

  cambiarDia(direccion: number): void {
    if (!this.fechaSeleccionada) return;

    const fechaActual = new Date(this.fechaSeleccionada);
    fechaActual.setDate(fechaActual.getDate() + direccion);

    const nuevaFecha = fechaActual.toISOString().split('T')[0]; // formato yyyy-MM-dd
    this.fechaSeleccionada = nuevaFecha;

    this.onFechaSeleccionadaChange(); // vuelve a hacer la consulta
  }
  

  getDiaSemana(fechaStr: string): string {
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    const [anio, mes, dia] = fechaStr.split('-').map(Number);
    const fechaLocal = new Date(anio, mes - 1, dia); // mes base 0

    return dias[fechaLocal.getDay()];
  }






}

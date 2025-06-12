import { Component, OnInit, OnDestroy } from '@angular/core';
import { CdkDragDrop, transferArrayItem } from '@angular/cdk/drag-drop';
import { Subject, takeUntil } from 'rxjs';
import { Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { ConId, ConIdType } from 'src/app/interfaces/conId';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-tablero-diario',
  standalone:false,
  templateUrl: './tablero-diario.component.html',
  styleUrls: ['./tablero-diario.component.scss'],
})
export class TableroDiarioComponent implements OnInit, OnDestroy {
  clientes: ConIdType<Cliente>[] = [];
  choferes: ConIdType<Chofer>[] = [];
  asignaciones: { [clienteId: number]: ConId<Chofer>[] } = {};
  connectedDropListsIds: string[] = [];
  destroy$ = new Subject<void>();
  hovering = false;
  fechaSeleccionada: string = '';
  choferesActivos: ConIdType<Chofer>[] = [];
  choferesInactivos: ConIdType<Chofer>[] = [];

  constructor(private storageService: StorageService) {}

  ngOnInit(): void {
    this.storageService
      .getObservable<ConIdType<Chofer>>('choferes')
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.choferes = data.sort((a, b) => a.apellido.localeCompare(b.apellido));
        this.choferesActivos = this.choferes.filter(c => c.activo)
        this.choferesInactivos = this.choferes.filter(c => !c.activo)
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

      this.clientes.forEach((cliente) => {
        this.asignaciones[cliente.idCliente] = [];
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


  onDropChoferEnCliente(event: CdkDragDrop<ConId<Chofer>[]>, idCliente: number) {
    const chofer: ConId<Chofer> = event.item.data;

    const listaDestino = this.asignaciones[idCliente];

    const yaAsignado = listaDestino.some(c => c.idChofer === chofer.idChofer);
    if (!yaAsignado) {
      listaDestino.push(chofer); // Esto copia el chofer sin removerlo del array original
    }
  }

  onDropEnListaChoferes(event: CdkDragDrop<ConIdType<Chofer>[]>) {
    const chofer = event.item.data;

    // Verificamos que provenga de una columna de cliente
    if (event.previousContainer !== event.container) {
      const clienteId = +event.previousContainer.id.replace('cliente-drop-', '');

      // Evitamos duplicados en el listado general
      const yaEnLista = this.choferes.some(c => c.idChofer === chofer.idChofer);
      if (!yaEnLista) {
        transferArrayItem(
          this.asignaciones[clienteId],
          this.choferes,
          event.previousIndex,
          event.currentIndex
        );
      } else {
        // Si ya está, simplemente lo quitamos de la asignación del cliente
        this.asignaciones[clienteId].splice(event.previousIndex, 1);
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
    if(this.fechaSeleccionada){
      const resultadoFinal = Object.entries(this.asignaciones)
      .filter(([_, choferes]) => choferes.length > 0)
      .map(([clienteId, choferes]) => ({
        fecha: this.fechaSeleccionada,
        clienteId,
        choferes: choferes.map(c => c.idChofer)
      }));

      console.log('Asignaciones a guardar:', resultadoFinal);
      // Aquí podés guardar en Firebase
      // Acá podrías guardar en Firebase o backend si querés
      // console.log('Asignaciones guardadas:', this.asignaciones);

      // Luego de guardar, limpiamos el tablero
      this.limpiarAsignaciones();
      localStorage.removeItem('asignacionesTemporal');
    } else {
      this.mensajesError("Debe seleccionar una fecha")
    }
    
  }

  limpiarAsignaciones() {
    for (const key of Object.keys(this.asignaciones)) {
      this.asignaciones[+key] = [];
    }
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
}

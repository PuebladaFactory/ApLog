import { Component, OnInit, OnDestroy } from '@angular/core';
import { CdkDragDrop, transferArrayItem } from '@angular/cdk/drag-drop';
import { Subject, takeUntil } from 'rxjs';
import { Chofer } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { ConId, ConIdType } from 'src/app/interfaces/conId';
import { StorageService } from 'src/app/servicios/storage/storage.service';

@Component({
  selector: 'app-tablero-diario',
  standalone:false,
  templateUrl: './tablero-diario.component.html',
  styleUrls: ['./tablero-diario.component.scss'],
})
export class TableroDiarioComponent implements OnInit, OnDestroy {
  clientes: ConId<Cliente>[] = [];
  choferes: ConId<Chofer>[] = [];
  asignaciones: { [clienteId: number]: ConId<Chofer>[] } = {};
  connectedDropListsIds: string[] = [];
  destroy$ = new Subject<void>();
  hovering = false;
  fechaSeleccionada: string = '';

  constructor(private storageService: StorageService) {}

  ngOnInit(): void {
    this.storageService
      .getObservable<ConIdType<Chofer>>('choferes')
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.choferes = data.sort((a, b) => a.apellido.localeCompare(b.apellido));
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
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }


onDropChoferEnCliente(event: CdkDragDrop<ConId<Chofer>[]>, idCliente: number) {
  const chofer: ConId<Chofer> = event.item.data;

  const listaDestino = this.asignaciones[idCliente];

  const yaAsignado = listaDestino.some(c => c.idChofer === chofer.idChofer);
  if (!yaAsignado) {
    listaDestino.push(chofer); // Esto copia el chofer sin removerlo del array original
  }
}

  onDropEnListaChoferes(event: CdkDragDrop<ConId<Chofer>[]>) {
    if (event.previousContainer !== event.container) {
      const clienteId = +event.previousContainer.id.replace('cliente-drop-', '');
      transferArrayItem(
        this.asignaciones[clienteId],
        this.choferes,
        event.previousIndex,
        event.currentIndex
      );
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
}

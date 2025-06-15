import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Cliente } from 'src/app/interfaces/cliente';
import { Chofer } from 'src/app/interfaces/chofer';
import { ConId, ConIdType } from 'src/app/interfaces/conId';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import { Operacion } from 'src/app/interfaces/operacion';

type ChoferAsignado = ConId<Chofer> & {
  hojaDeRuta?: string;
  observaciones?: string;
  tEventual: boolean;
  categoriaAsignada?: any;
  conceptoChofer?: string;
  valorChofer?: number;
  conceptoCliente?: string;
  valorCliente?: number;
};

@Component({
  selector: 'app-carga-tablero-diario',
  standalone:false,
  templateUrl: './carga-tablero-diario.component.html',
  styleUrl: './carga-tablero-diario.component.scss'
})
export class CargaTableroDiarioComponent implements OnInit, OnDestroy {
  @Input() fromParent!: { item: any[] };

  operaciones: Operacion[] = [];
  operacionesAgrupadas: { clienteId: number; razonSocial: string; tipo: 'eventual' | 'personalizada' | 'especial' | 'general'; operaciones: Operacion[] }[] = [];
  clientes: Cliente[] = [];
  fecha: string = '';

  constructor(public activeModal: NgbActiveModal) {}
  ngOnDestroy(): void {
    throw new Error('Method not implemented.');
  }

  ngOnInit(): void {
    const storedClientes = localStorage.getItem('clientes');
    this.clientes = storedClientes ? JSON.parse(storedClientes) : [];

    const entradas = this.fromParent.item;
    this.fecha = entradas[0]?.fecha || '';

    for (const entrada of entradas) {
      const cliente = this.clientes.find(c => c.idCliente === entrada.clienteId);
      if (!cliente) continue;

      for (const chofer of entrada.choferes) {
        const tarifaTipo = this.getTarifaTipo(cliente, chofer);

        const op: Operacion = {
          idOperacion: new Date().getTime() + Math.floor(Math.random() * 1000),
          fecha: entrada.fecha,
          km: 0,
          cliente: cliente,
          chofer: chofer,
          documentacion:"",
          observaciones: chofer.observaciones || '',
          hojaRuta: chofer.hojaDeRuta || '',
          acompaniante: false,
          facturaCliente: 0,
          facturaChofer: 0,
          tarifaEventual: {
            chofer: { concepto: '', valor: 0 },
            cliente: { concepto: '', valor: 0 }
          },
          tarifaPersonalizada: {
            seccion: 0,
            categoria: 0,
            nombre: '',
            aCobrar: 0,
            aPagar: 0
          },
          patenteChofer: '',
          estado: {
            abierta: true,
            cerrada: false,
            facCliente: false,
            facChofer: false,
            facturada: false,
            proformaCl: false,
            proformaCh: false
          },
          tarifaTipo,
          valores: {
            cliente: {
              acompValor: 0,
              kmAdicional: 0,
              tarifaBase: 0,
              aCobrar: 0
            },
            chofer: {
              acompValor: 0,
              kmAdicional: 0,
              tarifaBase: 0,
              aPagar: 0
            }
          },
          multiplicadorCliente: 1,
          multiplicadorChofer: 1
        };

        this.operaciones.push(op);
      }
    }

    this.agruparOperacionesPorCliente();
  }

  getTarifaTipo(cliente: Cliente, chofer: ConId<Chofer>) {
    if (cliente.tarifaTipo?.eventual || chofer.tarifaTipo?.eventual) {
      return { general: false, especial: false, eventual: true, personalizada: false };
    }

    if (cliente.tarifaTipo?.personalizada) {
      return { general: false, especial: false, eventual: false, personalizada: true };
    }

    if (cliente.tarifaTipo?.especial || chofer.tarifaTipo?.especial) {
      return { general: false, especial: true, eventual: false, personalizada: false };
    }

    return { general: true, especial: false, eventual: false, personalizada: false };
  }

  agruparOperacionesPorCliente(): void {
    const mapa = new Map<number, Operacion[]>();

    for (const op of this.operaciones) {
      if (!mapa.has(op.cliente.idCliente)) {
        mapa.set(op.cliente.idCliente, []);
      }
      mapa.get(op.cliente.idCliente)?.push(op);
    }

    this.operacionesAgrupadas = Array.from(mapa.entries()).map(([clienteId, operaciones]) => {
      const razonSocial = operaciones[0].cliente.razonSocial;
      const tipo = operaciones[0].tarifaTipo.eventual
        ? 'eventual'
        : operaciones[0].tarifaTipo.personalizada
        ? 'personalizada'
        : operaciones[0].tarifaTipo.especial
        ? 'especial'
        : 'general';

      return { clienteId, razonSocial, tipo, operaciones };
    });
  }

  guardar() {
    console.log('Operaciones finalizadas:', this.operaciones);
    this.activeModal.close(this.operaciones);
  }

}

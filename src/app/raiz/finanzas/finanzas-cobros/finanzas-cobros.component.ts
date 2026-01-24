import { Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Cliente } from 'src/app/interfaces/cliente';
import { ConId } from 'src/app/interfaces/conId';
import { InformeLiq } from 'src/app/interfaces/informe-liq';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { ExcelService } from 'src/app/servicios/informes/excel/excel.service';
import { PdfService } from 'src/app/servicios/informes/pdf/pdf.service';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2';
import { MovimientoFinancieroComponent } from '../modales/movimiento-financiero/movimiento-financiero.component';
import { MovimientoFormVM } from 'src/app/interfaces/movimiento-form-v-m';

@Component({
  selector: 'app-finanzas-cobros',
  standalone: false,
  templateUrl: './finanzas-cobros.component.html',
  styleUrl: './finanzas-cobros.component.scss'
})
export class FinanzasCobrosComponent implements OnInit {

  // UI
  cargando = false;

  // Selección
  clienteSeleccionadoId: number | null = null;

  // Datos
  clientes: ConId<Cliente>[] = [];
  informesPendientes: ConId<InformeLiq>[] = [];
  informesSeleccionados: ConId<InformeLiq>[] = [];

  constructor(
    private dbService: DbFirestoreService,
    private storageService: StorageService,
    private modalService: NgbModal
  ) {}

  ngOnInit(): void {
    this.clientes = this.storageService.loadInfo('clientes');
    this.clientes = this.clientes.sort((a, b) => a.razonSocial.localeCompare(b.razonSocial));
  }

  /* ===============================
     CARGA DE INFORMES
     =============================== */

  async onClienteSeleccionado(clienteId: number) {
    this.clienteSeleccionadoId = Number(clienteId);
    this.informesPendientes = [];
    this.informesSeleccionados = [];

    if (!clienteId) return;

    console.log("this.clienteSeleccionadoId: ", this.clienteSeleccionadoId);
    this.cargando = true;
    try {
      // 🔜 reemplazar por query real
      const informes= await this.dbService.getInformesPendientesPorEntidad(this.clienteSeleccionadoId)
      console.log("informes", informes);
      
      this.informesPendientes = informes.map(inf =>
        this.normalizarValoresFinancieros(inf)
      );
      this.informesPendientes = this.informesPendientes.sort((a,b)=> a.numeroInterno.localeCompare(b.numeroInterno))

      console.log("this.informesPendientes: ", this.informesPendientes);
      

    } catch (error) {
      console.error('Error cargando informes pendientes', error);
    } finally {
      this.cargando = false;
    }
  }

  /* ===============================
     NORMALIZACIÓN FINANCIERA
     =============================== */

  private normalizarValoresFinancieros(
    inf: ConId<InformeLiq>
  ): ConId<InformeLiq> {

    if (!inf.valoresFinancieros) {
      return {
        ...inf,
        valoresFinancieros: {
          total: inf.valores.total,
          totalCobrado: 0,
          saldo: inf.valores.total
        }
      };
    }

    return inf;
  }

  /* ===============================
     SELECCIÓN DE INFORMES
     =============================== */

  toggleSeleccion(inf: ConId<InformeLiq>, checked: boolean): void {
    if (checked) {
      this.informesSeleccionados.push(inf);
    } else {
      this.informesSeleccionados =
        this.informesSeleccionados.filter(i => i.id !== inf.id);
    }
  }

  estaSeleccionado(inf: ConId<InformeLiq>): boolean {
    return this.informesSeleccionados.some(i => i.id === inf.id);
  }

  /* ===============================
     TOTALES (DERIVADOS)
     =============================== */

  get totalSeleccionado(): number {
    return this.informesSeleccionados.reduce(
      (acc, inf) => acc + (inf.valoresFinancieros?.total ?? 0),
      0
    );
  }

  get totalCobradoSeleccionado(): number {
    return this.informesSeleccionados.reduce(
      (acc, inf) => acc + (inf.valoresFinancieros?.totalCobrado ?? 0),
      0
    );
  }

  get saldoSeleccionado(): number {
    return this.informesSeleccionados.reduce(
      (acc, inf) => acc + (inf.valoresFinancieros?.saldo ?? 0),
      0
    );
  }

  /* ===============================
     ACCIÓN PRINCIPAL
     =============================== */

  puedeRegistrarCobro(): boolean {
    return (
      !!this.clienteSeleccionadoId &&
      this.informesSeleccionados.length > 0 &&
      this.saldoSeleccionado > 0
    );
  }

registrarCobro(): void {
  if (!this.puedeRegistrarCobro()) return;

  const cliente = this.clientes.find(
    c => c.idCliente === this.clienteSeleccionadoId
  );

  if (!cliente) {
    console.error('Cliente no encontrado');
    return;
  }

  const modalRef = this.modalService.open(
    MovimientoFinancieroComponent,
    {
      size: 'lg',
      backdrop: 'static'
    }
  );

  modalRef.componentInstance.tipo = 'cobro';

  modalRef.componentInstance.entidad = {
    id: String(cliente.idCliente),
    tipo: 'cliente',
    razonSocial: cliente.razonSocial
  };

  modalRef.componentInstance.informes = this.informesSeleccionados;

  modalRef.result.then(
    async (form: MovimientoFormVM) => {
      try {
        // 🔥 acá va el service real
        await this.dbService.registrarMovimientoFinanciero(
          form,
          'UID_USUARIO' // luego lo sacás del auth
        );

        Swal.fire('OK', 'Cobro registrado correctamente', 'success');

        // refrescar informes
        await this.onClienteSeleccionado(this.clienteSeleccionadoId!);
      } catch (err) {
        console.error(err);
        Swal.fire('Error', 'No se pudo registrar el cobro', 'error');
      }
    },
    () => {
      // modal cancelado → no hacemos nada
    }
  );
}
  
}

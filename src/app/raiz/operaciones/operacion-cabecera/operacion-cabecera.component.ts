import { Component, Input, OnChanges } from '@angular/core';
import { Operacion } from 'src/app/interfaces/operacion';
import { RefTarifaHabilitada } from 'src/app/interfaces/tarifa-habilitada';
import { ClienteService } from 'src/app/servicios/clientes/cliente.service';
import { ChoferService } from 'src/app/servicios/choferes/chofer.service';
import { ProveedorService } from 'src/app/servicios/proveedores/proveedor.service';

@Component({
  selector: 'app-operacion-cabecera',
  standalone: false,
  templateUrl: './operacion-cabecera.component.html',
  styleUrls: ['./operacion-cabecera.component.scss'],
})
export class OperacionCabeceraComponent implements OnChanges {
  @Input() op!: Operacion;

  /** Tarifas HABILITADAS de la entidad (configuración), no la aplicada a esta
   *  operación puntual — ver operacion-valor-lado para esa otra badge. */
  tarifasHabilitadasCliente: RefTarifaHabilitada[] = [];
  tarifasHabilitadasChofer: RefTarifaHabilitada[] = [];

  constructor(
    private clienteServ: ClienteService,
    private choferServ: ChoferService,
    private proveedorServ: ProveedorService,
  ) {}

  ngOnChanges(): void {
    // Entidad no encontrada en memoria (p. ej. en papelera) → sin badges.
    // (TC8: fuera el respaldo que reconstruía la lista desde los booleanos
    // legacy de la operación.)
    const cliente = this.clienteServ.getClientePorId(this.op.cliente.id);
    this.tarifasHabilitadasCliente = cliente ? cliente.tarifasHabilitadas : [];

    const chofer = this.choferServ.getChoferPorId(this.op.chofer.id);
    // resolverTarifasHabilitadasChofer ya resuelve directo vs. proveedor
    // internamente (mismo método que usa ResolucionTarifaOpService.candidatosOp).
    this.tarifasHabilitadasChofer = chofer
      ? this.proveedorServ.resolverTarifasHabilitadasChofer(chofer)
      : [];
  }
}

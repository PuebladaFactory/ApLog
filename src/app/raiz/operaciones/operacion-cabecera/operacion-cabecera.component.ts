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
    const cliente = this.clienteServ.getClientePorId(this.op.cliente.id);
    this.tarifasHabilitadasCliente = cliente
      ? cliente.tarifasHabilitadas
      : this.legacyComoHabilitadas(this.op.tarifaTipo);

    const chofer = this.choferServ.getChoferPorId(this.op.chofer.id);
    // resolverTarifasHabilitadasChofer ya resuelve directo vs. proveedor
    // internamente (mismo método que usa ValoresTarifaService.calcularAlta).
    this.tarifasHabilitadasChofer = chofer
      ? this.proveedorServ.resolverTarifasHabilitadasChofer(chofer)
      : this.legacyComoHabilitadas(this.op.tarifaTipo);
  }

  /** Fallback cuando la entidad viva no está en memoria (cliente/chofer en
   *  papelera) — reconstruye la lista de habilitadas desde el tarifaTipo
   *  legacy de la operación, mismo precedente de respaldo que usa
   *  operaciones-editor.reagrupar(). No es exacto (tarifaTipo es un snapshot
   *  de la operación puntual, no la configuración actual de la entidad) pero
   *  evita mostrar la cabecera vacía. */
  private legacyComoHabilitadas(t: Operacion['tarifaTipo']): RefTarifaHabilitada[] {
    const out: RefTarifaHabilitada[] = [];
    if (t.general) out.push({ nivel: 'general' });
    if (t.especial) out.push({ nivel: 'especial' });
    if (t.personalizada) out.push({ nivel: 'personalizada' });
    if (t.eventual) out.push({ nivel: 'eventual' });
    return out;
  }
}

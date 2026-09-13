import { Component, Input, OnChanges } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Operacion } from 'src/app/interfaces/operacion';

@Component({
  selector: 'app-operacion-totales',
  standalone: false,
  templateUrl: './operacion-totales.component.html',
  styleUrls: ['./operacion-totales.component.scss'],
})
export class OperacionTotalesComponent implements OnChanges {
  @Input() op!: Operacion;
  @Input() form!: FormGroup;                     // shell.form.get('totales')
  @Input() puedeEditarKmYMultiplicadores = false;

  ngOnChanges(): void {
    if (!this.form) return;
    const habilitado = this.puedeEditarKmYMultiplicadores;
    const ctrlCliente = this.form.get('multiplicadorCliente');
    const ctrlChofer = this.form.get('multiplicadorChofer');
    habilitado ? ctrlCliente?.enable({ emitEvent: false }) : ctrlCliente?.disable({ emitEvent: false });
    habilitado ? ctrlChofer?.enable({ emitEvent: false }) : ctrlChofer?.disable({ emitEvent: false });
  }
}

import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Operacion } from 'src/app/interfaces/operacion';
import { NivelTarifa } from 'src/app/interfaces/tarifa';
import { CandidatoTarifa } from 'src/app/servicios/tarifario/valores-tarifa.service';

@Component({
  selector: 'app-operacion-valor-lado',
  standalone: false,
  templateUrl: './operacion-valor-lado.component.html',
  styleUrls: ['./operacion-valor-lado.component.scss'],
})
export class OperacionValorLadoComponent implements OnChanges {
  @Input() op!: Operacion;
  @Input() lado!: 'cliente' | 'chofer';
  @Input() form!: FormGroup;                    // shell.form.get('valorCliente' | 'valorChofer')
  @Input() puedeEditarDetalleCompleto = false;
  @Input() esPersonalizadaDelCliente = false;    // solo relevante si lado === 'chofer'
  @Input() candidatoPersonalizada: CandidatoTarifa | null = null;  // secciones/categorías de la tarifa YA resuelta (Personalizada)
  @Output() seccionCategoriaChange = new EventEmitter<{ seccion: number; categoria: number }>();
  /** Eventual (concepto/valor) vive fuera del FormGroup — ver nota de diseño arriba. */
  @Output() recalcular = new EventEmitter<void>();

  /** Sección/Categoría en curso — estado de UI propio, desacoplado de
   *  op.tarifaAplicadaCliente/Chofer porque esa referencia puede quedar en
   *  null mientras la selección está a mitad de camino (armarRefManual
   *  devuelve null hasta que ambas partes están elegidas). Mismo criterio
   *  que SeleccionSeccionCategoria de operaciones-editor. Se siembra una
   *  sola vez desde la referencia congelada del alta. */
  seccionEnCurso = -1;
  categoriaEnCurso = -1;
  private sembrado = false;

  ngOnChanges(): void {
    if (!this.sembrado) {
      const ref = this.refActual;
      if (ref) {
        this.seccionEnCurso = ref.seccion;
        this.categoriaEnCurso = ref.categoria;
        this.sembrado = true;
      }
    }
    this.aplicarGating();
  }

  private aplicarGating(): void {
    if (!this.form) return;
    const setEnabled = (nombre: string, habilitado: boolean) => {
      const ctrl = this.form.get(nombre);
      if (!ctrl) return;
      habilitado ? ctrl.enable({ emitEvent: false }) : ctrl.disable({ emitEvent: false });
    };
    setEnabled('adExtraValor', this.puedeEditarDetalleCompleto);
  }

  get refActual() {
    return this.lado === 'cliente' ? this.op.tarifaAplicadaCliente : this.op.tarifaAplicadaChofer;
  }

  /** Nivel real aplicado a este lado — mismo criterio que usaba el
   *  componente viejo (ModalResumenOpComponent, eliminado — nivelTarifaAplicada):
   *  Eventual es a nivel de operación completa, se chequea antes que
   *  tarifaAplicada*. */
  get nivel(): NivelTarifa | null {
    if (this.op.datosTarifaEventual !== null) return 'eventual';
    return this.refActual?.nivel ?? null;
  }

  get valores() {
    return this.lado === 'cliente' ? this.op.valoresNuevos?.cliente : this.op.valoresNuevos?.chofer;
  }

  get datosEventualLado() {
    return this.lado === 'cliente' ? this.op.datosTarifaEventual?.cliente : this.op.datosTarifaEventual?.chofer;
  }

  get seccionesDisponibles() {
    return this.candidatoPersonalizada?.secciones ?? [];
  }

  get categoriasDisponibles(): any[] {
    const seccion = this.candidatoPersonalizada?.secciones.find(s => s.orden === this.seccionEnCurso);
    return seccion?.categorias ?? [];
  }

  onSeccionChange(orden: number): void {
    this.seccionEnCurso = orden;
    this.categoriaEnCurso = -1;
    this.seccionCategoriaChange.emit({ seccion: orden, categoria: -1 });
  }

  onCategoriaChange(orden: number): void {
    this.categoriaEnCurso = orden;
    this.seccionCategoriaChange.emit({ seccion: this.seccionEnCurso, categoria: orden });
  }
}

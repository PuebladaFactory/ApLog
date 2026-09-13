import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, Output, ViewChild } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Operacion } from 'src/app/interfaces/operacion';

@Component({
  selector: 'app-operacion-detalle-general',
  standalone: false,
  templateUrl: './operacion-detalle-general.component.html',
  styleUrls: ['./operacion-detalle-general.component.scss'],
})
export class OperacionDetalleGeneralComponent implements OnChanges, AfterViewInit {
  @Input() op!: Operacion;
  @Input() form!: FormGroup;                     // shell.form.get('detalleGeneral')
  @Input() adExtraConcepto!: FormControl;         // shell.form.get('adExtraConcepto') — control raíz, fuera de detalleGeneral
  @Input() puedeEditarDetalleCompleto = false;
  @Input() puedeEditarKmYMultiplicadores = false;
  @Input() puedeEditarDocumentacion = false;
  @Input() puedeEditarAdExtraConcepto = false;
  @Input() autofocarKm = false;                  // true en modo 'cerrar' (lo decide el shell)

  @Output() kmEnter = new EventEmitter<void>();

  @ViewChild('kmInput') kmInputRef?: ElementRef<HTMLInputElement>;

  ngOnChanges(): void {
    if (this.form) this.aplicarGating();
  }

  ngAfterViewInit(): void {
    // setTimeout — NgbModal maneja su propio foco inicial al abrir el modal;
    // se difiere un tick para no perder contra eso.
    if (this.autofocarKm) {
      setTimeout(() => this.kmInputRef?.nativeElement.focus());
    }
  }

  onKmEnter(): void {
    this.kmEnter.emit();
  }

  /** Los checkboxes nativos togglean con Space pero no con Enter (estándar del
   *  browser) — se agrega soporte explícito para completar el flujo 100% por
   *  teclado (Tab desde km → Enter acá, sin pasar por mouse). */
  onAcompanianteEnter(): void {
    const ctrl = this.form.get('acompaniante');
    if (!ctrl || ctrl.disabled) return;
    ctrl.setValue(!ctrl.value);
    this.onAcompanianteToggle();
  }

  /** Fuente de verdad = estado enable/disable del FormGroup, no [disabled]
   *  sueltos en el HTML (ver diagnóstico, punto 4, del bug de Multiplicador
   *  Chofer del componente viejo). */
  private aplicarGating(): void {
    const setEnabled = (nombre: string, habilitado: boolean) => {
      const ctrl = this.form.get(nombre);
      if (!ctrl) return;
      habilitado ? ctrl.enable({ emitEvent: false }) : ctrl.disable({ emitEvent: false });
    };

    setEnabled('acompaniante', this.puedeEditarDetalleCompleto);
    setEnabled('acompanianteCant', this.puedeEditarDetalleCompleto && !!this.form.get('acompaniante')?.value);
    setEnabled('hojaRuta', this.puedeEditarDetalleCompleto);
    setEnabled('observaciones', this.puedeEditarDetalleCompleto);
    setEnabled('km', this.puedeEditarKmYMultiplicadores);
    setEnabled('documentacion', this.puedeEditarDocumentacion);

    // adExtraConcepto no es parte de this.form (control raíz del shell, ver
    // @Input arriba) — se gatea aparte, directo sobre el FormControl.
    if (this.adExtraConcepto) {
      this.puedeEditarAdExtraConcepto
        ? this.adExtraConcepto.enable({ emitEvent: false })
        : this.adExtraConcepto.disable({ emitEvent: false });
    }
  }

  /** Mismo patrón que operaciones-editor.configurarAcompaniante, adaptado a
   *  reactive forms: activar el checkbox precarga cantidad en 1.
   *  SIN emitEvent:false acá — este control vive en el mismo FormGroup raíz
   *  que el shell escucha para recalcular (form.valueChanges); si se suprime
   *  la emisión, el total queda calculado con la cantidad vieja hasta la
   *  próxima edición manual (bug reportado). */
  onAcompanianteToggle(): void {
    const activo = !!this.form.get('acompaniante')?.value;
    this.form.get('acompanianteCant')?.setValue(activo ? 1 : 0);
    this.aplicarGating();
  }

  /** Mismo patrón que operaciones-editor.configurarCantAcompaniante: cantidad
   *  en 0 desactiva el checkbox, cantidad > 0 lo activa. Misma razón que
   *  arriba para no suprimir la emisión. */
  onAcompanianteCantChange(): void {
    const cant = this.form.get('acompanianteCant')?.value ?? 0;
    if (cant === 0) this.form.get('acompaniante')?.setValue(false);
    if (cant > 0) this.form.get('acompaniante')?.setValue(true);
    this.aplicarGating();
  }
}

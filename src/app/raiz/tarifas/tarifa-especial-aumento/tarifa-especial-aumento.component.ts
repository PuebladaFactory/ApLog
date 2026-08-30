import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import { ConIdType } from 'src/app/interfaces/conId';
import { MetadataAumento, Seccion } from 'src/app/interfaces/tarifa';
import { CategoriaEspecial, TarifaEspecial } from 'src/app/interfaces/tarifa-especial';
import { TarifaEspecialFormData } from 'src/app/servicios/tarifario/tarifa-especial-factory.service';
import { UsuarioSesionService } from 'src/app/servicios/usuario-sesion/usuario-sesion.service';

type ModoAumento = 'unico' | 'manual';
type TipoRedondeo = 'unidad' | 'decena' | 'centena';

@Component({
  selector: 'app-tarifa-especial-aumento',
  templateUrl: './tarifa-especial-aumento.component.html',
  styleUrls: ['./tarifa-especial-aumento.component.scss'],
  standalone: false,
})
export class TarifaEspecialAumentoComponent implements OnInit {
  @Input() tarifa!: ConIdType<TarifaEspecial>;
  @Input() cargando = false;
  @Output() guardar = new EventEmitter<TarifaEspecialFormData>();
  @Output() cancelar = new EventEmitter<void>();

  form!: FormGroup;
  modo: ModoAumento = 'unico';
  usarRedondeo = true;
  tipoRedondeo: TipoRedondeo = 'unidad';
  puedeEditar = false;

  constructor(
    private fb: FormBuilder,
    private usuarioSesion: UsuarioSesionService,
  ) {}

  ngOnInit(): void {
    const usuario = this.usuarioSesion.getUsuarioActual();
    this.puedeEditar = !!usuario && ['dev', 'admin'].includes(usuario.role);
    this.construirForm();
  }

  get kmActivo(): boolean {
    return this.tarifa.kmDistancia !== null;
  }

  onChangeUsarRedondeo(e: any): void {
    this.usarRedondeo = e.target.checked;
  }

  onChangeTipoRedondeo(e: any): void {
    this.tipoRedondeo = e.target.value;
  }

  get seccionesArray(): FormArray {
    return this.form.get('secciones') as FormArray;
  }

  categoriasDe(si: number): FormArray {
    return this.seccionesArray.at(si).get('categorias') as FormArray;
  }

  invalido(ctrl: AbstractControl | null): boolean {
    return !!ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }

  private construirForm(): void {
    this.form = this.fb.group({
      porcentajeUnico: [0, [Validators.min(0)]],
      secciones: this.fb.array(this.tarifa.secciones.map(s => this.crearGrupoSeccion(s))),
      nuevoAdicionalAcompaniante: [{ value: this.tarifa.adicionalAcompaniante, disabled: true }, [Validators.min(0)]],
    });
    this.aplicarEstadoModo();
  }

  private crearGrupoSeccion(seccion: Seccion<CategoriaEspecial>): FormGroup {
    return this.fb.group({
      categorias: this.fb.array(seccion.categorias.map(c => this.crearFilaCategoria(c))),
    });
  }

  private crearFilaCategoria(cat: CategoriaEspecial): FormGroup {
    return this.fb.group({
      nuevoValor: [{ value: cat.valor, disabled: true }, [Validators.min(0)]],
      nuevoAdicionalKm: this.fb.group({
        primerSector: [{ value: cat.adicionalKm?.primerSector ?? 0, disabled: true }, [Validators.min(0)]],
        sectoresSiguientes: [{ value: cat.adicionalKm?.sectoresSiguientes ?? 0, disabled: true }, [Validators.min(0)]],
      }),
    });
  }

  cambiarModo(modo: ModoAumento): void {
    this.modo = modo;
    this.aplicarEstadoModo();
  }

  private aplicarEstadoModo(): void {
    const editable = this.modo === 'manual';
    this.forEachControlNuevo(ctrl => this.setDisabled(ctrl, editable));
  }

  private forEachControlNuevo(fn: (ctrl: AbstractControl) => void): void {
    fn(this.form.get('nuevoAdicionalAcompaniante')!);
    this.seccionesArray.controls.forEach((_, si) => {
      this.categoriasDe(si).controls.forEach(catCtrl => {
        fn(catCtrl.get('nuevoValor')!);
        if (this.kmActivo) {
          fn(catCtrl.get('nuevoAdicionalKm.primerSector')!);
          fn(catCtrl.get('nuevoAdicionalKm.sectoresSiguientes')!);
        }
      });
    });
  }

  private setDisabled(ctrl: AbstractControl, activo: boolean): void {
    activo ? ctrl.enable({ emitEvent: false }) : ctrl.disable({ emitEvent: false });
  }

  aplicarAumento(): void {
    if (this.modo === 'manual') return;
    const raw = this.form.getRawValue();
    const factor = 1 + raw.porcentajeUnico / 100;

    this.form.get('nuevoAdicionalAcompaniante')!.setValue(this.calcularValor(this.tarifa.adicionalAcompaniante, factor));

    this.tarifa.secciones.forEach((seccion, si) => {
      seccion.categorias.forEach((cat, ci) => {
        const catCtrl = this.categoriasDe(si).at(ci);
        catCtrl.get('nuevoValor')!.setValue(this.calcularValor(cat.valor, factor));
        if (this.kmActivo) {
          catCtrl.get('nuevoAdicionalKm.primerSector')!.setValue(this.calcularValor(cat.adicionalKm?.primerSector ?? 0, factor));
          catCtrl.get('nuevoAdicionalKm.sectoresSiguientes')!.setValue(this.calcularValor(cat.adicionalKm?.sectoresSiguientes ?? 0, factor));
        }
      });
    });
  }

  private calcularValor(valor: number, factor: number): number {
    const resultado = valor * factor;
    if (!this.usarRedondeo) return Math.round(resultado);
    switch (this.tipoRedondeo) {
      case 'decena': return Math.round(resultado / 10) * 10;
      case 'centena': return Math.round(resultado / 100) * 100;
      default: return Math.round(resultado);
    }
  }

  resetearValores(): void {
    this.construirForm();
  }

  calcularImpactoCategoria(si: number, ci: number): number {
    const cat = this.tarifa.secciones[si].categorias[ci];
    const f = this.categoriasDe(si).at(ci).getRawValue();
    const actual = cat.valor + (this.kmActivo ? (cat.adicionalKm?.primerSector ?? 0) + (cat.adicionalKm?.sectoresSiguientes ?? 0) : 0);
    const nuevo = f.nuevoValor + (this.kmActivo ? f.nuevoAdicionalKm.primerSector + f.nuevoAdicionalKm.sectoresSiguientes : 0);
    return actual ? ((nuevo - actual) / actual) * 100 : 0;
  }

  calcularImpactoTotal(): number {
    let actual = 0, nuevo = 0;
    this.tarifa.secciones.forEach((seccion, si) => {
      seccion.categorias.forEach((cat, ci) => {
        const f = this.categoriasDe(si).at(ci).getRawValue();
        actual += cat.valor + (this.kmActivo ? (cat.adicionalKm?.primerSector ?? 0) + (cat.adicionalKm?.sectoresSiguientes ?? 0) : 0);
        nuevo += f.nuevoValor + (this.kmActivo ? f.nuevoAdicionalKm.primerSector + f.nuevoAdicionalKm.sectoresSiguientes : 0);
      });
    });
    actual += this.tarifa.adicionalAcompaniante;
    nuevo += this.form.getRawValue().nuevoAdicionalAcompaniante;
    return actual ? ((nuevo - actual) / actual) * 100 : 0;
  }

  hayCambios(): boolean {
    const raw = this.form.getRawValue();
    if (raw.nuevoAdicionalAcompaniante !== this.tarifa.adicionalAcompaniante) return true;
    return this.tarifa.secciones.some((seccion, si) =>
      seccion.categorias.some((cat, ci) => {
        const f = raw.secciones[si].categorias[ci];
        if (f.nuevoValor !== cat.valor) return true;
        if (this.kmActivo) {
          if (f.nuevoAdicionalKm.primerSector !== (cat.adicionalKm?.primerSector ?? 0)) return true;
          if (f.nuevoAdicionalKm.sectoresSiguientes !== (cat.adicionalKm?.sectoresSiguientes ?? 0)) return true;
        }
        return false;
      })
    );
  }

  async onSubmit(): Promise<void> {
    if (!this.puedeEditar || !this.hayCambios()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const respuesta = await Swal.fire({
      title: '¿Aplicar el aumento?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar',
    });
    if (!respuesta.isConfirmed) return;

    const raw = this.form.getRawValue();

    const secciones: Seccion<CategoriaEspecial>[] = this.tarifa.secciones.map((seccion, si) => ({
      orden: seccion.orden,
      nombre: seccion.nombre,
      categorias: seccion.categorias.map((cat, ci) => {
        const f = raw.secciones[si].categorias[ci];
        return {
          orden: cat.orden,
          nombre: cat.nombre,
          valor: f.nuevoValor,
          ...(this.kmActivo ? {
            adicionalKm: { primerSector: f.nuevoAdicionalKm.primerSector, sectoresSiguientes: f.nuevoAdicionalKm.sectoresSiguientes },
          } : {}),
        };
      }),
    }));

    // metadataAumento: mismo criterio que TarifaAumentoComponent — acá no
    // existe modo 'segmentado' (la categoría especial tiene un solo valor,
    // no cobrar/pagar separados), así que solo hay 'unico'/'manual'.
    const metadataAumento: MetadataAumento = {
      modo: this.modo,
      ...(this.modo === 'unico' ? { porcentajeUnico: raw.porcentajeUnico } : {}),
      redondeo: this.modo !== 'manual' && this.usarRedondeo ? this.tipoRedondeo : null,
    };

    const formData: TarifaEspecialFormData = {
      entidadTipo: this.tarifa.entidadTipo,
      idEntidadDueño: this.tarifa.idEntidadDueño,
      alcance: this.tarifa.alcance,
      nombre: this.tarifa.nombre,
      modoTarifacion: this.tarifa.modoTarifacion,
      kmDistancia: this.tarifa.kmDistancia,
      secciones,
      adicionalAcompaniante: raw.nuevoAdicionalAcompaniante,
      metadataAumento,
    };

    // editor emite / padre persiste — el padre llama a
    // TarifaGuardadoService.guardarTarifaEspecial(formData, this.tarifa)
    // (nuevaVersion() ya fuerza entidadTipo/idEntidadDueño/alcance desde la
    // tarifa anterior, mismo criterio que TarifaAumentoComponent).
    this.guardar.emit(formData);
  }

  onCancelar(): void {
    this.cancelar.emit();
  }
}

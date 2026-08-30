import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import { ConIdType } from 'src/app/interfaces/conId';
import { CategoriaTarifa, MetadataAumento, Seccion, Tarifa } from 'src/app/interfaces/tarifa';
import { TarifaFormData } from 'src/app/servicios/tarifario/tarifa-factory.service';
import { UsuarioSesionService } from 'src/app/servicios/usuario-sesion/usuario-sesion.service';

type ModoAumento = 'unico' | 'segmentado' | 'manual';
type TipoRedondeo = 'unidad' | 'decena' | 'centena';

@Component({
  selector: 'app-tarifa-aumento',
  templateUrl: './tarifa-aumento.component.html',
  styleUrls: ['./tarifa-aumento.component.scss'],
  standalone: false,
})
export class TarifaAumentoComponent implements OnInit {
  @Input() tarifa!: ConIdType<Tarifa>;
  @Input() cargando = false;
  @Output() guardar = new EventEmitter<TarifaFormData>();
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

  get usaProveedor(): boolean {
    return this.tarifa.usaValoresProveedor;
  }

  /** Columnas por grupo (cobrar/pagar/proveedor): Base actual+nueva, y si
   *  kmActivo también 1er sector y Intervalo actual+nueva — el doble que en
   *  tarifa-viewer/tarifa-form porque acá cada valor tiene su par actual/nuevo. */
  get colspanGrupo(): number {
    return this.kmActivo ? 6 : 2;
  }

  /** (change) crudo, mismo criterio que seleccionarCliente() en
   *  tarifas-personalizada — evita sumar FormsModule solo para estos dos
   *  campos sueltos (no son parte del FormGroup reactivo). */
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
      porcentajeCobrar: [0, [Validators.min(0)]],
      porcentajePagar: [0, [Validators.min(0)]],
      porcentajeProveedor: [0, [Validators.min(0)]],
      secciones: this.fb.array(this.tarifa.secciones.map(s => this.crearGrupoSeccion(s))),
      nuevoAcompanianteACobrar: [{ value: this.tarifa.acompanianteACobrar, disabled: true }, [Validators.min(0)]],
      nuevoAcompanianteAPagar: [{ value: this.tarifa.acompanianteAPagar, disabled: true }, [Validators.min(0)]],
      nuevoAcompanianteAPagarProveedor: [{ value: this.tarifa.acompanianteAPagarProveedor ?? 0, disabled: true }, [Validators.min(0)]],
    });
    this.aplicarEstadoModo();
  }

  private crearGrupoSeccion(seccion: Seccion<CategoriaTarifa>): FormGroup {
    return this.fb.group({
      categorias: this.fb.array(seccion.categorias.map(c => this.crearFilaCategoria(c))),
    });
  }

  private crearFilaCategoria(cat: CategoriaTarifa): FormGroup {
    return this.fb.group({
      nuevoACobrar: [{ value: cat.aCobrar, disabled: true }, [Validators.min(0)]],
      nuevoAPagar: [{ value: cat.aPagar, disabled: true }, [Validators.min(0)]],
      nuevoAPagarProveedor: [{ value: cat.aPagarProveedor ?? 0, disabled: true }, [Validators.min(0)]],
      nuevoAdicionalCobrar: this.fb.group({
        primerSector: [{ value: cat.adicionalKmACobrar?.primerSector ?? 0, disabled: true }, [Validators.min(0)]],
        sectoresSiguientes: [{ value: cat.adicionalKmACobrar?.sectoresSiguientes ?? 0, disabled: true }, [Validators.min(0)]],
      }),
      nuevoAdicionalPagar: this.fb.group({
        primerSector: [{ value: cat.adicionalKmAPagar?.primerSector ?? 0, disabled: true }, [Validators.min(0)]],
        sectoresSiguientes: [{ value: cat.adicionalKmAPagar?.sectoresSiguientes ?? 0, disabled: true }, [Validators.min(0)]],
      }),
      nuevoAdicionalPagarProveedor: this.fb.group({
        primerSector: [{ value: cat.adicionalKmAPagarProveedor?.primerSector ?? 0, disabled: true }, [Validators.min(0)]],
        sectoresSiguientes: [{ value: cat.adicionalKmAPagarProveedor?.sectoresSiguientes ?? 0, disabled: true }, [Validators.min(0)]],
      }),
    });
  }

  /* ── Modo (único / segmentado / manual) ──────────────────────── */

  cambiarModo(modo: ModoAumento): void {
    this.modo = modo;
    this.aplicarEstadoModo();
  }

  private aplicarEstadoModo(): void {
    const editable = this.modo === 'manual';
    this.forEachControlNuevo(ctrl => this.setDisabled(ctrl, editable));
  }

  private forEachControlNuevo(fn: (ctrl: AbstractControl) => void): void {
    fn(this.form.get('nuevoAcompanianteACobrar')!);
    fn(this.form.get('nuevoAcompanianteAPagar')!);
    if (this.usaProveedor) fn(this.form.get('nuevoAcompanianteAPagarProveedor')!);

    this.seccionesArray.controls.forEach((_, si) => {
      this.categoriasDe(si).controls.forEach(catCtrl => {
        fn(catCtrl.get('nuevoACobrar')!);
        fn(catCtrl.get('nuevoAPagar')!);
        if (this.usaProveedor) fn(catCtrl.get('nuevoAPagarProveedor')!);
        if (this.kmActivo) {
          fn(catCtrl.get('nuevoAdicionalCobrar.primerSector')!);
          fn(catCtrl.get('nuevoAdicionalCobrar.sectoresSiguientes')!);
          fn(catCtrl.get('nuevoAdicionalPagar.primerSector')!);
          fn(catCtrl.get('nuevoAdicionalPagar.sectoresSiguientes')!);
          if (this.usaProveedor) {
            fn(catCtrl.get('nuevoAdicionalPagarProveedor.primerSector')!);
            fn(catCtrl.get('nuevoAdicionalPagarProveedor.sectoresSiguientes')!);
          }
        }
      });
    });
  }

  private setDisabled(ctrl: AbstractControl, activo: boolean): void {
    activo ? ctrl.enable({ emitEvent: false }) : ctrl.disable({ emitEvent: false });
  }

  /* ── Aplicar aumento (modo único/segmentado — en manual no hace nada) ── */

  aplicarAumento(): void {
    if (this.modo === 'manual') return;
    const raw = this.form.getRawValue();
    const pctCobrar = this.modo === 'unico' ? raw.porcentajeUnico : raw.porcentajeCobrar;
    const pctPagar = this.modo === 'unico' ? raw.porcentajeUnico : raw.porcentajePagar;
    const pctProveedor = this.modo === 'unico' ? raw.porcentajeUnico : raw.porcentajeProveedor;

    const factorCobrar = 1 + pctCobrar / 100;
    const factorPagar = 1 + pctPagar / 100;
    const factorProveedor = 1 + pctProveedor / 100;

    this.form.get('nuevoAcompanianteACobrar')!.setValue(this.calcularValor(this.tarifa.acompanianteACobrar, factorCobrar));
    this.form.get('nuevoAcompanianteAPagar')!.setValue(this.calcularValor(this.tarifa.acompanianteAPagar, factorPagar));
    if (this.usaProveedor) {
      this.form.get('nuevoAcompanianteAPagarProveedor')!.setValue(this.calcularValor(this.tarifa.acompanianteAPagarProveedor ?? 0, factorProveedor));
    }

    this.tarifa.secciones.forEach((seccion, si) => {
      seccion.categorias.forEach((cat, ci) => {
        const catCtrl = this.categoriasDe(si).at(ci);
        catCtrl.get('nuevoACobrar')!.setValue(this.calcularValor(cat.aCobrar, factorCobrar));
        catCtrl.get('nuevoAPagar')!.setValue(this.calcularValor(cat.aPagar, factorPagar));
        if (this.usaProveedor) {
          catCtrl.get('nuevoAPagarProveedor')!.setValue(this.calcularValor(cat.aPagarProveedor ?? 0, factorProveedor));
        }
        if (this.kmActivo) {
          catCtrl.get('nuevoAdicionalCobrar.primerSector')!.setValue(this.calcularValor(cat.adicionalKmACobrar?.primerSector ?? 0, factorCobrar));
          catCtrl.get('nuevoAdicionalCobrar.sectoresSiguientes')!.setValue(this.calcularValor(cat.adicionalKmACobrar?.sectoresSiguientes ?? 0, factorCobrar));
          catCtrl.get('nuevoAdicionalPagar.primerSector')!.setValue(this.calcularValor(cat.adicionalKmAPagar?.primerSector ?? 0, factorPagar));
          catCtrl.get('nuevoAdicionalPagar.sectoresSiguientes')!.setValue(this.calcularValor(cat.adicionalKmAPagar?.sectoresSiguientes ?? 0, factorPagar));
          if (this.usaProveedor) {
            catCtrl.get('nuevoAdicionalPagarProveedor.primerSector')!.setValue(this.calcularValor(cat.adicionalKmAPagarProveedor?.primerSector ?? 0, factorProveedor));
            catCtrl.get('nuevoAdicionalPagarProveedor.sectoresSiguientes')!.setValue(this.calcularValor(cat.adicionalKmAPagarProveedor?.sectoresSiguientes ?? 0, factorProveedor));
          }
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

  /* ── Resumen e impacto (para la tabla y el resumen final) ────── */

  calcularDelta(actual: number, nuevo: number): { monto: number; porcentaje: number } {
    const monto = nuevo - actual;
    const porcentaje = actual ? (monto / actual) * 100 : 0;
    return { monto, porcentaje };
  }

  private totalCategoriaActual(si: number, ci: number): number {
    const cat = this.tarifa.secciones[si].categorias[ci];
    let total = cat.aCobrar + cat.aPagar + (this.usaProveedor ? (cat.aPagarProveedor ?? 0) : 0);
    if (this.kmActivo) {
      total += (cat.adicionalKmACobrar?.primerSector ?? 0) + (cat.adicionalKmACobrar?.sectoresSiguientes ?? 0);
      total += (cat.adicionalKmAPagar?.primerSector ?? 0) + (cat.adicionalKmAPagar?.sectoresSiguientes ?? 0);
      if (this.usaProveedor) {
        total += (cat.adicionalKmAPagarProveedor?.primerSector ?? 0) + (cat.adicionalKmAPagarProveedor?.sectoresSiguientes ?? 0);
      }
    }
    return total;
  }

  private totalCategoriaNueva(si: number, ci: number): number {
    const f = this.categoriasDe(si).at(ci).getRawValue();
    let total = f.nuevoACobrar + f.nuevoAPagar + (this.usaProveedor ? f.nuevoAPagarProveedor : 0);
    if (this.kmActivo) {
      total += f.nuevoAdicionalCobrar.primerSector + f.nuevoAdicionalCobrar.sectoresSiguientes;
      total += f.nuevoAdicionalPagar.primerSector + f.nuevoAdicionalPagar.sectoresSiguientes;
      if (this.usaProveedor) {
        total += f.nuevoAdicionalPagarProveedor.primerSector + f.nuevoAdicionalPagarProveedor.sectoresSiguientes;
      }
    }
    return total;
  }

  calcularImpactoCategoria(si: number, ci: number): number {
    const actual = this.totalCategoriaActual(si, ci);
    const nuevo = this.totalCategoriaNueva(si, ci);
    return actual ? ((nuevo - actual) / actual) * 100 : 0;
  }

  calcularImpactoSeccion(si: number): number {
    const cats = this.tarifa.secciones[si].categorias;
    let actual = 0, nuevo = 0;
    cats.forEach((_, ci) => {
      actual += this.totalCategoriaActual(si, ci);
      nuevo += this.totalCategoriaNueva(si, ci);
    });
    return actual ? ((nuevo - actual) / actual) * 100 : 0;
  }

  calcularImpactoTotal(): number {
    let actual = 0, nuevo = 0;
    this.tarifa.secciones.forEach((seccion, si) => {
      seccion.categorias.forEach((_, ci) => {
        actual += this.totalCategoriaActual(si, ci);
        nuevo += this.totalCategoriaNueva(si, ci);
      });
    });
    actual += this.tarifa.acompanianteACobrar + this.tarifa.acompanianteAPagar + (this.usaProveedor ? (this.tarifa.acompanianteAPagarProveedor ?? 0) : 0);
    const raw = this.form.getRawValue();
    nuevo += raw.nuevoAcompanianteACobrar + raw.nuevoAcompanianteAPagar + (this.usaProveedor ? raw.nuevoAcompanianteAPagarProveedor : 0);
    return actual ? ((nuevo - actual) / actual) * 100 : 0;
  }

  hayCambios(): boolean {
    const raw = this.form.getRawValue();
    if (raw.nuevoAcompanianteACobrar !== this.tarifa.acompanianteACobrar) return true;
    if (raw.nuevoAcompanianteAPagar !== this.tarifa.acompanianteAPagar) return true;
    if (this.usaProveedor && raw.nuevoAcompanianteAPagarProveedor !== (this.tarifa.acompanianteAPagarProveedor ?? 0)) return true;

    return this.tarifa.secciones.some((seccion, si) =>
      seccion.categorias.some((cat, ci) => {
        const f = raw.secciones[si].categorias[ci];
        if (f.nuevoACobrar !== cat.aCobrar) return true;
        if (f.nuevoAPagar !== cat.aPagar) return true;
        if (this.usaProveedor && f.nuevoAPagarProveedor !== (cat.aPagarProveedor ?? 0)) return true;
        if (this.kmActivo) {
          if (f.nuevoAdicionalCobrar.primerSector !== (cat.adicionalKmACobrar?.primerSector ?? 0)) return true;
          if (f.nuevoAdicionalCobrar.sectoresSiguientes !== (cat.adicionalKmACobrar?.sectoresSiguientes ?? 0)) return true;
          if (f.nuevoAdicionalPagar.primerSector !== (cat.adicionalKmAPagar?.primerSector ?? 0)) return true;
          if (f.nuevoAdicionalPagar.sectoresSiguientes !== (cat.adicionalKmAPagar?.sectoresSiguientes ?? 0)) return true;
          if (this.usaProveedor) {
            if (f.nuevoAdicionalPagarProveedor.primerSector !== (cat.adicionalKmAPagarProveedor?.primerSector ?? 0)) return true;
            if (f.nuevoAdicionalPagarProveedor.sectoresSiguientes !== (cat.adicionalKmAPagarProveedor?.sectoresSiguientes ?? 0)) return true;
          }
        }
        return false;
      })
    );
  }

  /* ── Guardar ──────────────────────────────────────────────────── */

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

    const secciones: Seccion<CategoriaTarifa>[] = this.tarifa.secciones.map((seccion, si) => ({
      orden: seccion.orden,
      nombre: seccion.nombre,
      categorias: seccion.categorias.map((cat, ci) => {
        const f = raw.secciones[si].categorias[ci];
        return {
          orden: cat.orden,
          nombre: cat.nombre,
          aCobrar: f.nuevoACobrar,
          aPagar: f.nuevoAPagar,
          ...(this.usaProveedor ? { aPagarProveedor: f.nuevoAPagarProveedor } : {}),
          ...(this.kmActivo ? {
            adicionalKmACobrar: { primerSector: f.nuevoAdicionalCobrar.primerSector, sectoresSiguientes: f.nuevoAdicionalCobrar.sectoresSiguientes },
            adicionalKmAPagar: { primerSector: f.nuevoAdicionalPagar.primerSector, sectoresSiguientes: f.nuevoAdicionalPagar.sectoresSiguientes },
            ...(this.usaProveedor ? {
              adicionalKmAPagarProveedor: { primerSector: f.nuevoAdicionalPagarProveedor.primerSector, sectoresSiguientes: f.nuevoAdicionalPagarProveedor.sectoresSiguientes },
            } : {}),
          } : {}),
        };
      }),
    }));

    // metadataAumento: 'segmentado' solo completa cobrar/pagar/proveedor,
    // 'unico' solo porcentajeUnico — así el historial no muestra un
    // porcentaje que no se llegó a aplicar. En modo manual el redondeo queda
    // en null porque calcularValor() ni se ejecuta (los valores los tipeó
    // el usuario a mano, no hay factor/redondeo real de por medio).
    const metadataAumento: MetadataAumento = {
      modo: this.modo,
      ...(this.modo === 'unico' ? { porcentajeUnico: raw.porcentajeUnico } : {}),
      ...(this.modo === 'segmentado' ? {
        porcentajeCobrar: raw.porcentajeCobrar,
        porcentajePagar: raw.porcentajePagar,
        ...(this.usaProveedor ? { porcentajeProveedor: raw.porcentajeProveedor } : {}),
      } : {}),
      redondeo: this.modo !== 'manual' && this.usarRedondeo ? this.tipoRedondeo : null,
    };

    const formData: TarifaFormData = {
      nivel: this.tarifa.nivel,
      idEntidadDueño: this.tarifa.idEntidadDueño,
      nombre: this.tarifa.nombre,
      modoTarifacion: this.tarifa.modoTarifacion,
      kmDistancia: this.tarifa.kmDistancia,
      secciones,
      acompanianteACobrar: raw.nuevoAcompanianteACobrar,
      acompanianteAPagar: raw.nuevoAcompanianteAPagar,
      ...(this.usaProveedor ? { acompanianteAPagarProveedor: raw.nuevoAcompanianteAPagarProveedor } : {}),
      usaValoresProveedor: this.usaProveedor,
      metadataAumento,
    };

    // editor emite / padre persiste — el padre llama a
    // TarifaGuardadoService.guardarTarifa(formData, this.tarifa) para
    // versionar (nuevaVersion() ya fuerza nivel/idEntidadDueño/modoTarifacion
    // desde la tarifa anterior, así que los 3 campos de arriba quedan
    // pisados igual, pero van completos por tipo).
    this.guardar.emit(formData);
  }

  onCancelar(): void {
    this.cancelar.emit();
  }
}

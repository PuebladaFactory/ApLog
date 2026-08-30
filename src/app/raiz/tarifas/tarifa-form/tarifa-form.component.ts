import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import { ConIdType } from 'src/app/interfaces/conId';
import { CategoriaTarifa, ModoTarifacion, Seccion, Tarifa } from 'src/app/interfaces/tarifa';
import { TarifaFormData } from 'src/app/servicios/tarifario/tarifa-factory.service';
import { UsuarioSesionService } from 'src/app/servicios/usuario-sesion/usuario-sesion.service';

@Component({
  selector: 'app-tarifa-form',
  templateUrl: './tarifa-form.component.html',
  styleUrls: ['./tarifa-form.component.scss'],
  standalone: false,
})
export class TarifaFormComponent implements OnInit {
  @Input() nivel!: 'general' | 'personalizada';
  @Input() idEntidadDueño: string | null = null;
  @Input() tarifa?: ConIdType<Tarifa>;
  @Input() tarifaPlantilla?: ConIdType<Tarifa>;
  @Input() cargando = false;
  @Output() guardar = new EventEmitter<TarifaFormData>();
  @Output() cancelar = new EventEmitter<void>();

  eligiendoModo = false;
  modoTarifacion: ModoTarifacion | null = null;
  puedeEditar = false;
  form!: FormGroup;

  /** Snapshot (JSON) del form tomado al construirlo — hayCambios() lo compara
   *  contra el estado actual para avisar antes de salir sin guardar. */
  private formOriginal = '';

  constructor(
    private fb: FormBuilder,
    private usuarioSesion: UsuarioSesionService,
  ) {}

  ngOnInit(): void {
    const usuario = this.usuarioSesion.getUsuarioActual();
    this.puedeEditar = !!usuario && ['dev', 'admin'].includes(usuario.role);

    if (this.tarifaPlantilla) {
      // Duplicar: prellena con los valores de otra tarifa, pero apunta a
      // otra entidad dueña (idEntidadDueño llega por @Input aparte) y va a
      // persistirse como crearTarifa() más abajo en onSubmit (this.tarifa
      // queda undefined en este modo, así que ya cae en esa rama sin más
      // cambios). modoTarifacion queda fijo en el de la plantilla — Duplicar
      // es "copiar el formato de otra entidad", no elegir uno nuevo.
      this.modoTarifacion = this.tarifaPlantilla.modoTarifacion;
      this.construirForm(this.tarifaPlantilla);
    } else if (this.nivel === 'general') {
      this.modoTarifacion = 'categoria';
      this.construirForm(this.tarifa);
    } else if (this.tarifa) {
      this.modoTarifacion = this.tarifa.modoTarifacion;
      this.construirForm(this.tarifa);
    } else {
      this.eligiendoModo = true;
    }
  }

  get seccionesArray(): FormArray {
    return this.form.get('secciones') as FormArray;
  }

  categoriasDe(si: number): FormArray {
    return this.seccionesArray.at(si).get('categorias') as FormArray;
  }

  /** kmDistancia efectivamente activo — gobierna columnas de adicional por km,
   *  card de "Configuración de distancia" y el estado enabled/disabled de esos
   *  controles. General: siempre true. Personalizada-km: siempre false.
   *  Personalizada-categoria: según el checkbox usaAdicionalKm. */
  get kmActivo(): boolean {
    if (this.nivel === 'general') return true;
    if (this.modoTarifacion === 'km') return false;
    return !!this.form?.get('usaAdicionalKm')?.value;
  }

  get colspanGrupo(): number {
    return this.kmActivo ? 3 : 1;
  }

  get mostrarToggleAdicionalKm(): boolean {
    return this.nivel === 'personalizada' && this.modoTarifacion === 'categoria';
  }

  get permiteMultiplesSecciones(): boolean {
    return this.nivel === 'personalizada' && this.modoTarifacion === 'categoria';
  }

  elegirModo(modo: ModoTarifacion): void {
    this.modoTarifacion = modo;
    this.eligiendoModo = false;
    this.construirForm();
  }

  private construirForm(base?: ConIdType<Tarifa>): void {
    const usaProveedor = base?.usaValoresProveedor ?? false;
    const usaAdicionalKmInicial = !!base?.kmDistancia;
    const necesitaControlesKm = this.nivel === 'general' || this.modoTarifacion === 'categoria';
    const kmActivoInicial = this.nivel === 'general'
      ? true
      : (this.modoTarifacion === 'km' ? false : usaAdicionalKmInicial);

    const seccionesBase: (Seccion<CategoriaTarifa> | undefined)[] =
      base?.secciones?.length ? base.secciones : [undefined];

    this.form = this.fb.group({
      ...(this.nivel === 'personalizada' ? { nombre: [base?.nombre ?? '', Validators.required] } : {}),
      ...(this.mostrarToggleAdicionalKm ? { usaAdicionalKm: [usaAdicionalKmInicial] } : {}),
      usaValoresProveedor: [usaProveedor],
      ...(necesitaControlesKm ? {
        kmPrimerSector: [{ value: base?.kmDistancia?.primerSector ?? 0, disabled: !kmActivoInicial }, [Validators.required, Validators.min(0)]],
        kmSectoresSiguientes: [{ value: base?.kmDistancia?.sectoresSiguientes ?? 0, disabled: !kmActivoInicial }, [Validators.required, Validators.min(0)]],
      } : {}),
      secciones: this.fb.array(seccionesBase.map(s => this.crearGrupoSeccion(s, usaProveedor))),
      acompanianteACobrar: [base?.acompanianteACobrar ?? 0, [Validators.required, Validators.min(0)]],
      acompanianteAPagar: [base?.acompanianteAPagar ?? 0, [Validators.required, Validators.min(0)]],
      acompanianteAPagarProveedor: [{ value: base?.acompanianteAPagarProveedor ?? 0, disabled: !usaProveedor }, [Validators.min(0)]],
    });

    this.aplicarEstadoAdicionalKm(kmActivoInicial);
    this.formOriginal = JSON.stringify(this.form.value);
  }

  private crearGrupoSeccion(seccion: Seccion<CategoriaTarifa> | undefined, usaProveedor: boolean): FormGroup {
    const cats: (CategoriaTarifa | undefined)[] = seccion?.categorias?.length ? seccion.categorias : [undefined];
    return this.fb.group({
      nombre: [seccion?.nombre ?? null],
      categorias: this.fb.array(cats.map(c => this.crearFilaCategoria(c, usaProveedor))),
    });
  }

  private crearFilaCategoria(cat?: CategoriaTarifa, usaProveedor = false): FormGroup {
    return this.fb.group({
      nombre: [cat?.nombre ?? '', Validators.required],
      aCobrar: [cat?.aCobrar ?? 0, [Validators.required, Validators.min(0)]],
      aPagar: [cat?.aPagar ?? 0, [Validators.required, Validators.min(0)]],
      aPagarProveedor: [{ value: cat?.aPagarProveedor ?? 0, disabled: !usaProveedor }, [Validators.min(0)]],
      adicionalCobrar: this.fb.group({
        primerSector: [cat?.adicionalKmACobrar?.primerSector ?? 0, [Validators.required, Validators.min(0)]],
        sectoresSiguientes: [cat?.adicionalKmACobrar?.sectoresSiguientes ?? 0, [Validators.required, Validators.min(0)]],
      }),
      adicionalPagar: this.fb.group({
        primerSector: [cat?.adicionalKmAPagar?.primerSector ?? 0, [Validators.required, Validators.min(0)]],
        sectoresSiguientes: [cat?.adicionalKmAPagar?.sectoresSiguientes ?? 0, [Validators.required, Validators.min(0)]],
      }),
      adicionalPagarProveedor: this.fb.group({
        primerSector: [{ value: cat?.adicionalKmAPagarProveedor?.primerSector ?? 0, disabled: !usaProveedor }, [Validators.min(0)]],
        sectoresSiguientes: [{ value: cat?.adicionalKmAPagarProveedor?.sectoresSiguientes ?? 0, disabled: !usaProveedor }, [Validators.min(0)]],
      }),
    });
  }

  agregarSeccion(): void {
    const usaProveedor = this.form.get('usaValoresProveedor')!.value;
    this.seccionesArray.push(this.crearGrupoSeccion(undefined, usaProveedor));
    this.aplicarEstadoAdicionalKm(this.kmActivo);
  }

  async quitarSeccion(si: number): Promise<void> {
    if (this.seccionesArray.length <= 1) return;
    const respuesta = await Swal.fire({
      title: '¿Quitar la sección?',
      text: 'Se va a perder toda la información cargada en esta sección y sus categorías. No se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Quitar',
      cancelButtonText: 'Cancelar',
    });
    if (!respuesta.isConfirmed) return;
    this.seccionesArray.removeAt(si);
  }

  /** Clona la sección (nombre + todas sus categorías) e inserta la copia
   *  justo después de la original. El nombre de la sección y el de cada
   *  categoría se sufijan con " (copia)" — tanto secciones como categorías
   *  se matchean por nombre en otros lugares (tarifa-especial-form busca
   *  la sección/categoría de la misma tarifa por nombre, y la asignación de
   *  categoría por vehículo también matchea por nombre sin distinguir
   *  sección), así que dos con el mismo nombre generarían ambigüedad hasta
   *  que el usuario las renombre. */
  duplicarSeccion(si: number): void {
    const usaProveedor = this.form.get('usaValoresProveedor')!.value;
    const original = this.seccionesArray.at(si).getRawValue();
    const nuevaSeccion = this.crearGrupoSeccion(undefined, usaProveedor);
    const categoriasNueva = nuevaSeccion.get('categorias') as FormArray;
    categoriasNueva.clear();
    original.categorias.forEach((cat: any) => {
      const fila = this.crearFilaCategoria(undefined, usaProveedor);
      fila.patchValue({ ...cat, nombre: cat.nombre ? `${cat.nombre} (copia)` : cat.nombre });
      categoriasNueva.push(fila);
    });
    nuevaSeccion.patchValue({ nombre: original.nombre ? `${original.nombre} (copia)` : original.nombre });
    this.seccionesArray.insert(si + 1, nuevaSeccion);
    this.aplicarEstadoAdicionalKm(this.kmActivo);
  }

  agregarCategoria(si: number): void {
    const usaProveedor = this.form.get('usaValoresProveedor')!.value;
    this.categoriasDe(si).push(this.crearFilaCategoria(undefined, usaProveedor));
    this.aplicarEstadoAdicionalKm(this.kmActivo);
  }

  async quitarCategoria(si: number, i: number): Promise<void> {
    const cats = this.categoriasDe(si);
    if (cats.length <= 1) return;
    const respuesta = await Swal.fire({
      title: '¿Quitar la categoría?',
      text: 'Se va a perder toda la información cargada en esta categoría. No se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Quitar',
      cancelButtonText: 'Cancelar',
    });
    if (!respuesta.isConfirmed) return;
    cats.removeAt(i);
  }

  /** Clona la categoría e inserta la copia justo después de la original,
   *  con todos los valores iguales salvo el nombre (sufijado con " (copia)"
   *  por el mismo motivo que en duplicarSeccion — ver comentario ahí). */
  duplicarCategoria(si: number, i: number): void {
    const usaProveedor = this.form.get('usaValoresProveedor')!.value;
    const original = this.categoriasDe(si).at(i).getRawValue();
    const nuevaFila = this.crearFilaCategoria(undefined, usaProveedor);
    nuevaFila.patchValue({ ...original, nombre: original.nombre ? `${original.nombre} (copia)` : original.nombre });
    this.categoriasDe(si).insert(i + 1, nuevaFila);
    this.aplicarEstadoAdicionalKm(this.kmActivo);
  }

  toggleUsaValoresProveedor(): void {
    const proveedorActivo = this.form.get('usaValoresProveedor')!.value;
    this.setDisabled(this.form.get('acompanianteAPagarProveedor'), proveedorActivo);
    const kmActivoAhora = this.kmActivo;
    this.seccionesArray.controls.forEach(seccionCtrl => {
      const cats = (seccionCtrl.get('categorias') as FormArray).controls;
      cats.forEach(catCtrl => {
        this.setDisabled(catCtrl.get('aPagarProveedor'), proveedorActivo);
        this.setDisabled(catCtrl.get('adicionalPagarProveedor.primerSector'), proveedorActivo && kmActivoAhora);
        this.setDisabled(catCtrl.get('adicionalPagarProveedor.sectoresSiguientes'), proveedorActivo && kmActivoAhora);
      });
    });
  }

  toggleUsaAdicionalKm(): void {
    const activo = this.form.get('usaAdicionalKm')!.value;
    this.setDisabled(this.form.get('kmPrimerSector'), activo);
    this.setDisabled(this.form.get('kmSectoresSiguientes'), activo);
    this.aplicarEstadoAdicionalKm(activo);
  }

  private aplicarEstadoAdicionalKm(activo: boolean): void {
    const proveedorActivo = this.form.get('usaValoresProveedor')!.value;
    this.seccionesArray.controls.forEach(seccionCtrl => {
      const cats = (seccionCtrl.get('categorias') as FormArray).controls;
      cats.forEach(catCtrl => {
        this.setDisabled(catCtrl.get('adicionalCobrar.primerSector'), activo);
        this.setDisabled(catCtrl.get('adicionalCobrar.sectoresSiguientes'), activo);
        this.setDisabled(catCtrl.get('adicionalPagar.primerSector'), activo);
        this.setDisabled(catCtrl.get('adicionalPagar.sectoresSiguientes'), activo);
        this.setDisabled(catCtrl.get('adicionalPagarProveedor.primerSector'), activo && proveedorActivo);
        this.setDisabled(catCtrl.get('adicionalPagarProveedor.sectoresSiguientes'), activo && proveedorActivo);
      });
    });
  }

  private setDisabled(ctrl: AbstractControl | null, activo: boolean): void {
    if (!ctrl) return;
    activo ? ctrl.enable({ emitEvent: false }) : ctrl.disable({ emitEvent: false });
  }

  invalido(ctrl: AbstractControl | null): boolean {
    return !!ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }

  /** true si algún campo de dinero activo (no deshabilitado) quedó en $0.
   *  form.value ya excluye los controles disabled, así que los campos de
   *  proveedor (si usaValoresProveedor está apagado) o de adicional por km
   *  (si kmActivo está apagado) no se evalúan — solo lo que realmente se va
   *  a guardar. Es un aviso, no bloquea el submit (igual que en el viejo
   *  tarifa-editor). */
  existenValoresCero(): boolean {
    const v = this.form.value;
    const enCategorias = (v.secciones ?? []).some((s: any) =>
      (s.categorias ?? []).some((c: any) => [
        c.aCobrar, c.aPagar, c.aPagarProveedor,
        c.adicionalCobrar?.primerSector, c.adicionalCobrar?.sectoresSiguientes,
        c.adicionalPagar?.primerSector, c.adicionalPagar?.sectoresSiguientes,
        c.adicionalPagarProveedor?.primerSector, c.adicionalPagarProveedor?.sectoresSiguientes,
      ].some((val: any) => val === 0))
    );
    const enAcompaniante = [v.acompanianteACobrar, v.acompanianteAPagar, v.acompanianteAPagarProveedor].some((val: any) => val === 0);
    return enCategorias || enAcompaniante;
  }

  /** true si el form difiere del snapshot tomado al construirlo (justo
   *  después de aplicar el estado inicial de enabled/disabled de cada
   *  control). Comparación por JSON.stringify(form.value): como .value
   *  excluye los controles disabled, alcanza con comparar contra el
   *  snapshot sin lógica aparte para detectar cuándo un campo pasó de
   *  habilitado a deshabilitado (cambia la forma del objeto serializado). */
  hayCambios(): boolean {
    return JSON.stringify(this.form.value) !== this.formOriginal;
  }

  async onCancelar(): Promise<void> {
    if (this.hayCambios()) {
      const respuesta = await Swal.fire({
        title: 'Hay cambios sin guardar',
        text: 'Si salís ahora vas a perder los cambios realizados.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Salir sin guardar',
        cancelButtonText: 'Continuar editando',
      });
      if (!respuesta.isConfirmed) return;
    }
    this.cancelar.emit();
  }

  async onSubmit(): Promise<void> {
    if (!this.puedeEditar || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();

    const seDesactivaConDatosPrevios = !raw.usaValoresProveedor && (this.tarifa ?? this.tarifaPlantilla)?.usaValoresProveedor === true;
    if (seDesactivaConDatosPrevios) {
      const resultado = await Swal.fire({
        title: '¿Descartar valores de proveedor?',
        text: 'La columna Proveedor está desactivada — los valores cargados en esa columna no se van a guardar.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Continuar sin guardarlos',
        cancelButtonText: 'Cancelar',
      });
      if (!resultado.isConfirmed) return;
    }

    const modoTarifacion = this.modoTarifacion!;
    // general: kmDistancia siempre con valor. personalizada: null si es 'km' o
    // si el checkbox usaAdicionalKm está apagado (ese control no existe para
    // 'general', por eso se resuelve primero por nivel — no alcanza con la
    // condición "modoTarifacion==='km' || !raw.usaAdicionalKm" sola, porque en
    // 'general' raw.usaAdicionalKm es undefined y esa condición daría null).
    const kmDistancia = this.nivel === 'general'
      ? { primerSector: raw.kmPrimerSector, sectoresSiguientes: raw.kmSectoresSiguientes }
      : (modoTarifacion === 'km' || !raw.usaAdicionalKm)
        ? null
        : { primerSector: raw.kmPrimerSector, sectoresSiguientes: raw.kmSectoresSiguientes };

    const secciones: Seccion<CategoriaTarifa>[] = raw.secciones.map((s: any, si: number) => ({
      orden: si,
      nombre: this.permiteMultiplesSecciones ? (s.nombre || null) : null,
      categorias: s.categorias.map((c: any, i: number) => ({
        orden: i,
        nombre: c.nombre,
        aCobrar: c.aCobrar,
        aPagar: c.aPagar,
        aPagarProveedor: c.aPagarProveedor,
        ...(kmDistancia !== null ? {
          adicionalKmACobrar: { primerSector: c.adicionalCobrar.primerSector, sectoresSiguientes: c.adicionalCobrar.sectoresSiguientes },
          adicionalKmAPagar: { primerSector: c.adicionalPagar.primerSector, sectoresSiguientes: c.adicionalPagar.sectoresSiguientes },
          adicionalKmAPagarProveedor: { primerSector: c.adicionalPagarProveedor.primerSector, sectoresSiguientes: c.adicionalPagarProveedor.sectoresSiguientes },
        } : {}),
      })),
    }));

    const formData: TarifaFormData = {
      nivel: this.nivel,
      idEntidadDueño: this.idEntidadDueño,
      nombre: this.nivel === 'general' ? 'General' : raw.nombre,
      modoTarifacion,
      kmDistancia,
      secciones,
      acompanianteACobrar: raw.acompanianteACobrar,
      acompanianteAPagar: raw.acompanianteAPagar,
      acompanianteAPagarProveedor: raw.acompanianteAPagarProveedor,
      usaValoresProveedor: raw.usaValoresProveedor,
    };

    // editor emite / padre persiste: este componente no llama a
    // TarifarioService — el padre (tarifas-general/personalizada) decide
    // contra qué tarifa versionar y llama a TarifaGuardadoService.
    this.guardar.emit(formData);
  }
}

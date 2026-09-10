import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { ConIdType } from 'src/app/interfaces/conId';
import { Cliente } from 'src/app/interfaces/cliente';
import { Vehiculo } from 'src/app/interfaces/chofer';
import { CategoriaTarifa, EntidadTipo, Seccion, Tarifa } from 'src/app/interfaces/tarifa';
import { AlcanceTarifa, CategoriaEspecial, TarifaEspecial } from 'src/app/interfaces/tarifa-especial';
import { ClienteService } from 'src/app/servicios/clientes/cliente.service';
import { ChoferService } from 'src/app/servicios/choferes/chofer.service';
import { TarifarioService } from 'src/app/servicios/tarifario/tarifario.service';
import { TarifaEspecialFormData } from 'src/app/servicios/tarifario/tarifa-especial-factory.service';
import { UsuarioSesionService } from 'src/app/servicios/usuario-sesion/usuario-sesion.service';

@Component({
  selector: 'app-tarifa-especial-form',
  templateUrl: './tarifa-especial-form.component.html',
  styleUrls: ['./tarifa-especial-form.component.scss'],
  standalone: false,
})
export class TarifaEspecialFormComponent implements OnInit, OnDestroy {
  @Input() entidadTipo!: EntidadTipo;
  @Input() idEntidadDueño!: string;
  @Input() tarifa?: ConIdType<TarifaEspecial>;
  @Input() tarifaPlantilla?: ConIdType<TarifaEspecial>;
  @Input() cargando = false;
  @Output() guardar = new EventEmitter<TarifaEspecialFormData>();
  @Output() cancelar = new EventEmitter<void>();

  general: ConIdType<Tarifa> | null = null;
  clientes: ConIdType<Cliente>[] = [];
  vehiculos: ConIdType<Vehiculo>[] = [];
  /** Secciones/categorías candidatas a mostrarse en el form — para cliente,
   *  todas las del General; para chofer/proveedor, acotadas a las categorías
   *  de sus vehículos asignados actuales, más — solo al EDITAR (`tarifa`) —
   *  las que ya estuvieran en esa tarifa, para no perder visibilidad de datos
   *  ya cargados si el vehículo cambió después. Al DUPLICAR (`tarifaPlantilla`)
   *  NO se unen las categorías de la plantilla — son de otra entidad, podrían
   *  no corresponder al vehículo real del destino. Secciones sin ninguna
   *  categoría candidata no aparecen. Mismo índice que el FormArray
   *  `secciones`. */
  gruposCandidatos: { seccion: Seccion<CategoriaTarifa>; categorias: CategoriaTarifa[] }[] = [];
  puedeEditar = false;
  esDev = false;
  form!: FormGroup;

  /** Snapshot (JSON) del form tomado al construirlo — hayCambios() lo compara
   *  contra el estado actual para avisar antes de salir sin guardar. */
  private formOriginal = '';

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private clienteService: ClienteService,
    private choferService: ChoferService,
    private tarifarioService: TarifarioService,
    private usuarioSesion: UsuarioSesionService,
  ) {}

  ngOnInit(): void {
    const usuario = this.usuarioSesion.getUsuarioActual();
    this.puedeEditar = !!usuario && ['dev', 'admin'].includes(usuario.role);
    this.esDev = usuario?.role === 'dev';

    this.general = this.tarifarioService.getTarifaGeneralVigente() ?? null;

    this.clienteService.getActivos()
      .pipe(takeUntil(this.destroy$))
      .subscribe(clientes => { this.clientes = clientes; });

    if (!this.general) {
      Swal.fire('No hay tarifa general', 'Hace falta una tarifa general vigente antes de poder crear tarifas especiales.', 'warning');
      this.cancelar.emit();
      return;
    }

    this.vehiculos = this.calcularVehiculos();
    const fuente = this.tarifa ?? this.tarifaPlantilla;
    this.gruposCandidatos = this.calcularGruposCandidatos(fuente);

    if (this.gruposCandidatos.length === 0) {
      const detalle = this.entidadTipo === 'cliente'
        ? 'La tarifa general vigente no tiene categorías cargadas.'
        : 'Esta entidad no tiene vehículos asignados con una categoría que coincida con la tarifa general — no hay categorías para acotar la tarifa especial.';
      Swal.fire('Sin categorías disponibles', detalle, 'warning');
      this.cancelar.emit();
      return;
    }

    this.construirForm(fuente);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get mostrarAlcance(): boolean {
    return this.entidadTipo !== 'cliente';
  }

  /** Clientes elegibles para el alcance específico — deben tener habilitada
   *  la tarifa General o Especial. Si solo tienen Personalizada y/o Eventual
   *  habilitadas, esas tarifas tienen mayor prioridad y una Especial de
   *  chofer/proveedor con alcance a ese cliente nunca llegaría a aplicarse. */
  get clientesElegibles(): ConIdType<Cliente>[] {
    return this.clientes.filter(c => c.tarifasHabilitadas.some(t => t.nivel === 'general' || t.nivel === 'especial'));
  }

  get tieneKm(): boolean {
    return this.general!.kmDistancia !== null;
  }

  get seccionesArray(): FormArray {
    return this.form.get('secciones') as FormArray;
  }

  categoriasDe(si: number): FormArray {
    return this.seccionesArray.at(si).get('categorias') as FormArray;
  }

  /** Solo usado en modo edición (this.tarifa presente) para mostrar el
   *  alcance de solo lectura — ver nota arriba sobre por qué está bloqueado. */
  get nombreClienteAlcanceActual(): string {
    const alc = this.tarifa?.alcance;
    if (!alc || alc.tipo !== 'entidadCliente') return '';
    return this.clientes.find(c => c.idCliente === alc.idCliente)?.razonSocial ?? alc.idCliente;
  }

  /** Vehículos actualmente asignados a la entidad — solo aplica a
   *  chofer/proveedor, cliente no tiene restricción de categorías. */
  private calcularVehiculos(): ConIdType<Vehiculo>[] {
    if (this.entidadTipo === 'cliente') return [];
    return this.choferService.getVehiculosActuales().filter(v =>
      this.entidadTipo === 'chofer'
        ? v.asignadoA.tipo === 'chofer' && v.asignadoA.idChofer === this.idEntidadDueño
        : v.asignadoA.tipo === 'proveedor' && v.asignadoA.idProveedor === this.idEntidadDueño
    );
  }

  /** Universo de categorías que se ofrecen para marcar en el form. Cliente:
   *  todas las del General, sin restricción. Chofer/proveedor: acotadas a
   *  las categorías de sus vehículos asignados, unión con las que ya
   *  estuvieran en `fuente` (para no ocultar de golpe una categoría ya
   *  cargada si el vehículo cambió después de la última versión). Secciones
   *  sin ninguna categoría candidata se excluyen enteras. */
  private calcularGruposCandidatos(fuente?: ConIdType<TarifaEspecial>): { seccion: Seccion<CategoriaTarifa>; categorias: CategoriaTarifa[] }[] {
    const general = this.general!;
    const nombresVehiculo = new Set(this.vehiculos.map(v => v.categoria.nombre));
    // La unión con las categorías de la fuente solo aplica al EDITAR (this.tarifa
    // presente, misma entidad dueña — el vehículo pudo haber cambiado desde la
    // última versión). Al DUPLICAR (this.tarifaPlantilla, entidad dueña distinta)
    // NO se une: la fuente es la tarifa de OTRA entidad, y colar sus categorías
    // acá metería categorías que no corresponden al vehículo real del destino
    // (ej: duplicar de un chofer con Mini a uno con Maxi no debe ofrecer/marcar
    // "Mini" — el destino no tiene ningún vehículo Mini).
    const permiteUnionConFuente = this.entidadTipo !== 'cliente' && !!this.tarifa;

    return general.secciones
      .map(seccionGeneral => {
        const seccionFuente = fuente?.secciones.find(s => s.nombre === seccionGeneral.nombre);
        const nombresFuente = permiteUnionConFuente
          ? new Set(seccionFuente?.categorias.map(c => c.nombre) ?? [])
          : new Set<string>();
        const categorias = this.entidadTipo === 'cliente'
          ? seccionGeneral.categorias
          : seccionGeneral.categorias.filter(c => nombresVehiculo.has(c.nombre) || nombresFuente.has(c.nombre));
        return { seccion: seccionGeneral, categorias };
      })
      .filter(grupo => grupo.categorias.length > 0);
  }

  private construirForm(fuente?: ConIdType<TarifaEspecial>): void {
    this.categoriasConDatosOriginales.clear();
    const seccionesForm = this.gruposCandidatos.map((grupo, si) => {
      const seccionFuente = fuente?.secciones.find(s => s.nombre === grupo.seccion.nombre);
      return this.fb.group({
        categorias: this.fb.array(grupo.categorias.map((catGeneral, ci) => {
          const catFuente = seccionFuente?.categorias.find(c => c.nombre === catGeneral.nombre);
          if (catFuente) this.categoriasConDatosOriginales.add(`${si}-${ci}`);
          return this.fb.group({
            valor: [{ value: catFuente?.valor ?? 0, disabled: !catFuente }, [Validators.required, Validators.min(0)]],
            adicionalKm: this.fb.group({
              primerSector: [{ value: catFuente?.adicionalKm?.primerSector ?? 0, disabled: !catFuente }, [Validators.required, Validators.min(0)]],
              sectoresSiguientes: [{ value: catFuente?.adicionalKm?.sectoresSiguientes ?? 0, disabled: !catFuente }, [Validators.required, Validators.min(0)]],
            }),
          });
        })),
      });
    });

    this.form = this.fb.group({
      nombre: [this.nombreInicial(fuente), [Validators.required, this.validadorNombreUnico()]],
      alcanceTipo: [this.alcanceTipoInicial(fuente)],
      alcanceIdCliente: [fuente?.alcance.tipo === 'entidadCliente' ? fuente.alcance.idCliente : null],
      secciones: this.fb.array(seccionesForm),
      adicionalAcompaniante: [fuente?.adicionalAcompaniante ?? 0, [Validators.required, Validators.min(0)]],
      // Distancia propia de esta tarifa especial — YA NO se hereda de General en
      // modo solo lectura (podía diferir del real, ej. un cliente con "1er sector"
      // de 80km en vez de los 50km de la General). Default: la de `fuente` si se
      // está editando/duplicando, si no la de la General vigente como punto de
      // partida razonable — pero queda editable en ambos casos.
      ...(this.tieneKm ? {
        kmPrimerSector: [fuente?.kmDistancia?.primerSector ?? this.general?.kmDistancia?.primerSector ?? 0, [Validators.required, Validators.min(0)]],
        kmSectoresSiguientes: [fuente?.kmDistancia?.sectoresSiguientes ?? this.general?.kmDistancia?.sectoresSiguientes ?? 0, [Validators.required, Validators.min(0)]],
      } : {}),
      vigenciaDesde: [null],
    });
    this.formOriginal = JSON.stringify(this.form.value);
  }

  /** Al duplicar hacia la MISMA entidad dueña, sugiere "(copia)" en vez de
   *  copiar el nombre tal cual — ver validadorNombreUnico. Al duplicar hacia
   *  otra entidad, o al editar/crear, el nombre original sigue siendo un
   *  buen default. */
  private nombreInicial(fuente?: ConIdType<TarifaEspecial>): string {
    const esDuplicadoMismaEntidad = !!this.tarifaPlantilla && this.tarifaPlantilla.idEntidadDueño === this.idEntidadDueño;
    if (esDuplicadoMismaEntidad) return `${this.tarifaPlantilla!.nombre} (copia)`;
    return fuente?.nombre ?? '';
  }

  /** Ninguna tarifa especial vigente de la misma entidad dueña puede
   *  compartir `nombre` (comparación sin distinguir mayúsculas ni espacios
   *  al borde) — mismo criterio que TarifaFormComponent.validadorNombreUnico().
   *  Excluye la propia tarifa que se está editando/duplicando. */
  private validadorNombreUnico(): ValidatorFn {
    return (ctrl: AbstractControl) => {
      const nombre = (ctrl.value ?? '').trim().toLowerCase();
      if (!nombre) return null;
      const propio = (this.tarifa ?? this.tarifaPlantilla)?.idTarifa;
      const colisiona = this.tarifarioService.getTarifasEspecialesVigentes(this.idEntidadDueño)
        .some(t => t.idTarifa !== propio && t.nombre.trim().toLowerCase() === nombre);
      return colisiona ? { nombreDuplicado: true } : null;
    };
  }

  private alcanceTipoInicial(fuente?: ConIdType<TarifaEspecial>): 'entidad' | 'entidadCliente' {
    if (!this.mostrarAlcance) return 'entidad';
    return fuente?.alcance.tipo ?? 'entidad';
  }

  onCambioAlcanceTipo(): void {
    if (this.form.get('alcanceTipo')!.value !== 'entidadCliente') {
      this.form.get('alcanceIdCliente')!.setValue(null);
    }
  }

  /** true si la categoría (si, ci) está marcada — la fuente de verdad es si
   *  su control `valor` está enabled, no un control de checkbox aparte. */
  esSeleccionada(si: number, ci: number): boolean {
    return this.categoriasDe(si).at(ci).get('valor')!.enabled;
  }

  /** Set de claves "si-ci" de las categorías que YA tenían datos cargados al
   *  entrar al form (catFuente truthy en construirForm) — se usa para avisar
   *  antes de desmarcar una de estas, igual que tarifa-form avisa al
   *  desactivar "usaValoresProveedor" con datos previos cargados. */
  private categoriasConDatosOriginales = new Set<string>();

  async onToggleCategoria(si: number, ci: number, e: any): Promise<void> {
    const catCtrl = this.categoriasDe(si).at(ci);
    const activar = e.target.checked;

    if (!activar && this.categoriasConDatosOriginales.has(`${si}-${ci}`)) {
      const respuesta = await Swal.fire({
        title: '¿Desmarcar la categoría?',
        text: 'Esta categoría ya tiene valores cargados — si la desmarcás, no se van a guardar.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Continuar sin guardarlos',
        cancelButtonText: 'Cancelar',
      });
      if (!respuesta.isConfirmed) return;
    }

    const aplicar = (ctrl: AbstractControl) => activar ? ctrl.enable({ emitEvent: false }) : ctrl.disable({ emitEvent: false });
    aplicar(catCtrl.get('valor')!);
    if (this.tieneKm) {
      aplicar(catCtrl.get('adicionalKm.primerSector')!);
      aplicar(catCtrl.get('adicionalKm.sectoresSiguientes')!);
    }
  }

  invalido(ctrl: AbstractControl | null): boolean {
    return !!ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }

  /** true si algún campo de dinero de una categoría SELECCIONADA quedó en
   *  $0. form.value ya excluye los controles disabled, así que las
   *  categorías no marcadas (esSeleccionada === false) no se evalúan — solo
   *  lo que realmente se va a guardar. Es un aviso, no bloquea el submit. */
  existenValoresCero(): boolean {
    const v = this.form.value;
    const enCategorias = (v.secciones ?? []).some((s: any) =>
      (s.categorias ?? []).some((c: any) => [
        c.valor,
        c.adicionalKm?.primerSector,
        c.adicionalKm?.sectoresSiguientes,
      ].some((val: any) => val === 0))
    );
    return enCategorias || v.adicionalAcompaniante === 0;
  }

  /** true si el form difiere del snapshot tomado al construirlo. Comparación
   *  por JSON.stringify(form.value): como .value excluye los controles
   *  disabled, alcanza con comparar contra el snapshot sin lógica aparte
   *  para detectar cuándo una categoría pasó de seleccionada a no
   *  seleccionada (cambia la forma del objeto serializado). */
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

    if (this.mostrarAlcance && raw.alcanceTipo === 'entidadCliente' && !raw.alcanceIdCliente) {
      Swal.fire('Falta el cliente', 'Elegí el cliente para el alcance de esta tarifa especial.', 'warning');
      return;
    }

    const secciones: Seccion<CategoriaEspecial>[] = [];
    this.gruposCandidatos.forEach((grupo, si) => {
      const categoriasSeleccionadas: CategoriaEspecial[] = [];
      grupo.categorias.forEach((catGeneral, ci) => {
        const catCtrl = this.categoriasDe(si).at(ci);
        if (!catCtrl.get('valor')!.enabled) return;
        const f = catCtrl.getRawValue();
        categoriasSeleccionadas.push({
          orden: catGeneral.orden,
          nombre: catGeneral.nombre,
          valor: f.valor,
          ...(this.tieneKm ? {
            adicionalKm: { primerSector: f.adicionalKm.primerSector, sectoresSiguientes: f.adicionalKm.sectoresSiguientes },
          } : {}),
        });
      });
      if (categoriasSeleccionadas.length > 0) {
        secciones.push({ orden: grupo.seccion.orden, nombre: grupo.seccion.nombre, categorias: categoriasSeleccionadas });
      }
    });

    if (secciones.length === 0) {
      Swal.fire('Faltan categorías', 'Seleccioná al menos una categoría para guardar la tarifa especial.', 'warning');
      return;
    }

    const general = this.general!;
    const alcance: AlcanceTarifa = this.mostrarAlcance && raw.alcanceTipo === 'entidadCliente'
      ? { tipo: 'entidadCliente', idCliente: raw.alcanceIdCliente }
      : { tipo: 'entidad' };

    const formData: TarifaEspecialFormData = {
      entidadTipo: this.entidadTipo,
      idEntidadDueño: this.idEntidadDueño,
      alcance,
      nombre: raw.nombre,
      modoTarifacion: general.modoTarifacion,
      // Propia de esta tarifa especial, no la de la General (ver comentario en
      // construirForm) — General solo decide SI el adicional por km está activo
      // (tieneKm), no los km exactos de cada sector.
      kmDistancia: this.tieneKm ? { primerSector: raw.kmPrimerSector, sectoresSiguientes: raw.kmSectoresSiguientes } : null,
      secciones,
      adicionalAcompaniante: raw.adicionalAcompaniante,
      ...(raw.vigenciaDesde ? { vigenciaDesde: raw.vigenciaDesde } : {}),
    };

    // editor emite / padre persiste: este componente no llama a
    // TarifarioService — el padre (tarifas-especial) decide contra qué
    // tarifa versionar y llama a TarifaGuardadoService.
    this.guardar.emit(formData);
  }
}

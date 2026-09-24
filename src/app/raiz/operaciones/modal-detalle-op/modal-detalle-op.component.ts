import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { ConId } from 'src/app/interfaces/conId';
import { DocumentoOperacion, Operacion } from 'src/app/interfaces/operacion';
import { ValoresTarifaService, CandidatoTarifa } from 'src/app/servicios/tarifario/valores-tarifa.service';
import { OperacionService } from 'src/app/servicios/operaciones/operacion.service';
import { StorageArchivosService } from 'src/app/servicios/storage-archivos/storage-archivos.service';
import { UsuarioSesionService } from 'src/app/servicios/usuario-sesion/usuario-sesion.service';

/** Validador de grupo: si acompaniante está activo, la cantidad no puede ser 0.
 *  Misma regla que operaciones-editor.validarOperacion(), reusada acá para
 *  consistencia entre pantallas. */
function acompanianteValido(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const acomp = group.get('acompaniante')?.value;
    const cant = group.get('acompanianteCant')?.value;
    return (acomp && !cant) ? { acompanianteSinCantidad: true } : null;
  };
}

@Component({
  selector: 'app-modal-detalle-op',
  standalone: false,
  templateUrl: './modal-detalle-op.component.html',
  styleUrls: ['./modal-detalle-op.component.scss'],
})
export class ModalDetalleOpComponent implements OnInit, OnDestroy {
  @Input() op!: ConId<Operacion>;
  @Input() modo!: 'vista' | 'editar' | 'cerrar';

  opOriginal!: ConId<Operacion>;

  puedeEditarDetalleCompleto = false;
  puedeEditarKmYMultiplicadores = false;
  puedeEditarDocumentacion = false;
  puedeEditarAdExtraConcepto = false;

  candidatoPersonalizadaCliente: CandidatoTarifa | null = null;

  isLoading = false;

  form!: FormGroup;

  // Estado transitorio de documentación — no vive en el form (un File no tiene
  // sentido como valor de FormControl). archivosNuevos: seleccionados en esta
  // sesión de edición, todavía no subidos a Storage. archivosAEliminar: urls de
  // op.documentacion marcadas para sacar. Ambos se aplican recién al confirmar
  // guardar/cerrar (ver aplicarCambiosDocumentacion) — cancelar el modal no sube
  // ni borra nada.
  archivosNuevos: File[] = [];
  archivosAEliminar: string[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    public activeModal: NgbActiveModal,
    private fb: FormBuilder,
    private valoresTarifaServ: ValoresTarifaService,
    private operacionServ: OperacionService,
    private storageArchivosServ: StorageArchivosService,
    private usuarioSesion: UsuarioSesionService,
  ) {}

  ngOnInit(): void {
    this.opOriginal = this.op;
    console.log("op: ", this.opOriginal);    
    this.op = structuredClone(this.opOriginal);
    this.op.acompanianteCant = this.op.acompanianteCant ?? 0;
    this.op.adExtraConcepto = this.op.adExtraConcepto ?? '';
    this.op.valores.cliente.adExtraValor = this.op.valores.cliente.adExtraValor ?? 0;
    this.op.valores.chofer.adExtraValor = this.op.valores.chofer.adExtraValor ?? 0;
    // Defensivo — ops viejas (previas a este frente) tienen '' o null en Firestore en
    // vez de un array. OperacionMigrationService.normalizarDocumentacion lo corrige en
    // la base; esto es solo para no romper la ventana entre deployar este código y
    // correr esa migración.
    this.op.documentacion = Array.isArray(this.op.documentacion) ? this.op.documentacion : [];

    this.puedeEditarDetalleCompleto = this.modo === 'editar' && this.op.estado.ciclo === 'abierta';
    this.puedeEditarKmYMultiplicadores = (this.modo === 'editar' && this.op.estado.ciclo === 'abierta') || this.modo === 'cerrar';
    this.puedeEditarDocumentacion = this.modo !== 'vista';
    // Antes solo importaba el modo porque una op cerrada nunca llegaba a modo
    // 'editar' (bloqueado en tablero-op.puedeEditar). Ahora que sí puede llegar
    // (para permitir documentación), hay que cerrar esta puerta explícitamente —
    // el concepto del adicional extra no debe quedar editable en una op cerrada.
    this.puedeEditarAdExtraConcepto = this.modo === 'editar' && this.op.estado.ciclo === 'abierta';

    if (this.op.tarifaAplicadaCliente?.nivel === 'personalizada') {
      this.candidatoPersonalizadaCliente = this.valoresTarifaServ.candidatoDesdeTarifaAplicada(this.op.tarifaAplicadaCliente);
    }

    // Km requerido — exclusivo de cerrar (CONFIRMADO, no aplica en editar aunque
    // ahí también se pueda cargar).
    this.form = this.fb.group({
      detalleGeneral: this.fb.group({
        acompaniante: [this.op.acompaniante],
        acompanianteCant: [this.op.acompanianteCant],
        hojaRuta: [this.op.hojaRuta],
        observaciones: [this.op.observaciones],
        km: [this.op.km, this.modo === 'cerrar' ? [Validators.required] : []],
      }, { validators: acompanianteValido() }),
      adExtraConcepto: [this.op.adExtraConcepto],
      valorCliente: this.fb.group({ adExtraValor: [this.op.valores.cliente.adExtraValor] }),
      valorChofer: this.fb.group({ adExtraValor: [this.op.valores.chofer.adExtraValor] }),
      totales: this.fb.group({
        // Validators.required — un multiplicador vacío NO es lo mismo que 0:
        // 0 es una decisión de negocio válida (anula todo ese lado a propósito),
        // vacío es un estado incompleto que no debe poder guardarse/cerrarse.
        multiplicadorCliente: [this.op.multiplicadorCliente, [Validators.required, Validators.min(0), Validators.max(2)]],
        multiplicadorChofer: [this.op.multiplicadorChofer, [Validators.required, Validators.min(0), Validators.max(2)]],
      }),
    });

    if (this.modo === 'vista') {
      this.form.disable();
    }

    this.form.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.recalcular());
    this.recalcular();
  }

  get esPersonalizadaDelCliente(): boolean {
    return this.op.tarifaAplicadaCliente?.nivel === 'personalizada';
  }

  onSeccionCategoriaChangeCliente(evt: { seccion: number; categoria: number }): void {
    if (!this.candidatoPersonalizadaCliente) return;
    const ref = this.valoresTarifaServ.armarRefManual(this.candidatoPersonalizadaCliente, evt.seccion, evt.categoria);
    this.op.tarifaAplicadaCliente = ref;
    // Personalizada determina también el lado chofer/proveedor (mismo criterio
    // que aplicarRef en operaciones-editor) — se espeja automáticamente.
    if (ref?.nivel === 'personalizada') {
      this.op.tarifaAplicadaChofer = ref;
    }
    this.recalcular();
  }

  /** Recalculación centralizada — único disparador para editar/cerrar, reemplaza
   *  los 4 métodos ad hoc del componente viejo (recalcularValores/
   *  valoresAcompaniantes/valoresGastosExtras/valoresEventuales). */
  recalcular(): void {
    this.sincronizarFormHaciaOp();
    this.valoresTarifaServ.calcularCierre(this.op);
    // Espejo legacy — op.valores todavía lo lee tablero-op (ver Deuda anotada
    // en el diseño). Solo copia lo que calcularCierre ya resolvió, sin lógica nueva.
    if (this.op.valoresNuevos) {
      this.op.valores.cliente.aCobrar = this.op.valoresNuevos.cliente.aCobrar;
      this.op.valores.chofer.aPagar = this.op.valoresNuevos.chofer.aPagar;
    }
  }

  private sincronizarFormHaciaOp(): void {
    const v = this.form.getRawValue();
    this.op.acompaniante = v.detalleGeneral.acompaniante;
    this.op.acompanianteCant = v.detalleGeneral.acompanianteCant;
    this.op.hojaRuta = v.detalleGeneral.hojaRuta;
    this.op.observaciones = v.detalleGeneral.observaciones;
    this.op.km = v.detalleGeneral.km;
    this.op.adExtraConcepto = v.adExtraConcepto;
    this.op.valores.cliente.adExtraValor = v.valorCliente.adExtraValor;
    this.op.valores.chofer.adExtraValor = v.valorChofer.adExtraValor;
    this.op.multiplicadorCliente = v.totales.multiplicadorCliente;
    this.op.multiplicadorChofer = v.totales.multiplicadorChofer;
  }

  guardar(): void {
    if (this.modo === 'cerrar') {
      this.cerrarOperacion();
    } else if (this.modo === 'editar') {
      this.guardarEdicion();
    }
  }

  /** Enter en el input de km — exclusivo de modo 'cerrar' (pedido explícito;
   *  en 'editar' no queremos que Enter dispare un guardado). guardar() ya
   *  valida el form (markAllAsTouched + return si es inválido), así que Enter
   *  con km vacío en modo cerrar simplemente marca el error sin cerrar. */
  onKmEnter(): void {
    if (this.modo === 'cerrar') this.guardar();
  }

  /** Aplica sobre this.op.documentacion los cambios pendientes del picker de
   *  archivos: saca los marcados en archivosAEliminar y sube los nuevos a
   *  Storage recién acá (no al seleccionarlos) — así cancelar el modal nunca
   *  deja archivos huérfanos. Storage NO es transaccional con Firestore: si la
   *  subida falla, no se llega a tocar la operación (StorageArchivosService.
   *  subirVarios ya rechaza todo si cualquiera de los archivos falla). Devuelve
   *  false si hubo que abortar el guardado. */
  private async aplicarCambiosDocumentacion(): Promise<boolean> {
    const existentesConservados = this.op.documentacion.filter(
      d => !this.archivosAEliminar.includes(d.url),
    );

    if (this.archivosNuevos.length === 0) {
      this.op.documentacion = existentesConservados;
      return true;
    }

    try {
      const subidos = await this.storageArchivosServ.subirVarios(
        this.archivosNuevos, `operaciones/${this.op.idOperacion}`,
      );
      const usuario = this.usuarioSesion.getUsuarioActual();
      const nuevos: DocumentoOperacion[] = subidos.map(s => ({
        ...s,
        fechaCarga: new Date().toISOString(),
        usuario: usuario?.email || 'Desconocido',
      }));
      this.op.documentacion = [...existentesConservados, ...nuevos];
      return true;
    } catch (e: any) {
      Swal.fire({ title: 'Error', text: `No se pudieron subir los archivos adjuntos: ${e?.message ?? e}`, icon: 'error' });
      return false;
    }
  }

  /** Borrado best-effort en Storage de los archivos sacados — se dispara recién
   *  DESPUÉS de que el commit a Firestore salió bien (orden inverso al de la
   *  subida): si se borrara antes y el commit fallara, quedarían referencias
   *  rotas en la op vigente. No bloquea ni se espera — un error acá se loguea
   *  y no afecta el resultado ya devuelto al usuario. */
  private limpiarStorageEliminado(urls: string[]): void {
    urls.forEach(url => {
      this.storageArchivosServ.eliminarPorUrl(url).catch(e =>
        console.error(`Error al eliminar archivo de Storage (no crítico): ${url}`, e),
      );
    });
  }

  /** Confirmación → OperacionService.editarOperacion (batch atómico: doc de la
   *  operación + log + sincronización del tablero de asignaciones). */
  private async guardarEdicion(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const confirmacion = await Swal.fire({
      title: '¿Desea guardar los cambios en la operación?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
    });
    if (!confirmacion.isConfirmed) return;

    this.isLoading = true;
    const urlsAEliminar = [...this.archivosAEliminar];
    if (!(await this.aplicarCambiosDocumentacion())) {
      this.isLoading = false;
      return;
    }

    const resultado = await this.operacionServ.editarOperacion(this.op);
    this.isLoading = false;
    if (resultado.exito) {
      this.limpiarStorageEliminado(urlsAEliminar);
      Swal.fire({ title: 'Confirmado', text: 'La operación ha sido editada.', icon: 'success' })
        .then(result => { if (result.isConfirmed) this.activeModal.close(this.op); });
    } else {
      Swal.fire({ title: 'Error', text: `Ha ocurrido un error: ${resultado.mensaje}`, icon: 'error' });
    }
  }

  /** Confirmación → OperacionService.cerrarOperacion (facturación atómica +
   *  registro de tarifa eventual best-effort, ver ese método). */
  private async cerrarOperacion(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const confirmacion = await Swal.fire({
      title: '¿Desea cerrar la operación?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
    });
    if (!confirmacion.isConfirmed) return;

    this.isLoading = true;
    const urlsAEliminar = [...this.archivosAEliminar];
    if (!(await this.aplicarCambiosDocumentacion())) {
      this.isLoading = false;
      return;
    }

    const resultado = await this.operacionServ.cerrarOperacion(this.op);
    this.isLoading = false;
    if (resultado.exito) {
      this.limpiarStorageEliminado(urlsAEliminar);
      Swal.fire({ title: 'Confirmado', text: 'La operación ha sido cerrada.', icon: 'success' })
        .then(result => { if (result.isConfirmed) this.activeModal.close(this.op); });
    } else {
      Swal.fire({ title: 'Error', text: `Ha ocurrido un error: ${resultado.mensaje}`, icon: 'error' })
        .then(result => { if (result.isConfirmed) this.activeModal.close(); });
    }
  }

  cancelar(): void {
    this.activeModal.dismiss();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

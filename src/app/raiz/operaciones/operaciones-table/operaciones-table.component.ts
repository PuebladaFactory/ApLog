import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Operacion } from 'src/app/interfaces/operacion';
import { Chofer } from 'src/app/interfaces/chofer';
import { CategoriaTarifa, TarifaPersonalizadaCliente } from 'src/app/interfaces/tarifa-personalizada-cliente';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2';

// 🔹 mismo runtime que usa CargaTableroDiario — NO toca interfaz global
export type OperacionRuntime = Omit<Operacion, 'chofer'> & {
  // TODO: refactor Carga/Tablero — runtime carga Chofer completo (legacy). El refactor migrará a RefChofer.
  chofer: Chofer;
  // TODO: refactor Carga/Tablero — campo legacy; la selección de vehículo debe migrar a op.vehiculo.
  patenteChofer?: string;
  tarifaBase: 'general' | 'especial' | 'personalizada';
  tarifaOverride: 'eventual' | null;
};

@Component({
  selector: 'app-operaciones-table',
  standalone: false,
  templateUrl: './operaciones-table.component.html',
  styleUrls: ['./operaciones-table.component.scss']
})
export class OperacionesTableComponent {

  // grupos por cliente
  @Input() grupos: {
    clienteId: number;
    razonSocial: string;
    tipo: 'eventual' | 'personalizada' | 'especial' | 'general';
    operaciones: OperacionRuntime[];
  }[] = [];

  @Output() eliminar = new EventEmitter<OperacionRuntime>();

  tarifasPersonalizadas: TarifaPersonalizadaCliente[] = [];

  constructor(
    private storageService: StorageService
  ) {
    this.tarifasPersonalizadas = this.storageService.loadInfo('tarifasPersCliente') || [];
  }

  // =========================
  // TARIFA ACTIVA (runtime)
  // =========================

  getTarifaActiva(op: OperacionRuntime): 'general' | 'especial' | 'personalizada' | 'eventual' {
    return op.tarifaOverride ?? op.tarifaBase;
  }

  esEventual(op: OperacionRuntime) {
    return this.getTarifaActiva(op) === 'eventual';
  }

  esPersonalizada(op: OperacionRuntime) {
    return this.getTarifaActiva(op) === 'personalizada';
  }

  getTarifaPersonalizada(idCliente: number | string): TarifaPersonalizadaCliente | null {
    return this.tarifasPersonalizadas.find(t => t.idCliente === idCliente) || null;
  }

  // =========================
  // TOGGLE EVENTUAL (reversible real)
  // =========================

  onEventualToggle(op: OperacionRuntime, value: boolean) {

    op.tarifaOverride = value ? 'eventual' : null;

    if (value) {
      this.resetPersonalizada(op);
    } else {
      this.resetEventual(op);
    }

    this.syncFlagsLegacy(op);
  }

  // =========================
  // SYNC FLAGS LEGACY
  // =========================

  private syncFlagsLegacy(op: OperacionRuntime) {
    const t = this.getTarifaActiva(op);

    op.tarifaTipo.general = t === 'general';
    op.tarifaTipo.especial = t === 'especial';
    op.tarifaTipo.personalizada = t === 'personalizada';
    op.tarifaTipo.eventual = t === 'eventual';
  }

  // =========================
  // RESET SECCIONES
  // =========================

  resetEventual(op: OperacionRuntime) {
    // TODO: refactor Tarifas — datosTarifaEventual inicializado por la factory (nunca null en runtime).
    op.datosTarifaEventual!.chofer = { concepto: '', valor: 0 };
    op.datosTarifaEventual!.cliente = { concepto: '', valor: 0 };
  }

  resetPersonalizada(op: OperacionRuntime) {
    // TODO: refactor Tarifas — datosTarifaPersonalizada inicializado por la factory (nunca null en runtime).
    op.datosTarifaPersonalizada!.seccion = 0;
    op.datosTarifaPersonalizada!.categoria = 0;
    op.datosTarifaPersonalizada!.nombre = '';
    op.datosTarifaPersonalizada!.aCobrar = 0;
    op.datosTarifaPersonalizada!.aPagar = 0;
  }

  // =========================
  // VALIDACION — basada en tarifa activa
  // =========================

  validarOperacion(op: OperacionRuntime): string[] {

    const errores: string[] = [];
    const t = this.getTarifaActiva(op);

    if (!op.patenteChofer?.trim()) {
      errores.push('Patente requerida');
    }

    if (t === 'personalizada') {
      // TODO: refactor Tarifas — invariante: personalizada ⟺ datosTarifaPersonalizada !== null
      if (op.datosTarifaPersonalizada!.seccion <= 0) errores.push('Falta sección');
      if (op.datosTarifaPersonalizada!.categoria <= 0) errores.push('Falta categoría');
    }

    if (t === 'eventual') {
      // TODO: refactor Tarifas — invariante: eventual ⟺ datosTarifaEventual !== null
      if (!op.datosTarifaEventual!.chofer.concepto) errores.push('Concepto chofer');
      if (!op.datosTarifaEventual!.cliente.concepto) errores.push('Concepto cliente');
    }

    if(op.acompaniante && op.acompanianteCant === 0){
      errores.push("La cantidad de acompañantes no puede ser 0")
    }

    return errores;
  }

  tieneErrores(op: OperacionRuntime) {
    return this.validarOperacion(op).length > 0;
  }

  // =========================
  // CATEGORIAS PERSONALIZADAS
  // =========================

  onSeccionChange(op: Operacion) {
    // TODO: refactor Tarifas — datosTarifaPersonalizada inicializado por la factory (nunca null en runtime).
    op.datosTarifaPersonalizada!.seccion = Number(op.datosTarifaPersonalizada!.seccion);
    op.datosTarifaPersonalizada!.categoria = -1;
    op.datosTarifaPersonalizada!.nombre = '';
    op.datosTarifaPersonalizada!.aCobrar = 0;
    op.datosTarifaPersonalizada!.aPagar = 0;
  }


  getCategoriasDisponibles(op: OperacionRuntime): CategoriaTarifa[] {
    if (!this.esPersonalizada(op)) return [];

    // TODO: actualizar cuando se refactorice este módulo
    const tarifa = this.getTarifaPersonalizada(Number(op.cliente.id));
    // TODO: refactor Tarifas — invariante: personalizada ⟺ datosTarifaPersonalizada !== null
    const seccion = tarifa?.secciones.find(s => s.orden === +op.datosTarifaPersonalizada!.seccion);
    return seccion?.categorias || [];
  }

  onCategoriaChange(op: OperacionRuntime) {
    // TODO: refactor Tarifas — datosTarifaPersonalizada inicializado por la factory (nunca null en runtime).
    op.datosTarifaPersonalizada!.categoria = Number(op.datosTarifaPersonalizada!.categoria);

    // TODO: actualizar cuando se refactorice este módulo
    const tarifa = this.getTarifaPersonalizada(Number(op.cliente.id));
    if (!tarifa) return;

    const sec = tarifa.secciones.find(s => s.orden === +op.datosTarifaPersonalizada!.seccion);
    const cat = sec?.categorias.find(c => c.orden === +op.datosTarifaPersonalizada!.categoria);

    if (cat) {
      op.datosTarifaPersonalizada!.nombre = cat.nombre;
      op.datosTarifaPersonalizada!.aCobrar = cat.aCobrar;
      op.datosTarifaPersonalizada!.aPagar = cat.aPagar;
    }
  }


  // =========================
  // UI HELPERS
  // =========================

  disabledPersonalizada(op: OperacionRuntime) {
    return !this.esPersonalizada(op);
  }

  disabledEventual(op: OperacionRuntime) {
    return !this.esEventual(op);
  }

  getTarifaLabel(op: OperacionRuntime) {
    const t = this.getTarifaActiva(op);
    return t[0].toUpperCase() + t.slice(1);
  }

  esEventualActiva(op: OperacionRuntime) {
    return this.getTarifaActiva(op) === 'eventual';
  }

  esPersonalizadaActiva(op: OperacionRuntime) {
    return this.getTarifaActiva(op) === 'personalizada';
  }

  // ---------- labels ----------

  getCategoriaSeleccionadaLabel(op: OperacionRuntime): string {
    // TODO: refactor Tarifas — datosTarifaPersonalizada inicializado por la factory.
    if (!op.datosTarifaPersonalizada) return '';
    const cats = this.getCategoriasDisponibles(op);
    const cat = cats.find(c => c.orden === op.datosTarifaPersonalizada!.categoria);
    return cat ? `Categoría ${cat.orden}: ${cat.nombre}` : '';
  }

  getSeccionSeleccionadaLabel(op: OperacionRuntime): string {
    // TODO: refactor Tarifas — datosTarifaPersonalizada inicializado por la factory.
    if (!op.datosTarifaPersonalizada) return '';
    // TODO: actualizar cuando se refactorice este módulo
    const tarifa = this.getTarifaPersonalizada(Number(op.cliente.id));
    const sec = tarifa?.secciones.find(s => s.orden === op.datosTarifaPersonalizada!.seccion);
    return sec ? `Sección ${sec.orden}` : '';
  }


  esOriginalEventual(op: any): boolean {
    return !!op.originalEventual;
  }

  getChoferTarifaTipo(op: OperacionRuntime) {
    if (op.chofer.tarifaTipo.eventual) return 'Eventual';
    if (op.chofer.tarifaTipo.especial) return 'Especial';
    return 'General';
  }

  // ---------- acciones ----------

  eliminarOperacion(grupo: any, op: Operacion): void {
    Swal.fire({
      title: '¿Eliminar operación?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed) {
        // Quitar de grupo
        const indexGrupo = grupo.operaciones.indexOf(op);
        if (indexGrupo > -1) {
          grupo.operaciones.splice(indexGrupo, 1);
        }

       /*  // Quitar también del array global
        const indexGlobal = this.operaciones.findIndex(o => o.idOperacion === op.idOperacion);
        if (indexGlobal > -1) {
          this.operaciones.splice(indexGlobal, 1);
        } */

        Swal.fire('Eliminada', 'La operación fue eliminada correctamente.', 'success');
      }
    });
  }

  // ---------- ACOMPAÑANTES ----------

  configurarAcompaniante(op:OperacionRuntime){
    if(op.acompaniante) op.acompanianteCant = 1;
    if(!op.acompaniante) op.acompanianteCant = 0;
  }

  configurarCantAcompaniante(op:OperacionRuntime){
    if(op.acompanianteCant === 0) op.acompaniante = false;
    if(op.acompanianteCant && op.acompanianteCant > 0) op.acompaniante = true;
  }

}

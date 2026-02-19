import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Operacion } from 'src/app/interfaces/operacion';
import { CategoriaTarifa, TarifaPersonalizadaCliente } from 'src/app/interfaces/tarifa-personalizada-cliente';
import { StorageService } from 'src/app/servicios/storage/storage.service';
import Swal from 'sweetalert2';

// 🔹 mismo runtime que usa CargaTableroDiario — NO toca interfaz global
export type OperacionRuntime = Operacion & {
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

  getTarifaPersonalizada(idCliente: number): TarifaPersonalizadaCliente | null {
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
    op.tarifaEventual.chofer = { concepto: '', valor: 0 };
    op.tarifaEventual.cliente = { concepto: '', valor: 0 };
  }

  resetPersonalizada(op: OperacionRuntime) {
    op.tarifaPersonalizada.seccion = 0;
    op.tarifaPersonalizada.categoria = 0;
    op.tarifaPersonalizada.nombre = '';
    op.tarifaPersonalizada.aCobrar = 0;
    op.tarifaPersonalizada.aPagar = 0;
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
      if (op.tarifaPersonalizada.seccion <= 0) errores.push('Falta sección');
      if (op.tarifaPersonalizada.categoria <= 0) errores.push('Falta categoría');
    }

    if (t === 'eventual') {
      if (!op.tarifaEventual.chofer.concepto) errores.push('Concepto chofer');
      if (!op.tarifaEventual.cliente.concepto) errores.push('Concepto cliente');
    }

    if(op.acompaniante && op.acompanienteCant === 0){
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
    op.tarifaPersonalizada.seccion = Number(op.tarifaPersonalizada.seccion);
    op.tarifaPersonalizada.categoria = -1;
    op.tarifaPersonalizada.nombre = '';
    op.tarifaPersonalizada.aCobrar = 0;
    op.tarifaPersonalizada.aPagar = 0;
  }


  getCategoriasDisponibles(op: OperacionRuntime): CategoriaTarifa[] {
    if (!this.esPersonalizada(op)) return [];

    const tarifa = this.getTarifaPersonalizada(op.cliente.idCliente);
    const seccion = tarifa?.secciones.find(s => s.orden === +op.tarifaPersonalizada.seccion);
    return seccion?.categorias || [];
  }

  onCategoriaChange(op: OperacionRuntime) {
    op.tarifaPersonalizada.categoria = Number(op.tarifaPersonalizada.categoria);

    const tarifa = this.getTarifaPersonalizada(op.cliente.idCliente);
    if (!tarifa) return;

    const sec = tarifa.secciones.find(s => s.orden === +op.tarifaPersonalizada.seccion);
    const cat = sec?.categorias.find(c => c.orden === +op.tarifaPersonalizada.categoria);

    if (cat) {
      op.tarifaPersonalizada.nombre = cat.nombre;
      op.tarifaPersonalizada.aCobrar = cat.aCobrar;
      op.tarifaPersonalizada.aPagar = cat.aPagar;
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
    const cats = this.getCategoriasDisponibles(op);
    const cat = cats.find(c => c.orden === op.tarifaPersonalizada.categoria);
    return cat ? `Categoría ${cat.orden}: ${cat.nombre}` : '';
  }

  getSeccionSeleccionadaLabel(op: OperacionRuntime): string {
    const tarifa = this.getTarifaPersonalizada(op.cliente.idCliente);
    const sec = tarifa?.secciones.find(s => s.orden === op.tarifaPersonalizada.seccion);
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
    if(op.acompaniante) op.acompanienteCant = 1;
    if(!op.acompaniante) op.acompanienteCant = 0;
  }

  configurarCantAcompaniante(op:OperacionRuntime){
    if(op.acompanienteCant === 0) op.acompaniante = false;
    if(op.acompanienteCant && op.acompanienteCant > 0) op.acompaniante = true;
  }

}

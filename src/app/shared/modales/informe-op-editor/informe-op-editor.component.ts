import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import { ConId } from 'src/app/interfaces/conId';
import { Operacion } from 'src/app/interfaces/operacion';
import { InformeOpNuevo, Valores as ValoresInformeOp } from 'src/app/interfaces/informe-op-nuevo';
import { OperacionService } from 'src/app/servicios/operaciones/operacion.service';
import { InformeOpService } from 'src/app/servicios/informes-op/informe-op.service';
import { ValoresTarifaService } from 'src/app/servicios/tarifario/valores-tarifa.service';
import { TarifarioService } from 'src/app/servicios/tarifario/tarifario.service';
import { NivelTarifa, ModoTarifacion } from 'src/app/interfaces/tarifa';
import { nombreEntidadInforme, claseBadgeEstadoInforme } from 'src/app/shared/utils/entidad-informe.util';
import { InformeOpDetalleComponent } from 'src/app/shared/modales/informe-op-detalle/informe-op-detalle.component';

/** Lo que hay que aplicarle a la contraparte, ya resuelto según su estado.
 *  'completo' → reemplazar valores/datosOperacion enteros (informe trae el
 *  objeto recalculado completo). 'soloMonto' → actualizar únicamente
 *  contraParte.monto (informe es parcial, solo eso). */
export interface ResultadoContraparteEdicion {
  idInfOp: string;
  sync: 'completo' | 'soloMonto';
  informe: ConId<InformeOpNuevo> | { contraParte: { monto: number } };
}

export interface ResultadoEdicionInformeOp {
  /** Snapshot de la Operación ANTES de la edición — necesario para el delta
   *  de resúmenes (ResumenOpCalculatorService.generarDeltaUpdates, usado por
   *  InformeOpService.editar). Viene de this.operacion (cargado en ngOnInit,
   *  nunca mutado acá — operacionEditada es un structuredClone aparte). */
  operacionVieja: ConId<Operacion>;
  operacion: ConId<Operacion>;
  informeEditado: ConId<InformeOpNuevo>;
  contraparte: ResultadoContraparteEdicion | null;
}

/** Modal nuevo de edición de InformeOp — en paralelo a EditarInfOpComponent
 *  (viejo, sin tocar). Edita UN SOLO lado (el que se le pasa por @Input);
 *  no permite cambiar la tarifa aplicada, solo recalcular valores y cargar
 *  un valor manual de tarifa base. NO escribe a Firestore — devuelve todo
 *  recalculado para que un orquestador (todavía sin diseñar) decida cómo
 *  persistirlo. Ver razonamiento de la entrega para las reglas de
 *  sincronización con la contraparte según su estado. */
@Component({
  selector: 'app-informe-op-editor',
  standalone: false,
  templateUrl: './informe-op-editor.component.html',
  styleUrls: ['./informe-op-editor.component.scss'],
})
export class InformeOpEditorComponent implements OnInit {

  @Input() informeOp!: ConId<InformeOpNuevo>;

  operacion!: ConId<Operacion>;
  contraparte: ConId<InformeOpNuevo> | null = null;
  cargando = true;

  // Estado del formulario — se trabaja sobre estos campos, no se muta
  // this.operacion/this.informeOp directamente hasta confirmar.
  km!: number;
  acompaniante!: boolean;
  acompanianteCant!: number;
  multiplicador!: number;
  usarTarifaManual = false;
  tarifaBaseManualValor: number | null = null;
  tarifaBaseResuelta = 0;
  adExtraValor = 0;
  adExtraConcepto = '';
  observaciones = '';
  hojaRuta = '';
  observacionInforme = '';

  constructor(
    public activeModal: NgbActiveModal,
    private modalService: NgbModal,
    private operacionServ: OperacionService,
    private informeOpServ: InformeOpService,
    private valoresTarifaServ: ValoresTarifaService,
    private tarifarioServ: TarifarioService,
  ) {}

  get esLadoCliente(): boolean {
    return this.informeOp.tipo === 'cliente';
  }

  get nombreEntidadPropia(): string {
    return nombreEntidadInforme(this.informeOp);
  }

  get nombreEntidadContraparte(): string {
    return this.contraparte ? nombreEntidadInforme(this.contraparte) : '';
  }

  get claseBadgeEstadoContraparte(): string {
    return this.contraparte ? claseBadgeEstadoInforme(this.contraparte.estado) : '';
  }

  /** Nivel de la tarifa aplicada a ESTE lado — 'eventual' cuando no hay
   *  RefTarifaAplicada (tarifaAplicada null ⇔ eventual, mismo criterio que
   *  InformeOpDetalleComponent.esEventual). Puramente derivado. */
  get nivelTarifaAplicada(): NivelTarifa {
    return this.informeOp.datosOperacion.tarifaAplicada?.nivel ?? 'eventual';
  }

  /** Modo de tarifación (categoría/km) de la tarifa aplicada — vive en el
   *  documento Tarifa/TarifaEspecial, no en la referencia congelada
   *  (RefTarifaAplicada), así que hace falta resolverlo contra el cache de
   *  TarifarioService (misma ramificación especial vs. general/personalizada
   *  que ValoresTarifaService.calcularLado). null en eventual o si la
   *  tarifa ya no está en el cache (borrada/inactiva). */
  get modoTarifacionAplicada(): ModoTarifacion | null {
    const ref = this.informeOp.datosOperacion.tarifaAplicada;
    if (!ref) return null;
    const tarifa = ref.nivel === 'especial'
      ? this.tarifarioServ.getTarifaEspecialPorId(ref.idTarifa)
      : this.tarifarioServ.getTarifaPorId(ref.idTarifa);
    return tarifa?.modoTarifacion ?? null;
  }

  /** Valores recalculados EN VIVO con los campos actuales del form —
   *  acompañante/km adicional/total, para reflejarlos mientras se edita
   *  (no solo al confirmar). Reutiliza armarOperacionEditada() +
   *  valoresTarifaServ.calcularCierre(), el mismo cálculo que ya hacía
   *  confirmar(), sobre un clon descartable — no muta this.operacion.
   *  null mientras carga o si el cálculo no resuelve — el template lo
   *  trata como "sin datos" (?? 0). */
  get valoresEnVivo(): { tarifaBase: number; acompaniante: number; kmMonto: number; adExtra: number; total: number } | null {
    if (this.cargando) return null;
    const { op: opRecalculada, errores } = this.valoresTarifaServ.calcularCierre(this.armarOperacionEditada());
    if (errores.length > 0 || !opRecalculada.valoresNuevos) return null;

    const v = this.esLadoCliente ? opRecalculada.valoresNuevos.cliente : opRecalculada.valoresNuevos.chofer;
    const total = this.esLadoCliente ? opRecalculada.valoresNuevos.cliente.aCobrar : opRecalculada.valoresNuevos.chofer.aPagar;

    return {
      tarifaBase: v.tarifaBase,
      acompaniante: v.acompValor,
      kmMonto: v.kmAdicional,
      adExtra: v.adExtraValor ?? 0,
      total,
    };
  }

  async ngOnInit(): Promise<void> {
    const [operacion, contraparte] = await Promise.all([
      this.operacionServ.obtenerPorId(this.informeOp.idOperacion),
      this.informeOpServ.obtenerPorId(this.informeOp.contraParte.idInfOp),
    ]);

    if (!operacion) {
      await Swal.fire('Error', 'No se encontró la Operación asociada a este InformeOp.', 'error');
      this.activeModal.dismiss();
      return;
    }

    this.operacion = operacion;
    this.contraparte = contraparte;

    this.km = operacion.km;
    this.acompaniante = operacion.acompaniante;
    this.acompanianteCant = operacion.acompanianteCant ?? 0;
    this.observaciones = operacion.observaciones;
    this.hojaRuta = operacion.hojaRuta;
    this.adExtraConcepto = operacion.adExtraConcepto ?? '';
    // A diferencia de los campos de arriba, este vive en el propio
    // InformeOpNuevo (no en Operacion) — "nota propia del informe, no
    // ligada a la operación".
    this.observacionInforme = this.informeOp.observacionInforme;

    if (this.esLadoCliente) {
      this.multiplicador = operacion.multiplicadorCliente;
      this.usarTarifaManual = operacion.tarifaBaseManualCliente != null;
      this.tarifaBaseManualValor = operacion.tarifaBaseManualCliente ?? null;
      this.tarifaBaseResuelta = operacion.valoresNuevos?.cliente.tarifaBase ?? 0;
      this.adExtraValor = operacion.valores.cliente.adExtraValor ?? 0;
    } else {
      this.multiplicador = operacion.multiplicadorChofer;
      this.usarTarifaManual = operacion.tarifaBaseManualChofer != null;
      this.tarifaBaseManualValor = operacion.tarifaBaseManualChofer ?? null;
      this.tarifaBaseResuelta = operacion.valoresNuevos?.chofer.tarifaBase ?? 0;
      this.adExtraValor = operacion.valores.chofer.adExtraValor ?? 0;
    }

    this.notificarEstadoContraparte();
    this.cargando = false;
  }

  private notificarEstadoContraparte(): void {
    if (!this.contraparte) return;
    const mensajes: Partial<Record<InformeOpNuevo['estado'], string>> = {
      proforma: 'La contraparte ya está incluida en una Proforma — sus valores no se van a modificar, solo se actualizará el monto que tiene registrado de este lado.',
      liquidado: 'La contraparte ya fue liquidada — sus valores no se van a modificar, solo se actualizará el monto que tiene registrado de este lado.',
      anulado: 'La contraparte está anulada — no se va a modificar ni actualizar nada de ese lado.',
    };
    const msj = mensajes[this.contraparte.estado];
    if (msj) {
      Swal.fire({ icon: 'info', title: 'Contraparte no activa', text: msj });
    }
  }

  onToggleTarifaManual(): void {
    if (this.usarTarifaManual && this.tarifaBaseManualValor === null) {
      this.tarifaBaseManualValor = this.tarifaBaseResuelta;
    }
  }

  verDetalleContraparte(): void {
    if (!this.contraparte) return;
    const modalRef = this.modalService.open(InformeOpDetalleComponent, { centered: true, size: 'lg' });
    modalRef.componentInstance.informeOp = this.contraparte;
  }

  private validar(): string[] {
    const errores: string[] = [];
    if (this.km < 0) errores.push('El km no puede ser negativo.');
    if (this.multiplicador < 0 || this.multiplicador > 2) errores.push('El multiplicador debe estar entre 0 y 2.');
    if (this.acompaniante && (!this.acompanianteCant || this.acompanianteCant <= 0)) errores.push('La cantidad de acompañantes no puede ser 0.');
    if (this.usarTarifaManual && (this.tarifaBaseManualValor === null || this.tarifaBaseManualValor < 0)) errores.push('Cargá un valor válido para la tarifa base manual.');
    if (this.adExtraValor > 0 && !this.adExtraConcepto.trim()) errores.push('Cargá un concepto para el adicional extra.');
    return errores;
  }

  /** Arma el clon editado de this.operacion con los valores actuales del
   *  form — extraído de confirmar() para poder reutilizarlo también desde
   *  el getter valoresEnVivo() (recálculo en vivo) sin duplicar esta
   *  lógica. Comportamiento idéntico al que tenía confirmar() inline. */
  private armarOperacionEditada(): ConId<Operacion> {
    const operacionEditada: ConId<Operacion> = structuredClone(this.operacion);
    operacionEditada.km = this.km;
    operacionEditada.acompaniante = this.acompaniante;
    operacionEditada.acompanianteCant = this.acompaniante ? this.acompanianteCant : 0;
    operacionEditada.observaciones = this.observaciones;
    operacionEditada.hojaRuta = this.hojaRuta;
    operacionEditada.adExtraConcepto = this.adExtraConcepto;

    if (this.esLadoCliente) {
      operacionEditada.multiplicadorCliente = this.multiplicador;
      operacionEditada.tarifaBaseManualCliente = this.usarTarifaManual ? this.tarifaBaseManualValor : null;
      operacionEditada.valores.cliente.adExtraValor = this.adExtraValor;
    } else {
      operacionEditada.multiplicadorChofer = this.multiplicador;
      operacionEditada.tarifaBaseManualChofer = this.usarTarifaManual ? this.tarifaBaseManualValor : null;
      operacionEditada.valores.chofer.adExtraValor = this.adExtraValor;
    }
    return operacionEditada;
  }

  confirmar(): void {
    const errores = this.validar();
    if (errores.length > 0) {
      Swal.fire('Faltan datos', errores.join(' — '), 'warning');
      return;
    }

    const operacionEditada = this.armarOperacionEditada();
    const { op: opRecalculada, errores: erroresCalculo } = this.valoresTarifaServ.calcularCierre(operacionEditada);
    // calcularCierre() muta y devuelve la MISMA referencia que se le pasa
    // (operacionEditada, que sí tiene id) — su firma pública solo tipa
    // Operacion (sin id) porque el service es compartido con flujos que no
    // siempre parten de un ConId. El cast es seguro acá porque sabemos que
    // es el mismo objeto, no uno nuevo.
    // TODO: si el service se vuelve a tocar por otra razón, evaluar hacerlo
    // genérico (calcularCierre<T extends Operacion>(op: T): {op: T, ...})
    // para que el tipado refleje la garantía real en vez de parchear acá.
    const operacionRecalculada = opRecalculada as ConId<Operacion>;
    if (erroresCalculo.length > 0 || !operacionRecalculada.valoresNuevos) {
      Swal.fire('No se pudo recalcular', erroresCalculo.join(' — ') || 'La operación no tiene tarifa resuelta.', 'error');
      return;
    }

    let valoresPropios: ValoresInformeOp;
    let totalPropio: number;

    if (this.esLadoCliente) {
      const v = operacionRecalculada.valoresNuevos.cliente;
      totalPropio = v.aCobrar;
      valoresPropios = {
        tarifaBase: v.tarifaBase,
        tarifaBaseManual: operacionRecalculada.tarifaBaseManualCliente ?? null,
        acompaniante: v.acompValor,
        kmMonto: v.kmAdicional,
        adExtra: v.adExtraValor ?? 0,
        total: v.aCobrar,
      };
    } else {
      const v = operacionRecalculada.valoresNuevos.chofer;
      totalPropio = v.aPagar;
      valoresPropios = {
        tarifaBase: v.tarifaBase,
        tarifaBaseManual: operacionRecalculada.tarifaBaseManualChofer ?? null,
        acompaniante: v.acompValor,
        kmMonto: v.kmAdicional,
        adExtra: v.adExtraValor ?? 0,
        total: v.aPagar,
      };
    }

    const informeEditado: ConId<InformeOpNuevo> = {
      ...this.informeOp,
      valores: valoresPropios,
      datosOperacion: {
        ...this.informeOp.datosOperacion,
        km: operacionRecalculada.km,
        observaciones: operacionRecalculada.observaciones,
        hojaRuta: operacionRecalculada.hojaRuta,
      },
      observacionInforme: this.observacionInforme,
    };

    let contraparteResultado: ResultadoContraparteEdicion | null = null;

    if (this.contraparte) {
      if (this.contraparte.estado === 'activo') {
        let valoresContra: ValoresInformeOp;
        let totalContra: number;

        if (this.esLadoCliente) {
          const v = operacionRecalculada.valoresNuevos.chofer;
          totalContra = v.aPagar;
          valoresContra = {
            tarifaBase: v.tarifaBase,
            tarifaBaseManual: operacionRecalculada.tarifaBaseManualChofer ?? null,
            acompaniante: v.acompValor,
            kmMonto: v.kmAdicional,
            adExtra: v.adExtraValor ?? 0,
            total: v.aPagar,
          };
        } else {
          const v = operacionRecalculada.valoresNuevos.cliente;
          totalContra = v.aCobrar;
          valoresContra = {
            tarifaBase: v.tarifaBase,
            tarifaBaseManual: operacionRecalculada.tarifaBaseManualCliente ?? null,
            acompaniante: v.acompValor,
            kmMonto: v.kmAdicional,
            adExtra: v.adExtraValor ?? 0,
            total: v.aCobrar,
          };
        }

        const informeContraCompleto: ConId<InformeOpNuevo> = {
          ...this.contraparte,
          valores: valoresContra,
          datosOperacion: {
            ...this.contraparte.datosOperacion,
            km: operacionRecalculada.km,
            observaciones: operacionRecalculada.observaciones,
            hojaRuta: operacionRecalculada.hojaRuta,
          },
          contraParte: { ...this.contraparte.contraParte, monto: totalPropio },
        };

        informeEditado.contraParte = { ...informeEditado.contraParte, monto: totalContra };
        contraparteResultado = { idInfOp: this.contraparte.idInfOp, sync: 'completo', informe: informeContraCompleto };

      } else if (this.contraparte.estado === 'proforma' || this.contraparte.estado === 'liquidado') {
        contraparteResultado = {
          idInfOp: this.contraparte.idInfOp,
          sync: 'soloMonto',
          informe: { contraParte: { monto: totalPropio } },
        };
        // informeEditado.contraParte.monto queda igual — la contraparte no cambió su total.
      }
      // 'anulado' → contraparteResultado queda null, informeEditado.contraParte queda igual.
    }

    const resultado: ResultadoEdicionInformeOp = {
      operacionVieja: this.operacion,
      operacion: operacionRecalculada,
      informeEditado,
      contraparte: contraparteResultado,
    };

    this.activeModal.close(resultado);
  }
}

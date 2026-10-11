import { Injectable } from '@angular/core';

import { Operacion, Valores } from 'src/app/interfaces/operacion';
import { ConId, ConIdType } from 'src/app/interfaces/conId';
import { RefTarifaAplicada } from 'src/app/interfaces/ref-tarifa-aplicada';
import { RefTarifaHabilitada } from 'src/app/interfaces/tarifa-habilitada';
import { Tarifa, EntidadTipo, KmDistancia, AdicionalKmValores, Seccion, CategoriaTarifa, ModoTarifacion } from 'src/app/interfaces/tarifa';
import { TarifaEspecial, CategoriaEspecial } from 'src/app/interfaces/tarifa-especial';
import { RegistroOpEventual } from 'src/app/interfaces/registro-op-eventual';

import { TarifarioService } from 'src/app/servicios/tarifario/tarifario.service';
import { ChoferService } from 'src/app/servicios/choferes/chofer.service';
import { LogRegistroService } from 'src/app/servicios/log-registro/log-registro.service';
import { toISODateString } from 'src/app/servicios/fechas/date-range.service';

export interface ResultadoCalculoTarifa {
  op: Operacion;
  errores: string[]; // vacío = resolvió limpio en ambos lados
}

/** Un documento de tarifa (general/especial/personalizada) candidato a aplicarse a un
 *  lado de la operación — usado por operaciones-editor para ofrecer selección manual
 *  cuando hay ambigüedad (2+ vigentes) o la tarifa tiene más de una sección. */
export interface CandidatoTarifa {
  idTarifa: string;
  nivel: 'general' | 'especial' | 'personalizada';
  nombreTarifa: string;
  modoTarifacion: ModoTarifacion;
  secciones: Seccion<CategoriaTarifa | CategoriaEspecial>[];
}

/** Resultado de listar candidatos de un lado (cliente o chofer/proveedor): todos
 *  los vigentes de los niveles HABILITADOS de la entidad. nivelResuelto es el nivel
 *  del candidato cuando hay exactamente uno (null con 0 o 2+). Con 1 candidato la
 *  UI autoselecciona; con 2+ el usuario elige. */
export interface CandidatosLado {
  nivelResuelto: 'personalizada' | 'especial' | 'general' | null;
  candidatos: CandidatoTarifa[];
  motivoSinCandidatos: string | null;
}

/** Candidatos y cálculo de valores del sistema de Tarifas.
 *
 *  La ELECCIÓN de la tarifa de cada lado (op.tarifaAplicadaCliente/Chofer) no
 *  se hace en el alta: la hace el usuario en operaciones-editor (o el
 *  generador de pruebas), vía ResolucionTarifaOpService, sobre los candidatos
 *  de listarCandidatosLado (niveles HABILITADOS de la entidad, sin fallback
 *  implícito entre niveles) + resolverSeccionCategoria / armarRefManual.
 *  Personalizada es exclusiva de Clientes y determina ambos lados (el lado
 *  chofer/proveedor espeja la misma referencia). Eventual no usa referencias:
 *  se identifica por op.datosTarifaEventual.
 *
 *  Momentos de cálculo:
 *   - ALTA (calcularAlta): EXIGE las dos referencias ya elegidas (o eventual).
 *     Si falta alguna, valoresNuevos queda en null y el motivo vuelve en
 *     `errores`; altaDesdeAsignacion aborta el alta (TC2).
 *   - CIERRE, edición de InformeOp y restaurar (calcularCierre): reusa las
 *     referencias congeladas y recalcula con km/multiplicadores/acompañantes
 *     actuales.
 *
 *  modoTarifacion === 'km' (Personalizada): sin escalones de distancia — el valor
 *  cargado en la categoría ES la tarifa por km, se multiplica por op.km al calcular
 *  (ver calcularLado). Con una sola categoría, resolverSeccionCategoria la elige
 *  sola; con 2+ no hay forma automática de saber cuál corresponde (no matchean
 *  por categoría de vehículo) y se elige a mano. */
@Injectable({ providedIn: 'root' })
export class ValoresTarifaService {

  constructor(
    private tarifario: TarifarioService,
    private choferServ: ChoferService,
    private logRegistro: LogRegistroService,
  ) {}

  // ── ALTA ─────────────────────────────────────────────────────────

  calcularAlta(op: Operacion): ResultadoCalculoTarifa {
    const errores: string[] = [];

    if (op.datosTarifaEventual !== null) {
      op.tarifaAplicadaCliente = null;
      op.tarifaAplicadaChofer = null;
      op.valoresNuevos = this.valoresEventual(op);
      return { op, errores };
    }

    // Personalizada determina AMBOS lados (calcularLado lee aPagar/
    // aPagarProveedor de la misma categoría para el lado chofer). En el flujo
    // real ya viene espejada desde ResolucionTarifaOpService.aplicarRef — esto
    // es defensa en profundidad.
    if (op.tarifaAplicadaCliente?.nivel === 'personalizada' && !op.tarifaAplicadaChofer) {
      op.tarifaAplicadaChofer = op.tarifaAplicadaCliente;
    }

    // TC2: el alta EXIGE las referencias ya elegidas — no se resuelve
    // jerarquía acá (se retiró resolverLado, que caía a General aunque no
    // estuviera habilitada).
    if (!op.tarifaAplicadaCliente) {
      errores.push('lado cliente sin tarifa elegida (se elige en operaciones-editor o en el generador)');
    }
    if (!op.tarifaAplicadaChofer) {
      errores.push('lado chofer/proveedor sin tarifa elegida (se elige en operaciones-editor o en el generador)');
    }
    if (errores.length > 0) {
      op.valoresNuevos = null;
      return { op, errores };
    }

    const chofer = this.choferServ.getChoferPorId(op.chofer.id);
    const esProveedor = chofer ? chofer.contratacion.tipo === 'proveedor' : op.proveedor !== null;

    op.valoresNuevos = this.armarValoresNuevos(op, op.tarifaAplicadaCliente, op.tarifaAplicadaChofer, esProveedor);
    if (!op.valoresNuevos) {
      errores.push('no se pudieron calcular los valores: la tarifa o la sección/categoría elegida no está en memoria');
    }

    return { op, errores };
  }

  // ── CIERRE ───────────────────────────────────────────────────────

  calcularCierre(op: Operacion): ResultadoCalculoTarifa {
    const errores: string[] = [];

    if (op.datosTarifaEventual !== null) {
      op.valoresNuevos = this.valoresEventual(op);
      return { op, errores };
    }

    if (!op.tarifaAplicadaCliente && !op.tarifaAplicadaChofer) {
      // No se resolvió nada en el alta (ya quedó registrado en ese momento) — nada para recalcular.
      return { op, errores };
    }

    const chofer = this.choferServ.getChoferPorId(op.chofer.id);
    const esProveedor = chofer ? chofer.contratacion.tipo === 'proveedor' : op.proveedor !== null;

    op.valoresNuevos = this.armarValoresNuevos(op, op.tarifaAplicadaCliente, op.tarifaAplicadaChofer, esProveedor);
    if (op.tarifaAplicadaCliente === null) errores.push('lado cliente no tenía referencia congelada del alta — no se recalculó');
    if (op.tarifaAplicadaChofer === null) errores.push('lado chofer no tenía referencia congelada del alta — no se recalculó');

    return { op, errores };
  }

  // ── Registro histórico de operaciones eventuales (alimenta Historial, Bloque 5b) ──

  /** Best-effort, nunca tira — mismo criterio que LogRegistroService. Hasta
   *  este bloque registrosOpEventuales quedaba siempre vacía: nadie escribía
   *  ahí. Se llama al cerrar, nunca al alta — recién en el cierre existen
   *  los valores finales de la operación eventual. */
  async registrarEventualSiCorresponde(op: ConId<Operacion>): Promise<void> {
    if (op.datosTarifaEventual === null) return;

    const chofer = this.choferServ.getChoferPorId(op.chofer.id);
    const esProveedor = chofer ? chofer.contratacion.tipo === 'proveedor' : op.proveedor !== null;

    const registro: Omit<RegistroOpEventual, 'idTarifa'> = {
      idOperacion: op.idOperacion,
      fecha: toISODateString(new Date()),
      idCliente: op.cliente.id,
      idChofer: op.chofer.id,
      idProveedor: op.proveedor?.id ?? null,
      cliente: { concepto: op.datosTarifaEventual.cliente.concepto, valor: op.datosTarifaEventual.cliente.valor },
      chofer: esProveedor ? null : { concepto: op.datosTarifaEventual.chofer.concepto, valor: op.datosTarifaEventual.chofer.valor },
      proveedor: esProveedor ? { concepto: op.datosTarifaEventual.chofer.concepto, valor: op.datosTarifaEventual.chofer.valor } : null,
    };

    try {
      await this.tarifario.crearRegistroEventual(registro);
    } catch (e: any) {
      await this.logRegistro.registrarError(
        'EDITAR', 'registrosOpEventuales', op.idOperacion,
        `No se pudo registrar la operación eventual ${op.idOperacion}: ${e?.message ?? e}`,
      );
    }
  }

  // (TC2: resolverLado / resolverEnCandidatas retirados — la elección de
  // tarifa vive en listarCandidatosLado + resolverSeccionCategoria /
  // armarRefManual, usados por ResolucionTarifaOpService.)

  // ── Listado de candidatos para selección manual (mini-frente operaciones-editor) ──

  /** Devuelve TODOS los candidatos vigentes de TODOS los niveles habilitados
   *  de la entidad (Personalizada, Especial, General) que tengan alguno — el usuario elige
   *  en operaciones-editor cuando hay más de uno, incluso entre niveles distintos.
   *  Eventual no pasa por acá: se detecta en el componente vía op.datosTarifaEventual
   *  y usa sus propios campos, no RefTarifaAplicada.
   *
   *  Los 3 niveles se tratan igual (ajuste del 15/09/2026 — se sacó el fallback
   *  implícito a General que había antes): cada uno contribuye candidatos SOLO si
   *  está explícitamente habilitado, y si está habilitado pero sin vigente, no cae
   *  a ningún otro nivel — se reporta como motivo y listo, mismo criterio que ya
   *  regía para Personalizada. No hay más "General resuelve solo aunque no esté
   *  tildada": si ningún nivel habilitado tiene vigente, la operación queda sin
   *  candidatos y motivoSinCandidatos junta los motivos de cada nivel habilitado. */
  listarCandidatosLado(
    entidadTipo: EntidadTipo,
    idEntidad: string,
    habilitadas: RefTarifaHabilitada[],
    categoriaVehiculo: { catOrden: number; nombre: string },
    idClienteOp: string,
  ): CandidatosLado {
    const niveles = new Set(habilitadas.map(h => h.nivel));
    const candidatos: CandidatoTarifa[] = [];
    const motivos: string[] = [];

    if (niveles.has('personalizada')) {
      const candidatas = this.tarifario.getTarifasPersonalizadasVigentes(idEntidad);
      if (candidatas.length > 0) {
        candidatos.push(...candidatas.map(t => this.aCandidato(t)));
      } else {
        motivos.push(`personalizada de ${entidadTipo} ${idEntidad}: sin tarifa vigente`);
      }
    }

    if (niveles.has('especial')) {
      let candidatas = this.tarifario.getTarifasEspecialesVigentes(idEntidad)
        .filter(t => t.entidadTipo === entidadTipo && t.modoTarifacion !== 'km');
      if (entidadTipo !== 'cliente') {
        const especificas = candidatas.filter(t => t.alcance.tipo === 'entidadCliente' && t.alcance.idCliente === idClienteOp);
        candidatas = especificas.length > 0 ? especificas : candidatas.filter(t => t.alcance.tipo === 'entidad');
      }
      // Una especial de 1 sola sección que no cubre la categoría del vehículo no
      // es candidata.
      candidatas = candidatas.filter(t =>
        t.secciones.length !== 1 || t.secciones[0].categorias.some((cat: any) => cat.nombre === categoriaVehiculo.nombre));
      if (candidatas.length > 0) {
        candidatos.push(...candidatas.map(t => this.aCandidato(t)));
      } else {
        motivos.push(`especial de ${entidadTipo} ${idEntidad}: sin tarifa vigente que cubra la categoría`);
      }
    }

    if (niveles.has('general')) {
      const general = this.tarifario.getTarifaGeneralVigente();
      if (general && general.modoTarifacion !== 'km') {
        candidatos.push(this.aCandidato(general));
      } else {
        motivos.push('no hay tarifa general vigente');
      }
    }

    if (candidatos.length === 0) {
      return {
        nivelResuelto: null,
        candidatos: [],
        motivoSinCandidatos: motivos.length > 0
          ? motivos.join(' — ')
          : `${entidadTipo} ${idEntidad}: sin ningún nivel de tarifa habilitado`,
      };
    }
    const nivelResuelto = candidatos.length === 1 ? candidatos[0].nivel : null;
    return { nivelResuelto, candidatos, motivoSinCandidatos: null };
  }

  private aCandidato(t: ConIdType<Tarifa> | ConIdType<TarifaEspecial>): CandidatoTarifa {
    return { idTarifa: t.idTarifa, nivel: t.nivel as 'general' | 'especial' | 'personalizada', nombreTarifa: t.nombre, modoTarifacion: t.modoTarifacion, secciones: t.secciones };
  }

  /** Intenta resolver Sección + Categoría automáticamente para un candidato ya elegido
   *  (nivel general/especial siempre, o personalizada cuando tiene una sola sección).
   *  Categoría por match exacto de nombre contra la categoría del vehículo.
   *  Si la tarifa tiene más de una sección devuelve
   *  requiereSeleccionManual=true — el picker de Sección/Categoría de la fila
   *  expandible completa el resto a mano (armarRefManual). */
  resolverSeccionCategoria(
    candidato: CandidatoTarifa,
    categoriaVehiculo: { catOrden: number; nombre: string },
  ): { ref: RefTarifaAplicada | null; requiereSeleccionManual: boolean; motivo: string | null } {
    if (candidato.secciones.length === 0) {
      return { ref: null, requiereSeleccionManual: false, motivo: 'la tarifa no tiene secciones cargadas' };
    }
    if (candidato.secciones.length > 1) {
      return { ref: null, requiereSeleccionManual: true, motivo: null };
    }
    const seccion = candidato.secciones[0];
    if (seccion.categorias.length === 0) {
      return { ref: null, requiereSeleccionManual: false, motivo: 'la tarifa no tiene categorías cargadas' };
    }

    let categoria: any;
    if (candidato.modoTarifacion === 'km') {
      // Categorías libres (Personalizada por km): no matchean contra la categoría del
      // vehículo. Con una sola no hay ambigüedad — se autoselecciona. Con 2+, se
      // difiere a selección manual (picker de la fila expandible).
      if (seccion.categorias.length > 1) {
        return { ref: null, requiereSeleccionManual: true, motivo: null };
      }
      categoria = seccion.categorias[0];
    } else {
      categoria = seccion.categorias.find((c: any) => c.nombre === categoriaVehiculo.nombre);
      if (!categoria) {
        return { ref: null, requiereSeleccionManual: false, motivo: `categoría '${categoriaVehiculo.nombre}' no está en la tarifa` };
      }
    }
    return {
      ref: {
        idTarifa: candidato.idTarifa,
        nivel: candidato.nivel,
        nombreTarifa: candidato.nombreTarifa,
        seccion: seccion.orden,
        nombreSeccion: seccion.nombre,
        categoria: categoria.orden,
        nombreCategoria: categoria.nombre,
      },
      requiereSeleccionManual: false,
      motivo: null,
    };
  }

  /** Arma la referencia final cuando Sección/Categoría se eligen a mano (candidato con
   *  más de una sección — típico caso Personalizada). Usado por el picker de la fila
   *  expandible de operaciones-editor. */
  armarRefManual(candidato: CandidatoTarifa, ordenSeccion: number, ordenCategoria: number): RefTarifaAplicada | null {
    const seccion = candidato.secciones.find(s => s.orden === ordenSeccion);
    const categoria: any = seccion?.categorias.find((c: any) => c.orden === ordenCategoria);
    if (!seccion || !categoria) return null;
    return {
      idTarifa: candidato.idTarifa,
      nivel: candidato.nivel,
      nombreTarifa: candidato.nombreTarifa,
      seccion: seccion.orden,
      nombreSeccion: seccion.nombre,
      categoria: categoria.orden,
      nombreCategoria: categoria.nombre,
    };
  }

  /** Reconstruye el CandidatoTarifa (con sus secciones/categorías) a partir de una
   *  referencia ya congelada (tarifaAplicadaCliente/Chofer de una operación). Usado
   *  por modal-detalle-op para ofrecer el picker de Sección/Categoría en edición de
   *  Personalizada sin volver a resolver jerarquía — la tarifa del alta se mantiene
   *  fija, solo cambia qué sección/categoría de ESA tarifa se usa. */
  candidatoDesdeTarifaAplicada(ref: RefTarifaAplicada): CandidatoTarifa | null {
    const tarifa = ref.nivel === 'especial'
      ? this.tarifario.getTarifaEspecialPorId(ref.idTarifa)
      : this.tarifario.getTarifaPorId(ref.idTarifa);
    if (!tarifa) return null;
    return this.aCandidato(tarifa);
  }

  // ── Cálculo de valores (privado) ────────────────────────────────

  private armarValoresNuevos(
    op: Operacion,
    refCliente: RefTarifaAplicada | null,
    refChofer: RefTarifaAplicada | null,
    esProveedor: boolean,
  ): Valores | null {
    if (!refCliente || !refChofer) return null;

    const cliente = this.calcularLado(op, refCliente, false, false);
    const chofer = this.calcularLado(op, refChofer, true, esProveedor);
    if (!cliente || !chofer) return null;

    // Override manual de tarifa base (Chunk 3 — edición de InformeOp): un
    // valor cargado a mano reemplaza al resuelto por jerarquía para ESE
    // lado — el resto (km adicional, acompañante) se sigue derivando
    // normalmente de la tarifa. null/ausente = comportamiento de siempre.
    const tarifaBaseCliente = op.tarifaBaseManualCliente != null ? op.tarifaBaseManualCliente : cliente.tarifaBase;
    const tarifaBaseChofer = op.tarifaBaseManualChofer != null ? op.tarifaBaseManualChofer : chofer.tarifaBase;

    // Multiplicador 0 zanja todo el lado a 0 (acompañante, km adicional y
    // extra incluidos) — decisión de negocio confirmada, unificada acá para
    // que alta y cierre compartan el mismo criterio (Bloque 7 Paso 2).
    // (op.multiplicadorX ?? 0) — un multiplicador null/undefined (input vacío
    // en el form, momentáneo o por un estado inconsistente) se trata igual
    // que 0, nunca como si no aplicara: la rama "else" de abajo multiplica
    // tarifaBase por el multiplicador crudo, y tarifaBase * null da 0 en JS
    // sin afectar kmAdicional/acompValor/adExtraValor — quedaba una op con
    // la base en cero y los adicionales sueltos (bug real, reportado). Un
    // override manual de tarifaBase no exime de esta regla: multiplicador 0
    // sigue anulando el lado entero.
    const ladoCliente = (op.multiplicadorCliente ?? 0) === 0
      ? { acompValor: 0, kmAdicional: 0, tarifaBase: 0, aCobrar: 0, adExtraValor: 0 }
      : {
          acompValor: cliente.acompValor,
          kmAdicional: cliente.kmAdicional,
          tarifaBase: tarifaBaseCliente,
          aCobrar: tarifaBaseCliente * op.multiplicadorCliente + cliente.kmAdicional + cliente.acompValor + (op.valores.cliente.adExtraValor ?? 0),
          adExtraValor: op.valores.cliente.adExtraValor ?? 0,
        };

    const ladoChofer = (op.multiplicadorChofer ?? 0) === 0
      ? { acompValor: 0, kmAdicional: 0, tarifaBase: 0, aPagar: 0, adExtraValor: 0 }
      : {
          acompValor: chofer.acompValor,
          kmAdicional: chofer.kmAdicional,
          tarifaBase: tarifaBaseChofer,
          aPagar: tarifaBaseChofer * op.multiplicadorChofer + chofer.kmAdicional + chofer.acompValor + (op.valores.chofer.adExtraValor ?? 0),
          adExtraValor: op.valores.chofer.adExtraValor ?? 0,
        };

    return { cliente: ladoCliente, chofer: ladoChofer };
  }

  /** esLadoChofer=false → columna cliente (aCobrar/adicionalKmACobrar/
   *  acompanianteACobrar); esLadoChofer=true → columna chofer (aPagar, con
   *  fallback a valores de proveedor si esProveedor). Una TarifaEspecial ya
   *  viene scopeada a un solo lado por entidadTipo (categoria.valor único),
   *  así que esa rama no necesita esta distinción — solo General/Personalizada
   *  traen ambas columnas en la misma categoría y la necesitan. */
  private calcularLado(
    op: Operacion,
    ref: RefTarifaAplicada,
    esLadoChofer: boolean,
    esProveedor: boolean,
  ): { tarifaBase: number; kmAdicional: number; acompValor: number } | null {

    const tarifa = ref.nivel === 'especial'
      ? this.tarifario.getTarifaEspecialPorId(ref.idTarifa)
      : this.tarifario.getTarifaPorId(ref.idTarifa);
    if (!tarifa) return null;

    const seccion = tarifa.secciones.find(s => s.orden === ref.seccion);
    const categoria: any = seccion?.categorias.find((c: any) => c.orden === ref.categoria);
    if (!categoria) return null;

    let tarifaBase: number;
    let adicionalKm: AdicionalKmValores | undefined;
    let acompValor: number;

    if (ref.nivel === 'especial') {
      const t = tarifa as ConIdType<TarifaEspecial>;
      tarifaBase = categoria.valor;
      adicionalKm = categoria.adicionalKm;
      acompValor = t.adicionalAcompaniante;
    } else {
      const t = tarifa as ConIdType<Tarifa>;
      if (esLadoChofer) {
        tarifaBase = esProveedor ? (categoria.aPagarProveedor ?? categoria.aPagar) : categoria.aPagar;
        adicionalKm = esProveedor ? (categoria.adicionalKmAPagarProveedor ?? categoria.adicionalKmAPagar) : categoria.adicionalKmAPagar;
        acompValor = esProveedor ? (t.acompanianteAPagarProveedor ?? t.acompanianteAPagar) : t.acompanianteAPagar;
      } else {
        tarifaBase = categoria.aCobrar;
        adicionalKm = categoria.adicionalKmACobrar;
        acompValor = t.acompanianteACobrar;
      }
      // Personalizada por km: el valor cargado en la categoría ES la tarifa por km —
      // se multiplica por la distancia de la operación. Sin escalones de distancia en
      // este modo (kmDistancia siempre null — ver TarifaFormComponent.onSubmit).
      if (t.modoTarifacion === 'km') {
        tarifaBase = tarifaBase * op.km;
      }
    }

    return {
      tarifaBase,
      kmAdicional: this.calcularKmAdicional(op.km, tarifa.kmDistancia, adicionalKm),
      acompValor: op.acompaniante ? acompValor * (op.acompanianteCant ?? 1) : 0,
    };
  }

  /** Adicional por km. Con kmDistancia.primerSector = P y
   *  kmDistancia.sectoresSiguientes = S (ej. P = 50, S = 10):
   *   - hasta P inclusive (0-50): sin adicional, lo cubre la tarifa base;
   *   - primer tramo después de P, (P, P+S] (51-60): valores.primerSector;
   *   - cada tramo de S km empezado después de ese (61-70, 71-80, ...): suma
   *     valores.sectoresSiguientes. Cada límite (60, 70, ...) cierra su tramo.
   *  Guard: S <= 0 (dato inválido — el form lo bloquea desde TC1, pero puede
   *  haber tarifas ya guardadas así) cobra solo el primer tramo, en vez de
   *  dividir por cero (Infinity / NaN). */
  private calcularKmAdicional(km: number, kmDistancia: KmDistancia | null, valores: AdicionalKmValores | undefined): number {
    if (!kmDistancia || !valores || kmDistancia.primerSector <= 0) return 0;
    if (km <= kmDistancia.primerSector) return 0;
    let monto = valores.primerSector;
    if (kmDistancia.sectoresSiguientes <= 0) return monto;
    const tramosSiguientes = Math.ceil((km - kmDistancia.primerSector) / kmDistancia.sectoresSiguientes) - 1;
    monto += tramosSiguientes * valores.sectoresSiguientes;
    return monto;
  }

  /** Eventual: no hay RefTarifaAplicada — el valor base sale directo de
   *  datosTarifaEventual (mismo criterio que el sistema viejo); el adicional
   *  por acompañante se toma siempre de la General vigente (ídem sistema
   *  viejo). Sin adicional por km: eventual no lo contempla. */
  private valoresEventual(op: Operacion): Valores | null {
    if (!op.datosTarifaEventual) return null;
    const general = this.tarifario.getTarifaGeneralVigente();

    const chofer = this.choferServ.getChoferPorId(op.chofer.id);
    const esProveedor = chofer ? chofer.contratacion.tipo === 'proveedor' : op.proveedor !== null;

    const acompCliente = general ? general.acompanianteACobrar : 0;
    const acompChofer = general
      ? (esProveedor ? (general.acompanianteAPagarProveedor ?? general.acompanianteAPagar) : general.acompanianteAPagar)
      : 0;

    const tarifaBaseCliente = op.datosTarifaEventual.cliente.valor;
    const tarifaBaseChofer = op.datosTarifaEventual.chofer.valor;
    const acompValorCliente = op.acompaniante ? acompCliente * (op.acompanianteCant ?? 1) : 0;
    const acompValorChofer = op.acompaniante ? acompChofer * (op.acompanianteCant ?? 1) : 0;

    // Multiplicador 0 zanja todo el lado a 0 — mismo criterio que armarValoresNuevos
    // (incluido el ?? 0 para null/undefined, ver comentario ahí).
    const ladoCliente = (op.multiplicadorCliente ?? 0) === 0
      ? { acompValor: 0, kmAdicional: 0, tarifaBase: 0, aCobrar: 0, adExtraValor: 0 }
      : {
          acompValor: acompValorCliente,
          kmAdicional: 0,
          tarifaBase: tarifaBaseCliente,
          aCobrar: tarifaBaseCliente * op.multiplicadorCliente + acompValorCliente + (op.valores.cliente.adExtraValor ?? 0),
          adExtraValor: op.valores.cliente.adExtraValor ?? 0,
        };

    const ladoChofer = (op.multiplicadorChofer ?? 0) === 0
      ? { acompValor: 0, kmAdicional: 0, tarifaBase: 0, aPagar: 0, adExtraValor: 0 }
      : {
          acompValor: acompValorChofer,
          kmAdicional: 0,
          tarifaBase: tarifaBaseChofer,
          aPagar: tarifaBaseChofer * op.multiplicadorChofer + acompValorChofer + (op.valores.chofer.adExtraValor ?? 0),
          adExtraValor: op.valores.chofer.adExtraValor ?? 0,
        };

    return { cliente: ladoCliente, chofer: ladoChofer };
  }
}

import { Injectable } from '@angular/core';

import { Operacion, Valores } from 'src/app/interfaces/operacion';
import { ConId, ConIdType } from 'src/app/interfaces/conId';
import { RefTarifaAplicada } from 'src/app/interfaces/ref-tarifa-aplicada';
import { RefTarifaHabilitada } from 'src/app/interfaces/tarifa-habilitada';
import { Tarifa, EntidadTipo, KmDistancia, AdicionalKmValores, Seccion, CategoriaTarifa, ModoTarifacion } from 'src/app/interfaces/tarifa';
import { TarifaEspecial, CategoriaEspecial } from 'src/app/interfaces/tarifa-especial';
import { RegistroOpEventual } from 'src/app/interfaces/registro-op-eventual';

import { TarifarioService } from 'src/app/servicios/tarifario/tarifario.service';
import { ClienteService } from 'src/app/servicios/clientes/cliente.service';
import { ChoferService } from 'src/app/servicios/choferes/chofer.service';
import { ProveedorService } from 'src/app/servicios/proveedores/proveedor.service';
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

/** Resultado de listar candidatos de un lado (cliente o chofer/proveedor) en el nivel
 *  de jerarquía que ganó (Personalizada > Especial > General). Con 1 candidato la UI
 *  puede autoseleccionar; con 2+ el usuario elige. */
export interface CandidatosLado {
  nivelResuelto: 'personalizada' | 'especial' | 'general' | null;
  candidatos: CandidatoTarifa[];
  motivoSinCandidatos: string | null;
}

/** Resolución de jerarquía + cálculo del sistema NUEVO de Tarifas (Bloque 6).
 *  Corre en paralelo al sistema viejo (ValoresOpService / op.tarifaTipo /
 *  op.valores) sin tocarlo ni reemplazarlo — completa exclusivamente
 *  op.tarifaAplicadaCliente/Chofer y op.valoresNuevos.
 *
 *  Dos momentos de uso:
 *   - ALTA (calcularAlta): resuelve jerarquía (Eventual > Personalizada >
 *     Especial > General) y calcula valores iniciales. Congela la referencia.
 *   - CIERRE (calcularCierre): NO vuelve a resolver — reusa la referencia
 *     congelada en el alta y recalcula con km/multiplicadores/acompañantes
 *     actuales (pueden haber cambiado desde el alta).
 *
 *  Resolución automática con fallback a selección manual en operaciones-editor
 *  (Bloque 7 Paso 1). Si no puede determinar un único ganador (nivel habilitado
 *  sin tarifa vigente, más de una vigente simultánea, una tarifa con más de una
 *  sección, o — Personalizada por km — más de una categoría libre en su única
 *  sección) NO bloquea: deja la referencia/valores en null para ese lado y
 *  devuelve el motivo en `errores` para que el caller lo registre en el log de
 *  actividad.
 *
 *  modoTarifacion === 'km' (Personalizada): sin escalones de distancia — el valor
 *  cargado en la categoría ES la tarifa por km, se multiplica por op.km al calcular
 *  (ver calcularLado). Igual que en modo categoría, con una sola categoría se
 *  resuelve sola; con 2+ no hay forma automática de saber cuál corresponde (no
 *  matchean por categoría de vehículo) y requiere elegir a mano. */
@Injectable({ providedIn: 'root' })
export class ValoresTarifaService {

  constructor(
    private tarifario: TarifarioService,
    private clienteServ: ClienteService,
    private choferServ: ChoferService,
    private proveedorServ: ProveedorService,
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

    const cliente = this.clienteServ.getClientePorId(op.cliente.id);
    if (!cliente) {
      errores.push(`cliente ${op.cliente.id} no encontrado`);
      op.tarifaAplicadaCliente = null;
      op.tarifaAplicadaChofer = null;
      op.valoresNuevos = null;
      return { op, errores };
    }

    const chofer = this.choferServ.getChoferPorId(op.chofer.id);
    if (!chofer) {
      errores.push(`chofer ${op.chofer.id} no encontrado`);
      op.tarifaAplicadaCliente = null;
      op.tarifaAplicadaChofer = null;
      op.valoresNuevos = null;
      return { op, errores };
    }

    const esProveedor = chofer.contratacion.tipo === 'proveedor';
    const idEntidadChofer = esProveedor
      ? (chofer.contratacion as { tipo: 'proveedor'; idProveedor: string }).idProveedor
      : chofer.id;
    const entidadTipoChofer: EntidadTipo = esProveedor ? 'proveedor' : 'chofer';
    const habilitadasChofer = this.proveedorServ.resolverTarifasHabilitadasChofer(chofer);

    // Bloque 7 (mini-frente operaciones-editor): si el lado ya viene resuelto desde la
    // selección manual del usuario en el editor, se respeta tal cual — NO se vuelve a
    // resolver la jerarquía acá (pisaría una elección de Personalizada o una tarifa
    // elegida entre varias vigentes simultáneas).
    const resCliente = op.tarifaAplicadaCliente
      ? { ref: op.tarifaAplicadaCliente, error: null }
      : this.resolverLado('cliente', cliente.id, cliente.tarifasHabilitadas, op.vehiculo.categoria, op.cliente.id);

    // Personalizada es exclusiva de Clientes y determina AMBOS lados de la
    // operación — si el cliente resolvió a una Personalizada, el chofer/proveedor
    // NO resuelve su propia jerarquía: hereda la misma referencia (misma tarifa/
    // sección/categoría; calcularLado ya lee aPagar/aPagarProveedor de esa
    // categoría para el lado chofer). Defensa en profundidad — en el flujo real
    // esto ya viene resuelto así desde operaciones-editor (Bloque 7 Paso 1/2).
    const resChofer = op.tarifaAplicadaChofer
      ? { ref: op.tarifaAplicadaChofer, error: null }
      : resCliente.ref?.nivel === 'personalizada'
        ? { ref: resCliente.ref, error: null }
        : this.resolverLado(entidadTipoChofer, idEntidadChofer, habilitadasChofer, op.vehiculo.categoria, op.cliente.id);

    op.tarifaAplicadaCliente = resCliente.ref;
    op.tarifaAplicadaChofer = resChofer.ref;
    if (resCliente.error) errores.push(resCliente.error);
    if (resChofer.error) errores.push(resChofer.error);

    op.valoresNuevos = this.armarValoresNuevos(op, resCliente.ref, resChofer.ref, esProveedor);

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

  // ── Resolución de jerarquía (privado) ───────────────────────────

  private resolverLado(
    entidadTipo: EntidadTipo,
    idEntidad: string,
    habilitadas: RefTarifaHabilitada[],
    categoriaVehiculo: { catOrden: number; nombre: string },
    idClienteOp: string,
  ): { ref: RefTarifaAplicada | null; error: string | null } {

    const niveles = new Set(habilitadas.map(h => h.nivel));

    // 1. Personalizada
    if (niveles.has('personalizada')) {
      const candidatas = this.tarifario.getTarifasPersonalizadasVigentes(idEntidad);
      const r = this.resolverEnCandidatas(candidatas, categoriaVehiculo);
      if (r.ref) return { ref: r.ref, error: null };
      return { ref: null, error: `personalizada de ${entidadTipo} ${idEntidad}: ${r.motivo}` };
    }

    // 2. Especial (alcance específico al cliente de la operación gana sobre el genérico)
    if (niveles.has('especial')) {
      let candidatas = this.tarifario.getTarifasEspecialesVigentes(idEntidad).filter(t => t.entidadTipo === entidadTipo);
      if (entidadTipo !== 'cliente') {
        const especificas = candidatas.filter(t => t.alcance.tipo === 'entidadCliente' && t.alcance.idCliente === idClienteOp);
        candidatas = especificas.length > 0 ? especificas : candidatas.filter(t => t.alcance.tipo === 'entidad');
      }
      const r = this.resolverEnCandidatas(candidatas, categoriaVehiculo);
      if (r.ref) return { ref: r.ref, error: null };
      if (!r.categoriaNoIncluida) {
        return { ref: null, error: `especial de ${entidadTipo} ${idEntidad}: ${r.motivo}` };
      }
      // categoriaNoIncluida → Bloque 4 ajuste 1: la especial no cubre esta categoría del vehículo → cae a General.
    }

    // 3. General
    const general = this.tarifario.getTarifaGeneralVigente();
    if (!general) return { ref: null, error: `no hay tarifa general vigente` };
    const r = this.resolverEnCandidatas([general], categoriaVehiculo);
    if (r.ref) return { ref: r.ref, error: null };
    return { ref: null, error: `general: ${r.motivo}` };
  }

  /** Exige exactamente 1 tarifa vigente y exactamente 1 sección (más de una
   *  sección requiere elegir a mano cuál — no disponible en este bloque). */
  private resolverEnCandidatas(
    candidatas: (ConIdType<Tarifa> | ConIdType<TarifaEspecial>)[],
    categoriaVehiculo: { catOrden: number; nombre: string },
  ): { ref: RefTarifaAplicada | null; motivo: string | null; categoriaNoIncluida: boolean } {

    if (candidatas.length === 0) {
      return { ref: null, motivo: 'sin tarifa vigente', categoriaNoIncluida: false };
    }
    if (candidatas.length > 1) {
      return { ref: null, motivo: `${candidatas.length} tarifas vigentes simultáneas (ambigüedad)`, categoriaNoIncluida: false };
    }
    const tarifa = candidatas[0];
    if (tarifa.secciones.length !== 1) {
      return { ref: null, motivo: `tiene ${tarifa.secciones.length} secciones — requiere selección manual (pendiente, mini-frente operaciones-editor)`, categoriaNoIncluida: false };
    }
    const seccion = tarifa.secciones[0];
    let categoria: any;
    if (tarifa.modoTarifacion === 'km') {
      // Personalizada por km: categorías libres, no matchean por nombre de vehículo.
      // Con una sola no hay ambigüedad — se resuelve sola. Con 2+ no hay forma
      // automática de saber cuál corresponde — requiere elegir a mano.
      if (seccion.categorias.length === 0) {
        return { ref: null, motivo: `modoTarifacion 'km': la tarifa no tiene categorías cargadas`, categoriaNoIncluida: false };
      }
      if (seccion.categorias.length > 1) {
        return { ref: null, motivo: `modoTarifacion 'km' con ${seccion.categorias.length} categorías — requiere selección manual (mini-frente operaciones-editor)`, categoriaNoIncluida: false };
      }
      categoria = seccion.categorias[0];
    } else {
      categoria = seccion.categorias.find((c: any) => c.nombre === categoriaVehiculo.nombre);
      if (!categoria) {
        return { ref: null, motivo: `categoría '${categoriaVehiculo.nombre}' no está en la tarifa`, categoriaNoIncluida: true };
      }
    }
    return {
      ref: {
        idTarifa: tarifa.idTarifa,
        nivel: tarifa.nivel as 'general' | 'especial' | 'personalizada',
        nombreTarifa: tarifa.nombre,
        seccion: seccion.orden,
        categoria: categoria.orden,
        nombreCategoria: categoria.nombre,
      },
      motivo: null,
      categoriaNoIncluida: false,
    };
  }

  // ── Listado de candidatos para selección manual (mini-frente operaciones-editor) ──

  /** Mismo descenso de jerarquía que resolverLado (Personalizada > Especial > General),
   *  pero en vez de exigir un único ganador devuelve TODOS los candidatos vigentes del
   *  primer nivel que tenga alguno — el usuario elige en operaciones-editor cuando hay
   *  más de uno. Eventual no pasa por acá: se detecta en el componente vía
   *  op.datosTarifaEventual y usa sus propios campos, no RefTarifaAplicada. */
  listarCandidatosLado(
    entidadTipo: EntidadTipo,
    idEntidad: string,
    habilitadas: RefTarifaHabilitada[],
    categoriaVehiculo: { catOrden: number; nombre: string },
    idClienteOp: string,
  ): CandidatosLado {
    const niveles = new Set(habilitadas.map(h => h.nivel));

    if (niveles.has('personalizada')) {
      const candidatas = this.tarifario.getTarifasPersonalizadasVigentes(idEntidad);
      if (candidatas.length > 0) {
        return { nivelResuelto: 'personalizada', candidatos: candidatas.map(t => this.aCandidato(t)), motivoSinCandidatos: null };
      }
      return { nivelResuelto: null, candidatos: [], motivoSinCandidatos: `personalizada de ${entidadTipo} ${idEntidad}: sin tarifa vigente` };
    }

    if (niveles.has('especial')) {
      let candidatas = this.tarifario.getTarifasEspecialesVigentes(idEntidad)
        .filter(t => t.entidadTipo === entidadTipo && t.modoTarifacion !== 'km');
      if (entidadTipo !== 'cliente') {
        const especificas = candidatas.filter(t => t.alcance.tipo === 'entidadCliente' && t.alcance.idCliente === idClienteOp);
        candidatas = especificas.length > 0 ? especificas : candidatas.filter(t => t.alcance.tipo === 'entidad');
      }
      // Mismo criterio que resolverLado: una especial de 1 sola sección que no cubre
      // la categoría del vehículo no es candidata — cae a General.
      candidatas = candidatas.filter(t =>
        t.secciones.length !== 1 || t.secciones[0].categorias.some((cat: any) => cat.nombre === categoriaVehiculo.nombre));
      if (candidatas.length > 0) {
        return { nivelResuelto: 'especial', candidatos: candidatas.map(t => this.aCandidato(t)), motivoSinCandidatos: null };
      }
      // ninguna especial cubre la categoría → cae a General.
    }

    const general = this.tarifario.getTarifaGeneralVigente();
    if (general && general.modoTarifacion !== 'km') {
      return { nivelResuelto: 'general', candidatos: [this.aCandidato(general)], motivoSinCandidatos: null };
    }
    return { nivelResuelto: null, candidatos: [], motivoSinCandidatos: 'no hay tarifa general vigente' };
  }

  private aCandidato(t: ConIdType<Tarifa> | ConIdType<TarifaEspecial>): CandidatoTarifa {
    return { idTarifa: t.idTarifa, nivel: t.nivel as 'general' | 'especial' | 'personalizada', nombreTarifa: t.nombre, modoTarifacion: t.modoTarifacion, secciones: t.secciones };
  }

  /** Intenta resolver Sección + Categoría automáticamente para un candidato ya elegido
   *  (nivel general/especial siempre, o personalizada cuando tiene una sola sección).
   *  Categoría por match de nombre contra la categoría del vehículo — mismo criterio
   *  que resolverEnCandidatas. Si la tarifa tiene más de una sección devuelve
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
      categoria: categoria.orden,
      nombreCategoria: categoria.nombre,
    };
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

    // Multiplicador 0 zanja todo el lado a 0 (acompañante, km adicional y
    // extra incluidos) — decisión de negocio confirmada, unificada acá para
    // que alta y cierre compartan el mismo criterio (Bloque 7 Paso 2).
    const ladoCliente = op.multiplicadorCliente === 0
      ? { acompValor: 0, kmAdicional: 0, tarifaBase: 0, aCobrar: 0, adExtraValor: 0 }
      : {
          acompValor: cliente.acompValor,
          kmAdicional: cliente.kmAdicional,
          tarifaBase: cliente.tarifaBase,
          aCobrar: cliente.tarifaBase * op.multiplicadorCliente + cliente.kmAdicional + cliente.acompValor + (op.valores.cliente.adExtraValor ?? 0),
          adExtraValor: op.valores.cliente.adExtraValor ?? 0,
        };

    const ladoChofer = op.multiplicadorChofer === 0
      ? { acompValor: 0, kmAdicional: 0, tarifaBase: 0, aPagar: 0, adExtraValor: 0 }
      : {
          acompValor: chofer.acompValor,
          kmAdicional: chofer.kmAdicional,
          tarifaBase: chofer.tarifaBase,
          aPagar: chofer.tarifaBase * op.multiplicadorChofer + chofer.kmAdicional + chofer.acompValor + (op.valores.chofer.adExtraValor ?? 0),
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

  private calcularKmAdicional(km: number, kmDistancia: KmDistancia | null, valores: AdicionalKmValores | undefined): number {
    if (!kmDistancia || !valores || kmDistancia.primerSector <= 0) return 0;
    if (km < kmDistancia.primerSector) return 0;
    let monto = valores.primerSector;
    const kmRestantes = km - kmDistancia.primerSector;
    const sectoresAdicionales = Math.floor(kmRestantes / kmDistancia.sectoresSiguientes);
    monto += sectoresAdicionales * valores.sectoresSiguientes;
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

    // Multiplicador 0 zanja todo el lado a 0 — mismo criterio que armarValoresNuevos.
    const ladoCliente = op.multiplicadorCliente === 0
      ? { acompValor: 0, kmAdicional: 0, tarifaBase: 0, aCobrar: 0, adExtraValor: 0 }
      : {
          acompValor: acompValorCliente,
          kmAdicional: 0,
          tarifaBase: tarifaBaseCliente,
          aCobrar: tarifaBaseCliente * op.multiplicadorCliente + acompValorCliente + (op.valores.cliente.adExtraValor ?? 0),
          adExtraValor: op.valores.cliente.adExtraValor ?? 0,
        };

    const ladoChofer = op.multiplicadorChofer === 0
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

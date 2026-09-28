import { Injectable, inject } from '@angular/core';
import { Operacion } from 'src/app/interfaces/operacion';
import { Chofer, TarifaTipo, Vehiculo } from 'src/app/interfaces/chofer';
import { ConIdType } from 'src/app/interfaces/conId';
import { EntidadTipo } from 'src/app/interfaces/tarifa';
import { ClienteService } from 'src/app/servicios/clientes/cliente.service';
import { ChoferService } from 'src/app/servicios/choferes/chofer.service';
import { ProveedorService } from 'src/app/servicios/proveedores/proveedor.service';
import { OperacionFactoryService } from 'src/app/servicios/operaciones/operacion-factory.service';
import {
  CandidatoTarifa, CandidatosLado, ValoresTarifaService,
} from 'src/app/servicios/tarifario/valores-tarifa.service';

/** Resultado de listar candidatos de tarifa de una operación:
 *  - 'eventual':   la op es eventual (no usa tarifaAplicada*);
 *  - 'pendiente':  falta chofer o vehículo (los candidatos dependen de ambos);
 *  - 'sinEntidad': cliente o chofer no encontrados en memoria;
 *  - 'ok':         candidatos de ambos lados. */
export type ResultadoCandidatosOp =
  | { estado: 'eventual' }
  | { estado: 'pendiente' }
  | { estado: 'sinEntidad' }
  | { estado: 'ok'; cliente: CandidatosLado; chofer: CandidatosLado };

/** Reglas de DOMINIO para completar una operación nueva antes del alta
 *  (chofer/vehículo pendientes, eventual forzada, candidatos de tarifa por
 *  lado, espejo de Personalizada). Sin estado: opera sobre la Operacion que
 *  recibe (la muta in-place donde corresponde).
 *  Consumidores: OperacionesEditorComponent (decisiones de una persona) y el
 *  generador de operaciones de prueba (decisiones al azar). La política de
 *  interacción (autoselección, pickers, toggles) queda en cada consumidor.
 *  Extraído del editor sin cambios de comportamiento (P2 del generador). */
@Injectable({ providedIn: 'root' })
export class ResolucionTarifaOpService {

  private clienteService = inject(ClienteService);
  private choferService = inject(ChoferService);
  private proveedorService = inject(ProveedorService);
  private operacionFactory = inject(OperacionFactoryService);
  private valoresTarifa = inject(ValoresTarifaService);

  /** Choferes para resolver el chofer pendiente: los del proveedor de la op. */
  choferesDisponibles(op: Operacion): ConIdType<Chofer>[] {
    if (!op.proveedor) return [];
    return this.choferService.getChoferesPorProveedor(op.proveedor.id);
  }

  /** Vehículos disponibles: del proveedor si la op es de proveedor, del chofer
   *  si es directa. */
  vehiculosDisponibles(op: Operacion): ConIdType<Vehiculo>[] {
    const vehiculos = this.choferService.getVehiculosActuales();
    if (op.proveedor) {
      return vehiculos.filter(v =>
        v.asignadoA.tipo === 'proveedor' && v.asignadoA.idProveedor === op.proveedor!.id);
    }
    if (op.chofer.id) {
      return vehiculos.filter(v =>
        v.asignadoA.tipo === 'chofer' && v.asignadoA.idChofer === op.chofer.id);
    }
    return [];
  }

  /** Resuelve el chofer: puebla RefChofer y recalcula tarifaTipo con la tarifa
   *  del PROVEEDOR (el chofer de proveedor la hereda), manteniendo el
   *  invariante de datosTarifaX (aplicarTarifaTipo). `tipoRecalculado` es null
   *  si el cliente no está en memoria (no se recalcula). `asignado` false si
   *  el id es vacío o el chofer no existe (la op no se toca). */
  asignarChofer(op: Operacion, idChofer: string): { asignado: boolean; tipoRecalculado: TarifaTipo | null } {
    if (!idChofer) return { asignado: false, tipoRecalculado: null };
    const chofer = this.choferService.getChoferPorId(idChofer);
    if (!chofer) return { asignado: false, tipoRecalculado: null };

    op.chofer = {
      id:       chofer.id,
      nombre:   chofer.datosPersonales.nombre,
      apellido: chofer.datosPersonales.apellido,
      cuit:     chofer.datosPersonales.cuit,
    };

    // Recalcular tarifaTipo. Cliente vivo + tarifa secundaria del proveedor.
    const cliente = this.clienteService.getClientePorId(op.cliente.id);
    if (!cliente) return { asignado: true, tipoRecalculado: null };

    const tarifaProveedor = op.proveedor
      ? this.proveedorService.getTarifaTipo(op.proveedor.id)
      : undefined;
    const nuevoTipo = this.operacionFactory.recalcularTarifaTipo(cliente, tarifaProveedor);
    this.operacionFactory.aplicarTarifaTipo(op, nuevoTipo);
    return { asignado: true, tipoRecalculado: nuevoTipo };
  }

  /** Resuelve el vehículo: puebla RefVehiculo. false si el id es vacío o el
   *  vehículo no existe (la op no se toca). */
  asignarVehiculo(op: Operacion, idVehiculo: string): boolean {
    if (!idVehiculo) return false;
    const v = this.choferService.getVehiculoPorId(idVehiculo);
    if (!v) return false;
    op.vehiculo = { id: v.id, dominio: v.dominio, categoria: v.categoria };
    return true;
  }

  /** True si la op es eventual porque el cliente o el chofer/proveedor tienen
   *  el nivel Eventual habilitado (por invariante, cuando Eventual está
   *  habilitado es el único nivel de esa entidad). Con chofer pendiente se
   *  asume no forzado (todavía no se puede resolver la tarifa del proveedor). */
  esEventualForzada(op: Operacion): boolean {
    const cliente = this.clienteService.getClientePorId(op.cliente.id);
    if (cliente?.tarifasHabilitadas.some(h => h.nivel === 'eventual')) return true;

    if (op.chofer.id === '') return false;
    const chofer = this.choferService.getChoferPorId(op.chofer.id);
    if (!chofer) return false;

    return this.proveedorService
      .resolverTarifasHabilitadasChofer(chofer)
      .some(h => h.nivel === 'eventual');
  }

  /** Candidatos de tarifa de ambos lados (ValoresTarifaService.listarCandidatosLado).
   *  El lado chofer se calcula SIEMPRE con su propia jerarquía (chofer directo
   *  o proveedor del chofer); quién lo gobierna al final (propio o espejo de
   *  Personalizada del cliente) lo decide el consumidor al aplicar la ref. */
  candidatosOp(op: Operacion): ResultadoCandidatosOp {
    if (op.datosTarifaEventual !== null) return { estado: 'eventual' };
    if (op.chofer.id === '' || op.vehiculo.id === '') return { estado: 'pendiente' };

    const cliente = this.clienteService.getClientePorId(op.cliente.id);
    const chofer = this.choferService.getChoferPorId(op.chofer.id);
    if (!cliente || !chofer) return { estado: 'sinEntidad' };

    const esProveedor = chofer.contratacion.tipo === 'proveedor';
    const idEntidadChofer = esProveedor
      ? (chofer.contratacion as { tipo: 'proveedor'; idProveedor: string }).idProveedor
      : chofer.id;
    const entidadTipoChofer: EntidadTipo = esProveedor ? 'proveedor' : 'chofer';
    const habilitadasChofer = this.proveedorService.resolverTarifasHabilitadasChofer(chofer);

    const ladoCliente = this.valoresTarifa.listarCandidatosLado(
      'cliente', cliente.id, cliente.tarifasHabilitadas, op.vehiculo.categoria, op.cliente.id);
    const ladoChofer = this.valoresTarifa.listarCandidatosLado(
      entidadTipoChofer, idEntidadChofer, habilitadasChofer, op.vehiculo.categoria, op.cliente.id);

    return { estado: 'ok', cliente: ladoCliente, chofer: ladoChofer };
  }

  /** Aplica la referencia elegida a un lado. Personalizada determina también
   *  el lado chofer/proveedor: si la ref REALMENTE elegida para el cliente es
   *  Personalizada, se espeja al chofer (no una habilitación estática: un
   *  cliente con Personalizada y General que termina eligiendo General no
   *  arrastra al chofer). */
  aplicarRef(op: Operacion, cual: 'cliente' | 'chofer', ref: Operacion['tarifaAplicadaCliente']): void {
    if (cual === 'cliente') {
      op.tarifaAplicadaCliente = ref;
      if (ref?.nivel === 'personalizada') {
        op.tarifaAplicadaChofer = ref;
      }
    } else {
      op.tarifaAplicadaChofer = ref;
    }
  }

  /** True si el candidato no se puede resolver solo y requiere elegir
   *  Sección/Categoría a mano: más de una sección, o Personalizada por km con
   *  2+ categorías libres en su única sección (no matchean por categoría de
   *  vehículo). */
  requiereSeleccionManual(candidato: CandidatoTarifa): boolean {
    if (candidato.secciones.length > 1) return true;
    return candidato.modoTarifacion === 'km' && (candidato.secciones[0]?.categorias.length ?? 0) > 1;
  }
}

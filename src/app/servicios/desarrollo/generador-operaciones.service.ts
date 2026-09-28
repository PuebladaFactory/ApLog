import { Injectable, inject } from '@angular/core';
import { environment } from 'src/environments/environment';
import { AsignacionItem } from 'src/app/interfaces/asignacion';
import { Chofer, Vehiculo } from 'src/app/interfaces/chofer';
import { Cliente } from 'src/app/interfaces/cliente';
import { ConIdType } from 'src/app/interfaces/conId';
import { NoDisponibilidadChofer } from 'src/app/interfaces/no-disponibilidad-chofer';
import { DatosTarifaEventual, Operacion } from 'src/app/interfaces/operacion';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { RefTarifaAplicada } from 'src/app/interfaces/ref-tarifa-aplicada';
import { Tarifa } from 'src/app/interfaces/tarifa';
import { ChoferService } from 'src/app/servicios/choferes/chofer.service';
import { ClienteService } from 'src/app/servicios/clientes/cliente.service';
import { DbFirestoreService } from 'src/app/servicios/database/db-firestore.service';
import { LimpiezaDemoService } from 'src/app/servicios/desarrollo/limpieza-demo.service';
import { toISODateString } from 'src/app/servicios/fechas/date-range.service';
import { OperacionFactoryService } from 'src/app/servicios/operaciones/operacion-factory.service';
import { OperacionCreada, OperacionService } from 'src/app/servicios/operaciones/operacion.service';
import { ProveedorService } from 'src/app/servicios/proveedores/proveedor.service';
import { ResolucionTarifaOpService } from 'src/app/servicios/tarifario/resolucion-tarifa-op.service';
import { TarifarioService } from 'src/app/servicios/tarifario/tarifario.service';
import { CandidatosLado, ValoresTarifaService } from 'src/app/servicios/tarifario/valores-tarifa.service';
import { UsuarioSesionService } from 'src/app/servicios/usuario-sesion/usuario-sesion.service';
import { Azar } from 'src/app/shared/utils/azar.util';

export interface ParametrosGenerador {
  desde: string;               // 'YYYY-MM-DD'
  hasta: string;               // 'YYYY-MM-DD' (inclusive)
  cantidadTotal: number;       // objetivo de operaciones en el rango
  pesoSabado: number;          // volumen del sábado relativo a un día hábil (0..1)
  incluirDomingos: boolean;    // domingos con la mitad del peso del sábado
  sesgoClientes: number;       // exponente Zipf: 0 = uniforme, 1 = pocos clientes con mucho volumen
  pctEventualExtra: number;    // eventuales además de las forzadas por tarifa (0..1)
  pctAcompaniante: number;     // 0..1
  pctCerrar: number;           // de las operaciones con fecha pasada (0..1)
  kmMin: number;
  kmMax: number;
  pctAdicionalExtra: number;   // de las que se cierran (0..1)
  semilla: number;
}

export const PARAMETROS_GENERADOR_POR_DEFECTO: Omit<ParametrosGenerador, 'desde' | 'hasta' | 'semilla'> = {
  cantidadTotal: 500,
  pesoSabado: 0.4,
  incluirDomingos: false,
  sesgoClientes: 1,
  pctEventualExtra: 0.05,
  pctAcompaniante: 0.15,
  pctCerrar: 0.8,
  kmMin: 20,
  kmMax: 250,
  pctAdicionalExtra: 0.1,
};

/** Lo que se hará al cerrar (P4). null en OperacionPlaneada = queda abierta. */
export interface DecisionCierre {
  km: number;
  adicional: { concepto: string; valorCliente: number; valorChofer: number } | null;
}

export interface OperacionPlaneada {
  /** Lista para altaDesdeAsignacion: item del tablero + operación completa
   *  (chofer, vehículo, tarifas o datos eventuales, acompañante). */
  creada: OperacionCreada;
  eventual: 'no' | 'forzada' | 'extra';
  cierre: DecisionCierre | null;
}

export interface DiaPlan {
  fecha: string;
  objetivo: number;
  ops: OperacionPlaneada[];
}

export interface ExclusionPlan {
  fecha: string;
  cliente: string;
  vehiculo: string;
  motivo: string;
}

export interface ResumenPlan {
  objetivo: number;
  totalOps: number;
  dias: number;
  directas: number;
  proveedor: number;
  eventualesForzadas: number;
  eventualesExtra: number;
  conAcompaniante: number;
  aCerrar: number;
  conAdicional: number;
  porCliente: { cliente: string; cantidad: number }[];     // de mayor a menor
  porNivelTarifaCliente: { nivel: string; cantidad: number }[];
  /** Días en los que no se llegó al objetivo (faltan vehículos/choferes). */
  diasSinCapacidad: string[];
}

export interface PlanGeneracion {
  parametros: ParametrosGenerador;
  dias: DiaPlan[];
  exclusiones: ExclusionPlan[];
  resumen: ResumenPlan;
}

type Resultado = OperacionPlaneada | { motivo: string };

/** Generador de operaciones de prueba (solo DEMO) — P3: PLAN.
 *  Arma en memoria, sin escribir nada, un período de operaciones realistas:
 *  por cada día elige cliente (reparto sesgado) y vehículo libre (1 op por
 *  vehículo y por chofer por día, respetando activos y no-disponibilidad),
 *  y completa la operación con las MISMAS piezas que usa la UI:
 *  OperacionService.crearOperacionesDesdeAsignacion (armado base) +
 *  ResolucionTarifaOpService (chofer de proveedor, eventual forzada,
 *  candidatos de tarifa, espejo de Personalizada) + ValoresTarifaService
 *  (sección/categoría). Donde una persona elegiría, elige al azar con
 *  semilla (reproducible). Las ejecuciones (alta por día + cierre) son P4.
 *  Diseño: claude/diseno-generador-operaciones.md. */
@Injectable({ providedIn: 'root' })
export class GeneradorOperacionesService {

  private clienteService = inject(ClienteService);
  private choferService = inject(ChoferService);
  private proveedorService = inject(ProveedorService);
  private operacionService = inject(OperacionService);
  private operacionFactory = inject(OperacionFactoryService);
  private resolucionTarifa = inject(ResolucionTarifaOpService);
  private valoresTarifa = inject(ValoresTarifaService);
  private tarifario = inject(TarifarioService);
  private db = inject(DbFirestoreService);
  private usuarioSesion = inject(UsuarioSesionService);

  private readonly MAX_DIAS = 62;
  private readonly CONCEPTOS_ADICIONAL = ['Peaje', 'Espera', 'Carga adicional', 'Estacionamiento'];

  esEntornoDemo(): boolean {
    return environment.firebase.projectId === LimpiezaDemoService.PROYECTO_DEMO;
  }

  /** Arma el plan completo en memoria. No escribe nada. */
  async planificar(p: ParametrosGenerador): Promise<PlanGeneracion> {
    this.verificarEntorno();
    this.validarParametros(p);

    const azar = new Azar(p.semilla);
    const hoy = toISODateString(new Date());

    const clientes = this.clienteService.getClientesActuales().filter(c => c.activo);
    const choferes = this.choferService.getChoferesActuales().filter(c => c.activo);
    const proveedores = this.proveedorService.getProveedoresActuales().filter(pr => pr.activo);
    const vehiculos = this.choferService.getVehiculosActuales();
    if (clientes.length === 0 || vehiculos.length === 0) {
      throw new Error('No hay clientes activos o vehículos en memoria (¿se cargaron las entidades? Recargá la app).');
    }
    const general = this.tarifario.getTarifaGeneralVigente() ?? null;
    const noDisponibles = (await this.db.obtenerTodosConId<NoDisponibilidadChofer>('noOperativo'))
      .map(n => n.data)
      .filter(n => n.activa);

    // Reparto sesgado de clientes: orden aleatorio (con semilla) + pesos Zipf.
    const pesosClientes = azar.mezclar(clientes)
      .map((cliente, i) => ({ cliente, peso: 1 / Math.pow(i + 1, p.sesgoClientes) }));

    const fechas = this.fechasDelRango(p);
    const sumaPesos = fechas.reduce((acc, f) => acc + f.peso, 0);

    const dias: DiaPlan[] = [];
    const exclusiones: ExclusionPlan[] = [];
    const diasSinCapacidad: string[] = [];

    for (const { fecha, peso } of fechas) {
      const objetivo = Math.max(0, Math.round(p.cantidadTotal * (peso / sumaPesos) * (0.85 + 0.3 * azar.siguiente())));
      const noDispDia = this.choferesNoDisponibles(noDisponibles, fecha);
      const pool = this.poolDelDia(vehiculos, choferes, proveedores, noDispDia);

      const usadosVehiculo = new Set<string>();
      const usadosChofer = new Set<string>();
      const ops: OperacionPlaneada[] = [];
      let intentos = 0;

      while (ops.length < objetivo && intentos < objetivo * 4) {
        intentos++;
        const libres = pool.filter(v => !usadosVehiculo.has(v.id));
        if (libres.length === 0) break;

        const cliente = azar.elegirPonderado(pesosClientes, x => x.peso).cliente;
        const vehiculo = azar.elegir(libres);
        const r = this.planificarOperacion(azar, p, fecha, hoy, cliente, vehiculo, general, noDispDia, usadosChofer);

        if ('motivo' in r) {
          exclusiones.push({ fecha, cliente: cliente.razonSocial, vehiculo: vehiculo.dominio, motivo: r.motivo });
          continue;
        }
        usadosVehiculo.add(vehiculo.id);
        usadosChofer.add(r.creada.operacion.chofer.id);
        ops.push(r);
      }

      if (ops.length < objetivo) diasSinCapacidad.push(fecha);
      dias.push({ fecha, objetivo, ops });
    }

    return { parametros: { ...p }, dias, exclusiones, resumen: this.resumir(p, dias, diasSinCapacidad) };
  }

  // ---------------------------------------------------------------------------
  // Una operación
  // ---------------------------------------------------------------------------

  private planificarOperacion(
    azar: Azar,
    p: ParametrosGenerador,
    fecha: string,
    hoy: string,
    cliente: ConIdType<Cliente>,
    vehiculo: ConIdType<Vehiculo>,
    general: ConIdType<Tarifa> | null,
    noDispDia: Set<string>,
    usadosChofer: Set<string>,
  ): Resultado {
    // 1. Item de tablero + operación base (mismo armado que el tablero).
    const item = this.armarItem(azar, cliente, vehiculo);
    const res = this.operacionService.crearOperacionesDesdeAsignacion([item], fecha);
    if (res.errores.length > 0) return { motivo: res.errores[0].motivo };
    const creada = res.creadas[0];
    const op = creada.operacion;

    // 2. Chofer: de proveedor → uno al azar entre los activos, disponibles y libres.
    if (op.chofer.id === '') {
      const candidatos = this.resolucionTarifa.choferesDisponibles(op)
        .filter(ch => ch.activo && !noDispDia.has(ch.id) && !usadosChofer.has(ch.id));
      if (candidatos.length === 0) return { motivo: 'el proveedor no tiene choferes disponibles ese día' };
      const { asignado } = this.resolucionTarifa.asignarChofer(op, azar.elegir(candidatos).id);
      if (!asignado) return { motivo: 'no se pudo asignar el chofer del proveedor' };
    } else if (usadosChofer.has(op.chofer.id)) {
      return { motivo: 'el chofer ya tiene una operación ese día' };
    }

    // 3. Tarifa: eventual (forzada o extra al azar) o candidatos por lado.
    let eventual: OperacionPlaneada['eventual'] = 'no';
    if (this.resolucionTarifa.esEventualForzada(op)) {
      eventual = 'forzada';
    } else if (azar.chance(p.pctEventualExtra)) {
      eventual = 'extra';
    }

    if (eventual !== 'no') {
      if (!op.tarifaTipo.eventual) {
        this.operacionFactory.aplicarTarifaEventual(op, true, { ...op.tarifaTipo });
      }
      const datos = this.valoresEventual(azar, op, general);
      if (!datos) return { motivo: `sin tarifa general para la categoría '${op.vehiculo.categoria.nombre}' (valor eventual)` };
      op.datosTarifaEventual = datos;
    } else {
      const motivo = this.resolverTarifas(azar, op);
      if (motivo) return { motivo };
    }

    // 4. Acompañante.
    if (azar.chance(p.pctAcompaniante)) {
      op.acompaniante = true;
      op.acompanianteCant = 1;
    }

    // 5. Cierre (solo fechas pasadas).
    let cierre: DecisionCierre | null = null;
    if (fecha < hoy && azar.chance(p.pctCerrar)) {
      cierre = { km: azar.entero(p.kmMin, p.kmMax), adicional: null };
      if (azar.chance(p.pctAdicionalExtra)) {
        const valorCliente = this.redondear(azar.entero(3000, 25000));
        cierre.adicional = {
          concepto: azar.elegir(this.CONCEPTOS_ADICIONAL),
          valorCliente,
          valorChofer: this.redondear(valorCliente * 0.7),
        };
      }
    }

    return { creada, eventual, cierre };
  }

  private armarItem(azar: Azar, cliente: ConIdType<Cliente>, vehiculo: ConIdType<Vehiculo>): AsignacionItem {
    const a = vehiculo.asignadoA;
    return {
      idItem: crypto.randomUUID(),
      idCliente: cliente.id,
      sujeto: a.tipo === 'chofer'
        ? { tipo: 'directo', idChofer: a.idChofer, idVehiculo: vehiculo.id }
        : { tipo: 'proveedor', idProveedor: a.idProveedor, idChofer: null, idVehiculo: vehiculo.id },
      // Provisorio: altaDesdeAsignacion reconstruye el ref desde la op final.
      ref: {
        dominio: vehiculo.dominio,
        categoria: vehiculo.categoria,
        asignadoA: a.tipo === 'chofer'
          ? { tipo: 'chofer', idChofer: a.idChofer, nombre: '', apellido: '' }
          : { tipo: 'proveedor', idProveedor: a.idProveedor, razonSocial: '' },
      },
      observacion: '',
      hojaDeRuta: `HR-${azar.entero(10000, 99999)}`,
      idOperacion: null,
      estado: { estado: 'activa' },
    };
  }

  /** Elige tarifa por lado. Si el cliente queda en Personalizada, el lado
   *  chofer se espeja (aplicarRef) y no se elige nada propio. Devuelve el
   *  motivo si no se pudo resolver, o null. */
  private resolverTarifas(azar: Azar, op: Operacion): string | null {
    const res = this.resolucionTarifa.candidatosOp(op);
    if (res.estado !== 'ok') return `tarifa no resoluble (${res.estado})`;

    const cliente = this.elegirRef(azar, res.cliente, op);
    if (!cliente.ref) return `tarifa cliente: ${cliente.motivo}`;
    this.resolucionTarifa.aplicarRef(op, 'cliente', cliente.ref);

    if (cliente.ref.nivel !== 'personalizada') {
      const chofer = this.elegirRef(azar, res.chofer, op);
      if (!chofer.ref) return `tarifa chofer/proveedor: ${chofer.motivo}`;
      this.resolucionTarifa.aplicarRef(op, 'chofer', chofer.ref);
    }
    return null;
  }

  /** Candidato al azar; Sección/Categoría automática si se puede (misma regla
   *  que el editor) y, si no, sección al azar + categoría del vehículo (modo
   *  categoría) o categoría al azar (Personalizada por km). */
  private elegirRef(azar: Azar, lado: CandidatosLado, op: Operacion): { ref: RefTarifaAplicada | null; motivo: string } {
    if (lado.candidatos.length === 0) {
      return { ref: null, motivo: lado.motivoSinCandidatos ?? 'sin candidatos' };
    }
    const candidato = azar.elegir(lado.candidatos);

    if (!this.resolucionTarifa.requiereSeleccionManual(candidato)) {
      const r = this.valoresTarifa.resolverSeccionCategoria(candidato, op.vehiculo.categoria);
      return { ref: r.ref, motivo: r.motivo ?? `sin referencia en '${candidato.nombreTarifa}'` };
    }

    const seccion = azar.elegir(candidato.secciones);
    const categoria: any = candidato.modoTarifacion === 'km'
      ? (seccion.categorias.length > 0 ? azar.elegir(seccion.categorias) : null)
      : seccion.categorias.find((c: any) => c.nombre === op.vehiculo.categoria.nombre) ?? null;
    if (!categoria) {
      return { ref: null, motivo: `la sección elegida de '${candidato.nombreTarifa}' no tiene la categoría '${op.vehiculo.categoria.nombre}'` };
    }
    const ref = this.valoresTarifa.armarRefManual(candidato, seccion.orden, categoria.orden);
    return { ref, motivo: ref ? '' : `no se pudo armar la referencia de '${candidato.nombreTarifa}'` };
  }

  /** Valores eventuales: los de la tarifa general para la categoría del
   *  vehículo ±20% (a cobrar; a pagar al proveedor si la general usa esos
   *  valores y la op es de proveedor). null si no hay general o no tiene la
   *  categoría. */
  private valoresEventual(azar: Azar, op: Operacion, general: ConIdType<Tarifa> | null): DatosTarifaEventual | null {
    if (!general) return null;
    const categoria = general.secciones
      .flatMap(s => s.categorias)
      .find(c => c.nombre === op.vehiculo.categoria.nombre);
    if (!categoria) return null;

    const basePagar = op.proveedor && general.usaValoresProveedor && categoria.aPagarProveedor != null
      ? categoria.aPagarProveedor
      : categoria.aPagar;
    return {
      cliente: { concepto: 'Servicio eventual', valor: this.redondear(azar.variar(categoria.aCobrar, 0.2)) },
      chofer: { concepto: 'Servicio eventual', valor: this.redondear(azar.variar(basePagar, 0.2)) },
    };
  }

  // ---------------------------------------------------------------------------
  // Días, disponibilidad, resumen
  // ---------------------------------------------------------------------------

  /** Días del rango con su peso (hábil 1, sábado pesoSabado, domingo la
   *  mitad del sábado o 0). Fechas locales, sin pasar por UTC. */
  private fechasDelRango(p: ParametrosGenerador): { fecha: string; peso: number }[] {
    const [ad, md, dd] = p.desde.split('-').map(Number);
    const [ah, mh, dh] = p.hasta.split('-').map(Number);
    const d = new Date(ad, md - 1, dd);
    const fin = new Date(ah, mh - 1, dh);
    const res: { fecha: string; peso: number }[] = [];
    while (d <= fin) {
      const dia = d.getDay();
      const peso = dia === 6 ? p.pesoSabado
        : dia === 0 ? (p.incluirDomingos ? p.pesoSabado / 2 : 0)
        : 1;
      if (peso > 0) res.push({ fecha: toISODateString(d), peso });
      d.setDate(d.getDate() + 1);
    }
    return res;
  }

  /** Mismo criterio que el tablero: una no-disponibilidad cubre la fecha si
   *  desde <= fecha y (sin hasta o fecha <= hasta). */
  private choferesNoDisponibles(lista: NoDisponibilidadChofer[], fecha: string): Set<string> {
    return new Set(lista
      .filter(n => n.desde <= fecha && (!n.hasta || fecha <= n.hasta))
      .map(n => n.idChofer));
  }

  /** Vehículos utilizables el día: de chofer directo activo y disponible, o de
   *  proveedor activo con al menos un chofer activo disponible. */
  private poolDelDia(
    vehiculos: ConIdType<Vehiculo>[],
    choferes: ConIdType<Chofer>[],
    proveedores: ConIdType<Proveedor>[],
    noDispDia: Set<string>,
  ): ConIdType<Vehiculo>[] {
    const idsProveedoresActivos = new Set(proveedores.map(pr => pr.id));
    const proveedoresConChofer = new Set(choferes
      .filter(ch => ch.contratacion.tipo === 'proveedor' && !noDispDia.has(ch.id))
      .map(ch => (ch.contratacion as { tipo: 'proveedor'; idProveedor: string }).idProveedor));
    const idsChoferesDirectos = new Set(choferes
      .filter(ch => ch.contratacion.tipo === 'directo' && !noDispDia.has(ch.id))
      .map(ch => ch.id));

    return vehiculos.filter(v => v.asignadoA.tipo === 'chofer'
      ? idsChoferesDirectos.has(v.asignadoA.idChofer)
      : idsProveedoresActivos.has(v.asignadoA.idProveedor) && proveedoresConChofer.has(v.asignadoA.idProveedor));
  }

  private resumir(p: ParametrosGenerador, dias: DiaPlan[], diasSinCapacidad: string[]): ResumenPlan {
    const ops = dias.flatMap(d => d.ops);
    const porCliente = new Map<string, number>();
    const porNivel = new Map<string, number>();
    for (const o of ops) {
      const op = o.creada.operacion;
      porCliente.set(op.cliente.razonSocial, (porCliente.get(op.cliente.razonSocial) ?? 0) + 1);
      const nivel = op.datosTarifaEventual ? 'eventual' : (op.tarifaAplicadaCliente?.nivel ?? 'sin tarifa');
      porNivel.set(nivel, (porNivel.get(nivel) ?? 0) + 1);
    }
    const ordenar = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1]);
    return {
      objetivo: p.cantidadTotal,
      totalOps: ops.length,
      dias: dias.length,
      directas: ops.filter(o => o.creada.operacion.proveedor === null).length,
      proveedor: ops.filter(o => o.creada.operacion.proveedor !== null).length,
      eventualesForzadas: ops.filter(o => o.eventual === 'forzada').length,
      eventualesExtra: ops.filter(o => o.eventual === 'extra').length,
      conAcompaniante: ops.filter(o => o.creada.operacion.acompaniante).length,
      aCerrar: ops.filter(o => o.cierre !== null).length,
      conAdicional: ops.filter(o => o.cierre?.adicional).length,
      porCliente: ordenar(porCliente).map(([cliente, cantidad]) => ({ cliente, cantidad })),
      porNivelTarifaCliente: ordenar(porNivel).map(([nivel, cantidad]) => ({ nivel, cantidad })),
      diasSinCapacidad,
    };
  }

  private redondear(valor: number): number {
    return Math.round(valor / 100) * 100;
  }

  private validarParametros(p: ParametrosGenerador): void {
    const formato = /^\d{4}-\d{2}-\d{2}$/;
    if (!formato.test(p.desde) || !formato.test(p.hasta)) throw new Error('Fechas inválidas (YYYY-MM-DD).');
    if (p.desde > p.hasta) throw new Error('"Desde" no puede ser posterior a "hasta".');
    const [a1, m1, d1] = p.desde.split('-').map(Number);
    const [a2, m2, d2] = p.hasta.split('-').map(Number);
    const dias = (new Date(a2, m2 - 1, d2).getTime() - new Date(a1, m1 - 1, d1).getTime()) / 86400000 + 1;
    if (dias > this.MAX_DIAS) throw new Error(`El rango no puede superar ${this.MAX_DIAS} días.`);
    if (!Number.isInteger(p.cantidadTotal) || p.cantidadTotal < 1 || p.cantidadTotal > 2000) {
      throw new Error('La cantidad total tiene que ser un entero entre 1 y 2000.');
    }
    const pcts = [p.pesoSabado, p.pctEventualExtra, p.pctAcompaniante, p.pctCerrar, p.pctAdicionalExtra];
    if (pcts.some(x => !(x >= 0 && x <= 1))) throw new Error('Los porcentajes tienen que estar entre 0 y 1.');
    if (!(p.sesgoClientes >= 0 && p.sesgoClientes <= 3)) throw new Error('El sesgo de clientes tiene que estar entre 0 y 3.');
    if (!(p.kmMin >= 0 && p.kmMin <= p.kmMax)) throw new Error('Rango de km inválido.');
    if (!Number.isInteger(p.semilla)) throw new Error('La semilla tiene que ser un número entero.');
  }

  private verificarEntorno(): void {
    if (!this.esEntornoDemo()) {
      throw new Error(`Generador bloqueado: el proyecto es '${environment.firebase.projectId}', no demo.`);
    }
    if (this.usuarioSesion.getRol() !== 'dev') {
      throw new Error('Generador bloqueado: requiere rol dev.');
    }
  }
}

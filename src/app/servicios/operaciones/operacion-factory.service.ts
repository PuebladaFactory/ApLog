import { Injectable } from '@angular/core';
import { Operacion, EstadoOp } from 'src/app/interfaces/operacion';
import { Cliente } from 'src/app/interfaces/cliente';
import { Chofer, Vehiculo } from 'src/app/interfaces/chofer';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { ConId } from 'src/app/interfaces/conId';
import { RefTarifaHabilitada } from 'src/app/interfaces/tarifa-habilitada';
import { ProveedorService } from 'src/app/servicios/proveedores/proveedor.service';
import { EscrituraBatch } from 'src/app/servicios/database/db-firestore.service';

export interface DatosCrearOperacion {
  cliente:     ConId<Cliente>;
  chofer:      ConId<Chofer>    | null;   // null = pendiente (caso proveedor sin chofer asignado)
  vehiculo:    ConId<Vehiculo>  | null;   // null = pendiente (se resuelve en operaciones-table)
  proveedor:   ConId<Proveedor> | null;
  fecha:       string;                    // 'YYYY-MM-DD'
  observacion: string;
  hojaDeRuta:  string;
}

@Injectable({ providedIn: 'root' })
export class OperacionFactoryService {

  constructor(private proveedorService: ProveedorService) {}

  /**
   * Construye el esqueleto de una operación. Nace incompleta:
   * idOperacion vacío (lo asigna Firestore al guardar), vehículo vacío,
   * valores en cero, multiplicadores en 1. El usuario completa el resto al editar.
   */
  crearOperacionBase(datos: DatosCrearOperacion): Operacion {
    const { cliente, chofer, vehiculo, proveedor, fecha, observacion, hojaDeRuta } = datos;

    const esEventual = this.esEventualPorHabilitadas(
      cliente,
      chofer ? this.proveedorService.resolverTarifasHabilitadasChofer(chofer) : undefined,
    );

    return {
      idOperacion:      '',
      numeroOperacion:  0,   // se asignará al guardar (NumeradorService)
      fecha,
      km:             0,
      documentacion:  [],
      hojaRuta:       hojaDeRuta,
      observaciones:  observacion,

      cliente: {
        id:           cliente.id,
        razonSocial:  cliente.razonSocial,
        cuit:         cliente.cuit,
        // Frente Vendedores: snapshot de las asignaciones del cliente,
        // congelado al ALTA (la comisión es por operación, histórica). Copia
        // de cada entrada; siempre array (vacío si no tiene vendedores).
        comisiones: (cliente.comisionesVenta ?? []).map(a => ({
          idVendedor: a.idVendedor,
          porcentaje: a.porcentaje,
        })),
      },
      chofer: chofer
        ? {
            id:       chofer.id,
            nombre:   chofer.datosPersonales.nombre,
            apellido: chofer.datosPersonales.apellido,
            cuit:     chofer.datosPersonales.cuit,
          }
        : { id: '', nombre: '', apellido: '', cuit: 0 },   // pendiente, se completa en operaciones-table
      vehiculo: vehiculo
        ? { id: vehiculo.id, dominio: vehiculo.dominio, categoria: vehiculo.categoria }
        : { id: '', dominio: '', categoria: { catOrden: 0, nombre: '' } },
      proveedor: proveedor
        ? { id: proveedor.id, razonSocial: proveedor.razonSocial, cuit: proveedor.cuit }
        : null,

      acompaniante:     false,
      acompanianteCant: 0,

      informeOpCliente: '',
      informeOpChofer:  '',

      // Nace con objeto en cero SOLO si la op es eventual; sino null.
      datosTarifaEventual: esEventual
        ? { chofer: { concepto: '', valor: 0 }, cliente: { concepto: '', valor: 0 } }
        : null,

      tarifaAplicadaCliente: null,
      tarifaAplicadaChofer:  null,
      valoresNuevos:         null,

      multiplicadorCliente: 1,
      multiplicadorChofer:  1,
      adExtra:              null,

      estado: this.estadoInicial(),
    };
  }

  /** Estado inicial de una operación recién creada. */
  estadoInicial(): EstadoOp {
    return {
      ciclo:       'abierta',
      liquidacion: { cliente: false, chofer: false },
      proforma:    { cliente: false, chofer: false },
    };
  }

  /** True si la op es eventual porque el cliente o el chofer/proveedor tienen
   *  el nivel Eventual habilitado (por invariante, cuando Eventual está
   *  habilitado es el único nivel de esa entidad). `habilitadasChofer`:
   *  proveedorService.resolverTarifasHabilitadasChofer(chofer), que ya
   *  resuelve directo vs. proveedor; undefined con chofer pendiente → solo
   *  cuenta el cliente. Mismo criterio que
   *  ResolucionTarifaOpService.esEventualForzada.
   *  Reemplaza a la jerarquía legacy de 4 booleanos de la op (TC8): de ella
   *  solo se usaba la marca de eventual. */
  esEventualPorHabilitadas(cliente: Cliente, habilitadasChofer: RefTarifaHabilitada[] | undefined): boolean {
    return cliente.tarifasHabilitadas.some(h => h.nivel === 'eventual')
      || (habilitadasChofer ?? []).some(h => h.nivel === 'eventual');
  }

  /** Deja la op eventual o no, manteniendo el invariante
   *  eventual ⟺ datosTarifaEventual !== null. Al pasar a eventual crea
   *  datosTarifaEventual en cero si no existía (si ya existía conserva lo
   *  cargado); al salir lo deja en null. Muta la op in-place. Lo usan
   *  ResolucionTarifaOpService.asignarChofer (chofer de proveedor resuelto) y
   *  el toggle Eventual de operaciones-editor. */
  aplicarEventual(op: Operacion, eventual: boolean): void {
    op.datosTarifaEventual = eventual
      ? (op.datosTarifaEventual
         ?? { chofer: { concepto: '', valor: 0 }, cliente: { concepto: '', valor: 0 } })
      : null;
  }

  /** Convierte una Operación (ConId) al body que se persiste en Firestore —
   *  excluye idOperacion (id del documento, no campo) e id (metadata ConId).
   *  Migrado desde OperacionService (que ahora delega acá vía un wrapper
   *  privado) para que InformeOpService pueda reusarlo sin crear una
   *  dependencia circular (OperacionService ya inyecta InformeOpService,
   *  así que InformeOpService no puede inyectar OperacionService). */
  opToFirestore(op: Operacion): Omit<Operacion, 'idOperacion'> {
    const { idOperacion, id, ...resto } = op as any;
    return resto;
  }

  /** Empuja la escritura de una Operación a un EscrituraBatch[] en curso —
   *  no commitea, el caller sigue con su propio db.commitBatch(escrituras).
   *  'crear'/'reemplazar' son mecánicamente idénticos en commitBatch (ambos
   *  hacen batch.set) — el parámetro existe solo para declarar la intención
   *  semántica del caller, no cambia el comportamiento. */
  agregarEscrituraOperacion(
    escrituras: EscrituraBatch[],
    op: ConId<Operacion>,
    modo: 'crear' | 'reemplazar' = 'reemplazar',
  ): void {
    escrituras.push({ coleccion: 'operaciones', id: op.idOperacion, data: this.opToFirestore(op), modo });
  }

  /** Actualización PARCIAL de una Operación — solo los campos pasados en
   *  `campos` (notación de punto para anidados, ej. 'estado.proforma.cliente').
   *  Para transiciones que no reescriben la operación entera (liquidación,
   *  proforma). No commitea. Hermano de agregarEscrituraOperacion (reemplazo
   *  completo), mismo criterio de división por mecanismo que
   *  InformeOpService (Completo/Parcial). */
  agregarEscrituraOperacionParcial(
    escrituras: EscrituraBatch[],
    idOperacion: string,
    campos: Record<string, any>,
  ): void {
    escrituras.push({ coleccion: 'operaciones', id: idOperacion, data: campos, modo: 'actualizar' });
  }
}

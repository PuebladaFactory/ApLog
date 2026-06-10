import { Injectable } from '@angular/core';
import { Operacion, EstadoOp } from 'src/app/interfaces/operacion';
import { Cliente } from 'src/app/interfaces/cliente';
import { Chofer } from 'src/app/interfaces/chofer';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { TarifaTipo } from 'src/app/interfaces/chofer';
import { ConId } from 'src/app/interfaces/conId';

export interface DatosCrearOperacion {
  cliente:     ConId<Cliente>;
  chofer:      ConId<Chofer>;
  proveedor:   ConId<Proveedor> | null;
  fecha:       string;   // 'YYYY-MM-DD'
  observacion: string;
  hojaDeRuta:  string;
}

@Injectable({ providedIn: 'root' })
export class OperacionFactoryService {

  /**
   * Construye el esqueleto de una operación. Nace incompleta:
   * idOperacion vacío (lo asigna Firestore al guardar), vehículo vacío,
   * valores en cero, multiplicadores en 1. El usuario completa el resto al editar.
   */
  crearOperacionBase(datos: DatosCrearOperacion): Operacion {
    const { cliente, chofer, proveedor, fecha, observacion, hojaDeRuta } = datos;

    const tarifaTipo = this.getTarifaTipo(cliente, chofer);

    return {
      idOperacion:      '',
      numeroOperacion:  0,   // se asignará al guardar (NumeradorService)
      fecha,
      km:             0,
      documentacion:  null,
      hojaRuta:       hojaDeRuta,
      observaciones:  observacion,

      cliente: {
        id:           cliente.id,
        razonSocial:  cliente.razonSocial,
        cuit:         cliente.cuit,
      },
      chofer: {
        id:       chofer.id,
        nombre:   chofer.datosPersonales.nombre,
        apellido: chofer.datosPersonales.apellido,
        cuit:     chofer.datosPersonales.cuit,
      },
      vehiculo: {
        id:       '',
        dominio:  '',
        categoria: { catOrden: 0, nombre: '' },
      },
      proveedor: proveedor
        ? { id: proveedor.id, razonSocial: proveedor.razonSocial, cuit: proveedor.cuit }
        : null,

      acompaniante:     false,
      acompanianteCant: 0,

      informeOpCliente: 0,
      informeOpChofer:  0,

      tarifaTipo,
      // Nacen con objeto en cero SOLO si la tarifa correspondiente aplica; sino null.
      datosTarifaEventual: tarifaTipo.eventual
        ? { chofer: { concepto: '', valor: 0 }, cliente: { concepto: '', valor: 0 } }
        : null,
      datosTarifaPersonalizada: tarifaTipo.personalizada
        ? { seccion: 0, categoria: 0, nombre: '', aCobrar: 0, aPagar: 0 }
        : null,

      valores: {
        cliente: { acompValor: 0, kmAdicional: 0, tarifaBase: 0, aCobrar: 0 },
        chofer:  { acompValor: 0, kmAdicional: 0, tarifaBase: 0, aPagar:  0 },
      },
      multiplicadorCliente: 1,
      multiplicadorChofer:  1,

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

  /**
   * Determina el tarifaTipo del esqueleto según la jerarquía:
   * eventual > personalizada > especial > general.
   * TODO: refactor Tarifas — esta lógica migrará al sistema de tarifas unificado.
   */
  private getTarifaTipo(cliente: Cliente, chofer: ConId<Chofer>): TarifaTipo {
    if (cliente.tarifaTipo?.eventual || chofer.tarifaTipo?.eventual) {
      return { general: false, especial: false, eventual: true,  personalizada: false };
    }
    if (cliente.tarifaTipo?.personalizada) {
      return { general: false, especial: false, eventual: false, personalizada: true  };
    }
    if (cliente.tarifaTipo?.especial || chofer.tarifaTipo?.especial) {
      return { general: false, especial: true,  eventual: false, personalizada: false };
    }
    return   { general: true,  especial: false, eventual: false, personalizada: false };
  }
}

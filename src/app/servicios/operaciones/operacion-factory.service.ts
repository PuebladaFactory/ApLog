import { Injectable } from '@angular/core';
import { Operacion, EstadoOp } from 'src/app/interfaces/operacion';
import { Cliente } from 'src/app/interfaces/cliente';
import { Chofer, TarifaTipo, Vehiculo } from 'src/app/interfaces/chofer';
import { Proveedor } from 'src/app/interfaces/proveedor';
import { ConId } from 'src/app/interfaces/conId';

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

  /**
   * Construye el esqueleto de una operación. Nace incompleta:
   * idOperacion vacío (lo asigna Firestore al guardar), vehículo vacío,
   * valores en cero, multiplicadores en 1. El usuario completa el resto al editar.
   */
  crearOperacionBase(datos: DatosCrearOperacion): Operacion {
    const { cliente, chofer, vehiculo, proveedor, fecha, observacion, hojaDeRuta } = datos;

    const tarifaTipo = this.resolverJerarquiaTarifa(cliente, chofer?.tarifaTipo);

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
        // TODO: refactor Vendedores — poblar vendedor en el RefCliente desde el cliente vivo al
        // crear la op (comisión histórica por operación). Hasta entonces queda undefined y la
        // asignación de comisiones no corre para ops nuevas (acceso protegido por && en valores-op).
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
   * Jerarquía de tarifas: eventual > personalizada > especial > general.
   * `tarifaSecundaria` es la tarifa de la entidad que acompaña al cliente:
   * para chofer directo, chofer.tarifaTipo; para chofer de proveedor, la tarifa
   * del proveedor (resuelta por quien llama vía ProveedorService.getTarifaTipo).
   * undefined cuando todavía no hay chofer/proveedor resuelto (alta con pendiente).
   * Personalizada es exclusiva del cliente; no la aporta la tarifa secundaria.
   * TODO: refactor Tarifas — esta lógica migrará al sistema de tarifas unificado.
   */
  private resolverJerarquiaTarifa(
    cliente: Cliente,
    tarifaSecundaria: TarifaTipo | undefined,
  ): TarifaTipo {
    if (cliente.tarifaTipo?.eventual || tarifaSecundaria?.eventual) {
      return { general: false, especial: false, eventual: true,  personalizada: false };
    }
    if (cliente.tarifaTipo?.personalizada) {
      return { general: false, especial: false, eventual: false, personalizada: true  };
    }
    if (cliente.tarifaTipo?.especial || tarifaSecundaria?.especial) {
      return { general: false, especial: true,  eventual: false, personalizada: false };
    }
    return   { general: true,  especial: false, eventual: false, personalizada: false };
  }

  /**
   * Recalcula el tarifaTipo de una op cuando se resuelve el chofer pendiente
   * (caso proveedor). Quien llama resuelve la tarifa secundaria y la pasa ya
   * resuelta: para chofer directo, chofer.tarifaTipo; para chofer de proveedor,
   * ProveedorService.getTarifaTipo(idProveedor). El factory NO inyecta services.
   * Devuelve el nuevo TarifaTipo; NO muta la op (la mutación coherente, con
   * datosTarifaX, la hace aplicarTarifaTipo más abajo si hace falta).
   */
  recalcularTarifaTipo(cliente: Cliente, tarifaSecundaria: TarifaTipo | undefined): TarifaTipo {
    return this.resolverJerarquiaTarifa(cliente, tarifaSecundaria);
  }

  /**
   * Aplica o revierte la tarifa eventual sobre una op, manteniendo el invariante
   * de datosTarifaX. Estado de UI de operaciones-editor.
   *
   *  - activar=true: pasa la op a eventual. Crea datosTarifaEventual en cero si
   *    no existía y anula datosTarifaPersonalizada. (El tipo original lo guarda el
   *    componente en su Map para poder volver atrás.)
   *  - activar=false: restaura tarifaOriginal y reconstruye datosTarifaX según
   *    corresponda (eventual→null, personalizada→objeto en cero, resto→ambos null).
   *
   * TODO: refactor Tarifas — la mutación de datosTarifaX migrará al sistema unificado.
   */
  aplicarTarifaEventual(
    op: Operacion,
    activar: boolean,
    tarifaOriginal: TarifaTipo,
  ): void {
    if (activar) {
      op.tarifaTipo = { general: false, especial: false, eventual: true, personalizada: false };
      op.datosTarifaEventual = op.datosTarifaEventual
        ?? { chofer: { concepto: '', valor: 0 }, cliente: { concepto: '', valor: 0 } };
      op.datosTarifaPersonalizada = null;
    } else {
      op.tarifaTipo = { ...tarifaOriginal };
      op.datosTarifaEventual = tarifaOriginal.eventual
        ? (op.datosTarifaEventual
           ?? { chofer: { concepto: '', valor: 0 }, cliente: { concepto: '', valor: 0 } })
        : null;
      op.datosTarifaPersonalizada = tarifaOriginal.personalizada
        ? (op.datosTarifaPersonalizada
           ?? { seccion: 0, categoria: 0, nombre: '', aCobrar: 0, aPagar: 0 })
        : null;
    }
  }
}

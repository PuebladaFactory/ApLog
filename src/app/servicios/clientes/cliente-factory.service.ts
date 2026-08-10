import { Injectable } from '@angular/core';
import { Cliente, Contacto } from 'src/app/interfaces/cliente';
import { Direccion } from 'src/app/interfaces/chofer';
import { ConIdType } from 'src/app/interfaces/conId';
import { RefTarifaHabilitada, validarTarifasHabilitadas } from 'src/app/interfaces/tarifa-habilitada';

export interface ClienteFormData {
  razonSocial: string;
  cuit: string;
  condFiscal: string;
  provinciaFiscal: string;
  municipioFiscal: string;
  localidadFiscal: string;
  domicilioFiscal: string;
  provinciaOperativa: string;
  municipioOperativa: string;
  localidadOperativa: string;
  domicilioOperativa: string;
  tarifasHabilitadas: RefTarifaHabilitada[];
  contactos: Contacto[];
}

@Injectable({ providedIn: 'root' })
export class ClienteFactoryService {

  crearCliente(data: ClienteFormData): Cliente {
    const tarifasHabilitadas = data.tarifasHabilitadas;
    validarTarifasHabilitadas(tarifasHabilitadas);
    return {
      idCliente: '',
      razonSocial: data.razonSocial,
      cuit: Number(data.cuit.replace(/-/g, '')),
      condFiscal: data.condFiscal,
      direccionFiscal: this.buildDireccion(
        data.provinciaFiscal, data.municipioFiscal,
        data.localidadFiscal, data.domicilioFiscal
      ),
      direccionOperativa: this.buildDireccion(
        data.provinciaOperativa, data.municipioOperativa,
        data.localidadOperativa, data.domicilioOperativa
      ),
      contactos: data.contactos,
      tarifasHabilitadas,
      tarifaAsignada: false,
      idTarifa: '',
      // TODO: asignar vendedores cuando se refactorice ese módulo
      vendedor: [],
      activo: true,
      visible: true,
    };
  }

  editarCliente(original: ConIdType<Cliente>, data: ClienteFormData): Cliente {
    const tarifasHabilitadas = data.tarifasHabilitadas;
    validarTarifasHabilitadas(tarifasHabilitadas);
    return {
      ...original,
      razonSocial: data.razonSocial,
      cuit: Number(data.cuit.replace(/-/g, '')),
      condFiscal: data.condFiscal,
      direccionFiscal: this.buildDireccion(
        data.provinciaFiscal, data.municipioFiscal,
        data.localidadFiscal, data.domicilioFiscal
      ),
      direccionOperativa: this.buildDireccion(
        data.provinciaOperativa, data.municipioOperativa,
        data.localidadOperativa, data.domicilioOperativa
      ),
      contactos: data.contactos,
      tarifasHabilitadas,
    };
  }

  private buildDireccion(
    provincia: string,
    municipio: string,
    localidad: string,
    domicilio: string,
  ): Direccion {
    return { provincia, municipio, localidad, domicilio };
  }
}

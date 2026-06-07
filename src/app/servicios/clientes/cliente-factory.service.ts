import { Injectable } from '@angular/core';
import { Cliente, Contacto } from 'src/app/interfaces/cliente';
import { Direccion, TarifaTipo } from 'src/app/interfaces/chofer';
import { ConIdType } from 'src/app/interfaces/conId';

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
  tarifaTipo: TarifaTipo;
  contactos: Contacto[];
}

@Injectable({ providedIn: 'root' })
export class ClienteFactoryService {

  crearCliente(data: ClienteFormData): Cliente {
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
      tarifaTipo: data.tarifaTipo,
      tarifaAsignada: false,
      idTarifa: '',
      // TODO: asignar vendedores cuando se refactorice ese módulo
      vendedor: [],
      activo: true,
      visible: true,
    };
  }

  editarCliente(original: ConIdType<Cliente>, data: ClienteFormData): Cliente {
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
      tarifaTipo: data.tarifaTipo,
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

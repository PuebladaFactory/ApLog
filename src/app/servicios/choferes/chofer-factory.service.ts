import { Injectable } from '@angular/core';
import {
  Chofer, ContratacionChofer, DatosPersonales,
  Direccion, TarifaTipo
} from 'src/app/interfaces/chofer';
import { ConIdType } from 'src/app/interfaces/conId';

export interface ChoferFormData {
  nombre: string;
  apellido: string;
  cuit: string;
  fechaNac: Date;
  email: string;
  celularContacto: number;
  celularEmergencia: number;
  contactoEmergencia: string;
  provincia: string;
  municipio: string;
  localidad: string;
  domicilio: string;
  condFiscal: string;
  contratacion: ContratacionChofer;
  tarifaTipo: TarifaTipo;
}

@Injectable({ providedIn: 'root' })
export class ChoferFactoryService {

  crearChofer(data: ChoferFormData): Chofer {
    return {
      idChofer: '',
      datosPersonales: this.buildDatosPersonales(data),
      condFiscal: data.condFiscal,
      contratacion: data.contratacion,
      tarifaTipo: data.tarifaTipo,
      tarifaAsignada: false,
      idTarifa: '',
      activo: true,
      visible: true,
    };
  }

  editarChofer(original: ConIdType<Chofer>, data: ChoferFormData): Chofer {
    return {
      ...original,
      datosPersonales: this.buildDatosPersonales(data),
      condFiscal: data.condFiscal,
      contratacion: data.contratacion,
      tarifaTipo: data.tarifaTipo,
    };
  }

  private buildDatosPersonales(data: ChoferFormData): DatosPersonales {
    const direccion: Direccion = {
      provincia: data.provincia,
      municipio: data.municipio,
      localidad: data.localidad,
      domicilio: data.domicilio,
    };
    return {
      nombre: data.nombre,
      apellido: data.apellido,
      cuit: Number(data.cuit.replace(/-/g, '')),
      fechaNac: data.fechaNac,
      email: data.email,
      celularContacto: Number(data.celularContacto),
      celularEmergencia: Number(data.celularEmergencia),
      contactoEmergencia: data.contactoEmergencia,
      direccion,
    };
  }
}

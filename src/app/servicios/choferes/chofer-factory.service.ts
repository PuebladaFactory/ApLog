import { Injectable } from '@angular/core';
import {
  Chofer, ContratacionChofer, DatosPersonales,
  Direccion
} from 'src/app/interfaces/chofer';
import { ConIdType } from 'src/app/interfaces/conId';
import { RefTarifaHabilitada, validarTarifasHabilitadas } from 'src/app/interfaces/tarifa-habilitada';
import { errorFechaNacimiento, normalizarFechaNacimiento } from 'src/app/shared/utils/fecha-nacimiento.util';

export interface ChoferFormData {
  nombre: string;
  apellido: string;
  cuit: string;
  fechaNac: string; // 'YYYY-MM-DD' del input de fecha
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
  tarifasHabilitadas: RefTarifaHabilitada[] | null;
}

@Injectable({ providedIn: 'root' })
export class ChoferFactoryService {

  crearChofer(data: ChoferFormData): Chofer {
    const tarifasHabilitadas = data.tarifasHabilitadas;
    if (tarifasHabilitadas !== null) {
      validarTarifasHabilitadas(tarifasHabilitadas);
    }
    return {
      idChofer: '',
      datosPersonales: this.buildDatosPersonales(data),
      condFiscal: data.condFiscal,
      contratacion: data.contratacion,
      tarifasHabilitadas,
      activo: true,
      visible: true,
    };
  }

  editarChofer(original: ConIdType<Chofer>, data: ChoferFormData): Chofer {
    const tarifasHabilitadas = data.tarifasHabilitadas;
    if (tarifasHabilitadas !== null) {
      validarTarifasHabilitadas(tarifasHabilitadas);
    }
    return {
      ...original,
      datosPersonales: this.buildDatosPersonales(data),
      condFiscal: data.condFiscal,
      contratacion: data.contratacion,
      tarifasHabilitadas,
    };
  }

  private buildDatosPersonales(data: ChoferFormData): DatosPersonales {
    // FI1c: único punto de escritura de la fecha de nacimiento (alta y
    // edición). Se normaliza a 'YYYY-MM-DD' y se valida: nunca se guarda un
    // objeto de fecha ni una fecha fuera de rango.
    const fechaNac = normalizarFechaNacimiento(data.fechaNac).fecha;
    const errorFecha = errorFechaNacimiento(fechaNac);
    if (errorFecha) {
      throw new Error(`Chofer: ${errorFecha}.`);
    }
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
      fechaNac: fechaNac!,
      email: data.email,
      celularContacto: Number(data.celularContacto),
      celularEmergencia: Number(data.celularEmergencia),
      contactoEmergencia: data.contactoEmergencia,
      direccion,
    };
  }
}

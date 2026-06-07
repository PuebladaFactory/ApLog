import { Injectable } from '@angular/core';
import { AsignacionVehiculo, Categoria, Vehiculo } from 'src/app/interfaces/chofer';
import { ConIdType } from 'src/app/interfaces/conId';

export interface VehiculoFormData {
  dominio: string;
  marca: string;
  modelo: string;
  categoria: Categoria;
  tipoCombustible: string[];
  tarjetaCombustible: boolean;
  publicidad: boolean;
  segSat: boolean;
  satelital: string;
  refrigeracion: boolean | null;
  asignadoA: AsignacionVehiculo;
}

@Injectable({ providedIn: 'root' })
export class VehiculoFactoryService {

  crearVehiculo(data: VehiculoFormData): Vehiculo {
    return {
      idVehiculo: '',
      dominio: data.dominio.toUpperCase(),
      marca: data.marca,
      modelo: data.modelo,
      categoria: data.categoria,
      tipoCombustible: data.tipoCombustible,
      tarjetaCombustible: data.tarjetaCombustible,
      publicidad: data.publicidad,
      segSat: data.segSat,
      satelital: data.segSat ? data.satelital : '',
      refrigeracion: data.refrigeracion,
      asignadoA: data.asignadoA,
    };
  }

  editarVehiculo(original: ConIdType<Vehiculo>, data: VehiculoFormData): Vehiculo {
    return {
      ...original,
      dominio: data.dominio.toUpperCase(),
      marca: data.marca,
      modelo: data.modelo,
      categoria: data.categoria,
      tipoCombustible: data.tipoCombustible,
      tarjetaCombustible: data.tarjetaCombustible,
      publicidad: data.publicidad,
      segSat: data.segSat,
      satelital: data.segSat ? data.satelital : '',
      refrigeracion: data.refrigeracion,
      asignadoA: data.asignadoA,
    };
  }
}

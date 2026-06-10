export interface Asignacion {
  fecha: string;                      // 'YYYY-MM-DD', única para toda la tanda
  asignaciones: AsignacionBase[];
}

export interface AsignacionBase {
  idCliente: string;
  asignacionesChofer: AsignacionChofer[];
}

export interface AsignacionChofer {
  idChofer: string;
  observacion: string;
  hojaDeRuta: string;
  // Futuro: vehiculoAsignado (idVehiculo, categoria, etc.) cuando se refactorice tablero-diario
}

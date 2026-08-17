export type AccionLog =
  // Mutación de datos — la entrada se escribe DENTRO del batch atómico de negocio.
  | 'ALTA'
  | 'EDITAR'
  | 'BAJA'
  | 'RESTAURAR'
  // Acciones operativas sin mutación de datos — no hay batch de negocio al cual
  // atarse, se escriben sueltas. Ampliar esta lista a medida que se necesiten
  // (cobros/pagos y liquidación cuando se implemente Finanzas, etc.).
  | 'REIMPRIMIR'
  | 'DESCARGAR';

export interface CambioCampo {
  campo: string;
  anterior: any;
  nuevo: any;
}

export interface RegistroLog {
  timestamp: number;
  userId: string;
  userEmail: string;
  action: AccionLog;
  coleccion: string;        // colección "dueña" de la acción, no lista de afectadas
  idObjet: string | number;
  details: string;
  status: 'SUCCESS' | 'ERROR';
  cambios?: CambioCampo[];  // solo presente en action === 'EDITAR', y solo si hubo diffs
}

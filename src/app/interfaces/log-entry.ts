export interface LogEntry {
    timestamp: number;       // Fecha y hora en milisegundos
    userId: string;          // ID del usuario
    userEmail: string;       // Correo del usuario (opcional)
    action: string;          // Tipo de acción
    coleccion: string       //
    details: string;         // Detalles específicos del evento
    idObjet: number;        //    
    status: 'SUCCESS' | 'ERROR'; // Resultado del evento
}

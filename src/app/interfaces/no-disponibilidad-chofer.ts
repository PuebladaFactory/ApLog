export interface NoDisponibilidadChofer {
    idNoDisponibilidad: number;     
    idChofer: number;
    desde: string; // YYYY-MM-DD
    hasta: string; // YYYY-MM-DD
    motivo?: string;
    activa: boolean;
}

export interface NoDisponibilidadChofer {
    idNoDisponibilidad: number;     
    idChofer: number;
    desde: string; // YYYY-MM-DD
    hasta: string | null;   // null = sin definir
    motivo?: string;
    activa: boolean;
}

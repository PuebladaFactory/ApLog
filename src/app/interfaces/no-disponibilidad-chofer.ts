export interface NoDisponibilidadChofer {
    idNoDisponibilidad: string;
    idChofer: string;
    desde: string;
    hasta: string | null;
    motivo?: string;
    activa: boolean;
}

export interface RankingMoroso {
  entidadId: number;
  razonSocial: string;
  tipoEntidad: string;

  deudaTotal: number;
  score: number;

  deudaVencidaPorc: number;

  bucket0_30: number;
  bucket31_60: number;
  bucket61_90: number;
  bucket90mas: number;
}

export interface ResumenDashboard {
  total: number;
  vencido: number;
  vencidoPorc: number;
}


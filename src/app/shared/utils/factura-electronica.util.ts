import { FacturaElectronicaLiq, InformeLiqNuevo } from 'src/app/interfaces/informe-liq-nuevo';
import { TIPOS_COMPROBANTE } from 'src/app/constantes/tipos-comprobante';

/** Contenido del QR de AFIP (RG 4291): JSON en base64 dentro del parámetro
 *  `p` de https://www.afip.gob.ar/fe/qr/?p=… — `cuit` es el EMISOR y
 *  `nroDocRec` el RECEPTOR. `codAut` es el CAE (o CAEA). */
export interface DatosQrAfip {
  ver?: number;
  fecha: string;              // YYYY-MM-DD
  cuit: number;
  ptoVta: number;
  tipoCmp: number;
  nroCmp: number;
  importe: number;
  moneda?: string;
  ctz?: number;
  tipoDocRec?: number;
  nroDocRec?: number;
  tipoCodAut?: string;
  codAut: number;
}

export interface ValidacionFactura {
  importeOk: boolean;
  cuitOk: boolean;
}

/** Decodifica el texto leído del QR (la URL de AFIP). Tira Error con un
 *  mensaje legible si no es un QR de AFIP válido o le faltan datos. Pura. */
export function decodificarQrAfip(textoQr: string): DatosQrAfip {
  let p: string | null;
  try {
    p = new URL(textoQr).searchParams.get('p');
  } catch {
    throw new Error('El QR no contiene una URL válida de AFIP.');
  }
  if (!p) throw new Error('El QR no tiene el parámetro de datos de AFIP (p).');

  let json: any;
  try {
    // Admite base64 estándar y base64url, con o sin relleno.
    const b64 = p.replace(/-/g, '+').replace(/_/g, '/');
    const conRelleno = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    json = JSON.parse(atob(conRelleno));
  } catch {
    throw new Error('No se pudieron decodificar los datos del QR.');
  }

  const requeridos = ['fecha', 'cuit', 'ptoVta', 'tipoCmp', 'nroCmp', 'importe', 'codAut'];
  const faltan = requeridos.filter(k => json?.[k] === undefined || json?.[k] === null || json?.[k] === '');
  if (faltan.length > 0) throw new Error(`Al QR le faltan datos: ${faltan.join(', ')}.`);

  return {
    ...json,
    cuit: Number(json.cuit),
    ptoVta: Number(json.ptoVta),
    tipoCmp: Number(json.tipoCmp),
    nroCmp: Number(json.nroCmp),
    importe: Number(json.importe),
    nroDocRec: json.nroDocRec !== undefined && json.nroDocRec !== null ? Number(json.nroDocRec) : undefined,
    codAut: Number(json.codAut),
  };
}

/** Valida la factura contra el informe (D8: se permite vincular con
 *  discrepancias, con confirmación; el resultado queda registrado).
 *  - Importe: igual a valores.total (tolerancia 1 centavo).
 *  - CUIT: cliente → la factura la emite Vantruck, se compara el RECEPTOR
 *    (nroDocRec) con la entidad; chofer/proveedor → la emiten ellos, se
 *    compara el EMISOR (cuit). Pura. */
export function validarFacturaContraInforme(
  qr: DatosQrAfip,
  liq: Pick<InformeLiqNuevo, 'tipo' | 'entidad' | 'valores'>,
): ValidacionFactura {
  const importeOk = Math.abs(qr.importe - liq.valores.total) < 0.01;
  const cuitEntidad = liq.entidad?.cuit !== undefined && liq.entidad?.cuit !== null ? String(liq.entidad.cuit) : '';
  const cuitFactura = liq.tipo === 'cliente' ? String(qr.nroDocRec ?? '') : String(qr.cuit);
  return { importeOk, cuitOk: cuitEntidad !== '' && cuitEntidad === cuitFactura };
}

/** Arma la factura normalizada que se persiste en InformeLiqNuevo.factura.
 *  Sin campos undefined (Firestore no los acepta). Pura. */
export function facturaDesdeQr(
  qr: DatosQrAfip,
  textoQr: string,
  validacion: ValidacionFactura,
  vinculadaPor: string,
  fechaVinculacion: string,
): FacturaElectronicaLiq {
  return {
    cuitEmisor: String(qr.cuit),
    cuitReceptor: qr.nroDocRec !== undefined ? String(qr.nroDocRec) : '',
    puntoVenta: qr.ptoVta,
    tipoComprobante: qr.tipoCmp,
    numero: qr.nroCmp,
    cae: String(qr.codAut),
    fecha: qr.fecha,
    importe: qr.importe,
    qrData: textoQr,
    origen: 'qr',
    validacion: { importeOk: validacion.importeOk, cuitOk: validacion.cuitOk },
    vinculadaPor,
    fechaVinculacion,
  };
}

/** Clave de unicidad del comprobante = doc id en facturasVinculadas. */
export function claveComprobante(
  f: Pick<FacturaElectronicaLiq, 'cuitEmisor' | 'puntoVenta' | 'tipoComprobante' | 'numero'>,
): string {
  return `${f.cuitEmisor}_${f.puntoVenta}_${f.tipoComprobante}_${f.numero}`;
}

/** Misma clave, a partir de los datos del QR. */
export function claveComprobanteQr(qr: DatosQrAfip): string {
  return claveComprobante({
    cuitEmisor: String(qr.cuit), puntoVenta: qr.ptoVta, tipoComprobante: qr.tipoCmp, numero: qr.nroCmp,
  });
}

/** "Factura A", "Nota de Crédito B"… (constantes/tipos-comprobante). */
export function descripcionTipoComprobante(codigo: number): string {
  return TIPOS_COMPROBANTE.find(t => t.codigo === codigo)?.descripcion ?? `Comprobante tipo ${codigo}`;
}

/** Número legible del comprobante: "0003-00001234". */
export function numeroComprobante(f: Pick<FacturaElectronicaLiq, 'puntoVenta' | 'numero'>): string {
  return `${String(f.puntoVenta).padStart(4, '0')}-${String(f.numero).padStart(8, '0')}`;
}

/** Fecha del comprobante 'YYYY-MM-DD' → 'DD/MM/YYYY'. Sin pasar por Date ni
 *  por el pipe date (que toma ese formato como UTC y corre un día). Pura. */
export function fechaComprobanteLegible(fecha: string): string {
  const [a, m, d] = (fecha ?? '').split('-');
  return a && m && d ? `${d}/${m}/${a}` : (fecha ?? '');
}

/** Campos en los que la factura no coincide con el informe: 'importe',
 *  'CUIT' (vacío si coincide todo). Pura. */
export function listarDiscrepancias(v: ValidacionFactura): string[] {
  return [v.importeOk ? null : 'importe', v.cuitOk ? null : 'CUIT']
    .filter((x): x is string => x !== null);
}
